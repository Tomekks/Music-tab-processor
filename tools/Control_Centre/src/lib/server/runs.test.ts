import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findRunDir } from "./runs.ts";

function makeRun(runsDir: string, id: string, ingestedAt: string): void {
  mkdirSync(join(runsDir, id), { recursive: true });
  writeFileSync(join(runsDir, id, "metadata.json"), JSON.stringify({ runId: id, ingestedAt }));
}

test("newest run at/after startedAt wins", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  makeRun(dir, "old-song-20260101-100000", "2026-01-01T10:00:00");
  makeRun(dir, "new-song-20260601-120000", "2026-06-01T12:00:00");
  makeRun(dir, "newest-song-20260601-120500", "2026-06-01T12:05:00");
  assert.equal(findRunDir(dir, "2026-06-01T12:00:00+02:00"), "newest-song-20260601-120500");
});

test("older runs ignored", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  makeRun(dir, "old-song-20260101-100000", "2026-01-01T10:00:00");
  assert.equal(findRunDir(dir, "2026-06-01T12:00:00+02:00"), null);
});

test("none → null", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  assert.equal(findRunDir(dir, "2026-06-01T12:00:00+02:00"), null);
  assert.equal(findRunDir(join(dir, "no-such-dir"), "2026-06-01T12:00:00+02:00"), null);
});
