import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest, StageDef } from "./manifest.ts";
import { appendRecord, nowIso, readRecords } from "./records.ts";
import { advanceChain, clearChain, ensureChainTicker, readChain, startChain } from "./chain.ts";
import { startRunStage } from "./runner.ts";

function makeScript(dir: string, name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

function makeDirs(): { dataDir: string; runsDir: string; pipelineRoot: string } {
  const root = mkdtempSync(join(tmpdir(), "chain-"));
  const dataDir = join(root, "data");
  const runsDir = join(root, "runs");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(runsDir, { recursive: true });
  return { dataDir, runsDir, pipelineRoot: root };
}

function makeChainManifest(scripts: { ingest: string; separate: string; transcribe: string; tab: string }): Manifest {
  const stage = (id: string, label: string, command: string, argsFrom: "audioPath" | "runDir", produces: string[]): StageDef => ({
    id, label, command: [command], argsFrom, requires: [], produces, temp: [], reveal: "."
  });
  return {
    version: 1,
    stages: [
      stage("s01_ingest", "Ingestion", scripts.ingest, "audioPath", ["audio.wav"]),
      stage("s02_separate", "Separation", scripts.separate, "runDir", ["stems"]),
      stage("s03_transcribe", "Transcription", scripts.transcribe, "runDir", ["notes"]),
      stage("s04_tab", "Tab", scripts.tab, "runDir", ["tab.json"])
    ]
  };
}

function makeScripts(dir: string, body = "exit 0"): { ingest: string; separate: string; transcribe: string; tab: string } {
  return {
    ingest: makeScript(dir, "ingest.sh", body),
    separate: makeScript(dir, "separate.sh", body),
    transcribe: makeScript(dir, "transcribe.sh", body),
    tab: makeScript(dir, "tab.sh", body)
  };
}

function makeRun(runsDir: string, id: string, files: string[]): void {
  mkdirSync(join(runsDir, id), { recursive: true });
  writeFileSync(join(runsDir, id, "metadata.json"), JSON.stringify({ runId: id, ingestedAt: nowIso().slice(0, 19) }));
  for (const f of files) writeFileSync(join(runsDir, id, f), "x");
}

function appendFinished(
  dataDir: string, execId: string, stage: string, startedAt: string, runId: string | null,
  outcome: "done" | "failed" | "interrupted" | "stopped"
): void {
  appendRecord(dataDir, {
    schemaVersion: 1, type: "finished", execId, stage, startedAt, finishedAt: startedAt,
    runId, exitCode: outcome === "done" ? 0 : 1, outcome, durationSec: 0,
    logFile: `${stage}.log`, command: ["stub"]
  });
}

function killStage(dataDir: string, stageId: string): void {
  try {
    const state = JSON.parse(readFileSync(join(dataDir, `${stageId}.json`), "utf8")) as { pid: number | null };
    if (state.pid !== null) process.kill(-state.pid, "SIGKILL");
  } catch {
    // Already gone; temp dir is discarded anyway.
  }
}

function writeChainFile(dataDir: string, state: { currentStage: string; execId: string; runId: string | null }): void {
  writeFileSync(join(dataDir, "chain.json"), JSON.stringify(state));
}

function appendStarted(dataDir: string, execId: string, stage: string, startedAt: string): void {
  appendRecord(dataDir, { schemaVersion: 1, type: "started", execId, stage, startedAt, runId: null });
}

test("readChain is null without a file, clearChain is idempotent", () => {
  const { dataDir } = makeDirs();
  assert.equal(readChain(dataDir), null);
  assert.doesNotThrow(() => clearChain(dataDir));
});

test("readChain on a corrupt file is null", () => {
  const { dataDir } = makeDirs();
  writeFileSync(join(dataDir, "chain.json"), "not json{{{");
  assert.equal(readChain(dataDir), null);
});

test("startChain writes the file and returns the execId", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  try {
    const result = startChain(manifest, "/tmp/song.wav", { dataDir, runsDir, pipelineRoot });
    assert.equal(result.busy, false);
    if (result.busy) return;
    const chain = readChain(dataDir);
    assert.deepEqual(chain, { currentStage: "s01_ingest", execId: result.execId, runId: null });
  } finally {
    killStage(dataDir, "s01_ingest");
  }
});

