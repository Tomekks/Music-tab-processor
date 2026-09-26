"use client";

import { ArrowUpDown } from "lucide-react";
import { IconButton } from "@guitar-tabs/design-system";

// Shared by SheetDiagram and FretboardDiagram (2026-09-10) -- both views need
// the exact same "flip which end is on top" control, and it should look
// identical in both places rather than two independently-styled buttons that
// happen to say similar things. Extracted the same way tabNotation.ts's
// helpers were: once a second component needed it, not before.
//
// No visual "active" color (2026-09-25 IconButton migration) -- unlike Play
// and Volume, this control's icon never changes and its background never
// changes; the flip is still a real toggle functionally, so aria-pressed is
// kept for screen-reader users even though sighted users get no color cue.
export function StringOrientationToggle({ highOnTop, onToggle }: { highOnTop: boolean; onToggle: () => void }) {
  const stateWords = highOnTop ? "thin e" : "thick E";
  return (
    <IconButton
      icon={ArrowUpDown}
      variant="secondary"
      onClick={onToggle}
      data-umami-event="flip-strings"
      aria-pressed={highOnTop}
      title={`Flip strings (currently ${stateWords} on top)`}
      aria-label={`Flip strings (currently ${stateWords} on top)`}
    />
  );
}
