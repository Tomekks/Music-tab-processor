import test from "node:test";
import assert from "node:assert/strict";
import {
  createStaged,
  discardAll,
  previewVars,
  rebaseOnFile,
  redoEdit,
  stageEdit,
  undoEdit,
} from "./stagedEdits.ts";

test("stagedEdits: stage records path with was/now", () => {
  const next = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  assert.deepEqual(next.staged["semantic.color.accent"], { was: "#ae97f7", now: "#ff0000" });
});

test("stagedEdits: was is always the file value, never an earlier staged value", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const two = stageEdit(one, "semantic.color.accent", "#ae97f7", "#00ff00");
  assert.equal(two.staged["semantic.color.accent"].was, "#ae97f7");
});

test("stagedEdits: replace=true overwrites without adding a history step", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const pastLength = one.past.length;
  const two = stageEdit(one, "semantic.color.accent", "#ae97f7", "#00ff00", true);
  assert.equal(two.staged["semantic.color.accent"].now, "#00ff00");
  assert.equal(two.staged["semantic.color.accent"].was, "#ae97f7");
  assert.equal(two.past.length, pastLength);
  assert.equal(undoEdit(two).staged["semantic.color.accent"]?.now ?? "#ae97f7", "#ae97f7");
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

test("stagedEdits: previewVars also overrides dependents with the same value", () => {
  const tokens = [
    {
      path: "semantic.color.accent",
      cssVar: "--color-accent",
      value: "#ae97f7",
      dependents: ["--component-button-primary-background", "--component-icon-button-primary-background"],
    },
    { path: "semantic.color.border", cssVar: "--border", value: "#e6dfd8" },
  ];
  const staged = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000").staged;
  assert.deepEqual(previewVars(tokens, staged), {
    "--color-accent": "#ff0000",
    "--component-button-primary-background": "#ff0000",
    "--component-icon-button-primary-background": "#ff0000",
    "--border": "#e6dfd8",
  });
  assert.deepEqual(previewVars(tokens, {}), {
    "--color-accent": "#ae97f7",
    "--component-button-primary-background": "#ae97f7",
    "--component-icon-button-primary-background": "#ae97f7",
    "--border": "#e6dfd8",
  });
});

test("stagedEdits: discardAll empties staged as one undoable step", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const discarded = discardAll(one);
  assert.deepEqual(discarded.staged, {});
  assert.deepEqual(undoEdit(discarded).staged, one.staged);
});

test("stagedEdits: discardAll with nothing staged returns the same state", () => {
  const empty = createStaged();
  assert.equal(discardAll(empty), empty);
});

test("stagedEdits: rebaseOnFile drops saved entries and keeps pending ones", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const two = stageEdit(one, "semantic.color.border", "#e6dfd8", "#00ff00");
  const rebased = rebaseOnFile(two, [
    { path: "semantic.color.accent", value: "#FF0000" },
    { path: "semantic.color.border", value: "#e6dfd8" },
  ]);
  assert.deepEqual(rebased.staged, {
    "semantic.color.border": { was: "#e6dfd8", now: "#00ff00" },
  });
});

test("stagedEdits: rebaseOnFile moves survivors onto the new file value and clears history", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const rebased = rebaseOnFile(one, [{ path: "semantic.color.accent", value: "#111111" }]);
  assert.deepEqual(rebased.staged["semantic.color.accent"], { was: "#111111", now: "#ff0000" });
  assert.deepEqual(rebased.past, []);
  assert.deepEqual(rebased.future, []);
});

test("stagedEdits: rebaseOnFile drops entries whose path is gone", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  const rebased = rebaseOnFile(one, [{ path: "semantic.color.border", value: "#e6dfd8" }]);
  assert.deepEqual(rebased.staged, {});
});

test("stagedEdits: rebaseOnFile with nothing different returns the same state", () => {
  const one = stageEdit(createStaged(), "semantic.color.accent", "#ae97f7", "#ff0000");
  assert.equal(rebaseOnFile(one, [{ path: "semantic.color.accent", value: "#ae97f7" }]), one);
});
