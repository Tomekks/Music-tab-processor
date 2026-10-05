import test from "node:test";
import assert from "node:assert/strict";
import {
  createStaged,
  previewVars,
  redoEdit,
  stageEdit,
  undoEdit,
} from "./stagedEdits.ts";

test("stagedEdits: stage records path with was/now", () => {
  const next = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  assert.deepEqual(next.staged["semantic.color.accent"], { was: "#ae97f7", now: "#ff0000" });
});

test("stagedEdits: staging the same value as the file value clears the entry", () => {
  const staged = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const cleared = stageEdit(staged, "semantic.color.accent", "#ae97f7", "#ae97f7");
  assert.deepEqual(cleared.staged, {});
});

test("stagedEdits: undo restores the previous staged value and redo re-applies it", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const two = stageEdit(one, "semantic.color.accent", "#ae97f7", "#00ff00");
  assert.equal(undoEdit(two).staged["semantic.color.accent"].now, "#ff0000");
  assert.equal(redoEdit(undoEdit(two)).staged["semantic.color.accent"].now, "#00ff00");
});

test("stagedEdits: undo or redo with empty history is a no-op", () => {
  const empty = createStaged();
  assert.deepEqual(undoEdit(empty).staged, {});
  assert.deepEqual(redoEdit(empty).staged, {});
});

test("stagedEdits: previewVars returns the staged hex for edited tokens and the file value for the rest", () => {
  const tokens = [
    { path: "semantic.color.accent", cssVar: "--color-accent", value: "#ae97f7" },
    { path: "semantic.color.border", cssVar: "--border", value: "#e6dfd8" },
  ];
  const staged = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000").staged;
  assert.deepEqual(previewVars(tokens, staged), {
    "--color-accent": "#ff0000",
    "--border": "#e6dfd8",
  });
});
