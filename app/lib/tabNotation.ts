// Shared pure helpers for reading contracts/tab.schema.json note data as
// playback-ordered steps -- used by both FretboardDiagram.tsx and
// SheetDiagram.tsx. Extracted out of fretboard.ts once a second component
// needed the same grouping/naming logic; fretboard.ts now holds only what's
// genuinely fretboard-specific (getStepWindow). Unit-tested in
// tabNotation.test.ts via node's built-in test runner.

export type FretPosition = { string: number; fret: number };
export type TimedNote = FretPosition & { startTimeSec: number };

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Note name for an open string's MIDI pitch, e.g. 40 -> "E". */
export function pitchClassName(midi: number): string {
  return PITCH_CLASSES[((midi % 12) + 12) % 12];
}

/** A string/fret position's actual sounding pitch, as a MIDI note number. */
export function fretToMidi(tuning: number[], stringIndex: number, fret: number): number {
  return tuning[stringIndex] + fret;
}

/** Standard equal-temperament MIDI-to-frequency conversion (A4 = MIDI 69 = 440Hz). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * The nearest step index (local to one system/line, per SheetDiagram's own
 * layout constants) for a horizontal pixel position -- used by the loop
 * drag-select gesture to turn a pointer position into a step. Clamped to a
 * valid index for that system, so dragging past either edge still resolves
 * to the nearest real step rather than an out-of-range value.
 */
export function stepIndexForX(x: number, stepWidth: number, padLeft: number, stepCountInSystem: number): number {
  const idx = Math.round((x - padLeft - stepWidth / 2) / stepWidth);
  return Math.max(0, Math.min(stepCountInSystem - 1, idx));
}

/**
 * Intersects a global loop range (in whole-song step indices) with one
 * system's own local window -- so SheetDiagram's multi-line layout can draw
 * a selection band only across the lines it actually touches, in each
 * line's own local coordinates. Null when the loop range doesn't reach this
 * system at all.
 */
export function intersectLoopRangeWithSystem(
  loopRange: { start: number; end: number } | null,
  systemStartIdx: number,
  systemLength: number,
): { start: number; end: number } | null {
  if (!loopRange) return null;
  const lo = Math.max(loopRange.start, systemStartIdx);
  const hi = Math.min(loopRange.end, systemStartIdx + systemLength - 1);
  if (lo > hi) return null;
  return { start: lo - systemStartIdx, end: hi - systemStartIdx };
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
 * Maps a schema string index (0 = lowest/thick E, per contracts/tab.schema.json)
 * to a visual row (0 = top of the diagram), depending on which convention is
 * currently displayed -- thin e on top (standard tab convention) or thick E
 * on top (matches how the neck physically sits when you look down at it).
 */
export function getDisplayRow(stringIndex: number, nStrings: number, highOnTop: boolean): number {
  return highOnTop ? nStrings - 1 - stringIndex : stringIndex;
}

/**
 * Total playback length, formatted m:ss. There's no stored duration column
 * (see db/schema.ts's songs table) -- this is simply the latest point any
 * note stops ringing, derived from the notes' own timing. Rounds the total
 * to a whole second before splitting into minutes/seconds so a value like
 * 59.6s can't come out as the invalid "0:60".
 */
export function formatSongLength(notes: { startTimeSec: number; durationSec: number }[]): string {
  const totalSeconds = notes.length === 0 ? 0 : Math.round(Math.max(...notes.map((n) => n.startTimeSec + n.durationSec)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Splits an array into fixed-size chunks, last chunk possibly shorter. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * How many steps fit on one line of SheetDiagram, given the actual
 * available width -- extracted as its own pure function so the responsive
 * line-wrapping math is unit-testable independent of ResizeObserver/DOM
 * measurement (which this repo has no way to exercise in an automated
 * test). Always at least 1, so a very narrow container still shows
 * something rather than a division-derived 0.
 */
export function computeStepsPerLine(availableWidth: number, stepWidth: number, padLeft: number, padRight: number): number {
  return Math.max(1, Math.floor((availableWidth - padLeft - padRight) / stepWidth));
}

/**
 * A string's drawn line thickness, like a real guitar set: the top three
 * strings (thinnest -- e, B, G in standard tuning) are drawn the same
 * thickness, then each string below that steps up -- D slightly thicker, A
 * more, E (the lowest) the most. Used by both FretboardDiagram and
 * SheetDiagram so the two views agree on what a string "looks like".
 */
export function stringThickness(stringIndex: number, nStrings: number, base = 1, step = 0.6): number {
  const fromTop = nStrings - 1 - stringIndex; // 0 = highest/thinnest string
  const tier = Math.max(0, fromTop - 2); // top 3 strings tie at the base thickness
  return base + tier * step;
}
