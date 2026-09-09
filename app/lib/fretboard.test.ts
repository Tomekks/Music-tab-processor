import test from "node:test";
import assert from "node:assert/strict";
import { getStepWindow } from "./fretboard.ts";

test("getStepWindow: open-only step shows exactly 1 cell of context (fret 1)", () => {
  assert.deepEqual(getStepWindow([0]), { start: 1, end: 1 });
  assert.deepEqual(getStepWindow([0, 0]), { start: 1, end: 1 });
});

test("getStepWindow: a single fretted note is exactly 1 cell, no padding", () => {
  assert.deepEqual(getStepWindow([7]), { start: 7, end: 7 });
  assert.deepEqual(getStepWindow([1]), { start: 1, end: 1 });
});

test("getStepWindow: a chord fits exactly its own span, no more", () => {
  assert.deepEqual(getStepWindow([5, 7]), { start: 5, end: 7 });
  assert.deepEqual(getStepWindow([2, 10]), { start: 2, end: 10 });
});

test("getStepWindow: a chord on the same fret (different strings) is still exactly 1 cell", () => {
  assert.deepEqual(getStepWindow([3, 3]), { start: 3, end: 3 });
});

test("getStepWindow: open notes in a step don't affect the fretted window", () => {
  assert.deepEqual(getStepWindow([0, 7, 0]), { start: 7, end: 7 });
});
