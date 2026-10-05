# Metronome Real-Timing Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the metronome's auto-advance pace itself by each step's real recorded onset gap (scaled by the Tempo box, as a speed slider against the song's own detected tempo), instead of a fixed one-step-per-beat interval — fixing the reported bug where playback "sounds closer to normal at 3x-5x the default bpm."

**Architecture:** `lib/tabNotation.ts` gains a small helper that returns each step's real onset time (seconds), derived from the exact same grouping pass `groupNotesByStep` already does (one shared internal computation, so the two can never drift out of sync by index). `hooks/useMetronome.ts`'s auto-advance switches from a constant `setInterval` to a chain of `setTimeout`s, each waiting the real gap to the next step, scaled by `songTempoBpm / bpm`. `app/_components/StudioTabs.tsx` (the hook's only caller) computes and passes the new onset-times array through. Two docs that describe the old "not synced to real timing" behavior as intentional get corrected to match.

**Tech Stack:** TypeScript, React (client hook), `node --test` for the one new unit test (matches this repo's existing `lib/*.test.ts` convention — no test framework for hooks exists in this repo and none is being introduced; the hook's timeout-chain wiring is verified manually in the browser, not with fake timers, since this is a hobby project and that infra isn't worth adding for one hook).

**Spec:** No separate spec file — this was classified as a **bounded** task (existing, well-scoped flow) during `superpowers:brainstorming`; the design was approved in-chat and is fully captured in this plan's Architecture section and the task bodies below.

## Global Constraints

- Only touch `lib/tabNotation.ts`, `hooks/useMetronome.ts`, `app/_components/StudioTabs.tsx`, `components/SheetDiagram.RULES.md`, and `docs/decisions/0005-display-modes.md`. No other file's behavior changes.
- `groupNotesByStep`'s existing return type and output must stay byte-for-byte identical — every existing caller (`FretboardDiagram.tsx`, `SheetDiagram.tsx`, `StudioTabs.tsx`) and the existing tests in `lib/tabNotation.test.ts` must keep passing unmodified.
- No new npm dependencies, no test framework beyond the existing `node --test`.
- `npm run verify` (typecheck → lint → unit tests) must pass before this is considered done.

---

### Task 1: Add `getStepOnsetTimes` to `lib/tabNotation.ts`

**Files:**
- Modify: `app/lib/tabNotation.ts:66-74` (the current `groupNotesByStep` function)
- Test: `app/lib/tabNotation.test.ts` (append after the existing `groupNotesByStep` tests, currently ending at line 44)

**Interfaces:**
- Consumes: `TimedNote` type (`{ string: number; fret: number; startTimeSec: number }`), already defined at `lib/tabNotation.ts:9`.
- Produces: `getStepOnsetTimes(notes: TimedNote[]): number[]` — same length and order as `groupNotesByStep(notes)`, by construction (both derive from one shared internal helper). Element `i` is the real onset time (seconds) of step `i`.

- [ ] **Step 1: Write the failing tests**

Append to `app/lib/tabNotation.test.ts` (add `getStepOnsetTimes` to the existing import list at the top of the file first):

```ts
test("getStepOnsetTimes: same order/length as groupNotesByStep, one time per step", () => {
  const notes = [
    { string: 4, fret: 2, startTimeSec: 1.5 },
    { string: 5, fret: 0, startTimeSec: 0 },
  ];
  assert.deepEqual(getStepOnsetTimes(notes), [0, 1.5]);
});

test("getStepOnsetTimes: notes sharing a startTimeSec collapse to one time, not repeated", () => {
  const notes = [
    { string: 0, fret: 3, startTimeSec: 2 },
    { string: 1, fret: 2, startTimeSec: 2 },
  ];
  assert.deepEqual(getStepOnsetTimes(notes), [2]);
});

test("getStepOnsetTimes: empty input is an empty array", () => {
  assert.deepEqual(getStepOnsetTimes([]), []);
});
```

The import line near the top of `app/lib/tabNotation.test.ts` currently reads:

```ts
import {
  pitchClassName,
  groupNotesByStep,
  getDisplayRow,
  chunk,
  stringThickness,
  computeStepsPerLine,
  formatSongLength,
  fretToMidi,
  midiToFrequency,
  stepIndexForX,
  intersectLoopRangeWithSystem,
} from "./tabNotation.ts";
```

Change it to add `getStepOnsetTimes`:

```ts
import {
  pitchClassName,
  groupNotesByStep,
  getStepOnsetTimes,
  getDisplayRow,
  chunk,
  stringThickness,
  computeStepsPerLine,
  formatSongLength,
  fretToMidi,
  midiToFrequency,
  stepIndexForX,
  intersectLoopRangeWithSystem,
} from "./tabNotation.ts";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npm test`
Expected: FAIL — `getStepOnsetTimes is not defined` (or a TypeScript error naming the missing export), the three new tests failing, all pre-existing tests still passing.

- [ ] **Step 3: Implement `getStepOnsetTimes`, refactored off a shared internal helper**

In `app/lib/tabNotation.ts`, replace the current `groupNotesByStep` function (lines 66-74):

```ts
export function groupNotesByStep(notes: TimedNote[]): FretPosition[][] {
  const byTime = new Map<number, FretPosition[]>();
  for (const { string, fret, startTimeSec } of notes) {
    const group = byTime.get(startTimeSec) ?? [];
    group.push({ string, fret });
    byTime.set(startTimeSec, group);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group);
}
```

with:

```ts
// Shared by groupNotesByStep and getStepOnsetTimes below so both derive from
// exactly one grouping pass -- guarantees they can never drift out of index
// sync with each other (two independently-written loops producing "the same"
// order would be one refactor away from silently not matching).
function groupByStepInternal(notes: TimedNote[]): [number, FretPosition[]][] {
  const byTime = new Map<number, FretPosition[]>();
  for (const { string, fret, startTimeSec } of notes) {
    const group = byTime.get(startTimeSec) ?? [];
    group.push({ string, fret });
    byTime.set(startTimeSec, group);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]);
}

export function groupNotesByStep(notes: TimedNote[]): FretPosition[][] {
  return groupByStepInternal(notes).map(([, group]) => group);
}

/**
 * The real onset time (seconds) of each step groupNotesByStep returns --
 * same order and length by construction. Used by useMetronome.ts to pace
 * playback by real note-to-note gaps instead of a fixed one-step-per-beat
 * interval (see its own top comment for the full reasoning).
 */
export function getStepOnsetTimes(notes: TimedNote[]): number[] {
  return groupByStepInternal(notes).map(([time]) => time);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npm test`
Expected: PASS — all tests including the three new ones, and every pre-existing `groupNotesByStep` test unchanged and still green (confirms the refactor didn't alter its output).

- [ ] **Step 5: Commit**

```bash
git add app/lib/tabNotation.ts app/lib/tabNotation.test.ts
git commit -m "Add getStepOnsetTimes, sharing groupNotesByStep's grouping pass"
```

---

### Task 2: Rewrite `useMetronome`'s auto-advance to use real timing

**Files:**
- Modify: `app/hooks/useMetronome.ts` (whole file rewrite — small file, easier to review as one unit than as a diff)

**Interfaces:**
- Consumes: `getStepOnsetTimes` is NOT imported here — the hook stays agnostic of `lib/tabNotation.ts` (same "keep the hook generic" principle as before); it just receives the resulting `number[]` as a new third parameter.
- Produces: `useMetronome(defaultBpm: number, stepCount: number, stepTimes: number[])` — same return shape as before (`bpm`, `setBpm`, `isPlaying`, `currentStep`, `play`, `pause`, `toggle`, `reset`, `stepBy`, `loopRange`, `setLoopRange`), signature changed only by the added third parameter. Task 3 is the only caller and updates to match.

- [ ] **Step 1: Replace the whole file**

Replace the full contents of `app/hooks/useMetronome.ts` with:

```ts
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
// sound at the song's real tempo -- see docs/decisions/0005-display-modes.md's
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
  const [hasStarted, setHasStarted] = useState(false); // true once play has been pressed at least once
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
```

- [ ] **Step 2: Typecheck (this file has no dedicated unit test — see Global Constraints and the Tech Stack note above)**

Run: `cd app && npm run typecheck`
Expected: FAILS right now, specifically at the one call site (`app/_components/StudioTabs.tsx`) — it still calls `useMetronome(tempoBpm, stepCount)` with only two arguments. That's expected; Task 3 fixes it. Confirm the *only* typecheck error is that missing-argument error at that one call site, nothing else.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useMetronome.ts
git commit -m "Pace metronome auto-advance by real note timing, not a fixed beat interval"
```

(Committing here is intentionally in a transiently-broken typecheck state between Task 2 and Task 3 — acceptable for a single local, unpushed feature branch; do not push between these two commits.)

---

### Task 3: Wire `stepTimes` through `StudioTabs.tsx`

**Files:**
- Modify: `app/app/_components/StudioTabs.tsx:7-32`

**Interfaces:**
- Consumes: `getStepOnsetTimes` from Task 1, `useMetronome(defaultBpm, stepCount, stepTimes)` from Task 2.
- Produces: nothing new for other files — this is the hook's only caller.

- [ ] **Step 1: Update the import and the two lines that build `steps`/call `useMetronome`**

In `app/app/_components/StudioTabs.tsx`, change the import (currently line 12):

```ts
import { fretToMidi, groupNotesByStep, type TimedNote } from "@/lib/tabNotation";
```

to:

```ts
import { fretToMidi, groupNotesByStep, getStepOnsetTimes, type TimedNote } from "@/lib/tabNotation";
```

Then change (currently lines 30-32):

```ts
  const steps = useMemo(() => groupNotesByStep(notes), [notes]);
  const stepCount = steps.length;
  const metronome = useMetronome(tempoBpm, stepCount);
```

to:

```ts
  const steps = useMemo(() => groupNotesByStep(notes), [notes]);
  const stepCount = steps.length;
  const stepTimes = useMemo(() => getStepOnsetTimes(notes), [notes]);
  const metronome = useMetronome(tempoBpm, stepCount, stepTimes);
```

- [ ] **Step 2: Typecheck and run the full verify script**

Run: `cd app && npm run verify`
Expected: PASS — typecheck clean (the Task 2 error is now fixed), lint clean, all unit tests (including Task 1's three new ones) passing.

- [ ] **Step 3: Manual browser verification**

Run: `cd app && npm run dev`, open `http://localhost:3000`, pick a song with a fast/dense passage (e.g. Seven Nation Army or Shame, both published earlier in this project), press Play at the song's own detected tempo (the Tempo box's starting value), and confirm playback now sounds like a real, recognizable pace instead of stretched-out. Then try setting the Tempo box to roughly half that number and confirm playback audibly slows down proportionally (both the fast and slow parts of the passage), and roughly double it and confirm it speeds up proportionally. Also verify a drag-selected loop range still wraps correctly (Loop pill shows, playback repeats within it) and Reset still jumps back to the loop's start (or step 0 with no loop).

- [ ] **Step 4: Commit**

```bash
git add app/app/_components/StudioTabs.tsx
git commit -m "Pass real step onset times into the metronome"
```

---

### Task 4: Correct the two docs that describe the old, now-false behavior

**Files:**
- Modify: `app/components/SheetDiagram.RULES.md:90-96`
- Modify: `docs/decisions/0005-display-modes.md:29`

**Interfaces:** None — documentation only, no code interfaces involved.

- [ ] **Step 1: Update `SheetDiagram.RULES.md`'s backlog item**

The visual-spacing gap (steps drawn evenly apart on screen regardless of real timing) is still real and unbuilt — only the playback-pacing half of that paragraph is now false. In `app/components/SheetDiagram.RULES.md`, replace (currently lines 92-96):

```markdown
- **Rhythm/timing-proportional spacing.** Steps are spaced evenly regardless
  of actual time between them. A held note and a quick run currently look
  the same width apart. The metronome doesn't change this — it deliberately
  advances one step per beat, not synced to real note timing either (see
  `docs/DECISIONS.md`'s Metronome note).
```

with:

```markdown
- **Rhythm/timing-proportional spacing.** Steps are still spaced evenly on
  screen regardless of actual time between them — a held note and a quick
  run still look the same width apart visually. This is now a purely visual
  gap, though: the metronome's *playback* (2026-09-18) is paced by each
  step's real recorded timing (see `app/hooks/useMetronome.ts` and
  `docs/decisions/0005-display-modes.md`'s Metronome note) — what's missing here
  is only proportional spacing in the rendered Sheet/Fretboard diagrams
  themselves, not in how playback sounds.
```

- [ ] **Step 2: Update `docs/decisions/0005-display-modes.md`'s Metronome note**

In `docs/decisions/0005-display-modes.md`, replace the sentence (currently within line 29):

```markdown
**The metronome (built 2026-09-09) answers this partially, deliberately, not as an oversight.** `app/hooks/useMetronome.ts` is a generic step sequencer — play/pause, editable bpm, advance one step per beat, loop — with zero knowledge of notes, strings, or frets, the same "keep layers separate" principle applied to *when* something happens, not just *what*. It does not attempt to sync to the song's actual note timing; it advances one step per beat at whatever bpm is set, full stop — the same "recognizable, not accurate" reasoning as the top of `docs/DECISIONS.md`, not an attempt at real rhythmic sync (which would hit the same `durationSec`-approximation limit as the Songsterr gap above). Because the hook is generic, any display mode could consume its `currentStep`; today only Sheet does (a playhead line, inverted note colors at the active step) — extending the same highlight to Fretboard/Ascii is real and logged, just not built.
```

with:

```markdown
**The metronome (built 2026-09-09, real-timing playback added 2026-09-18) answers this, not fully but for real now.** `app/hooks/useMetronome.ts` is a step sequencer — play/pause, editable bpm, loop — with zero knowledge of notes, strings, or frets, the same "keep layers separate" principle applied to *when* something happens, not just *what*. It originally advanced one step per beat flat, deliberately not synced to real note timing; that made dense/fast passages play noticeably slower than the actual song (reported directly: playback only sounded right at 3-5x the song's real bpm). It's now paced by each step's real recorded onset gap (`lib/tabNotation.ts`'s `getStepOnsetTimes`), scaled by the Tempo box against the song's own detected tempo — so Tempo now works as a genuine practice-mode speed slider rather than a mostly-decorative number. Per-note `durationSec` is still only an approximation (see the Songsterr gap above), and the *visual* Sheet/Fretboard diagrams still space steps evenly regardless of real timing (see `app/components/SheetDiagram.RULES.md`'s backlog) — only *playback pacing* is now real-timing-based, not the rendered layout. Because the hook is generic, any display mode could consume its `currentStep`; today only Sheet does (a playhead line, inverted note colors at the active step) — extending the same highlight to Fretboard/Ascii is real and logged, just not built.
```

- [ ] **Step 3: Verify no other stale references remain**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor && grep -rn "one step per beat\|not synced to real note timing\|not synced to the song" docs/ app/components/*.RULES.md app/hooks/*.ts 2>/dev/null`

Expected: no remaining matches describing the *playback* behavior as unsynced (the `SheetDiagram.RULES.md` edit above deliberately keeps describing the *visual* spacing as still unsynced — that's still true and should still show up if you grep for "spaced evenly").

- [ ] **Step 4: Commit**

```bash
git add app/components/SheetDiagram.RULES.md docs/decisions/0005-display-modes.md
git commit -m "Update docs: metronome playback is now real-timing-paced, not one-step-per-beat"
```
