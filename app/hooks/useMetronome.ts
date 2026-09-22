"use client";

// A step sequencer paced by the song's REAL note-to-note timing (2026-09-18
// rewrite) -- not a fixed "one step per beat" interval. Each step waits the
// real recorded gap to the next step's onset (see lib/tabNotation.ts's
// getStepOnsetTimes), scaled by how far the Tempo box is from the song's own
// detected tempo (songTempoBpm/bpm) -- so Tempo works like a playback-speed
// slider: drag it down to practice a fast run slow, everything (fast and
// slow parts alike) scales together, drag it back up to speed. Previously
// this hook ignored real timing entirely and advanced one step per beat
// flat, which made dense/fast passages play far slower than they actually
// sound at the song's real tempo -- see docs/decisions/display-modes.md's
// Metronome note (updated alongside this change) for the full history.
//
// Still knows nothing about notes, strings, or frets -- stepTimes is just
// "the real onset time of step i, in seconds," supplied by the caller (see
// getStepOnsetTimes) -- so this hook stays swappable/reusable the same way
// it always was, just now timing-aware instead of timing-blind.
//
// loopRange (2026-09-10) narrows the auto-advance from "wrap across the
// whole song" to "wrap across just this sub-range" -- selected by dragging
// on SheetDiagram, not owned by it, since looping is a timing/sequencing
// concern like everything else this hook already owns. Manual stepBy
// navigation deliberately ignores loopRange (free to inspect any note
// without disturbing a selected loop) -- only the automatic tick respects it.

import { useCallback, useEffect, useRef, useState } from "react";

export type LoopRange = { start: number; end: number };

// Floor on any single step's wait, regardless of how close together two
// notes were actually transcribed -- Basic Pitch can produce near-duplicate
// onset timestamps a few milliseconds apart (transcription jitter, not real
// rhythm), which would otherwise flash through steps unreadably fast.
const MIN_STEP_MS = 40;
// Used when a step has no following onset to measure a real gap to (the
// song's true last step, or the last step of a shortened loop range) --
// reuses the previous real gap rather than inventing an arbitrary constant.
const FALLBACK_GAP_SEC = 0.5;

export function useMetronome(defaultBpm: number, stepCount: number, stepTimes: number[]) {
  const [bpm, setBpm] = useState(() => Math.round(defaultBpm) || 60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(true); // first step selected by default on song open (no "never started" state)
  const [currentStep, setCurrentStep] = useState(0);
  const [loopRange, setLoopRange] = useState<LoopRange | null>(null);
  // Mirrors currentStep so the scheduling effect below can read the latest
  // value synchronously inside its own setTimeout chain, without needing
  // currentStep itself in that effect's dependency array (which would tear
  // down and rebuild the whole chain on every single tick).
  const currentStepRef = useRef(currentStep);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // The song's own real tempo, for the songTempoBpm/bpm scale ratio below --
  // a stable reference distinct from `bpm` itself, which the Tempo box edits.
  const songTempoBpm = defaultBpm || 60;

  useEffect(() => {
    if (!isPlaying || stepCount <= 0) return;
    const lo = loopRange ? Math.max(0, loopRange.start) : 0;
    const hi = loopRange ? Math.min(stepCount - 1, loopRange.end) : stepCount - 1;
    const ratio = songTempoBpm / bpm;

    // Real gap (seconds) from step i to step i+1's actual onset, or the
    // previous real gap when there's no next onset to measure to -- see
    // FALLBACK_GAP_SEC above.
    const gapAfter = (i: number) => {
      if (i + 1 < stepTimes.length) return stepTimes[i + 1] - stepTimes[i];
      if (i > 0) return stepTimes[i] - stepTimes[i - 1];
      return FALLBACK_GAP_SEC;
    };

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleFrom = (fromStep: number) => {
      const toStep = fromStep + 1 > hi ? lo : fromStep + 1;
      const waitMs = Math.max(MIN_STEP_MS, gapAfter(fromStep) * 1000 * ratio);
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        currentStepRef.current = toStep;
        setCurrentStep(toStep);
        scheduleFrom(toStep);
      }, waitMs);
    };

    scheduleFrom(currentStepRef.current);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isPlaying, bpm, stepCount, loopRange, stepTimes, songTempoBpm]);

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

  // Always a real step index (never null -- the first step is selected by
  // default on song open, so the playhead is visible before anyone presses
  // play). Consumers still guard null for safety, and an empty song yields
  // no segments to mark either way.
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
