"use client";

// Composition root: wires the tab selector, the metronome, and whichever diagram is
// active together, without any of THEM knowing about each other -- see
// DetailToolbar.tsx's comment for why that matters. Renders nothing of its own beyond
// DetailToolbar + DiagramViewport.
import { useEffect, useMemo, useState } from "react";
import { DetailToolbar } from "./DetailToolbar";
import { DiagramViewport } from "./DiagramViewport";
import { useMetronome } from "@/hooks/useMetronome";
import { useNoteSound } from "@/hooks/useNoteSound";
import { fretToMidi, groupNotesByStep, type TimedNote } from "@/lib/tabNotation";
import { isEditableTarget } from "@/lib/keyboardShortcuts";

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
  const steps = useMemo(() => groupNotesByStep(notes), [notes]);
  const stepCount = steps.length;
  const metronome = useMetronome(tempoBpm, stepCount);
  const [soundEnabled, setSoundEnabled] = useState(false); // beta, opt-in -- see MetronomeControls
  const { playMidiNotes } = useNoteSound();

  // Transport keyboard shortcuts (2026-09-10): left/right steps one note at
  // a time (free-roam, ignores any active loop -- see useMetronome.ts),
  // space toggles play/pause. Skipped entirely while focus is in an
  // editable element (e.g. the Tempo field) so normal typing/native input
  // behavior always wins. Always stops playback first on a step press --
  // stepBy already does this itself, matching the request that pressing a
  // transport key while playing should stop it, not fight the running timer.
  const { stepBy, toggle } = metronome; // stable (useCallback) refs, so the effect below only re-subscribes when they actually change
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target as { tagName?: string } | null)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBy(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepBy(1);
      } else if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepBy, toggle]);

  // Note-accurate playback sound (2026-09-10, beta): plays the real pitch(es)
  // of whichever step the metronome just advanced to, only while enabled and
  // actually playing. See hooks/useNoteSound.ts for why this is a simple
  // synthesized tone, not real guitar timbre.
  useEffect(() => {
    if (!soundEnabled || !metronome.isPlaying || metronome.currentStep === null) return;
    const step = steps[metronome.currentStep];
    if (!step) return;
    playMidiNotes(step.map(({ string, fret }) => fretToMidi(tuning, string, fret)));
  }, [metronome.currentStep, metronome.isPlaying, soundEnabled, steps, tuning, playMidiNotes]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <DetailToolbar active={active} onSelect={setActive} metronome={metronome} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled((v) => !v)} />
      <DiagramViewport
        active={active}
        notes={notes}
        tuning={tuning}
        tempoBpm={tempoBpm}
        asciiTab={asciiTab}
        currentStep={metronome.currentStep}
        loopRange={metronome.loopRange}
        onSetLoopRange={metronome.setLoopRange}
      />
    </div>
  );
}
