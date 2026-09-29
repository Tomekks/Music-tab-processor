import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findRunDir, listRuns, resolveRunDir } from "./runs.ts";

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

test("listRuns returns newest first", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  makeRun(dir, "old-song-20260101-100000", "2026-01-01T10:00:00");
  makeRun(dir, "new-song-20260601-120000", "2026-06-01T12:00:00");
  makeRun(dir, "newest-song-20260601-120500", "2026-06-01T12:05:00");
  assert.deepEqual(
    listRuns(dir).map((r) => r.id),
    ["newest-song-20260601-120500", "new-song-20260601-120000", "old-song-20260101-100000"]
  );
});

test("listRuns ignores folders without a valid metadata.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  makeRun(dir, "good-song-20260601-120000", "2026-06-01T12:00:00");
  mkdirSync(join(dir, "stray-folder"), { recursive: true });
  writeFileSync(join(dir, "loose-file.txt"), "x");
  mkdirSync(join(dir, "bad-json"), { recursive: true });
  writeFileSync(join(dir, "bad-json", "metadata.json"), "not json{");
  mkdirSync(join(dir, "no-stamp"), { recursive: true });
  writeFileSync(join(dir, "no-stamp", "metadata.json"), JSON.stringify({ runId: "no-stamp" }));
  assert.deepEqual(listRuns(dir).map((r) => r.id), ["good-song-20260601-120000"]);
});

test("listRuns on an empty or missing dir → []", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  assert.deepEqual(listRuns(dir), []);
  assert.deepEqual(listRuns(join(dir, "no-such-dir")), []);
});

test("resolveRunDir accepts a listed run", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  makeRun(dir, "good-song-20260601-120000", "2026-06-01T12:00:00");
  assert.equal(resolveRunDir(dir, "good-song-20260601-120000"), join(dir, "good-song-20260601-120000"));
});

test("resolveRunDir rejects .. and absolute or /-containing IDs", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  makeRun(dir, "good-song-20260601-120000", "2026-06-01T12:00:00");
  assert.equal(resolveRunDir(dir, "../x"), null);
  assert.equal(resolveRunDir(dir, "/etc"), null);
  assert.equal(resolveRunDir(dir, "a/b"), null);
  assert.equal(resolveRunDir(dir, ""), null);
  assert.equal(resolveRunDir(dir, "a..b"), null);
});

test("resolveRunDir rejects a file, a missing folder and a folder with no metadata.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "runs-"));
  writeFileSync(join(dir, "loose-file.txt"), "x");
  mkdirSync(join(dir, "stray-folder"), { recursive: true });
  assert.equal(resolveRunDir(dir, "loose-file.txt"), null);
  assert.equal(resolveRunDir(dir, "missing-folder"), null);
  assert.equal(resolveRunDir(dir, "stray-folder"), null);
});
