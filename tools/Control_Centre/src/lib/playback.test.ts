import test from "node:test";
import assert from "node:assert/strict";
import { fretToMidi, midiToFrequency, relativeTimes, stepAt } from "./playback.ts";
import type { TabStep } from "./tab.ts";

function step(startTimeSec: number): TabStep {
  return { index: 0, startTimeSec, notes: [] };
}

test("stepAt: before the first step gives 0, exact hits, between steps, after the last", () => {
  const rel = [0, 1.0, 2.5];
  assert.equal(stepAt(rel, -0.5), 0);
  assert.equal(stepAt(rel, 0), 0);
  assert.equal(stepAt(rel, 1.0), 1);
  assert.equal(stepAt(rel, 1.7), 1);
  assert.equal(stepAt(rel, 2.5), 2);
  assert.equal(stepAt(rel, 99), 2);
});

test("relativeTimes starts at 0 and keeps the gaps", () => {
  const steps = [step(1.0), step(1.5), step(3.0)];
  assert.deepEqual(relativeTimes(steps), [0, 0.5, 2.0]);
});

test("fretToMidi adds the fret to the open string, midiToFrequency of 69 is 440", () => {
  assert.equal(fretToMidi([40, 45], 1, 3), 48);
  assert.equal(midiToFrequency(69), 440);
});
