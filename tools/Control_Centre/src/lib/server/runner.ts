import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Manifest, StageDef } from "./manifest.ts";
import { appendRecord, hasFinishedRecord, nowIso, readRecords, type RunRecord } from "./records.ts";
import { findRunDir, listRuns } from "./runs.ts";

export interface Dirs {
  dataDir: string;
  runsDir: string;
  // Repo root: the manifest's relative command tokens resolve against this.
  pipelineRoot: string;
}

export type StepState = "notStarted" | "running" | "done" | "failed";

export interface StepStatus {
  status: StepState;
  execId: string | null;
  startedAt: string | null;
  outcome: "done" | "failed" | "interrupted" | null;
}

export function statePath(dataDir: string, stageId: string): string {
  return join(dataDir, `${stageId}.json`);
}

export function logPath(dataDir: string, stageId: string): string {
  return join(dataDir, `${stageId}.log`);
}

export function exitPath(dataDir: string, stageId: string): string {
  return join(dataDir, `${stageId}.exit`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Alive = kill(pid, 0) succeeds (EPERM also means alive; ESRCH means dead)
// AND ps shows the stage script's basename. pid comes from our own state
// file and is validated as an integer, so it never reaches a shell.
export function isPidAlive(pid: number, scriptBase: string): boolean {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ESRCH") return false;
    if (code !== "EPERM") return false;
  }
  let command: string;
  try {
    command = execSync(`ps -p ${pid} -o command=`, { encoding: "utf8" });
  } catch {
    return false;
  }
  return new RegExp(`(^|[\\s/])${escapeRegExp(scriptBase)}(\\s|$)`).test(command);
}

function scriptBaseOf(stage: StageDef): string {
  const script = [...stage.command].reverse().find((t) => t.endsWith(".py") || t.endsWith(".sh"));
  return basename(script ?? stage.command[stage.command.length - 1]);
}

function readState(dataDir: string, stageId: string): { execId: string; startedAt: string; pid: number | null } | null {
  const path = statePath(dataDir, stageId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as { execId: string; startedAt: string; pid: number | null };
  } catch {
    return null;
  }
}

export function isStageLive(manifest: Manifest, stageId: string, dirs: Dirs): boolean {
  const stage = manifest.stages.find((s) => s.id === stageId);
  const state = stage ? readState(dirs.dataDir, stageId) : null;
  if (!stage || !state || state.pid === null) return false;
  return isPidAlive(state.pid, scriptBaseOf(stage));
}

export function anyStageLive(manifest: Manifest, dirs: Dirs): boolean {
  return manifest.stages.some((s) => isStageLive(manifest, s.id, dirs));
}

function readExitCode(dataDir: string, stageId: string): number | null {
  const raw = readFileSync(exitPath(dataDir, stageId), "utf8").trim();
  const code = Number(raw);
  return Number.isInteger(code) ? code : null;
}

export function stageStatus(manifest: Manifest, stageId: string, dirs: Dirs): StepStatus {
  const stage = manifest.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`unknown stage: ${stageId}`);
  const state = readState(dirs.dataDir, stageId);
  if (!state) {
    // No execution slot (e.g. data/ was wiped): a newest run holding every
    // produces file still reads as done, so step 1 survives data loss.
    const newest = listRuns(dirs.runsDir)[0];
    if (newest !== undefined && stage.produces.every((f) => existsSync(join(dirs.runsDir, newest.id, f)))) {
      return { status: "done", execId: null, startedAt: null, outcome: "done" };
    }
    return { status: "notStarted", execId: null, startedAt: null, outcome: null };
  }
  if (existsSync(exitPath(dirs.dataDir, stageId))) {
    const code = readExitCode(dirs.dataDir, stageId);
    if (code === 0) {
      const runId = findRunDir(dirs.runsDir, state.startedAt);
      const complete =
        runId !== null && stage.produces.every((f) => existsSync(join(dirs.runsDir, runId, f)));
      if (complete) return { status: "done", execId: state.execId, startedAt: state.startedAt, outcome: "done" };
    }
    return { status: "failed", execId: state.execId, startedAt: state.startedAt, outcome: "failed" };
  }
  if (state.pid !== null && isPidAlive(state.pid, scriptBaseOf(stage))) {
    return { status: "running", execId: state.execId, startedAt: state.startedAt, outcome: null };
  }
  return { status: "failed", execId: state.execId, startedAt: state.startedAt, outcome: "interrupted" };
}

