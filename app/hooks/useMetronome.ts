"use client";

// A generic step sequencer, independent of any specific view. It knows
// nothing about notes, strings, or frets -- just "advance one step every
// beat, at this bpm, optionally looping" -- so any display mode could
// consume it (SheetDiagram does today; Fretboard could later) without this
// hook needing to change. Deliberately not synced to the song's actual
// note timing (see SheetDiagram.RULES.md) -- one step per beat, plain and
// predictable, not an attempt at rhythmic accuracy.
//
// loopRange (2026-09-10) narrows the auto-advance from "wrap across the
// whole song" to "wrap across just this sub-range" -- selected by dragging
// on SheetDiagram, not owned by it, since looping is a timing/sequencing
// concern like everything else this hook already owns. Manual stepBy
// navigation deliberately ignores loopRange (free to inspect any note
// without disturbing a selected loop) -- only the automatic tick respects it.

import { useCallback, useEffect, useRef, useState } from "react";

export type LoopRange = { start: number; end: number };

export function useMetronome(defaultBpm: number, stepCount: number) {
  const [bpm, setBpm] = useState(() => Math.round(defaultBpm) || 60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // true once play has been pressed at least once
  const [currentStep, setCurrentStep] = useState(0);
  const [loopRange, setLoopRange] = useState<LoopRange | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPlaying || stepCount <= 0) return;
    const lo = loopRange ? Math.max(0, loopRange.start) : 0;
    const hi = loopRange ? Math.min(stepCount - 1, loopRange.end) : stepCount - 1;
    const msPerStep = 60000 / bpm;
    intervalRef.current = setInterval(() => {
      setCurrentStep((s) => (s + 1 > hi ? lo : s + 1));
    }, msPerStep);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, bpm, stepCount, loopRange]);

  // Selecting a loop range jumps straight into it, even mid-playback or
  // while paused elsewhere in the song -- "practice this bit" should show
  // this bit immediately, not wait for playback to wander in on its own.
  // Done as part of the same setter (not a separate effect reacting to
  // loopRange) so it's one state update, not a synchronous setState-in-effect.
  const setLoopRangeAndSnap = useCallback((range: LoopRange | null) => {
    setLoopRange(range);
    if (range) setCurrentStep((s) => (s < range.start || s > range.end ? range.start : s));
  }, []);

  // If stepCount shrinks (e.g. a different song) while a stale index is
  // still selected, clamp at read time rather than correcting state from
  // an effect (which would just cause an extra render for no real benefit).
  const safeStep = stepCount > 0 ? Math.min(currentStep, stepCount - 1) : 0;

  const play = useCallback(() => {
    setIsPlaying(true);
    setHasStarted(true);
  }, []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => {
    setIsPlaying((p) => !p);
    setHasStarted(true);
  }, []);
  // Stops playback and rewinds to the first step of the active loop (or the
  // whole song, with no loop set) -- ready for another play press. Doesn't
  // touch hasStarted, so the playhead stays visible at that step rather than
  // disappearing (the metronome has still "started" for this song, it's
  // just back at the beginning).
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(loopRange ? loopRange.start : 0);
  }, [loopRange]);
  // Manual, free-roam step navigation (arrow keys) -- always pauses first
  // (stepping while the interval is still ticking would fight it), clamps
  // rather than wraps (predictable "can't go further" at either end,
  // distinct from reset's own "go to start" and from loop wrap-around),
  // and ignores loopRange entirely so you can inspect any note without
  // clearing your selected loop.
  const stepBy = useCallback(
    (delta: number) => {
      if (stepCount <= 0) return;
      setIsPlaying(false);
      setHasStarted(true);
      setCurrentStep((s) => Math.min(stepCount - 1, Math.max(0, s + delta)));
    },
    [stepCount],
  );

  // Null (not 0) until the first play, so a consumer can tell "never
  // started" apart from "paused at the first step" and choose not to draw
  // a playhead prematurely.
  return {
    bpm,
    setBpm,
    isPlaying,
    currentStep: hasStarted ? safeStep : null,
    play,
    pause,
    toggle,
    reset,
    stepBy,
    loopRange,
    setLoopRange: setLoopRangeAndSnap,
  };
}
