"use client";

// Switches between the three ways to read a song's tab -- Sheet,
// Fretboard, Ascii, in that order, one visible at a time. Controls sit
// below the song's title/bpm/tuning header, per the page layout. A client
// component since it holds interactive state; the song data itself is
// still fetched server-side in the page and passed down as props.
//
// Also owns the metronome (useMetronome, app/hooks/useMetronome.ts) --
// lifted up here rather than into SheetDiagram itself, since the hook is a
// generic step-sequencer with no knowledge of notes/strings/frets, and this
// is the natural composition point for wiring it to whichever view can
// actually use it. Today that's just Sheet (the metronome bar only shows
// there); Fretboard could consume the same currentStep later without the
// hook itself changing.

import { useState } from "react";
import { SheetDiagram } from "./SheetDiagram";
import { FretboardDiagram } from "./FretboardDiagram";
import { MetronomeControls } from "./MetronomeControls";
import { useMetronome } from "@/hooks/useMetronome";
import { groupNotesByStep, type TimedNote } from "@/lib/tabNotation";

const TABS = ["Sheet", "Fretboard", "Ascii"] as const;
type Tab = (typeof TABS)[number];

export function SongTabs({
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
    <div>
      <div role="tablist" aria-label="Tab display mode" className="flex gap-1 mb-6 border-b border-zinc-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            className={
              "px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors " +
              (active === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-700")
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "Sheet" && (
        <>
          <MetronomeControls bpm={metronome.bpm} onBpmChange={metronome.setBpm} isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
          <SheetDiagram notes={notes} tuning={tuning} tempoBpm={tempoBpm} currentStep={metronome.currentStep} />
        </>
      )}
      {active === "Fretboard" && <FretboardDiagram notes={notes} tuning={tuning} />}
      {active === "Ascii" && (
        <pre className="bg-zinc-950 text-zinc-100 text-sm rounded-lg p-6 overflow-x-auto font-mono leading-relaxed">
          {asciiTab}
        </pre>
      )}
    </div>
  );
}
