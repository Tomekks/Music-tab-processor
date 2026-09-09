// Pure geometry/data helpers for the fretboard diagram (app/components/FretboardDiagram.tsx).
// Kept separate from the React component so this logic is unit-testable with
// node's built-in test runner (no test framework installed yet) -- see
// fretboard.test.ts.

export type FretPosition = { string: number; fret: number };

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Note name for an open string's MIDI pitch, e.g. 40 -> "E". */
export function pitchClassName(midi: number): string {
  return PITCH_CLASSES[((midi % 12) + 12) % 12];
}

/**
 * How many frets to draw. Always starts at the open string (fret 0 notes are
 * drawn separately, to the left of the nut -- see the component). Widens to
 * fit the song's highest fretted note, with a sensible minimum span so a
 * simple song doesn't render a cramped 1-fret diagram, and a cap so an
 * outlier note doesn't stretch the diagram absurdly wide.
 */
export function getFretRange(
  notes: Pick<FretPosition, "fret">[],
  minSpan = 5,
  maxFrets = 15
): { minFret: number; maxFret: number } {
  if (notes.length === 0) return { minFret: 0, maxFret: minSpan };
  const highest = Math.max(...notes.map((n) => n.fret));
  return { minFret: 0, maxFret: Math.min(Math.max(highest, minSpan), maxFrets) };
}

/** Deduplicated (string, fret) pairs, first-seen order preserved. */
export function getUniquePositions(notes: FretPosition[]): FretPosition[] {
  const seen = new Set<string>();
  const result: FretPosition[] = [];
  for (const { string, fret } of notes) {
    const key = string + ":" + fret;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ string, fret });
    }
  }
  return result;
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
