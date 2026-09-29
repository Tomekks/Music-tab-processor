import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StageDef } from "./manifest.ts";
import { deleteStageOutputs, isInsideRun, isSafeEntry } from "./stop.ts";

function makeRunDir(): string {
  return mkdtempSync(join(tmpdir(), "stop-"));
}

function stageWith(overrides: Partial<StageDef>): StageDef {
  return {
    id: "s02_separate",
    label: "Separation",
    command: ["python", "separate.py"],
    argsFrom: "runDir",
    requires: [],
    produces: [],
    temp: [],
    reveal: ".",
    ...overrides
  };
}

test("isInsideRun/isSafeEntry accept plain paths and reject structural or protected names", () => {
  const plain = [
    "stems/other.wav",
    "stems/bass.wav",
    "_demucs_raw",
    "_basic_pitch_raw",
    "_transcribe_input.wav",
    "separation.json"
  ];
  for (const ok of plain) {
    assert.equal(isInsideRun(ok), true, `isInsideRun(${ok})`);
    assert.equal(isSafeEntry(ok), true, `isSafeEntry(${ok})`);
  }
  assert.equal(isInsideRun("metadata.json"), true);
  assert.equal(isSafeEntry("metadata.json"), false);

  const structural = ["", ".", "./x", "stems/.", "a//b", "x/../y", "//x", "/abs", "..", "stems/.."];
  for (const bad of structural) {
    assert.equal(isInsideRun(bad), false, `isInsideRun(${JSON.stringify(bad)})`);
    assert.equal(isSafeEntry(bad), false, `isSafeEntry(${JSON.stringify(bad)})`);
  }

  const protectedNames = ["metadata.json", "Metadata.JSON", "stems/metadata.json", "source.wav", "SOURCE.M4A"];
  for (const bad of protectedNames) {
    assert.equal(isInsideRun(bad), true, `isInsideRun(${JSON.stringify(bad)})`);
    assert.equal(isSafeEntry(bad), false, `isSafeEntry(${JSON.stringify(bad)})`);
  }
});

test("deleteStageOutputs deletes only produces files written by this execution", () => {
  const runDir = makeRunDir();
  const stage = stageWith({ produces: ["old.json", "new.json"] });
  writeFileSync(join(runDir, "old.json"), "old");
  writeFileSync(join(runDir, "new.json"), "new");
  const old = new Date(Date.now() - 60_000);
  utimesSync(join(runDir, "old.json"), old, old);
  const startedAtMs = Date.now() - 30_000;

  const { deleted } = deleteStageOutputs(stage, runDir, startedAtMs);

  assert.deepEqual(deleted, ["new.json"]);
  assert.equal(existsSync(join(runDir, "old.json")), true);
  assert.equal(existsSync(join(runDir, "new.json")), false);
});

test("deleteStageOutputs removes temp dirs/files and a symlink without following it", () => {
  const runDir = makeRunDir();
  const targetDir = mkdtempSync(join(tmpdir(), "stop-target-"));
  const target = join(targetDir, "keep.txt");
  writeFileSync(target, "keep");
  mkdirSync(join(runDir, "_demucs_raw", "htdemucs"), { recursive: true });
  writeFileSync(join(runDir, "_demucs_raw", "htdemucs", "x.wav"), "x");
  writeFileSync(join(runDir, "_transcribe_input.wav"), "x");
  symlinkSync(target, join(runDir, "link.wav"));
  const stage = stageWith({ temp: ["_demucs_raw", "_transcribe_input.wav", "link.wav"] });

  const { deleted } = deleteStageOutputs(stage, runDir, Date.now());

  assert.deepEqual(deleted, ["_demucs_raw", "_transcribe_input.wav", "link.wav"]);
  assert.equal(existsSync(join(runDir, "_demucs_raw")), false);
  assert.equal(existsSync(join(runDir, "_transcribe_input.wav")), false);
  assert.equal(existsSync(join(runDir, "link.wav")), false);
  assert.equal(existsSync(target), true);
});

test("deleteStageOutputs refuses protected names even when the stage lists them", () => {
  const runDir = makeRunDir();
  const stage = stageWith({
    produces: ["source.wav", "metadata.json", "Metadata.JSON"],
    temp: ["source.wav", "metadata.json", "Metadata.JSON"]
  });
  for (const f of ["source.wav", "metadata.json", "Metadata.JSON"]) writeFileSync(join(runDir, f), "x");

  const { deleted } = deleteStageOutputs(stage, runDir, Date.now() - 1000);

  assert.deepEqual(deleted, []);
  for (const f of ["source.wav", "metadata.json", "Metadata.JSON"]) {
    assert.equal(existsSync(join(runDir, f)), true);
  }
});

test("dryRun returns the same list as a real delete and touches nothing", () => {
  const runDir = makeRunDir();
  const stage = stageWith({ produces: ["separation.json"], temp: ["_demucs_raw"] });
  writeFileSync(join(runDir, "separation.json"), "x");
  mkdirSync(join(runDir, "_demucs_raw"));
  const startedAtMs = Date.now() - 1000;

  const preview = deleteStageOutputs(stage, runDir, startedAtMs, { dryRun: true });
  assert.deepEqual(preview.deleted, ["separation.json", "_demucs_raw"]);
  assert.equal(existsSync(join(runDir, "separation.json")), true);
  assert.equal(existsSync(join(runDir, "_demucs_raw")), true);

  const real = deleteStageOutputs(stage, runDir, startedAtMs);
  assert.deepEqual(real.deleted, preview.deleted);
  assert.equal(existsSync(join(runDir, "separation.json")), false);
  assert.equal(existsSync(join(runDir, "_demucs_raw")), false);
});
