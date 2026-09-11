import test from "node:test";
import assert from "node:assert/strict";
import { getStepWindow, FIXED_CELLS } from "./fretboard.ts";

// Uniform-width window (2026-09-10): every segment shows the same FIXED_CELLS
// cells for the common case, so segments read as a tidy grid instead of a
// jagged one -- a deliberate reopening of the earlier "tight-fit, no padding"
// decision (docs/decisions/display-modes.md), on a fresh, real reason (visual
// consistency across the three tab views for a beginner-facing product), not
// a silent reversal. A step wider than FIXED_CELLS still shows its full span
// -- real fret data is never truncated -- so "uniform" holds for the vast
// majority of steps, not literally every one.

test("getStepWindow: open-only step gets the full fixed window starting at fret 1", () => {
  assert.deepEqual(getStepWindow([0]), { start: 1, end: FIXED_CELLS });
  assert.deepEqual(getStepWindow([0, 0]), { start: 1, end: FIXED_CELLS });
});

test("getStepWindow: a single fretted note still gets the full fixed window, not just 1 cell", () => {
  assert.deepEqual(getStepWindow([7]), { start: 7, end: 7 + FIXED_CELLS - 1 });
  assert.deepEqual(getStepWindow([1]), { start: 1, end: FIXED_CELLS });
});

test("getStepWindow: a chord narrower than the fixed window still fills it", () => {
  assert.deepEqual(getStepWindow([5, 7]), { start: 5, end: 5 + FIXED_CELLS - 1 });
});

test("getStepWindow: a chord on the same fret (different strings) still gets the full fixed window", () => {
  assert.deepEqual(getStepWindow([3, 3]), { start: 3, end: 3 + FIXED_CELLS - 1 });
});

test("getStepWindow: a stretch wider than the fixed window is never truncated", () => {
  assert.deepEqual(getStepWindow([2, 10]), { start: 2, end: 10 });
});

test("getStepWindow: open notes in a step don't affect where the fretted window starts", () => {
  assert.deepEqual(getStepWindow([0, 7, 0]), { start: 7, end: 7 + FIXED_CELLS - 1 });
});
