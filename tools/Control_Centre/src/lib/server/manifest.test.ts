import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
      produces: ["metadata.json"]
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