test("startChain while another stage is live returns busy and writes nothing", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir, "sleep 30"));
  const dirs = { dataDir, runsDir, pipelineRoot };
  try {
    const live = startRunStage(manifest, "s02_separate", "run-busy", dirs);
    assert.equal(live.busy, false);
    const result = startChain(manifest, "/tmp/song.wav", dirs);
    assert.deepEqual(result, { busy: true });
    assert.equal(existsSync(join(dataDir, "chain.json")), false);
  } finally {
    killStage(dataDir, "s02_separate");
  }
});

test("advanceChain does nothing without a finished record", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  appendStarted(dataDir, "exec-wait", "s01_ingest", startedAt);
  writeChainFile(dataDir, { currentStage: "s01_ingest", execId: "exec-wait", runId: null });
  advanceChain(manifest, dirs);
  assert.deepEqual(readChain(dataDir), { currentStage: "s01_ingest", execId: "exec-wait", runId: null });
  assert.equal(readRecords(dataDir).filter((r) => r.type === "started" && r.stage === "s02_separate").length, 0);
});

test("advanceChain ignores a finished record for another execId", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  makeRun(runsDir, "run-adv", ["audio.wav"]);
  appendStarted(dataDir, "exec-wait", "s01_ingest", startedAt);
  appendFinished(dataDir, "exec-other", "s01_ingest", startedAt, "run-adv", "done");
  writeChainFile(dataDir, { currentStage: "s01_ingest", execId: "exec-wait", runId: null });
  advanceChain(manifest, dirs);
  assert.deepEqual(readChain(dataDir), { currentStage: "s01_ingest", execId: "exec-wait", runId: null });
  assert.equal(readRecords(dataDir).filter((r) => r.type === "started" && r.stage === "s02_separate").length, 0);
});

test("advanceChain on done starts the next stage and moves the chain", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  makeRun(runsDir, "run-adv", ["audio.wav"]);
  appendStarted(dataDir, "exec-adv", "s01_ingest", startedAt);
  appendFinished(dataDir, "exec-adv", "s01_ingest", startedAt, "run-adv", "done");
  writeChainFile(dataDir, { currentStage: "s01_ingest", execId: "exec-adv", runId: null });
  try {
    advanceChain(manifest, dirs);
    const chain = readChain(dataDir);
    assert.equal(chain?.currentStage, "s02_separate");
    assert.equal(chain?.runId, "run-adv");
    const started = readRecords(dataDir).filter((r) => r.type === "started" && r.stage === "s02_separate");
    assert.equal(started.length, 1);
    assert.equal(started[0].execId, chain?.execId);
  } finally {
    killStage(dataDir, "s02_separate");
  }
});

for (const outcome of ["failed", "interrupted", "stopped"] as const) {
  test(`advanceChain on ${outcome} clears the chain and starts nothing`, () => {
    const { dataDir, runsDir, pipelineRoot } = makeDirs();
    const manifest = makeChainManifest(makeScripts(dataDir));
    const dirs = { dataDir, runsDir, pipelineRoot };
    const startedAt = nowIso();
    makeRun(runsDir, "run-adv", ["audio.wav"]);
    appendStarted(dataDir, "exec-bad", "s01_ingest", startedAt);
    appendFinished(dataDir, "exec-bad", "s01_ingest", startedAt, "run-adv", outcome);
    writeChainFile(dataDir, { currentStage: "s01_ingest", execId: "exec-bad", runId: null });
    advanceChain(manifest, dirs);
    assert.equal(readChain(dataDir), null);
    assert.equal(readRecords(dataDir).filter((r) => r.type === "started" && r.stage === "s02_separate").length, 0);
  });
}

test("advanceChain on done on the last stage clears", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  appendStarted(dataDir, "exec-last", "s04_tab", startedAt);
  appendFinished(dataDir, "exec-last", "s04_tab", startedAt, "run-adv", "done");
  writeChainFile(dataDir, { currentStage: "s04_tab", execId: "exec-last", runId: "run-adv" });
  advanceChain(manifest, dirs);
  assert.equal(readChain(dataDir), null);
});

