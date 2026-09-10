"use client";

// Composition root: wires the tab selector, the metronome, and whichever diagram is
// active together, without any of THEM knowing about each other -- see
// DetailToolbar.tsx's comment for why that matters. Renders nothing of its own beyond
// DetailToolbar + DiagramViewport.
import { useState } from "react";
import { DetailToolbar } from "./DetailToolbar";
import { DiagramViewport } from "./DiagramViewport";
import { useMetronome } from "@/hooks/useMetronome";
import { groupNotesByStep, type TimedNote } from "@/lib/tabNotation";

export const TABS = ["Sheet", "Fretboard", "Ascii"] as const;
export type Tab = (typeof TABS)[number];

export function StudioTabs({
  notes,
  tuning,
  tempoBpm,
  asciiTab,
}: {
  notes: TimedNote[];
  tuning: number[];
  tempoBpm: number;
  asciiTab: string;
}) {
  const [active, setActive] = useState<Tab>("Sheet");
  const stepCount = groupNotesByStep(notes).length;
  const metronome = useMetronome(tempoBpm, stepCount);

  return (
    <div className="flex flex-col h-full min-h-0">
      <DetailToolbar active={active} onSelect={setActive} metronome={metronome} />
      <DiagramViewport
        active={active}
        notes={notes}
        tuning={tuning}
        tempoBpm={tempoBpm}
        asciiTab={asciiTab}
        currentStep={metronome.currentStep}
      />
    </div>
  );
}
