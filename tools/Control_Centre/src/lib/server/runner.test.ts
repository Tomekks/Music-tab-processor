import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest } from "./manifest.ts";
import { nowIso, readRecords } from "./records.ts";
import { reconcile, stageStatus, startStage } from "./runner.ts";

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

function makeDirs(): { dataDir: string; runsDir: string } {
  const root = mkdtempSync(join(tmpdir(), "runner-"));
  const dataDir = join(root, "data");
  const runsDir = join(root, "runs");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(runsDir, { recursive: true });
  return { dataDir, runsDir };
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
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "sleep_stage.sh", "sleep 30"));
  try {
    const result = startStage(manifest, "s01_ingest", "/tmp/song.wav", { dataDir, runsDir });
    assert.equal(result.busy, false);
    const records = readRecords(dataDir);
    assert.equal(records.length, 1);
    assert.equal(records[0].type, "started");
    assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir }).status, "running");
  } finally {
    killGroup(dataDir);
  }
});

test("exit 0 + produces present → done, one finished after two reconciles", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "ok_stage.sh", "exit 0"));
  const startedAt = nowIso();
  craftFinishedState(dataDir, runsDir, startedAt, "exec-done", true);
  writeFileSync(join(dataDir, "s01_ingest.exit"), "0\n");
  assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir }).status, "done");
  reconcile(manifest, { dataDir, runsDir });
  reconcile(manifest, { dataDir, runsDir });
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].outcome, "done");
  assert.equal(finished[0].runId, "run1");
});

test("exit 3 → failed with exitCode 3", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "fail_stage.sh", "exit 3"));
  craftFinishedState(dataDir, runsDir, nowIso(), "exec-fail", false);
  writeFileSync(join(dataDir, "s01_ingest.exit"), "3\n");
  assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir }).status, "failed");
  reconcile(manifest, { dataDir, runsDir });
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].outcome, "failed");
  assert.equal(finished[0].exitCode, 3);
});

test("pid gone with no .exit → interrupted", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "gone_stage.sh", "exit 0"));
  craftFinishedState(dataDir, runsDir, nowIso(), "exec-gone", false);
  const status = stageStatus(manifest, "s01_ingest", { dataDir, runsDir });
  assert.equal(status.status, "failed");
  assert.equal(status.outcome, "interrupted");
  reconcile(manifest, { dataDir, runsDir });
  const finished = readRecords(dataDir).filter((r) => r.type === "finished");
  assert.equal(finished[0].outcome, "interrupted");
  assert.equal(finished[0].exitCode, null);
});

test("live pid whose command does not match the script → not running", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "fake_xyz_stage.sh", "exit 0"));
  const holder = spawn("sleep", ["20"], { stdio: "ignore" });
  try {
    writeFileSync(
      join(dataDir, "s01_ingest.json"),
      JSON.stringify({ execId: "exec-recycled", startedAt: nowIso(), pid: holder.pid })
    );
    const status = stageStatus(manifest, "s01_ingest", { dataDir, runsDir });
    assert.notEqual(status.status, "running");
  } finally {
    try {
      holder.kill("SIGKILL");
    } catch {
      // Already gone; temp dir is discarded anyway.
    }
  }
});

test("second startStage while live → busy", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "busy_stage.sh", "sleep 30"));
  try {
    assert.equal(startStage(manifest, "s01_ingest", "/tmp/a.wav", { dataDir, runsDir }).busy, false);
    assert.deepEqual(startStage(manifest, "s01_ingest", "/tmp/b.wav", { dataDir, runsDir }), { busy: true });
    assert.equal(readRecords(dataDir).filter((r) => r.type === "started").length, 1);
  } finally {
    killGroup(dataDir);
  }
});

test("audio path with spaces and leading dash arrives as one argument after --", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "echo_stage.sh", "printf '<%s>\\n' \"$@\""));
  const audioPath = join(dataDir, "dir with spaces", "-foo.wav");
  mkdirSync(join(dataDir, "dir with spaces"), { recursive: true });
  writeFileSync(audioPath, "x");
  startStage(manifest, "s01_ingest", audioPath, { dataDir, runsDir });
  waitFor(join(dataDir, "s01_ingest.exit"));
  const log = readFileSync(join(dataDir, "s01_ingest.log"), "utf8");
  assert.ok(log.includes("<-->\n"), `log should contain the -- separator, got: ${log}`);
  assert.ok(log.includes(`<${audioPath}>\n`), `log should contain the full path, got: ${log}`);
});

test("stale .exit from an earlier execution is not read as the new result", () => {
  const { dataDir, runsDir } = makeDirs();
  const manifest = makeManifest(makeScript(dataDir, "fresh_stage.sh", "sleep 30"));
  writeFileSync(join(dataDir, "s01_ingest.exit"), "0\n");
  try {
    startStage(manifest, "s01_ingest", "/tmp/song.wav", { dataDir, runsDir });
    assert.equal(existsSync(join(dataDir, "s01_ingest.exit")), false);
    assert.equal(stageStatus(manifest, "s01_ingest", { dataDir, runsDir }).status, "running");
  } finally {
    killGroup(dataDir);
  }
});
