// Fretboard-specific pure logic for FretboardDiagram.tsx. The grouping/
// naming helpers this used to also hold (pitchClassName, groupNotesByStep,
// getDisplayRow) moved to tabNotation.ts once SheetDiagram.tsx needed the
// same ones -- this file now holds only what's actually specific to drawing
// a fretboard segment. Unit-tested in fretboard.test.ts.

/**
 * Every segment shows this many cells for the common case -- a deliberate,
 * uniform window (2026-09-10), not the tight-fit/no-padding window this used
 * to be. See FretboardDiagram.RULES.md, rule 1, for the full reasoning: a
 * reopened decision (docs/decisions/display-modes.md previously argued width
 * itself should be a signal), on a fresh reason -- visual regularity across
 * Sheet/Fretboard/Ascii reads better for a beginner-facing product than a
 * jagged row of differently-sized cards did in practice.
 */
export const FIXED_CELLS = 4;

/**
 * A fret window (in cells, 1-indexed) for one step -- FIXED_CELLS wide,
 * starting at the lowest fretted note in the step, EXCEPT when the step's
 * own span is already wider than that: real fret data is never truncated,
 * so a genuinely wide stretch or chord still shows its full extent instead
 * of clipping. An open-only step gets the fixed window starting at fret 1;
 * open notes themselves don't affect the window, since they're drawn
 * separately, to the left of the nut.
 */
export function getStepWindow(frets: number[]): { start: number; end: number } {
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length === 0) return { start: 1, end: FIXED_CELLS };

  const lo = Math.min(...fretted);
  const hi = Math.max(...fretted);
  return { start: lo, end: Math.max(hi, lo + FIXED_CELLS - 1) };
}
