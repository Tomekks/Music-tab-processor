# Song views (Sheet, Fretboard, Ascii) and the metronome

Part of `app/status/` — see `app/STATUS.md` for the index. **This is current state only** — what's built, where the code lives, what's not built yet. The *why* behind each of these lives in `docs/decisions/display-modes.md`; the exact rendering rules live in each component's own `RULES.md` — neither is repeated here.

**The song page is tabbed.** `app/_components/StudioTabs.tsx` (composition root; renders the
diagram via `app/_components/DiagramViewport.tsx`), controls below the title/tuning header, tab order **Sheet, Fretboard, Ascii** (Sheet is the default), exactly one view rendered at a time. Tuning displays as note names (`E-A-D-G-B-e`), not raw MIDI numbers. Page width is fixed at `max-w-[1200px]` (with an explicit `w-full` alongside it — `max-width` alone doesn't reliably shrink on a narrower viewport) so switching tabs doesn't jump the page.

**Sheet** (`components/SheetDiagram.tsx`, default view) — a Songsterr-inspired tab staff: 6 lines, round note shapes with the fret number inside, playback order, wraps to a new system when a line fills. Steps-per-line is measured from actual container width (responsive), not fixed. The first component wired to the real design-system tokens (`var(--background)`/`var(--foreground)`) instead of hardcoded colors. See `components/SheetDiagram.RULES.md`.

**Fretboard** (`components/FretboardDiagram.tsx`) — one small mini-fretboard per playback step, chained left to right, uniform `FIXED_CELLS`-wide window per segment (reopened from an earlier tight-fit-to-span rule, see `docs/decisions/display-modes.md`) except when a step's real span is wider, which is never truncated. The active segment gets a fixed-width inset playback ring, `aria-current`, and nearest-area auto-scroll; segments inside the inclusive loop range receive the shared loop wash. Thin-e/thick-E toggle, now `components/StringOrientationToggle.tsx`, shared with `SheetDiagram`. Colors now use the real design-system tokens, same as `SheetDiagram`/`AsciiView` — the earlier hardcoded-color gap is closed. See `components/FretboardDiagram.RULES.md`.

**Ascii** (`app/app/_components/AsciiView.tsx`) — the plain ASCII tab: a static reference printout, deliberately without a playhead (`renderTab.ts` returns one opaque string with no per-step structure). A small `role="status"` banner above the text states playback continues on Sheet or Fretboard — announced once on mount, never updated per step.

**Metronome** (`app/hooks/useMetronome.ts` + `components/MetronomeControls.tsx`) — play/pause, reset-to-start (2026-09-10, rewinds to step 0 and pauses), editable bpm (defaults to the song's own tempo). Drives a playhead on Sheet (dashed line, inverted note colors at the active step) and active-segment playback state on Fretboard (inset ring, `aria-current`) via optional `currentStep` props. The first step is selected by default on song open, so the playhead is visible before the first press of Play.

**Shared logic:** `pitchClassName`, `groupNotesByStep`, `getDisplayRow`, `chunk`, `stringThickness`, `computeStepsPerLine` all live in `lib/tabNotation.ts` (shared by Fretboard and Sheet), `lib/tabNotation.test.ts`. Fretboard-only logic (the per-step fret window) stays in `lib/fretboard.ts`.

**Not built yet:** the metronome's playhead on Ascii, a sequential/step-through overview mode for Fretboard, real rhythm notation on Sheet, the design-system tokens applied to Ascii's own chrome (Fretboard's are done; Ascii's `<pre>` block already used them from the start, see `AsciiView.tsx`).
