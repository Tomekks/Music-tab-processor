# Fretboard diagram: segment rendering rules

Living rules for how each segment in the sequenced fretboard strip
(`FretboardDiagram.tsx`) decides its own width and what it shows. Add to this
over time as new cases come up — that's the point of this file existing
separately from `app/STATUS.md`. Implementation lives in `app/lib/fretboard.ts`
(pure, unit-tested in `fretboard.test.ts`), not in this file.

## Current rules (2026-09-09)

1. **A segment's fret window is exactly the fretted span played, no padding.**
   Not a fixed width. The window is `[min fret in the step, max fret in the
   step]` — a single note is just the case where min = max, so it's exactly
   1 cell wide, not padded out. A two-fret-apart chord is exactly 2 cells. A
   wide stretch (rare) is exactly as wide as it needs to be. Width becomes a
   visual signal on its own: a wider segment *means* a wider stretch, not
   just decoration.
2. **An open-only step (every note in it is fret 0) shows exactly 1 cell**
   (fret 1), for minimal visual context of "here's the neck," not 4. The
   open note itself still renders as a ring to the left of the nut, same as
   before — this rule is only about how much fretted-grid to show alongside
   it.
3. **A note's fret number is shown once, as the column header above the
   grid — not repeated inside the note dot.** The header already says which
   fret a column is; a number inside the dot too was pure redundancy. Dots
   for fretted notes are now plain filled circles, no label. (Open-string
   markers were already unlabeled rings — unchanged.)
4. **Simultaneous notes (same `startTimeSec` — a chord) are one segment,**
   never split into several, even though this file is about single-note
   segments looking cleaner. See `docs/DECISIONS.md` for why.
5. **The thin-e/thick-E-on-top toggle applies to every segment at once,**
   not per-segment.
6. **String lines step up in thickness like a real set** — e/B/G tied at
   the thinnest, D/A/E each a step thicker (`stringThickness` in
   `tabNotation.ts`, shared with `SheetDiagram`) — not a uniform gradient
   across all six.
7. **The toggle button is a real bordered button, not subtle underlined
   text (2026-09-09).** It was genuinely present and working before this —
   confirmed in the DOM in both states — but easy to miss visually (small,
   low-contrast, tucked in a corner). Reports of it having "disappeared"
   were about discoverability, not an actual regression; fixed by making it
   look like an actual control, matching the metronome's Play button.

## Ideas raised, not yet decided

- Should there be a small fixed pixel padding around a 1-cell segment so the
  dot doesn't sit flush against the segment's border? Currently: no padding
  beyond the segment card's own existing padding.
- A per-segment time or step-index label, for orientation in a very long
  strip (some songs run into the hundreds of steps). Not built — unclear if
  it's worth the visual clutter yet.
