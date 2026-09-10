"use client";

// M3: tab-switching state only. M4 adds useMetronome here and threads currentStep
// into DiagramViewport -- see app/app/studio/STATUS.md. Deliberately renders nothing
// of its own beyond DetailToolbar + DiagramViewport: this is the composition root that
// wires tab selector, metronome, and diagrams together without any of THEM knowing
// about each other (the thing SongTabs.tsx doesn't do today -- its metronome is nested
// inside the Sheet tab's branch instead of living here as a sibling).
import { useState } from "react";
import { DetailToolbar } from "./DetailToolbar";
import { DiagramViewport } from "./DiagramViewport";
import type { TimedNote } from "@/lib/tabNotation";

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

  return (
    <div className="flex flex-col h-full min-h-0">
      <DetailToolbar active={active} onSelect={setActive} />
      <DiagramViewport
        active={active}
        notes={notes}
        tuning={tuning}
        tempoBpm={tempoBpm}
        asciiTab={asciiTab}
        currentStep={null}
      />
    </div>
  );
}
