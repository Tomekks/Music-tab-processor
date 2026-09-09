"use client";

// A generic step sequencer, independent of any specific view. It knows
// nothing about notes, strings, or frets -- just "advance one step every
// beat, at this bpm, optionally looping" -- so any display mode could
// consume it (SheetDiagram does today; Fretboard could later) without this
// hook needing to change. Deliberately not synced to the song's actual
// note timing (see SheetDiagram.RULES.md) -- one step per beat, plain and
// predictable, not an attempt at rhythmic accuracy.

import { useCallback, useEffect, useRef, useState } from "react";

export function useMetronome(defaultBpm: number, stepCount: number) {
  const [bpm, setBpm] = useState(() => Math.round(defaultBpm) || 60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // true once play has been pressed at least once
  const [currentStep, setCurrentStep] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPlaying || stepCount <= 0) return;
    const msPerStep = 60000 / bpm;
    intervalRef.current = setInterval(() => {
      setCurrentStep((s) => (s + 1) % stepCount);
    }, msPerStep);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, bpm, stepCount]);

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

  // Null (not 0) until the first play, so a consumer can tell "never
  // started" apart from "paused at the first step" and choose not to draw
  // a playhead prematurely.
  return { bpm, setBpm, isPlaying, currentStep: hasStarted ? safeStep : null, play, pause, toggle };
}
