"use client";

// Shared by SheetDiagram and FretboardDiagram (2026-09-10) -- both views need
// the exact same "flip which end is on top" control, and it should look
// identical in both places rather than two independently-styled buttons that
// happen to say similar things. Extracted the same way tabNotation.ts's
// helpers were: once a second component needed it, not before.
export function StringOrientationToggle({ highOnTop, onToggle }: { highOnTop: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:opacity-70"
      style={{ borderColor: "color-mix(in srgb, var(--foreground) 25%, transparent)" }}
    >
      Flip to {highOnTop ? "thick E" : "thin e"} on top
    </button>
  );
}
