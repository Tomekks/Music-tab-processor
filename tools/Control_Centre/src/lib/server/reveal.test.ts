import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Manifest } from "./manifest.ts";
import { resolveRevealDir } from "./reveal.ts";

function makeManifest(): Manifest {
  return {
    version: 1,
    stages: [
      { id: "s01_ingest", label: "Ingestion", command: ["/bin/true"], argsFrom: "audioPath", requires: [], produces: ["metadata.json"], reveal: "." },
      { id: "s02_separate", label: "Separation", command: ["/bin/true"], argsFrom: "runDir", requires: ["metadata.json"], produces: ["stems/other.wav"], reveal: "stems" }
    ]
  };
}

function makeRun(runsDir: string, id: string, subdirs: string[] = []): void {
  mkdirSync(join(runsDir, id), { recursive: true });
  writeFileSync(join(runsDir, id, "metadata.json"), JSON.stringify({ runId: id, ingestedAt: "2026-06-01T12:00:00" }));
  for (const d of subdirs) mkdirSync(join(runsDir, id, d), { recursive: true });
}

test("stems folder resolved for s02_separate", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "reveal-"));
  makeRun(runsDir, "run1", ["stems"]);
  assert.equal(resolveRevealDir(makeManifest(), "s02_separate", "run1", runsDir), join(runsDir, "run1", "stems"));
});

test("'.' resolves to the run folder", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "reveal-"));
  makeRun(runsDir, "run1");
  assert.equal(resolveRevealDir(makeManifest(), "s01_ingest", "run1", runsDir), join(runsDir, "run1"));
});

test("a missing folder → null", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "reveal-"));
  makeRun(runsDir, "run1");
  assert.equal(resolveRevealDir(makeManifest(), "s02_separate", "run1", runsDir), null);
});

test("an unknown stage → null", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "reveal-"));
  makeRun(runsDir, "run1", ["stems"]);
  assert.equal(resolveRevealDir(makeManifest(), "s99_nope", "run1", runsDir), null);
});

test("a bad or unlisted run ID → null", () => {
  const runsDir = mkdtempSync(join(tmpdir(), "reveal-"));
  makeRun(runsDir, "run1", ["stems"]);
  assert.equal(resolveRevealDir(makeManifest(), "s02_separate", "../x", runsDir), null);
  assert.equal(resolveRevealDir(makeManifest(), "s02_separate", "not-listed", runsDir), null);
});
