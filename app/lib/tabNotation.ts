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