// Fully synchronous between the liveness check and the state write (no
// await), so two Start clicks cannot both pass the check in one process.
function spawnStage(
  manifest: Manifest,
  stage: StageDef,
  arg: string,
  runId: string | null,
  dirs: Dirs
): { busy: true } | { busy: false; execId: string } {
  const stageId = stage.id;
  if (anyStageLive(manifest, dirs)) return { busy: true };
  mkdirSync(dirs.dataDir, { recursive: true });
  const execId = randomUUID();
  const startedAt = nowIso();
  rmSync(exitPath(dirs.dataDir, stageId), { force: true });
  writeFileSync(statePath(dirs.dataDir, stageId), JSON.stringify({ execId, startedAt, pid: null }), "utf8");
  appendRecord(dirs.dataDir, { schemaVersion: 1, type: "started", execId, stage: stageId, startedAt, runId });
  const logFd = openSync(logPath(dirs.dataDir, stageId), "w");
  let childPid: number | undefined;
  try {
    const child = spawn(
      "/bin/sh",
      ["-c", '"$@"; echo $? > "$EXIT_FILE"', "sh", ...stage.command, "--", arg],
      {
        detached: true,
        stdio: ["ignore", logFd, logFd],
        cwd: dirs.pipelineRoot,
        env: {
          ...process.env,
          EXIT_FILE: exitPath(dirs.dataDir, stageId),
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`
        }
      }
    );
    child.on("error", (err) => {
      appendRecord(dirs.dataDir, {
        schemaVersion: 1, type: "finished", execId, stage: stageId, startedAt,
        finishedAt: nowIso(), runId: null, exitCode: null, outcome: "failed",
        durationSec: 0, logFile: `${stageId}.log`, command: stage.command, reason: `spawn_failed: ${err.message}`
      });
    });
    childPid = child.pid;
    child.unref();
  } catch (err) {
    closeSync(logFd);
    appendRecord(dirs.dataDir, {
      schemaVersion: 1, type: "finished", execId, stage: stageId, startedAt,
      finishedAt: nowIso(), runId: null, exitCode: null, outcome: "failed",
      durationSec: 0, logFile: `${stageId}.log`, command: stage.command,
      reason: `spawn_failed: ${(err as Error).message}`
    });
    throw err;
  }
  writeFileSync(statePath(dirs.dataDir, stageId), JSON.stringify({ execId, startedAt, pid: childPid ?? null }), "utf8");
  closeSync(logFd);
  return { busy: false, execId };
}

// Step 1 (ingest): today's startStage, renamed. The started record carries
// runId null; the run is found via findRunDir once the stage finishes.
export function startAudioStage(
  manifest: Manifest,
  stageId: string,
  audioPath: string,
  dirs: Dirs
): { busy: true } | { busy: false; execId: string } {
  const stage = manifest.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`unknown stage: ${stageId}`);
  if (stage.argsFrom !== "audioPath") throw new Error(`stage ${stageId} takes a run directory, not an audio path`);
  return spawnStage(manifest, stage, audioPath, null, dirs);
}

// Steps 2-4: the caller has already run resolveRunDir on runId, so the
// path below is built from a validated ID, never from raw client input.
export function startRunStage(
  manifest: Manifest,
  stageId: string,
  runId: string,
  dirs: Dirs
): { busy: true } | { busy: false; execId: string } {
  const stage = manifest.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`unknown stage: ${stageId}`);
  if (stage.argsFrom !== "runDir") throw new Error(`stage ${stageId} takes an audio path, not a run directory`);
  return spawnStage(manifest, stage, join(dirs.runsDir, runId), runId, dirs);
}

// The run linked to an execution slot: the slot's own "started" record.
function startedRunId(dataDir: string, stageId: string, execId: string): string | null {
  const started = readRecords(dataDir).find(
    (r) => r.type === "started" && r.stage === stageId && r.execId === execId
  );
  return started?.runId ?? null;
}

// The run linked to a stage's current slot, via its "started" record;
// null when there is no slot, no started record, or the slot belongs to
// the ingest stage (whose started records carry runId null).
export function slotRunId(dirs: Dirs, stageId: string, records: RunRecord[]): string | null {
  const state = readState(dirs.dataDir, stageId);
  if (!state) return null;
  return records.find((r) => r.type === "started" && r.stage === stageId && r.execId === state.execId)?.runId ?? null;
}

export interface RunStepStatus {
  status: StepState;
  outcome: "done" | "failed" | "interrupted" | null;
  startedAt: string | null;
}

// Per-run status for runDir stages (steps 2-4). `records` is the whole
// records.jsonl, read once per page load by the caller.
export function runStepStatus(
  manifest: Manifest,
  stageId: string,
  runId: string,
  dirs: Dirs,
  records: RunRecord[]
): RunStepStatus {
  const stage = manifest.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`unknown stage: ${stageId}`);
  const state = readState(dirs.dataDir, stageId);
  if (state !== null && state.pid !== null && isPidAlive(state.pid, scriptBaseOf(stage))) {
    const started = records.find((r) => r.type === "started" && r.stage === stageId && r.execId === state.execId);
    if (started !== undefined && started.runId === runId) {
      return { status: "running", outcome: null, startedAt: state.startedAt };
    }
  }
  const finished = records.filter((r) => r.type === "finished" && r.stage === stageId && r.runId === runId);
  const last = finished[finished.length - 1];
  // A crash leaves partial or stale files behind, so a failed or
  // interrupted record always wins over whatever is on disk.
  if (last !== undefined && (last.outcome === "failed" || last.outcome === "interrupted")) {
    return { status: "failed", outcome: last.outcome, startedAt: last.startedAt };
  }
  const complete = stage.produces.every((f) => existsSync(join(dirs.runsDir, runId, f)));
  if (last !== undefined && last.outcome === "done" && complete) {
    return { status: "done", outcome: "done", startedAt: last.startedAt };
  }
  // No record at all with all files present: a run made from the command
  // line before Control Center. (The "(no record)" label is 3c's.)
  if (last === undefined && complete) {
    return { status: "done", outcome: "done", startedAt: null };
  }
  return { status: "notStarted", outcome: null, startedAt: null };
}

export type CanStart = { ok: true } | { ok: false; reason: string };

// A stage may start only while nothing is live and the previous stage is
// done for this run. `requires` needs no separate check: every requires
// file is produced by the previous stage, and done already means those
// files exist on disk.
export function canStart(
  manifest: Manifest,
  stageId: string,
  runId: string,
  dirs: Dirs,
  records: RunRecord[]
): CanStart {
  const index = manifest.stages.findIndex((s) => s.id === stageId);
  if (index === -1) throw new Error(`unknown stage: ${stageId}`);
  const live = manifest.stages.find((s) => isStageLive(manifest, s.id, dirs));
  if (live !== undefined) return { ok: false, reason: `Waiting: ${live.label} is running` };
  if (index === 0) return { ok: true };
  const prev = manifest.stages[index - 1];
  const prevDone =
    prev.argsFrom === "audioPath"
      ? prev.produces.every((f) => existsSync(join(dirs.runsDir, runId, f)))
      : runStepStatus(manifest, prev.id, runId, dirs, records).status === "done";
  if (!prevDone) return { ok: false, reason: `Run ${prev.label} first` };
  return { ok: true };
}

// Synchronous; safe to call any number of times (init, load). Appends a
// "finished" record only when the execId has none yet.
export function reconcile(manifest: Manifest, dirs: Dirs): void {
  for (const stage of manifest.stages) {
    if (stage.argsFrom === "runDir") {
      reconcileRunDirStage(stage, dirs);
      continue;
    }
    const status = stageStatus(manifest, stage.id, dirs);
    if (status.status !== "done" && status.status !== "failed") continue;
    if (status.execId === null || status.startedAt === null || status.outcome === null) continue;
    const records = readRecords(dirs.dataDir);
    if (hasFinishedRecord(records, status.execId)) continue;
    const hasExit = existsSync(exitPath(dirs.dataDir, stage.id));
    const finishedAt = hasExit ? nowIso(statSync(exitPath(dirs.dataDir, stage.id)).mtime) : nowIso();
    const runId = findRunDir(dirs.runsDir, status.startedAt);
    appendRecord(dirs.dataDir, {
      schemaVersion: 1, type: "finished", execId: status.execId, stage: stage.id,
      startedAt: status.startedAt, finishedAt, runId,
      exitCode: hasExit ? readExitCode(dirs.dataDir, stage.id) : null,
      outcome: status.outcome,
      durationSec: Math.max(0, (new Date(finishedAt).getTime() - new Date(status.startedAt).getTime()) / 1000),
      logFile: `${stage.id}.log`,
      command: stage.command
    });
  }
}

// runDir twin of the ingest path above: the run comes from the slot's own
// "started" record (written by startRunStage), never from findRunDir,
// whose startedAt comparison only fits stages that create their own run.
function reconcileRunDirStage(stage: StageDef, dirs: Dirs): void {
  const state = readState(dirs.dataDir, stage.id);
  if (!state) return;
  const runId = startedRunId(dirs.dataDir, stage.id, state.execId);
  let outcome: "done" | "failed" | "interrupted";
  let exitCode: number | null;
  if (existsSync(exitPath(dirs.dataDir, stage.id))) {
    exitCode = readExitCode(dirs.dataDir, stage.id);
    const complete =
      exitCode === 0 &&
      runId !== null &&
      stage.produces.every((f) => existsSync(join(dirs.runsDir, runId, f)));
    outcome = complete ? "done" : "failed";
  } else {
    if (state.pid !== null && isPidAlive(state.pid, scriptBaseOf(stage))) return;
    exitCode = null;
    outcome = "interrupted";
  }
  if (hasFinishedRecord(readRecords(dirs.dataDir), state.execId)) return;
  const hasExit = existsSync(exitPath(dirs.dataDir, stage.id));
  const finishedAt = hasExit ? nowIso(statSync(exitPath(dirs.dataDir, stage.id)).mtime) : nowIso();
  appendRecord(dirs.dataDir, {
    schemaVersion: 1, type: "finished", execId: state.execId, stage: stage.id,
    startedAt: state.startedAt, finishedAt, runId,
    exitCode,
    outcome,
    durationSec: Math.max(0, (new Date(finishedAt).getTime() - new Date(state.startedAt).getTime()) / 1000),
    logFile: `${stage.id}.log`,
    command: stage.command
  });
}
