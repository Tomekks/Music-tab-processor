"use client";

// Simple, deliberately un-realistic synthesized tone per note (2026-09-10,
// beta -- backlog item 18's first real step). A triangle-wave oscillator at
// the note's real pitch with a short pluck envelope, no attempt at actual
// guitar timbre/string modeling. Matches this project's own "recognizable,
// not accurate" stance (docs/DECISIONS.md) and the metronome's own approach
// (docs/decisions/display-modes.md's "Playback and the metronome" section):
// this answers "is this the right note," not "does this sound like a real
// guitar." The metronome still advances one step per beat, not synced to
// real note timing, so this plays a fixed short envelope per triggered
// step -- not the schema's own approximated durationSec.
//
// One AudioContext per component lifetime (lazily created on first note --
// autoplay policies need a prior user gesture, which pressing Play already
// is), never one per note.

import { useCallback, useEffect, useRef } from "react";
import { midiToFrequency } from "@/lib/tabNotation";

const ATTACK_SEC = 0.005;
const DECAY_SEC = 0.35;
const PEAK_GAIN = 0.2;

export function useNoteSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  const playMidiNotes = useCallback((midiNotes: number[]) => {
    if (midiNotes.length === 0) return;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    const now = ctx.currentTime;

    for (const midi of midiNotes) {
      const freq = midiToFrequency(midi);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + ATTACK_SEC);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + ATTACK_SEC + DECAY_SEC);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + ATTACK_SEC + DECAY_SEC + 0.05);
    }
  }, []);

  return { playMidiNotes };
}
