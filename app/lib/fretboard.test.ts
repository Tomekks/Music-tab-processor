import test from "node:test";
import assert from "node:assert/strict";
import { pitchClassName, getFretRange, getUniquePositions, getDisplayRow } from "./fretboard.ts";

test("pitchClassName matches standard tuning (E2 A2 D3 G3 B3 E4)", () => {
  // contracts/tab.schema.json's own documented example: [40, 45, 50, 55, 59, 64]
  assert.deepEqual([40, 45, 50, 55, 59, 64].map(pitchClassName), ["E", "A", "D", "G", "B", "E"]);
});

test("pitchClassName wraps correctly for out-of-first-octave MIDI values", () => {
  assert.equal(pitchClassName(0), "C");
  assert.equal(pitchClassName(127), "G");
});

test("getFretRange: empty notes falls back to the minimum span", () => {
  assert.deepEqual(getFretRange([]), { minFret: 0, maxFret: 5 });
});

test("getFretRange: widens to the highest fretted note", () => {
  assert.deepEqual(getFretRange([{ fret: 2 }, { fret: 10 }, { fret: 5 }]), { minFret: 0, maxFret: 10 });
});

test("getFretRange: never shrinks below the minimum span", () => {
  assert.deepEqual(getFretRange([{ fret: 0 }, { fret: 2 }]), { minFret: 0, maxFret: 5 });
});

test("getFretRange: caps an outlier fret at maxFrets", () => {
  assert.deepEqual(getFretRange([{ fret: 22 }]), { minFret: 0, maxFret: 15 });
});

test("getUniquePositions: dedupes repeated positions, keeps first-seen order", () => {
  const notes = [
    { string: 5, fret: 0 },
    { string: 4, fret: 2 },
    { string: 5, fret: 0 }, // repeat later in the song, same open note
    { string: 3, fret: 2 },
  ];
  assert.deepEqual(getUniquePositions(notes), [
    { string: 5, fret: 0 },
    { string: 4, fret: 2 },
    { string: 3, fret: 2 },
  ]);
});

test("getDisplayRow: thin-e-on-top reverses schema order (0=low E -> bottom row)", () => {
  assert.equal(getDisplayRow(0, 6, true), 5); // low E -> bottom
  assert.equal(getDisplayRow(5, 6, true), 0); // high e -> top
});

test("getDisplayRow: thick-E-on-top keeps schema order as-is", () => {
  assert.equal(getDisplayRow(0, 6, false), 0); // low E -> top
  assert.equal(getDisplayRow(5, 6, false), 5); // high e -> bottom
});
