import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCancelError, readPicked, readPickedForClient, savePicked } from "./pick.ts";
import { appendRecord, readRecords } from "./records.ts";

test("bad extension rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "pick-"));
  const file = join(dir, "notes.txt");
  writeFileSync(file, "not audio");
  assert.throws(() => savePicked(dir, file), /Not a supported audio file/);
});

test("missing file rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "pick-"));
  assert.throws(() => savePicked(dir, join(dir, "gone.wav")), /Not a file/);
});

test("picked.json round-trips name and size, UI shape has no path", () => {
  const dir = mkdtempSync(join(tmpdir(), "pick-"));
  const file = join(dir, "song.wav");
  writeFileSync(file, "fake-audio-bytes");
  const client = savePicked(dir, file);
  assert.deepEqual(client, { name: "song.wav", size: 16 });
  assert.equal(readPicked(dir)?.path, file);
  assert.deepEqual(readPickedForClient(dir), { name: "song.wav", size: 16 });
  assert.ok(!("path" in (readPickedForClient(dir) as Record<string, unknown>)));
});

test("cancel parser recognises the osascript cancel error", () => {
  assert.equal(isCancelError("execution error: User canceled. (-128)"), true);
  assert.equal(isCancelError("0:42: execution error: No such file"), false);
});

test("cancel parser accepts the two-l spelling and bare (-128)", () => {
  assert.equal(isCancelError("execution error: User cancelled. (-128)"), true);
  assert.equal(isCancelError("User canceled"), true);
  assert.equal(isCancelError("execution error: An error occurred. (-128)"), true);
});

test("cancel parser rejects non-cancel errors", () => {
  assert.equal(isCancelError("execution error: Application isn't running. (-600)"), false);
  assert.equal(isCancelError(""), false);
});

test("savePicked creates a missing nested data dir", () => {
  const root = mkdtempSync(join(tmpdir(), "pick-"));
  const dataDir = join(root, "nested", "data");
  const file = join(root, "song.wav");
  writeFileSync(file, "fake-audio-bytes");
  assert.deepEqual(savePicked(dataDir, file), { name: "song.wav", size: 16 });
  assert.equal(readPicked(dataDir)?.path, file);
});

test("appendRecord creates a missing data dir", () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), "pick-")), "nested", "data");
  appendRecord(dataDir, { schemaVersion: 1, type: "started", execId: "x", stage: "s01_ingest", startedAt: "2026-09-29T10:00:00+02:00" });
  assert.equal(readRecords(dataDir).length, 1);
});
