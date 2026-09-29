import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCancelError, readPicked, readPickedForClient, savePicked } from "./pick.ts";

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
