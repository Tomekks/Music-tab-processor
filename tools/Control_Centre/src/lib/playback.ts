import type { TabStep } from "./tab.ts";

export function fretToMidi(tuning: number[], string: number, fret: number): number {
  return tuning[string] + fret;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Step times relative to the first step, so Play sounds step 0 immediately.
export function relativeTimes(steps: TabStep[]): number[] {
  return steps.map((s) => s.startTimeSec - steps[0].startTimeSec);
}

// Index of the last step whose time is <= songTime (0 before the first step). rel is ascending and non-empty
// (the Player is only built when there are steps; see TabPlayer).
export function stepAt(rel: number[], songTime: number): number {
  let lo = 0,
    hi = rel.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (rel[mid] <= songTime) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
