import test from "node:test";
import assert from "node:assert/strict";
import { pitchClassName, groupNotesByStep, getDisplayRow, chunk, stringThickness, computeStepsPerLine, formatSongLength } from "./tabNotation.ts";

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

test("getDisplayRow: thin-e-on-top reverses schema order (0=low E -> bottom row)", () => {
  assert.equal(getDisplayRow(0, 6, true), 5); // low E -> bottom
  assert.equal(getDisplayRow(5, 6, true), 0); // high e -> top
});

test("getDisplayRow: thick-E-on-top keeps schema order as-is", () => {
  assert.equal(getDisplayRow(0, 6, false), 0); // low E -> top
  assert.equal(getDisplayRow(5, 6, false), 5); // high e -> bottom
});

test("chunk: splits into fixed-size groups, last one shorter", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("chunk: exact multiple leaves no short final chunk", () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
});

test("chunk: empty input is an empty array of chunks", () => {
  assert.deepEqual(chunk([], 3), []);
});

test("stringThickness: the top three strings (e, B, G) tie at the base thickness", () => {
  const base = stringThickness(5, 6); // e
  assert.equal(stringThickness(4, 6), base); // B
  assert.equal(stringThickness(3, 6), base); // G
});

test("stringThickness: D, A, E step up in that order, each strictly thicker than the last", () => {
  const g = stringThickness(3, 6); // G, top tier
  const d = stringThickness(2, 6);
  const a = stringThickness(1, 6);
  const e = stringThickness(0, 6);
  assert.ok(d > g);
  assert.ok(a > d);
  assert.ok(e > a);
});

test("computeStepsPerLine: a wider container fits more steps", () => {
  const narrow = computeStepsPerLine(400, 38, 26, 16);
  const wide = computeStepsPerLine(1200, 38, 26, 16);
  assert.ok(wide > narrow);
});

test("computeStepsPerLine: matches exact division when it divides evenly", () => {
  // 26 + 16 + 10*38 = 422
  assert.equal(computeStepsPerLine(422, 38, 26, 16), 10);
});

test("computeStepsPerLine: never returns less than 1, even for a very narrow container", () => {
  assert.equal(computeStepsPerLine(10, 38, 26, 16), 1);
  assert.equal(computeStepsPerLine(0, 38, 26, 16), 1);
});

test("formatSongLength: empty notes is 0:00", () => {
  assert.equal(formatSongLength([]), "0:00");
});

test("formatSongLength: uses the latest note's end time, not its start time", () => {
  const notes = [
    { startTimeSec: 0, durationSec: 0.5 },
    { startTimeSec: 10, durationSec: 194 }, // ends at 204s = 3:24
    { startTimeSec: 50, durationSec: 1 }, // ends earlier than the note above -- must not win
  ];
  assert.equal(formatSongLength(notes), "3:24");
});

test("formatSongLength: pads seconds under 10, and a total that rounds to :60 rolls into the next minute", () => {
  assert.equal(formatSongLength([{ startTimeSec: 0, durationSec: 65 }]), "1:05");
  assert.equal(formatSongLength([{ startTimeSec: 0, durationSec: 59.6 }]), "1:00");
});
