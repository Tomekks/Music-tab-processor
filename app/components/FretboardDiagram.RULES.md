# Fretboard diagram: segment rendering rules

Living rules for how each segment in the sequenced fretboard strip
(`FretboardDiagram.tsx`) decides its own width and what it shows. Add to this
over time as new cases come up — that's the point of this file existing
separately from `app/STATUS.md`. Implementation lives in `app/lib/fretboard.ts`
(pure, unit-tested in `fretboard.test.ts`), not in this file.

## Current rules

1. **A segment's fret window is `FIXED_CELLS` (4) wide for the common case
   (2026-09-10) — uniform, not tight-fit.** Reopened from the earlier
   "exactly the fretted span, no padding" rule (see `docs/decisions/
   display-modes.md` for the full history of both the original decision and
   why it changed): a real, fresh reason — the jagged, differently-sized
   segments read as messy next to Sheet/Ascii's consistent look, a bigger
   cost for a beginner-facing product than the old rule's benefit (width
   itself carrying a "how wide is this stretch" signal). A step whose actual
   span is already wider than `FIXED_CELLS` still shows its full width —
   real fret data is never truncated — so segments are uniform for the vast
   majority of steps, not literally every single one.
2. **An open-only step (every note in it is fret 0) gets the same fixed
   window, starting at fret 1** — same uniform-width rule as any other step,
   not a special narrower case anymore. The open note itself still renders
   as a ring to the left of the nut, unchanged.
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
   look like an actual control, matching the metronome's Play button. Now
   `components/StringOrientationToggle.tsx`, shared verbatim with
   `SheetDiagram` (2026-09-10) — both views need the identical control, so
   there's exactly one implementation instead of two that could drift apart.
8. **Colors come from the real design-system tokens (2026-09-10)** — same
   `var(--background)`/`var(--foreground)`/`border-border` as `SheetDiagram`
   and `AsciiView`, replacing hardcoded zinc/white. This is what actually
   fixed the "looks different from the other two tabs" complaint — the
   uniform-width change (rule 1) addressed sizing, this addressed color; the
   two were separate problems that happened to be fixed at the same time.
   Also means this view finally adapts to dark mode, a gap called out here
   since the component existed.
9. **`bordered`/`showHeader`/`showCaption` props (2026-09-10), mirroring
   `SheetDiagram`'s own.** `DiagramViewport` opts out of all three for both
   views, for the same reason in both cases: the song header above already
   shows what a "Fretboard, in order" title or caption would repeat, and the
   outer card is redundant once this is the only content in the tab's
   scroll region.

## Ideas raised, not yet decided

- Should there be a small fixed pixel padding around a 1-cell segment so the
  dot doesn't sit flush against the segment's border? Currently: no padding
  beyond the segment card's own existing padding.
- A per-segment time or step-index label, for orientation in a very long
  strip (some songs run into the hundreds of steps). Not built — unclear if
  it's worth the visual clutter yet.
