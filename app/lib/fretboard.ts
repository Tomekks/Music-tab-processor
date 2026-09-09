// Fretboard-specific pure logic for FretboardDiagram.tsx. The grouping/
// naming helpers this used to also hold (pitchClassName, groupNotesByStep,
// getDisplayRow) moved to tabNotation.ts once SheetDiagram.tsx needed the
// same ones -- this file now holds only what's actually specific to drawing
// a fretboard segment. Unit-tested in fretboard.test.ts.

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
