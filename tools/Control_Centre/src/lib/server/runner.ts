import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Manifest, StageDef } from "./manifest.ts";
import { appendRecord, hasFinishedRecord, nowIso, readRecords } from "./records.ts";
import { findRunDir } from "./runs.ts";

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
  if (!state) return { status: "notStarted", execId: null, startedAt: null, outcome: null };
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
export function startStage(
  manifest: Manifest,
  stageId: string,
  audioPath: string,
  dirs: Dirs
): { busy: true } | { busy: false; execId: string } {
  const stage = manifest.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`unknown stage: ${stageId}`);
  if (anyStageLive(manifest, dirs)) return { busy: true };
  mkdirSync(dirs.dataDir, { recursive: true });
  const execId = randomUUID();
  const startedAt = nowIso();
  rmSync(exitPath(dirs.dataDir, stageId), { force: true });
  writeFileSync(statePath(dirs.dataDir, stageId), JSON.stringify({ execId, startedAt, pid: null }), "utf8");
  appendRecord(dirs.dataDir, { schemaVersion: 1, type: "started", execId, stage: stageId, startedAt });
  const logFd = openSync(logPath(dirs.dataDir, stageId), "w");
  let childPid: number | undefined;
  try {
    const child = spawn(
      "/bin/sh",
      ["-c", '"$@"; echo $? > "$EXIT_FILE"', "sh", ...stage.command, "--", audioPath],
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

// Synchronous; safe to call any number of times (init, load). Appends a
// "finished" record only when the execId has none yet.
export function reconcile(manifest: Manifest, dirs: Dirs): void {
  for (const stage of manifest.stages) {
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
