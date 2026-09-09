# Song views (Sheet, Fretboard, Ascii) and the metronome

Part of `app/status/` — see `app/STATUS.md` for the index. **This is current state only** — what's built, where the code lives, what's not built yet. The *why* behind each of these lives in `docs/decisions/display-modes.md`; the exact rendering rules live in each component's own `RULES.md` — neither is repeated here.

**The song page is tabbed.** `components/SongTabs.tsx`, controls below the title/tuning header, tab order **Sheet, Fretboard, Ascii** (Sheet is the default), exactly one view rendered at a time. Tuning displays as note names (`E-A-D-G-B-e`), not raw MIDI numbers. Page width is fixed at `max-w-[1200px]` (with an explicit `w-full` alongside it — `max-width` alone doesn't reliably shrink on a narrower viewport) so switching tabs doesn't jump the page.

**Sheet** (`components/SheetDiagram.tsx`, default view) — a Songsterr-inspired tab staff: 6 lines, round note shapes with the fret number inside, playback order, wraps to a new system when a line fills. Steps-per-line is measured from actual container width (responsive), not fixed. The first component wired to the real design-system tokens (`var(--background)`/`var(--foreground)`) instead of hardcoded colors. See `components/SheetDiagram.RULES.md`.

**Fretboard** (`components/FretboardDiagram.tsx`) — one small mini-fretboard per playback step, chained left to right, tight-fit sized to exactly the fretted span played. Thin-e/thick-E toggle (a real, working, bordered button). Colors are still hardcoded, not wired to the design-system tokens — a real gap, `SheetDiagram` shows the alternative already works. See `components/FretboardDiagram.RULES.md`.

**Ascii** — the plain ASCII tab, unchanged, still the baseline/default-content display underneath everything else.

**Metronome** (`app/hooks/useMetronome.ts` + `components/MetronomeControls.tsx`) — play/pause, editable bpm (defaults to the song's own tempo), shown only on the Sheet tab, below the tab bar and above Sheet's own frame. Drives a playhead on Sheet (dashed line, inverted note colors at the active step) via an optional `currentStep` prop — no playhead before the first press of Play.

**Shared logic:** `pitchClassName`, `groupNotesByStep`, `getDisplayRow`, `chunk`, `stringThickness`, `computeStepsPerLine` all live in `lib/tabNotation.ts` (shared by Fretboard and Sheet), `lib/tabNotation.test.ts`. Fretboard-only logic (the per-step fret window) stays in `lib/fretboard.ts`.

**Not built yet:** the metronome's playhead on Fretboard/Ascii, a sequential/step-through overview mode for Fretboard, real rhythm notation on Sheet, the design-system tokens applied to Fretboard/Ascii.
