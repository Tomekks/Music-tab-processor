# Default brand — design principles

## Atmosphere

Guitar Practice Tabs is a practice tool, not a marketing surface — a song-list sidebar and a
tab-detail pane (Sheet/Fretboard/Ascii views) plus a metronome, used by one person (the app's
owner) to practice guitar against real tab data. The tone is calm and functional: nothing here
is trying to sell anything or hold attention it doesn't need. Currently dark-mode only, warm
near-black surfaces with a soft lavender accent — utilitarian first, considered second.

## Color roles

- `background`/`foreground` — the page canvas and primary text. Warm, not pure black (`#1c1d1f`
  dark, `#faf9f5` light) or pure white.
- `accent` — used for emphasis (active tab text, active song row, focus states), not for large
  filled areas. Soft lavender, low saturation — this app doesn't compete for attention.
- `onAccent` — paired with `accent` for any future filled-background use (a primary button, a
  badge). Not yet used by anything in Phase 0; exists so Phase 1 has a contrast-safe answer
  already computed instead of guessing later.
- **Exception (2026-09-25):** `IconButton`'s `primary` variant (`component.iconButton.primaryBackground`/
  `primaryIcon`) uses `accent` as a full filled background — first real use of the `onAccent`
  pairing described above. Currently single-purpose (the metronome's Play/Pause control only).
  This is a deliberate, noted exception to "not for large filled areas" above, not an oversight —
  revisit and generalize (or formally restrict) once component states are defined system-wide.
- `surface`/`surfaceText` and `surfaceActive`/`surfaceActiveText` — one step off the page
  background, for a control or row that needs to read as a distinct element (a song row, a
  button). `surfaceActive` is a hard inversion (dark theme: white fill, near-black text), used
  for a genuinely selected/pressed state, not a hover.
- `border` — hairline dividers and outlines. Low contrast against `surface` by design; this app
  favors quiet structure over visible boxes.
- `playback` tier — loop and playback identity, theme-aware via explicit dark overrides:
  - `playbackActive` — active-step ring, currently hardcoded `var(--foreground)` at the call site with no semantic name. Ring-only by decision — no fill token exists.
  - `loopRange` — loop identity; replaces two ad-hoc loop `color-mix()` literals (SheetDiagram:254, DetailToolbar:47). FretboardDiagram:218 is the out-of-scope card border, not a loop mix.
  - `state.loopRangeOpacity` — the 18% currently hardcoded in those two mixes, tokenized so opacity is owned too.
  - Standardized wash (the only sanctioned wash going forward):
    `color-mix(in srgb, var(--color-loop-range) var(--state-loop-range-opacity), transparent)`.

## Typography

Geist Sans for UI text, Geist Mono for anything numeric or tabular (BPM readouts, tab notation)
— both already wired via `next/font`, referenced here rather than duplicated.

## Component behavior expectations

- Interactive states (hover/focus/pressed) are derived from the base color plus the
  `state.hoverOpacity`/`focusOpacity`/`pressedOpacity` tokens via `color-mix()`, not hand-picked
  per component. See the design spec, §3, for the exact formula. Disabled state uses
  `state.disabledOpacity` as a flat opacity reduction, not a color-mix.
- State priority when more than one applies at once: `disabled > loading > active > focus >
  hover > default`.
- Focus ring: `focus.ringWidth`/`focus.ringOffset`/`focus.ringColor` — currently 2px, 2px offset,
  in the accent color.
- Contrast minimum: WCAG AA — 4.5:1 for body text, 3:1 for large text (18px+) and UI components.
  Every accent/on-accent and surface/surface-text pairing in this brand's tokens is expected to
  meet this; a later task enforces it as a test, not just this statement.

## Anti-patterns

- No decorative motion. This is a practice tool someone opens dozens of times a session —
  animation should communicate state changes, not add personality.
- No card-nesting. Rows and controls read as flat, bordered elements, not stacked boxes.
- Cards/containers only when they signal real hierarchy, not by default.
