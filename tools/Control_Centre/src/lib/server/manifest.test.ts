import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest } from "./manifest.ts";

function writeManifest(dir: string, value: unknown): string {
  const path = join(dir, "manifest.json");
  writeFileSync(path, JSON.stringify(value));
  return path;
}

const base = {
  version: 1,
  stages: [
    {
      id: "s01_ingest",
      label: "Ingestion",
      command: ["{python}", "pipeline/s01_ingest/ingest.py"],
      argsFrom: "audioPath",
      requires: [],
      produces: ["metadata.json"],
      temp: [],
      reveal: "."
    }
  ]
};

test("valid manifest expands {python}", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const manifest = loadManifest(writeManifest(dir, base), { python: "/tmp/fake/python" });
  assert.equal(manifest.stages[0].command[0], "/tmp/fake/python");
  assert.equal(manifest.stages[0].command[1], "pipeline/s01_ingest/ingest.py");
});

test("non-array command is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const bad = { ...base, stages: [{ ...base.stages[0], command: "python ingest.py" }] };
  assert.throws(() => loadManifest(writeManifest(dir, bad), { python: "python" }), /command must be an array/);
});

test("non-string token is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const bad = { ...base, stages: [{ ...base.stages[0], command: ["{python}", 42] }] };
  assert.throws(() => loadManifest(writeManifest(dir, bad), { python: "python" }), /tokens must be strings/);
});

test("unknown argsFrom is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const bad = { ...base, stages: [{ ...base.stages[0], argsFrom: "songTitle" }] };
  assert.throws(() => loadManifest(writeManifest(dir, bad), { python: "python" }), /unknown argsFrom/);
});

test("duplicate id is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const bad = { ...base, stages: [base.stages[0], base.stages[0]] };
  assert.throws(() => loadManifest(writeManifest(dir, bad), { python: "python" }), /duplicate stage id/);
});

test("missing file is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  assert.throws(() => loadManifest(join(dir, "no-such.json"), { python: "python" }), /not found or invalid JSON/);
});

test("real pipeline/manifest.json loads with four stages in order", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "..", "..", "..", "..", "..", "pipeline", "manifest.json");
  const manifest = loadManifest(path, { python: "/tmp/fake/python" });
  assert.deepEqual(
    manifest.stages.map((s) => s.id),
    ["s01_ingest", "s02_separate", "s03_transcribe", "s04_tab"]
  );
  for (const stage of manifest.stages) assert.ok(stage.produces.length > 0);
});

test("reveal '.' and 'stems' are accepted", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const ok = {
    ...base,
    stages: [
      { ...base.stages[0], reveal: "." },
      { ...base.stages[0], id: "s02_separate", reveal: "stems" }
    ]
  };
  const manifest = loadManifest(writeManifest(dir, ok), { python: "python" });
  assert.equal(manifest.stages[0].reveal, ".");
  assert.equal(manifest.stages[1].reveal, "stems");
});

test("reveal that is absolute or contains .. is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const absolute = { ...base, stages: [{ ...base.stages[0], reveal: "/tmp/x" }] };
  assert.throws(() => loadManifest(writeManifest(dir, absolute), { python: "python" }), /reveal must be relative/);
  const dotdot = { ...base, stages: [{ ...base.stages[0], reveal: "a/../b" }] };
  assert.throws(() => loadManifest(writeManifest(dir, dotdot), { python: "python" }), /must not contain \.\./);
});

test("real pipeline/manifest.json has a valid reveal for all four stages", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "..", "..", "..", "..", "..", "pipeline", "manifest.json");
  const manifest = loadManifest(path, { python: "/tmp/fake/python" });
  assert.equal(manifest.stages.length, 4);
  for (const stage of manifest.stages) {
    assert.equal(typeof stage.reveal, "string");
    assert.ok(!stage.reveal.startsWith("/"));
    assert.ok(!stage.reveal.split("/").includes(".."));
  }
});

test("temp is accepted when empty and non-empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const ok = {
    ...base,
    stages: [
      { ...base.stages[0], temp: [] },
      { ...base.stages[0], id: "s02_separate", produces: ["stems/other.wav"], temp: ["_demucs_raw"] }
    ]
  };
  const manifest = loadManifest(writeManifest(dir, ok), { python: "python" });
  assert.deepEqual(manifest.stages[0].temp, []);
  assert.deepEqual(manifest.stages[1].temp, ["_demucs_raw"]);
});

test("unsafe temp or produces entries are rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "manifest-"));
  const structural = ["/abs", "//x", ".", "./x", "stems/.", "a//b", "x/../y", ".."];
  const protectedNames = ["metadata.json", "Metadata.JSON", "source.wav", "SOURCE.M4A"];

  for (const bad of [...structural, ...protectedNames]) {
    const asTemp = { ...base, stages: [{ ...base.stages[0], temp: [bad] }] };
    assert.throws(() => loadManifest(writeManifest(dir, asTemp), { python: "python" }), /unsafe temp entry/);
  }
  for (const bad of structural) {
    const asProduces = { ...base, stages: [{ ...base.stages[0], produces: [bad] }] };
    assert.throws(() => loadManifest(writeManifest(dir, asProduces), { python: "python" }), /unsafe produces entry/);
  }
  for (const ok of protectedNames) {
    const asProduces = { ...base, stages: [{ ...base.stages[0], produces: [ok] }] };
    const manifest = loadManifest(writeManifest(dir, asProduces), { python: "python" });
    assert.deepEqual(manifest.stages[0].produces, [ok]);
  }

  const nonArray = { ...base, stages: [{ ...base.stages[0], temp: "x" }] };
  assert.throws(() => loadManifest(writeManifest(dir, nonArray), { python: "python" }), /temp must be an array/);
  const nonString = { ...base, stages: [{ ...base.stages[0], temp: [42] }] };
  assert.throws(() => loadManifest(writeManifest(dir, nonString), { python: "python" }), /temp entries must be strings/);
});

test("real pipeline/manifest.json has a valid temp for all four stages", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "..", "..", "..", "..", "..", "pipeline", "manifest.json");
  const manifest = loadManifest(path, { python: "/tmp/fake/python" });
  const expected: Record<string, string[]> = {
    s01_ingest: [],
    s02_separate: ["_demucs_raw"],
    s03_transcribe: ["_basic_pitch_raw", "_transcribe_input.wav"],
    s04_tab: []
  };
  for (const stage of manifest.stages) {
    assert.deepEqual(stage.temp, expected[stage.id]);
  }
});
