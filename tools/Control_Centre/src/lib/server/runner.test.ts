import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Manifest } from "./manifest.ts";
import { appendRecord, nowIso, readRecords } from "./records.ts";
import { canStart, reconcile, runStepStatus, stageStatus, startAudioStage, startRunStage } from "./runner.ts";

function makeScript(dir: string, name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

function makeManifest(script: string): Manifest {
  return {
    version: 1,
    stages: [{ id: "s01_ingest", label: "Ingestion", command: [script], argsFrom: "audioPath", requires: [], produces: ["metadata.json"] }]
  };
}

function makeDirs(): { dataDir: string; runsDir: string; pipelineRoot: string } {
  const root = mkdtempSync(join(tmpdir(), "runner-"));
  const dataDir = join(root, "data");
  const runsDir = join(root, "runs");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(runsDir, { recursive: true });
  return { dataDir, runsDir, pipelineRoot: root };
}

function waitFor(path: string, timeoutMs = 5000): void {
  const end = Date.now() + timeoutMs;
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  while (!existsSync(path)) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${path}`);
    Atomics.wait(view, 0, 0, 50);
  }
}

function statePid(dataDir: string): number | null {
  const state = JSON.parse(readFileSync(join(dataDir, "s01_ingest.json"), "utf8")) as { pid: number | null };
  return state.pid;
}

function killGroup(dataDir: string): void {
  const pid = statePid(dataDir);
  if (pid !== null) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // Already gone; temp dir is discarded anyway.
    }
  }
}

function craftFinishedState(dataDir: string, runsDir: string, startedAt: string, execId: string, withRun: boolean): void {
  writeFileSync(join(dataDir, "s01_ingest.json"), JSON.stringify({ execId, startedAt, pid: 999999999 }));
  if (withRun) {
    mkdirSync(join(runsDir, "run1"), { recursive: true });
    writeFileSync(join(runsDir, "run1", "metadata.json"), JSON.stringify({ runId: "run1", ingestedAt: startedAt.slice(0, 19) }));
  }
}

test("start writes started before the process finishes", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "sleep_stage.sh", "sleep 30"));
  try {
    const result = startAudioStage(manifest, "s01_ingest", "/tmp/song.wav", { dataDir, runsDir, pipelineRoot });
    assert.equal(result.busy, false);
    const records = readRecords(dataDir);
    assert.equal(records.length, 1);
    assert.equal(records[0].type, "started");
    assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir, pipelineRoot }).status, "running");
  } finally {
    killGroup(dataDir);
  }
});

test("exit 0 + produces present → done, one finished after two reconciles", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "ok_stage.sh", "exit 0"));
  const startedAt = nowIso();
  craftFinishedState(dataDir, runsDir, startedAt, "exec-done", true);
  writeFileSync(join(dataDir, "s01_ingest.exit"), "0\n");
  assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir, pipelineRoot }).status, "done");
  reconcile(manifest, { dataDir, runsDir, pipelineRoot });
  reconcile(manifest, { dataDir, runsDir, pipelineRoot });
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].outcome, "done");
  assert.equal(finished[0].runId, "run1");
});

test("exit 3 → failed with exitCode 3", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "fail_stage.sh", "exit 3"));
  craftFinishedState(dataDir, runsDir, nowIso(), "exec-fail", false);
  writeFileSync(join(dataDir, "s01_ingest.exit"), "3\n");
  assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir, pipelineRoot }).status, "failed");
  reconcile(manifest, { dataDir, runsDir, pipelineRoot });
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].outcome, "failed");
  assert.equal(finished[0].exitCode, 3);
});

test("pid gone with no .exit → interrupted", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "gone_stage.sh", "exit 0"));
  craftFinishedState(dataDir, runsDir, nowIso(), "exec-gone", false);
  const status = stageStatus(manifest, "s01_ingest", { dataDir, runsDir, pipelineRoot });
  assert.equal(status.status, "failed");
  assert.equal(status.outcome, "interrupted");
  reconcile(manifest, { dataDir, runsDir, pipelineRoot });
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished[0].outcome, "interrupted");
  assert.equal(finished[0].exitCode, null);
});

test("live pid whose command does not match the script → not running", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "fake_xyz_stage.sh", "exit 0"));
  const holder = spawn("sleep", ["20"], { stdio: "ignore" });
  try {
    writeFileSync(
      join(dataDir, "s01_ingest.json"),
      JSON.stringify({ execId: "exec-recycled", startedAt: nowIso(), pid: holder.pid })
    );
    const status = stageStatus(manifest, "s01_ingest", { dataDir, runsDir, pipelineRoot });
    assert.notEqual(status.status, "running");
  } finally {
    try {
      holder.kill("SIGKILL");
    } catch {
      // Already gone; temp dir is discarded anyway.
    }
  }
});

test("second startAudioStage while live → busy", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "busy_stage.sh", "sleep 30"));
  try {
    assert.equal(startAudioStage(manifest, "s01_ingest", "/tmp/a.wav", { dataDir, runsDir, pipelineRoot }).busy, false);
    assert.deepEqual(startAudioStage(manifest, "s01_ingest", "/tmp/b.wav", { dataDir, runsDir, pipelineRoot }), { busy: true });
    assert.equal(readRecords(dataDir).filter((r) => r.type === "started").length, 1);
  } finally {
    killGroup(dataDir);
  }
});

test("audio path with spaces and leading dash arrives as one argument after --", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "echo_stage.sh", "printf '<%s>\\n' \"$@\""));
  const audioPath = join(dataDir, "dir with spaces", "-foo.wav");
  mkdirSync(join(dataDir, "dir with spaces"), { recursive: true });
  writeFileSync(audioPath, "x");
  startAudioStage(manifest, "s01_ingest", audioPath, { dataDir, runsDir, pipelineRoot });
  waitFor(join(dataDir, "s01_ingest.exit"));
  const log = readFileSync(join(dataDir, "s01_ingest.log"), "utf8");
  assert.ok(log.includes("<-->\n"), `log should contain the -- separator, got: ${log}`);
  assert.ok(log.includes(`<${audioPath}>\n`), `log should contain the full path, got: ${log}`);
});

test("stale .exit from an earlier execution is not read as the new result", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "fresh_stage.sh", "sleep 30"));
  writeFileSync(join(dataDir, "s01_ingest.exit"), "0\n");
  try {
    startAudioStage(manifest, "s01_ingest", "/tmp/song.wav", { dataDir, runsDir, pipelineRoot });
    assert.equal(existsSync(join(dataDir, "s01_ingest.exit")), false);
    assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir, pipelineRoot }).status, "running");
  } finally {
    killGroup(dataDir);
  }
});

test("relative stage command resolves against pipelineRoot, not the server cwd", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  mkdirSync(join(pipelineRoot, "rel"), { recursive: true });
  makeScript(pipelineRoot, join("rel", "rel_stage.sh"), "printf 'rel-ok\\n'\nexit 0");
  const manifest = makeManifest(join("rel", "rel_stage.sh"));
  const result = startAudioStage(manifest, "s01_ingest", "/tmp/song.wav", { dataDir, runsDir, pipelineRoot });
  assert.equal(result.busy, false);
  waitFor(join(dataDir, "s01_ingest.exit"));
  assert.equal(readFileSync(join(dataDir, "s01_ingest.exit"), "utf8").trim(), "0");
  assert.ok(readFileSync(join(dataDir, "s01_ingest.log"), "utf8").includes("rel-ok"));
});

function makeRunManifest(s02Script: string): Manifest {
  return {
    version: 1,
    stages: [
      { id: "s01_ingest", label: "Ingestion", command: ["/bin/true"], argsFrom: "audioPath", requires: [], produces: ["metadata.json"] },
      { id: "s02_separate", label: "Separation", command: [s02Script], argsFrom: "runDir", requires: ["metadata.json"], produces: ["stems/other.wav", "stems/bass.wav"] },
      { id: "s03_transcribe", label: "Transcription", command: ["/bin/true"], argsFrom: "runDir", requires: ["stems/other.wav", "stems/bass.wav"], produces: ["notes.json"] }
    ]
  };
}

function makeRunWithFiles(runsDir: string, id: string, ingestedAt: string, files: string[]): void {
  mkdirSync(join(runsDir, id), { recursive: true });
  writeFileSync(join(runsDir, id, "metadata.json"), JSON.stringify({ runId: id, ingestedAt }));
  for (const f of files) {
    const p = join(runsDir, id, f);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "x");
  }
}

function appendStarted(dataDir: string, execId: string, stage: string, startedAt: string, runId: string | null): void {
  appendRecord(dataDir, { schemaVersion: 1, type: "started", execId, stage, startedAt, runId });
}

function appendFinished(
  dataDir: string, execId: string, stage: string, startedAt: string, runId: string | null,
  outcome: "done" | "failed" | "interrupted"
): void {
  appendRecord(dataDir, {
    schemaVersion: 1, type: "finished", execId, stage, startedAt, finishedAt: startedAt,
    runId, exitCode: outcome === "done" ? 0 : 1, outcome, durationSec: 0,
    logFile: `${stage}.log`, command: ["fake"]
  });
}

function craftRunState(dataDir: string, stageId: string, startedAt: string, execId: string): void {
  writeFileSync(join(dataDir, `${stageId}.json`), JSON.stringify({ execId, startedAt, pid: 999999999 }));
}

function statePidFor(dataDir: string, stageId: string): number | null {
  const state = JSON.parse(readFileSync(join(dataDir, `${stageId}.json`), "utf8")) as { pid: number | null };
  return state.pid;
}

function killGroupFor(dataDir: string, stageId: string): void {
  const pid = statePidFor(dataDir, stageId);
  if (pid !== null) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // Already gone; temp dir is discarded anyway.
    }
  }
}

test("runStepStatus: done record + files → done", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "run1", startedAt.slice(0, 19), ["stems/other.wav", "stems/bass.wav"]);
  appendFinished(dataDir, "exec-1", "s02_separate", startedAt, "run1", "done");
  const status = runStepStatus(manifest, "s02_separate", "run1", dirs, readRecords(dataDir));
  assert.equal(status.status, "done");
  assert.equal(status.outcome, "done");
});

test("runStepStatus: a failed record beats present files", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "run1", startedAt.slice(0, 19), ["stems/other.wav", "stems/bass.wav"]);
  appendFinished(dataDir, "exec-1", "s02_separate", startedAt, "run1", "failed");
  const status = runStepStatus(manifest, "s02_separate", "run1", dirs, readRecords(dataDir));
  assert.equal(status.status, "failed");
  assert.equal(status.outcome, "failed");
});

test("runStepStatus: interrupted record → failed with outcome interrupted", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "run1", startedAt.slice(0, 19), ["stems/other.wav", "stems/bass.wav"]);
  appendFinished(dataDir, "exec-1", "s02_separate", startedAt, "run1", "interrupted");
  const status = runStepStatus(manifest, "s02_separate", "run1", dirs, readRecords(dataDir));
  assert.equal(status.status, "failed");
  assert.equal(status.outcome, "interrupted");
});

test("runStepStatus: no record + all files → done", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "run1", startedAt.slice(0, 19), ["stems/other.wav", "stems/bass.wav"]);
  const status = runStepStatus(manifest, "s02_separate", "run1", dirs, readRecords(dataDir));
  assert.equal(status.status, "done");
  assert.equal(status.outcome, "done");
});

test("runStepStatus: no record + missing files → notStarted", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  const status = runStepStatus(manifest, "s02_separate", "run-missing", dirs, readRecords(dataDir));
  assert.equal(status.status, "notStarted");
  assert.equal(status.outcome, null);
});

test("runStepStatus: a slot live on another run does not mark this run running", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "sleep_s02.sh", "sleep 30"));
  makeRunWithFiles(runsDir, "runA", "2026-01-01T00:00:00", []);
  makeRunWithFiles(runsDir, "runB", "2026-01-01T00:00:00", []);
  const started = startRunStage(manifest, "s02_separate", "runA", dirs);
  assert.equal(started.busy, false);
  try {
    const records = readRecords(dataDir);
    assert.equal(runStepStatus(manifest, "s02_separate", "runA", dirs, records).status, "running");
    assert.notEqual(runStepStatus(manifest, "s02_separate", "runB", dirs, records).status, "running");
  } finally {
    killGroupFor(dataDir, "s02_separate");
  }
});

test("canStart: blocked when a stage is live", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "sleep_s02.sh", "sleep 30"));
  makeRunWithFiles(runsDir, "runA", "2026-01-01T00:00:00", []);
  const started = startRunStage(manifest, "s02_separate", "runA", dirs);
  assert.equal(started.busy, false);
  try {
    assert.deepEqual(canStart(manifest, "s03_transcribe", "runA", dirs, readRecords(dataDir)), {
      ok: false, reason: "Waiting: Separation is running"
    });
  } finally {
    killGroupFor(dataDir, "s02_separate");
  }
});

test("canStart: blocked when the previous step is not done", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  assert.deepEqual(canStart(manifest, "s02_separate", "run1", dirs, readRecords(dataDir)), {
    ok: false, reason: "Run Ingestion first"
  });
});

test("canStart: allowed when the previous step is done", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "run1", startedAt.slice(0, 19), ["stems/other.wav", "stems/bass.wav"]);
  appendFinished(dataDir, "exec-1", "s02_separate", startedAt, "run1", "done");
  assert.deepEqual(canStart(manifest, "s03_transcribe", "run1", dirs, readRecords(dataDir)), { ok: true });
});

test("startRunStage passes <runsDir>/<runId> after -- and records runId", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "echo_s02.sh", "printf '<%s>\\n' \"$@\""));
  const started = startRunStage(manifest, "s02_separate", "run-9", dirs);
  assert.equal(started.busy, false);
  waitFor(join(dataDir, "s02_separate.exit"));
  const log = readFileSync(join(dataDir, "s02_separate.log"), "utf8");
  assert.ok(log.includes("<-->\n"), `log should contain the -- separator, got: ${log}`);
  assert.ok(log.includes(`<${join(runsDir, "run-9")}>\n`), `log should contain the run path, got: ${log}`);
  const startedRec = readRecords(dataDir).find((r) => r.type === "started");
  assert.equal(startedRec?.runId, "run-9");
});

test("reconcile writes finished with the started record's runId, not findRunDir", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02x.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "decoy", startedAt.slice(0, 19), []);
  makeRunWithFiles(runsDir, "runX", "2020-01-01T00:00:00", []);
  craftRunState(dataDir, "s02_separate", startedAt, "exec-r");
  appendStarted(dataDir, "exec-r", "s02_separate", startedAt, "runX");
  reconcile(manifest, dirs);
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].runId, "runX");
  assert.equal(finished[0].outcome, "interrupted");
});

test("exit 0 with a missing produces file reconciles as failed", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeRunManifest(makeScript(dataDir, "s02y.sh", "exit 0"));
  const startedAt = nowIso();
  makeRunWithFiles(runsDir, "runY", "2020-01-01T00:00:00", ["stems/other.wav"]);
  craftRunState(dataDir, "s02_separate", startedAt, "exec-m");
  appendStarted(dataDir, "exec-m", "s02_separate", startedAt, "runY");
  writeFileSync(join(dataDir, "s02_separate.exit"), "0\n");
  reconcile(manifest, dirs);
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].outcome, "failed");
  assert.equal(finished[0].exitCode, 0);
});

test("regression: a failed ingest with runId null still shows Failed step 1", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const dirs = { dataDir, runsDir, pipelineRoot };
  const manifest = makeManifest(makeScript(dataDir, "fail_ing.sh", "exit 1"));
  const startedAt = nowIso();
  craftFinishedState(dataDir, runsDir, startedAt, "exec-fi", false);
  writeFileSync(join(dataDir, "s01_ingest.exit"), "1\n");
  appendFinished(dataDir, "exec-fi", "s01_ingest", startedAt, null, "failed");
  const status = stageStatus(manifest, "s01_ingest", dirs);
  assert.equal(status.status, "failed");
  assert.equal(status.outcome, "failed");
});
