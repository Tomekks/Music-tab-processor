import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSaveBody,
  describeSaveFailure,
  discardedLabel,
  revertBody,
  savedLabel,
} from "./saveState.ts";

test("buildSaveBody maps staged entries to path/value edits with the version", () => {
  const body = buildSaveBody(
    { "semantic.color.accent": { was: "#ae97f7", now: "#ff0000" } },
    "version-123",
  );
  assert.deepEqual(body, {
    edits: [{ path: "semantic.color.accent", value: "#ff0000" }],
    loadedVersion: "version-123",
  });
});

test("changed-on-disk returns kind changed naming tokens.json with nothing written", () => {
  const failure = describeSaveFailure("changed-on-disk", "tokens.json changed on disk");
  assert.equal(failure.kind, "changed");
  assert.match(failure.message, /tokens\.json/);
  assert.match(failure.message.toLowerCase(), /nothing was written/);
});

test("not-writable returns failed with nothing written plus the server text", () => {
  const failure = describeSaveFailure("not-writable", "File is not writable");
  assert.equal(failure.kind, "failed");
  assert.match(failure.message, /Nothing was written\./);
  assert.match(failure.message, /File is not writable/);
});

test("write-failed returns failed with nothing written plus the server text", () => {
  const failure = describeSaveFailure("write-failed", "Cannot write file");
  assert.equal(failure.kind, "failed");
  assert.match(failure.message, /Nothing was written\./);
  assert.match(failure.message, /Cannot write file/);
});

test("invalid returns failed with nothing written plus the server text", () => {
  const failure = describeSaveFailure("invalid", "Body must include edits");
  assert.equal(failure.kind, "failed");
  assert.match(failure.message, /Nothing was written\./);
  assert.match(failure.message, /Body must include edits/);
});

test("unknown or missing code returns the generic nothing-written failure", () => {
  const unknown = describeSaveFailure("something-else", "server text");
  assert.equal(unknown.kind, "failed");
  assert.match(unknown.message, /Nothing was written\./);
  const missing = describeSaveFailure(undefined, undefined);
  assert.equal(missing.kind, "failed");
  assert.match(missing.message, /Nothing was written\./);
});

test("savedLabel counts down from Saved 5 to Saved 1", () => {
  assert.equal(savedLabel(5), "Saved 5");
  assert.equal(savedLabel(4), "Saved 4");
  assert.equal(savedLabel(3), "Saved 3");
  assert.equal(savedLabel(2), "Saved 2");
  assert.equal(savedLabel(1), "Saved 1");
});

test("revertBody maps before entries to path/was edits with the version", () => {
  const body = revertBody(
    [{ path: "semantic.color.accent", was: "#ae97f7" }],
    "version-123",
  );
  assert.deepEqual(body, {
    edits: [{ path: "semantic.color.accent", value: "#ae97f7" }],
    loadedVersion: "version-123",
  });
});

test("revertBody keeps every before entry in order", () => {
  const body = revertBody(
    [
      { path: "semantic.color.accent", was: "#ae97f7" },
      { path: "semantic.color.background", was: "#e6dfd8" },
    ],
    "version-456",
  );
  assert.deepEqual(body, {
    edits: [
      { path: "semantic.color.accent", value: "#ae97f7" },
      { path: "semantic.color.background", value: "#e6dfd8" },
    ],
    loadedVersion: "version-456",
  });
});

test("discardedLabel uses singular/plural", () => {
  assert.equal(discardedLabel(1), "Discarded 1 change");
  assert.equal(discardedLabel(3), "Discarded 3 changes");
});
