"use client";

// Shared by SheetDiagram and FretboardDiagram (2026-09-10) -- both views need
// the exact same "flip which end is on top" control, and it should look
// identical in both places rather than two independently-styled buttons that
// happen to say similar things. Extracted the same way tabNotation.ts's
// helpers were: once a second component needed it, not before.
export function StringOrientationToggle({ highOnTop, onToggle }: { highOnTop: boolean; onToggle: () => void }) {
  // Spec 7: visible label is exactly "Flip strings" on every tab -- state is
  // conveyed via aria-pressed + the dynamic title/accessible name only.
  const stateWords = highOnTop ? "thin e" : "thick E";
  return (
    <button
      onClick={onToggle}
      aria-pressed={highOnTop}
      title={`Flip strings (currently ${stateWords} on top)`}
      aria-label={`Flip strings (currently ${stateWords} on top)`}
      className="inline-flex items-center gap-1.5 rounded-md border border-surface bg-surface px-3 py-1.5 text-sm font-semibold text-surface-text hover:bg-surface-hover hover:border-surface-hover"
    >
      Flip strings
    </button>
  );
}
