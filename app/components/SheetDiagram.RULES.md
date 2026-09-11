# Sheet: rendering rules and what's missing

Living rules for `SheetDiagram.tsx`, the Songsterr-inspired tab-staff view.
Add to this over time — same pattern as `FretboardDiagram.RULES.md`.
Implementation lives in `app/lib/tabNotation.ts` (shared with the fretboard
view — grouping, naming, string thickness, and the responsive line-wrapping
math) plus JSX/layout logic inline in the component itself. Playback timing
lives separately again, in `app/hooks/useMetronome.ts` — see rule 8 below.

## What this deliberately is, and isn't (2026-09-09)

This is **not** real musical staff notation (a 5-line staff with note-head
shapes whose position encodes pitch, stems/beams encoding duration). It's a
cleaner, drawn version of what the ASCII tab already shows: 6 lines (one per
string), round shapes on the correct line, the fret number inside. Songsterr
itself shows both a real notation staff *and* this kind of tab staff
together — this only builds the tab-staff half, on purpose. Real notation
would need accurate per-note duration to pick the right note-head/stem
shapes, which `tab.schema.json`'s `durationSec` deliberately doesn't provide
(see `docs/DECISIONS.md`'s Songsterr note) — building it would mean
reopening that decision, not just adding a display mode.

## Current rules

1. **Steps-per-line is measured from the actual available width**
   (`ResizeObserver` on the scroll container, `computeStepsPerLine` in
   `tabNotation.ts` does the math, unit-tested independent of the DOM), not
   a fixed constant — a narrower window shows fewer notes per line and a
   taller page, not clipped or scrolled content. `DEFAULT_STEPS_PER_LINE`
   (16) is only the value used for the very first paint, before the
   observer's first measurement lands.
2. **Chords are shown by position, not extra markup.** Simultaneous notes
   (same `startTimeSec`) land on their own string's line at the same
   horizontal x — "play these together" falls directly out of that, no
   separate stacking/bracket logic.
3. **Every note shows its fret number, including open strings (fret 0).**
   Different from `FretboardDiagram`'s convention (an unlabeled ring for
   open notes) — deliberate, not an inconsistency: Sheet has no "outside the
   grid" concept the way a fretboard neck does, so a uniform "always show
   the number" reads more like real tab notation.
4. **Thin-e/thick-E toggle (2026-09-10), same as `FretboardDiagram`.**
   Defaults to thin-e-on-top, same as Fretboard's default. Own `useState`
   inside `SheetDiagram` (not lifted to a parent — no other component needs
   this preference), but the button itself is
   `components/StringOrientationToggle.tsx`, shared verbatim with
   `FretboardDiagram` so both views' identical control can't visually drift
   apart. The toggle is independent of `showHeader`: even when a caller
   hides the "Sheet"/tempo header row (its own song header already shows
   tempo), the flip button still renders on its own in that row, since it's
   a real per-view control, not decoration.
5. **Tempo is shown once, at the top of the whole component** (not per
   system) — matches how a real tempo marking appears once at the start of
   a piece, not repeated on every line.
6. **Colors come from the real design-system tokens**
   (`var(--background)`/`var(--foreground)` from `app/app/globals.css`), not
   hardcoded. `FretboardDiagram` now does too (2026-09-10) — this was the
   first component to, and the reference the retrofit followed.
7. **String lines step up in thickness like a real set** — e/B/G tied at
   the thinnest, D/A/E each a step thicker (`stringThickness` in
   `tabNotation.ts`, shared with `FretboardDiagram`).
8. **A playhead (2026-09-09), driven by `useMetronome`, not by this
   component.** `SheetDiagram` takes an optional `currentStep` prop and, if
   given a non-null value, draws a dashed vertical line at that step across
   whichever system it falls in, and inverts that step's note circles
   (background/foreground swapped) so the active notes visibly pop. The
   component has zero timing logic of its own — see `app/hooks/useMetronome.ts`
   and the "Metronome" note in `docs/DECISIONS.md` for why that's a separate,
   independent module. No playhead is drawn until the metronome has actually
   been started at least once (`currentStep` is `null` until then), so the
   view doesn't show a cursor before anyone's pressed play.
9. **Manual step navigation (2026-09-10), owned by `useMetronome`, driven
   from `StudioTabs.tsx`, not this component.** Left/right arrow keys call
   `stepBy(±1)` (clamped, not wrapped); space calls `toggle()`. Skipped
   while focus is in an editable element (`lib/keyboardShortcuts.ts`'s
   `isEditableTarget`) so the Tempo field's own arrow-key behavior still
   wins there. Always pauses first — `stepBy` itself does this — matching
   the rule that a transport key press during playback should take over,
   not race the running interval.
10. **Loop drag-select (2026-09-10).** Dragging directly on a system draws
    a selection band (accent-colored, low opacity) and, on release, sets
    `useMetronome`'s `loopRange` to that step range; playback then wraps
    within it instead of the whole song. A plain click (no movement) clears
    the loop. Scoped to **one system/line at a time** — dragging across a
    line wrap isn't built, since the common case (loop a short section) fits
    in one line already. Reuses the metronome's own `bpm`, deliberately no
    separate practice-tempo control. The live drag preview is local
    component state in `System` (not lifted to `loopRange` until pointer-up)
    so dragging doesn't re-render every system on each pixel of movement.

## Not built, logged for later

- **Rhythm/timing-proportional spacing.** Steps are spaced evenly regardless
  of actual time between them. A held note and a quick run currently look
  the same width apart. The metronome doesn't change this — it deliberately
  advances one step per beat, not synced to real note timing either (see
  `docs/DECISIONS.md`'s Metronome note).
- **Technique markers** (hammer-on, pull-off, slide, bend, palm-mute) —
  `tab.schema.json`'s `technique` field already carries this data; nothing
  reads it yet, in Sheet or the ASCII tab.
- **Bar lines / measures.** No time signature is captured anywhere in the
  pipeline, so there's no data to group steps into measures with yet.
- **Chord name labels** (e.g. "Am", "G") — would need actual chord-detection
  logic (music theory, not just data this project already has); a bigger
  feature, not a rendering tweak.
- **Lyrics** — not in the data model at all (no lyrics field anywhere in the
  pipeline or `tab.schema.json`); out of scope until/unless that changes.
- **Playhead on Fretboard/Ascii too.** `useMetronome`'s `currentStep` is
  generic and already usable by any view; only `SheetDiagram` consumes it
  today. Extending the same highlight to the other two tabs is a real,
  fairly cheap follow-up, not attempted here since the metronome controls
  themselves are currently only shown on the Sheet tab.
