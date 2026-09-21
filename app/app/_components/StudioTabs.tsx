"use client";

// Composition root: wires the tab selector, the metronome, and whichever diagram is
// active together, without any of THEM knowing about each other -- see
// DetailToolbar.tsx's comment for why that matters. Renders nothing of its own beyond
// DetailToolbar + DiagramViewport.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DetailToolbar } from "./DetailToolbar";
import { DiagramViewport } from "./DiagramViewport";
import { useMetronome } from "@/hooks/useMetronome";
import { useNoteSound } from "@/hooks/useNoteSound";
import { fretToMidi, groupNotesByStep, getStepOnsetTimes, type TimedNote } from "@/lib/tabNotation";
import { matchTransportShortcut, shouldHandleKey } from "@/lib/keyboardShortcuts";

export const TABS = ["Sheet", "Fretboard", "Ascii"] as const;
export type Tab = (typeof TABS)[number];

const SHORTCUTS_KEY = "tabbytab:shortcuts";
const ORIENTATION_KEY = "tabbytab:orientation";

const shortcutListeners = new Set<() => void>();
function subscribeShortcuts(notify: () => void): () => void {
  shortcutListeners.add(notify);
  return () => {
    shortcutListeners.delete(notify);
  };
}
function getShortcutsSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SHORTCUTS_KEY) !== "0";
  } catch {
    return true;
  }
}
function getShortcutsServerSnapshot(): boolean {
  return true;
}

// Orientation persistence (spec 7) uses the same idiom for the same reasons
// (see the shortcuts comment below): server snapshot true matches SSR markup,
// client snapshot reads the stored preference, guarded, never throws.
const orientationListeners = new Set<() => void>();
function subscribeOrientation(notify: () => void): () => void {
  orientationListeners.add(notify);
  return () => {
    orientationListeners.delete(notify);
  };
}
function getOrientationSnapshot(): boolean {
  try {
    return window.localStorage.getItem(ORIENTATION_KEY) !== "0";
  } catch {
    return true;
  }
}
function getOrientationServerSnapshot(): boolean {
  return true;
}

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
  const stepTimes = useMemo(() => getStepOnsetTimes(notes), [notes]);
  const metronome = useMetronome(tempoBpm, stepCount, stepTimes);
  const [soundEnabled, setSoundEnabled] = useState(false); // beta, opt-in -- see MetronomeControls
  // Lifted out of SheetDiagram so its toggle button can render next to "Note
  // sound" in DetailToolbar instead of inside the Sheet view itself -- see
  // SheetDiagram.tsx's highOnTop prop doc comment. Spec 7 made this a
  // persisted global ("tabbytab:orientation", default thin-e-on-top) driving
  // both diagrams from the toolbar's single control -- see DiagramViewport's
  // FretboardDiagram wiring and FretboardDiagram's controlled fallback.
  const highOnTop = useSyncExternalStore(subscribeOrientation, getOrientationSnapshot, getOrientationServerSnapshot);
  const toggleHighOnTop = () => {
    const next = !highOnTop;
    try {
      window.localStorage.setItem(ORIENTATION_KEY, next ? "1" : "0");
    } catch {
      // Keep going -- the notify below still flips this session's state.
    }
    for (const notify of orientationListeners) notify();
  };
  const { playMidiNotes } = useNoteSound();

  // Transport keyboard shortcuts (2026-09-10, opt-out 2026-09-21): left/right
  // steps one note at a time (free-roam, ignores any active loop -- see
  // useMetronome.ts), space toggles play/pause. Handled only with focus
  // inside this container (scope gate): sidebar Space keeps its native link
  // activation, and clicking a non-focusable diagram area parks focus on
  // body where keys stay dead until the user tabs/clicks a control (spec
  // 1+4 §3 tradeoff -- accepted, not fixed here). Skipped entirely while
  // focus is in an editable element (e.g. the Tempo field) so normal
  // typing/native input behavior always wins, and while the opt-out switch
  // is off (handler returns before preventDefault -- fully native). Always
  // stops playback first on a step press -- stepBy already does this itself,
  // matching the request that pressing a transport key while playing should
  // stop it, not fight the running timer. Dispatch reads the action from
  // TRANSPORT_SHORTCUTS -- no keys re-listed here.
  const { stepBy, toggle } = metronome; // stable (useCallback) refs, so the effect below only re-subscribes when they actually change
  const rootRef = useRef<HTMLDivElement>(null);
  // Opt-out state (spec 1+4): useSyncExternalStore over localStorage. The
  // server snapshot (true) matches SSR markup so hydration never mismatches,
  // and the client snapshot reads the stored preference. A mount-effect read
  // trips the repo's set-state-in-effect lint (hard error), a lazy
  // initializer mismatches, and a render-phase read trips ref-in-render --
  // this is the lint-clean idiom with the same observable behavior (the e2e
  // reload test proves it). Toggle notifies subscribers directly (same-tab
  // setItem fires no storage event); cross-tab sync is out of scope.
  const shortcutsEnabled = useSyncExternalStore(
    subscribeShortcuts,
    getShortcutsSnapshot,
    getShortcutsServerSnapshot,
  );
  const toggleShortcuts = () => {
    const next = !shortcutsEnabled;
    try {
      window.localStorage.setItem(SHORTCUTS_KEY, next ? "1" : "0");
    } catch {
      // Keep going -- the notify below still flips this session's state.
    }
    for (const notify of shortcutListeners) notify();
  };
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const inScope = rootRef.current?.contains(e.target as Node) ?? false;
      if (!shouldHandleKey(e, e.target as { tagName?: string } | null, { shortcutsEnabled, inScope })) return;
      const match = matchTransportShortcut(e);
      if (!match) return;
      e.preventDefault();
      if (match.action === "toggle-play") {
        toggle();
      } else {
        stepBy(match.action === "step-forward" ? 1 : -1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepBy, toggle, shortcutsEnabled]);

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
    <div ref={rootRef} className="flex flex-col h-full min-h-0">
      <DetailToolbar
        active={active}
        onSelect={setActive}
        metronome={metronome}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        highOnTop={highOnTop}
        onToggleHighOnTop={toggleHighOnTop}
        loopRange={metronome.loopRange}
        onClearLoop={() => metronome.setLoopRange(null)}
        shortcutsEnabled={shortcutsEnabled}
        onToggleShortcuts={toggleShortcuts}
      />
      <DiagramViewport
        active={active}
        notes={notes}
        tuning={tuning}
        tempoBpm={tempoBpm}
        asciiTab={asciiTab}
        currentStep={metronome.currentStep}
        loopRange={metronome.loopRange}
        onSetLoopRange={metronome.setLoopRange}
        highOnTop={highOnTop}
        onToggleHighOnTop={toggleHighOnTop}
      />
    </div>
  );
}
