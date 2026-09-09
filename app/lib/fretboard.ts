// Pure geometry/data helpers for the fretboard diagram (app/components/FretboardDiagram.tsx).
// Kept separate from the React component so this logic is unit-testable with
// node's built-in test runner (no test framework installed yet) -- see
// fretboard.test.ts.

export type FretPosition = { string: number; fret: number };
export type TimedNote = FretPosition & { startTimeSec: number };

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Note name for an open string's MIDI pitch, e.g. 40 -> "E". */
export function pitchClassName(midi: number): string {
  return PITCH_CLASSES[((midi % 12) + 12) % 12];
}

/**
 * Groups notes into playback-order steps: everything sharing a startTimeSec
 * is one step (a single note, or a chord if several strings ring at once).
 * Same grouping convention as renderAsciiTab.ts's byTime map -- a step here
 * is exactly one column there. Order is sorted by time; within a step,
 * original note order is preserved.
 */
export function groupNotesByStep(notes: TimedNote[]): FretPosition[][] {
  const byTime = new Map<number, FretPosition[]>();
  for (const { string, fret, startTimeSec } of notes) {
    const group = byTime.get(startTimeSec) ?? [];
    group.push({ string, fret });
    byTime.set(startTimeSec, group);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group);
}

/**
 * A tight-fit fret window (in cells, 1-indexed) for one step -- exactly the
 * fretted span played, no padding. See FretboardDiagram.RULES.md, rule 1: a
 * single note is just the case where the span is 1 fret wide, not a special
 * case of some larger fixed width. An open-only step (rule 2) shows 1 cell
 * of context (fret 1); open notes themselves don't affect the window, since
 * they're drawn separately, to the left of the nut.
 */
export function getStepWindow(frets: number[]): { start: number; end: number } {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length === 0) return { start: 1, end: 1 };

  const lo = Math.min(...fretted);
  const hi = Math.max(...fretted);
  return { start: lo, end: hi };
}

/**
 * Maps a schema string index (0 = lowest/thick E, per contracts/tab.schema.json)
 * to a visual row (0 = top of the diagram), depending on which convention is
 * currently displayed -- thin e on top (standard tab convention, the default
 * everywhere else in this app) or thick E on top (matches how the neck
 * physically sits when you look down at it while playing).
 */
export function getDisplayRow(stringIndex: number, nStrings: number, highOnTop: boolean): number {
  return highOnTop ? nStrings - 1 - stringIndex : stringIndex;
}
