import test from "node:test";
import assert from "node:assert/strict";
import { pitchClassName, groupNotesByStep, getStepWindow, getDisplayRow } from "./fretboard.ts";

test("pitchClassName matches standard tuning (E2 A2 D3 G3 B3 E4)", () => {
  // contracts/tab.schema.json's own documented example: [40, 45, 50, 55, 59, 64]
  assert.deepEqual([40, 45, 50, 55, 59, 64].map(pitchClassName), ["E", "A", "D", "G", "B", "E"]);
});

test("pitchClassName wraps correctly for out-of-first-octave MIDI values", () => {
  assert.equal(pitchClassName(0), "C");
  assert.equal(pitchClassName(127), "G");
});

test("groupNotesByStep: sorts by time, single notes become one-note steps", () => {
  const notes = [
    { string: 4, fret: 2, startTimeSec: 1.5 },
    { string: 5, fret: 0, startTimeSec: 0 },
  ];
  assert.deepEqual(groupNotesByStep(notes), [[{ string: 5, fret: 0 }], [{ string: 4, fret: 2 }]]);
});

test("groupNotesByStep: notes sharing a startTimeSec become one chord step, not split", () => {
  const notes = [
    { string: 0, fret: 3, startTimeSec: 2 },
    { string: 1, fret: 2, startTimeSec: 2 },
    { string: 2, fret: 0, startTimeSec: 2 },
  ];
  const steps = groupNotesByStep(notes);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].length, 3);
});

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

test("getDisplayRow: thin-e-on-top reverses schema order (0=low E -> bottom row)", () => {
  assert.equal(getDisplayRow(0, 6, true), 5); // low E -> bottom
  assert.equal(getDisplayRow(5, 6, true), 0); // high e -> top
});

test("getDisplayRow: thick-E-on-top keeps schema order as-is", () => {
  assert.equal(getDisplayRow(0, 6, false), 0); // low E -> top
  assert.equal(getDisplayRow(5, 6, false), 5); // high e -> bottom
});