test("advanceChain with a missing run folder clears", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  appendStarted(dataDir, "exec-ghost", "s02_separate", startedAt);
  appendFinished(dataDir, "exec-ghost", "s02_separate", startedAt, "ghost", "done");
  writeChainFile(dataDir, { currentStage: "s02_separate", execId: "exec-ghost", runId: "ghost" });
  advanceChain(manifest, dirs);
  assert.equal(readChain(dataDir), null);
  assert.equal(readRecords(dataDir).filter((r) => r.type === "started" && r.stage === "s03_transcribe").length, 0);
});

test("advanceChain yields to a hand-started step and never runs it twice", () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const scripts = makeScripts(dataDir);
  makeScript(dataDir, "separate.sh", "sleep 30");
  const manifest = makeChainManifest(scripts);
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  makeRun(runsDir, "run-take", ["audio.wav"]);
  try {
    const hand = startRunStage(manifest, "s02_separate", "run-take", dirs);
    assert.equal(hand.busy, false);
    appendStarted(dataDir, "exec-take", "s01_ingest", startedAt);
    appendFinished(dataDir, "exec-take", "s01_ingest", startedAt, "run-take", "done");
    writeChainFile(dataDir, { currentStage: "s01_ingest", execId: "exec-take", runId: null });
    advanceChain(manifest, dirs);
    assert.equal(readChain(dataDir), null);
    assert.equal(readRecords(dataDir).filter((r) => r.type === "started" && r.stage === "s02_separate").length, 1);
  } finally {
    killStage(dataDir, "s02_separate");
  }
});

// Ticker waits must yield to the event loop (plain `await new Promise`),
// so the 1 s interval can actually fire while the test waits. A blocking
// wait would make every assertion below pass vacuously.
const tickWait = () => new Promise((resolve) => setTimeout(resolve, 1400));

test("ensureChainTicker advances the chain without any page load", async () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  appendStarted(dataDir, "exec-tick", "s04_tab", startedAt);
  appendFinished(dataDir, "exec-tick", "s04_tab", startedAt, "run-tick", "done");
  writeChainFile(dataDir, { currentStage: "s04_tab", execId: "exec-tick", runId: "run-tick" });
  const ticker = ensureChainTicker(manifest, dirs);
  try {
    await tickWait();
    assert.equal(readChain(dataDir), null);
  } finally {
    ticker.stop();
  }
});

test("ensureChainTicker twice leaves one timer running", async () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  appendStarted(dataDir, "exec-tick", "s04_tab", startedAt);
  appendFinished(dataDir, "exec-tick", "s04_tab", startedAt, "run-tick", "done");
  writeChainFile(dataDir, { currentStage: "s04_tab", execId: "exec-tick", runId: "run-tick" });
  const first = ensureChainTicker(manifest, dirs);
  const second = ensureChainTicker(manifest, dirs);
  try {
    first.stop();
    await tickWait();
    // A tick would have cleared the last-stage-done chain; the file is still
    // here, so the single shared timer was stopped and no second one exists.
    assert.deepEqual(readChain(dataDir), { currentStage: "s04_tab", execId: "exec-tick", runId: "run-tick" });
  } finally {
    first.stop();
    second.stop();
  }
});

test("ensureChainTicker stops itself once the chain is gone", async () => {
  const { dataDir, runsDir, pipelineRoot } = makeDirs();
  const manifest = makeChainManifest(makeScripts(dataDir));
  const dirs = { dataDir, runsDir, pipelineRoot };
  const startedAt = nowIso();
  appendStarted(dataDir, "exec-tick", "s04_tab", startedAt);
  appendFinished(dataDir, "exec-tick", "s04_tab", startedAt, "run-tick", "done");
  writeChainFile(dataDir, { currentStage: "s04_tab", execId: "exec-tick", runId: "run-tick" });
  const ticker = ensureChainTicker(manifest, dirs);
  try {
    clearChain(dataDir);
    await tickWait();
    // The tick that found no chain stopped the timer: a fresh chain that a
    // live ticker would clear is still here.
    writeChainFile(dataDir, { currentStage: "s04_tab", execId: "exec-tick", runId: "run-tick" });
    await tickWait();
    assert.deepEqual(readChain(dataDir), { currentStage: "s04_tab", execId: "exec-tick", runId: "run-tick" });
  } finally {
    ticker.stop();
  }
});
