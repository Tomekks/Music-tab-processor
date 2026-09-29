import test from "node:test";
import assert from "node:assert/strict";
import { buildTabPreview, pitchClassName } from "./tab.ts";

const tuning = [40, 45, 50, 55, 59, 64];

function note(string: unknown, fret: unknown, startTimeSec: unknown) {
  return { string, fret, startTimeSec, durationSec: 0.25 };
}

test("equal startTimeSec groups into one step in file order", () => {
  const raw = {
    tuning,
    tempoBpm: 120,
    notes: [note(5, 1, 2.0), note(4, 0, 1.0), note(3, 2, 1.0)]
  };
  const preview = buildTabPreview(raw);
  assert.ok(preview);
  assert.equal(preview.steps.length, 2);
  assert.deepEqual(preview.steps[0].notes, [
    { string: 4, fret: 0 },
    { string: 3, fret: 2 }
  ]);
});

test("notes at >= limitSec are dropped and limitSec is a parameter", () => {
  const raw = {
    tuning,
    tempoBpm: 120,
    notes: [note(0, 3, 0.5), note(1, 2, 1.0), note(2, 0, 30.0)]
  };
  const full = buildTabPreview(raw);
  assert.ok(full);
  assert.equal(full.steps.length, 2);
  const first = buildTabPreview(raw, 1);
  assert.ok(first);
  assert.equal(first.steps.length, 1);
  assert.equal(first.steps[0].startTimeSec, 0.5);
});

test("steps are sorted by time with 0-based contiguous index", () => {
  const raw = {
    tuning,
    tempoBpm: 120,
    notes: [note(0, 0, 5.0), note(1, 1, 1.0), note(2, 2, 3.0)]
  };
  const preview = buildTabPreview(raw);
  assert.ok(preview);
  assert.deepEqual(
    preview.steps.map((s) => [s.index, s.startTimeSec]),
    [
      [0, 1.0],
      [1, 3.0],
      [2, 5.0]
    ]
  );
});

test("null for a non-object, missing tuning/notes, bad string index, bad startTimeSec", () => {
  assert.equal(buildTabPreview(null), null);
  assert.equal(buildTabPreview(42), null);
  assert.equal(buildTabPreview({ tempoBpm: 120, notes: [] }), null);
  assert.equal(buildTabPreview({ tuning, tempoBpm: 120 }), null);
  assert.equal(buildTabPreview({ tuning: [], tempoBpm: 120, notes: [] }), null);
  assert.equal(buildTabPreview({ tuning, tempoBpm: 120, notes: [note(6, 0, 1.0)] }), null);
  assert.equal(buildTabPreview({ tuning, tempoBpm: 120, notes: [note(-1, 0, 1.0)] }), null);
  assert.equal(buildTabPreview({ tuning, tempoBpm: 120, notes: [note(0, 0, NaN)] }), null);
  assert.equal(buildTabPreview({ tuning, tempoBpm: 120, notes: [note(0, 0, -1)] }), null);
  assert.equal(buildTabPreview({ tuning, tempoBpm: 120, notes: [null] }), null);
});

test("tempoBpm missing gives null, tuning passes through, pitchClassName", () => {
  const preview = buildTabPreview({ tuning, notes: [note(0, 3, 1.0)] });
  assert.ok(preview);
  assert.equal(preview.tempoBpm, null);
  assert.deepEqual(preview.tuning, tuning);
  assert.equal(pitchClassName(40), "E");
  assert.equal(pitchClassName(59), "B");
});
