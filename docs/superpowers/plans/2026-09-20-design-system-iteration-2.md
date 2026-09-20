# Design System Iteration 2 Implementation Plan

> **For agentic workers:** this project overrides the generic Superpowers execution loop for
> `app/` work — see `docs/WEB_APP_WORKFLOW.md`. Do NOT use `superpowers:subagent-driven-development`
> or `superpowers:executing-plans`. Instead: each task below becomes its own spec file in
> `docs/specs/` (written fresh against current code, per `WEB_APP_WORKFLOW.md` §3's rule), then
> runs `WEB_APP_WORKFLOW.md` §5's loop. Checkbox syntax below tracks task-level, not step-level,
> progress — the actual step-by-step detail belongs in each task's own spec, written right before
> that task starts, not baked into this plan up front (this project learned the hard way this
> session that specs go stale fast — see the git-blame on `WEB_APP_WORKFLOW.md`'s newest note).

**Goal:** Eight independent design-system improvements. Four sourced from reviewing
[Chainlift/liftkit](https://github.com/Chainlift/liftkit) (concepts only — that repo is GPL-2 and
explicitly "not recommended for production"; no code is copied from it): generative color from
seed hues, a live preview in the token editor, a shared interaction-state primitive, and a real
dark/light theme switcher. The fifth (Task 5) is `docs/BACKLOG.md` item 14 — multi-brand
inheritance with per-token reset-to-parent — flagged by the user as a request from a prior
session that got dropped, not a liftkit-derived idea. The sixth (Task 6, a token orphan-detection
test) came out of external research into design-system anti-patterns, done in response to the
user's explicit request to research the field and find complementary improvements — see
`app/packages/design-system/SELF-EVALUATION.md` for the full research synthesis. The seventh and
eighth (Tasks 7-8, a per-component sidebar editor and staged exception-vs-brand-wide edits with
an explicit Save) are a second round of user-requested features (2026-09-20), independent of
liftkit/backlog/research.

**Architecture:** All eight build on the existing `@guitar-tabs/design-system` package
(`app/packages/design-system/`) and its `/design-system` editor — no new subsystem, no new
package. Each task is independently shippable and independently revertible.

**Note on `docs/BACKLOG.md`:** item 14's text is quoted directly in Task 5 below rather than that
file being edited to cross-reference this plan — `BACKLOG.md` has uncommitted changes from a
concurrent session as of 2026-09-20 (a docs-reorg pass, several files touched), and editing a
file mid-flight under another editor risks clobbering it. Whoever picks up Task 5 should update
`BACKLOG.md` item 14's status once it's safe to touch (after the concurrent session's changes
land or are confirmed clear).

**Tech Stack:** Existing stack only, plus one new runtime dependency introduced in Task 1
(`@material/material-color-utilities` — Google's HCT/tonal-palette library, MIT-licensed, ~30KB,
zero transitive deps beyond itself). This is the first runtime dependency
`@guitar-tabs/design-system` will have (today: `peerDependencies` on react/react-dom only,
confirmed in `app/packages/design-system/package.json`) — flagged explicitly because adding it is
a real decision, not a given.

**Spec:** No separate design spec — this plan **is** the design doc; each task's own
`docs/specs/*.md` (written at execution time, per the note above) is the implementation-level
detail.

## Global Constraints

- `npm run verify` (typecheck, lint, `node --test`) must pass after every task — see
  `app/packages/design-system/src/*.test.mjs` for the existing 45 tests these changes must not
  break, especially `contrast.test.mjs` (WCAG AA 4.5:1 check on every semantic color pair, both
  themes — Task 1's generated output must keep passing this unchanged test, not a modified one).
- `master` is branch-protected (confirmed this session by a rejected direct push) — every task
  ships via a branch + PR, not a direct push.
- **Another AI model may be concurrently editing this same working tree.** Each task works on its
  own branch (created fresh from `origin/master` at task-start time, not reused across tasks), and
  commits are scoped tightly to that task's file allowlist — no broad `git add -A`.
- No hardcoded colors — every new value is a token, resolved through the existing
  `{path.to.token}` reference system in `resolve.mjs`.
- Don't touch `.env`/credentials (none of these tasks need to).
- Per `DESIGN.md`: WCAG AA minimum (4.5:1 body text, 3:1 large text/UI), no decorative motion, no
  card-nesting.

---

### Task 1: Seed-color tonal ramp generator (pure logic)

Generates the full light+dark neutral/surface ramp and the light/dark tone pair for a single
accent hue, from a handful of seed hex colors — replacing hand-picked hex values in `tokens.json`
and its `dark` block with values derived from a formula. Pure logic only; wiring it into the
brand data / editor is Task 1b.

**Files:**
- Create: `app/packages/design-system/src/generate-ramp.mjs`
- Create: `app/packages/design-system/src/generate-ramp.test.mjs`
- Modify: `app/packages/design-system/package.json` (add `@material/material-color-utilities`
  dependency)

**Interfaces:**
- Produces:
  - `generateNeutralRamp(seedHex: string): { light: NeutralTones, dark: NeutralTones }` where
    `NeutralTones = { background, foreground, border, surface, surfaceText, surfaceHover,
    surfaceActive, surfaceActiveText }` — every value a `#rrggbb` hex string.
  - `generateAccentPair(seedHex: string): { accent: string, onAccent: string }` — theme-invariant,
    matching the existing schema (`dark.semantic.color` has no `accent`/`onAccent` override today;
    this generator's output for these two stays a single value, not a light/dark pair, exactly
    like the hand-authored version).

**Design (fill in against real HCT tone semantics, not guessed alphabetically):**

```js
// generate-ramp.mjs
import { Hct, TonalPalette, argbFromHex, hexFromArgb } from "@material/material-color-utilities";

function tone(palette, t) {
  return hexFromArgb(palette.tone(t));
}

// Tone indices chosen to match this brand's existing hand-picked values as closely as
// possible (see DESIGN.md's "Color roles" section for what each slot means) — verify against
// the current tokens.json/dark block's actual hex values as part of writing this task's spec,
// don't just trust these numbers blind.
export function generateNeutralRamp(seedHex) {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const neutral = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, 8));
  return {
    light: {
      background: tone(neutral, 99),
      foreground: tone(neutral, 10),
      border: tone(neutral, 90),
      surface: tone(neutral, 98),
      surfaceText: tone(neutral, 10),
      surfaceHover: tone(neutral, 94),
      surfaceActive: tone(neutral, 10),
      surfaceActiveText: tone(neutral, 99),
    },
    dark: {
      background: tone(neutral, 11),
      foreground: tone(neutral, 92),
      border: tone(neutral, 22),
      surface: tone(neutral, 32),
      surfaceText: tone(neutral, 99),
      surfaceHover: tone(neutral, 38),
      surfaceActive: tone(neutral, 99),
      surfaceActiveText: tone(neutral, 13),
    },
  };
}

export function generateAccentPair(seedHex) {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const accentPalette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);
  return {
    accent: tone(accentPalette, 70),
    onAccent: tone(accentPalette, 10),
  };
}
```

- [ ] Write `generate-ramp.test.mjs`: feed today's actual light/dark hex values' approximate hue
      back in and assert the WCAG pairs the generator produces (`background`/`foreground`,
      `surface`/`surfaceText`, `surfaceActive`/`surfaceActiveText`, both themes) each hit ≥4.5:1 —
      reuse `contrast.test.mjs`'s existing `luminance`/`ratio` helpers (extract them to a small
      shared `contrast-math.mjs` if duplicating them a second time feels wrong — a real call to
      make at spec time, not decided here).
- [ ] Run tests, confirm failing (function doesn't exist yet).
- [ ] Implement `generate-ramp.mjs` per the design above, tune tone indices until the contrast
      tests pass for at least 3 different seed hues (a warm neutral, a cool neutral, a
      saturated one) — this tuning is the actual work of this task, not the scaffolding.
- [ ] Run `node --test app/packages/design-system/src/generate-ramp.test.mjs`, confirm passing.
- [ ] Run the full `npm test --workspace @guitar-tabs/design-system` — confirm all 45+N tests
      still pass, especially `contrast.test.mjs` unmodified.
- [ ] Checkpoint commit.

---

### Task 1b: Wire the generator into brand authoring + editor

Lets someone pick a neutral seed + accent seed and regenerate the brand's full color set, instead
of hand-editing each of the ~18 color leaves individually.

**Files:**
- Modify: `app/app/api/design-system/tokens/route.ts` — new `action: "generate-from-seed"`
  branch, `{ neutralSeed, accentSeed }` body, calls `generateNeutralRamp`/`generateAccentPair`
  from Task 1, writes the results into `tokens.json`'s `semantic.color` and `dark.semantic.color`
  exactly like `applyWrite` does today (reuse `stringifyTokens`, don't hand-roll JSON writing).
- Modify: `app/packages/design-system/src/token-writes.mjs` — add
  `applyGenerateFromSeed(tokensTree, neutralSeed, accentSeed)`, following the existing
  `applyWrite`/`applyResetAll` pattern (pure function, tempfile-round-trip tested).
- Modify: `app/app/design-system/editor.tsx` — one new section at the top ("Generate from seed
  colors"): two `ColorField`s (neutral, accent) + a `Button` that POSTs the new action.
- Test: `app/packages/design-system/src/token-writes.test.mjs` — add cases for
  `applyGenerateFromSeed`.

**Interfaces:**
- Consumes: `generateNeutralRamp`, `generateAccentPair` (Task 1); `stringifyTokens`,
  `getLeaf` (existing, `token-writes.mjs`).
- Produces: `applyGenerateFromSeed(tokensTree, neutralSeed, accentSeed): { ok: true, tree } |
  { ok: false, error }` — same result shape as `applyWrite`, so `route.ts` handles it identically.

- [ ] Write `token-writes.test.mjs` cases: valid seeds produce a tree with all 18 color leaves
      populated and internally consistent (dark block only contains the theme-varying keys, same
      invariant `build-tokens.mjs`'s `themeVaryingColorRef` already relies on).
- [ ] Run, confirm failing.
- [ ] Implement `applyGenerateFromSeed`.
- [ ] Wire the route + editor UI.
- [ ] Run `npm run verify`; manually generate from 2-3 seed pairs in the running editor, confirm
      the live app (both `data-theme="light"` and `"dark"`, toggle via devtools until Task 4 ships
      a real switcher) still reads correctly and passes the existing contrast test.
- [ ] **Extend `contrast.test.mjs`'s hand-enumerated `PAIRS` array** if generation introduces any
      new color-pair relationship not already covered — a discipline check, not new tooling
      (research finding: a hand-enumerated contrast test silently stops covering new pairs if
      nobody remembers to extend it; make it a checklist item here rather than trusting memory).
- [ ] Checkpoint commit.

---

### Task 2: Live, direct-DOM preview in the editor

Today, seeing a color/slider change requires `postAction` → API writes `tokens.json` →
`router.refresh()` re-reads the file → Next re-renders. That's a real round trip per edit
(confirmed by reading `editor.tsx`'s `runWrite`). This task adds instant visual feedback by
mutating `document.documentElement.style` directly as the user drags/types, before any network
call — the same technique liftkit's `ThemeProvider` uses (`root.style.setProperty` in a `useEffect`
reacting to local state), adapted to this editor's existing commit-on-blur/debounce model rather
than replacing it.

**Files:**
- Modify: `app/app/design-system/editor.tsx` — `ColorRow` and `SliderRow`.

**Interfaces:**
- No new exported functions; this is UI-only. The CSS custom property name for a given field is
  derivable from `FieldDescriptor.path` — confirm the exact kebab-case mapping
  `build-tokens.mjs` uses (`--color-<kebab>` for `semantic.color.*`, `--<kebab>` for bare keys,
  `--component-<component>-<kebab>` for `component.*` — read `generateCSS`'s `theme.push(...)`
  lines directly, don't guess) before writing the spec for this task.

**Design:**

```tsx
// Inside ColorRow, alongside the existing `text`/`setText` state:
useEffect(() => {
  document.documentElement.style.setProperty(cssVarNameFor(d), text);
}, [text, d]);

// Inside SliderRow, alongside `num`/`setNum`:
useEffect(() => {
  document.documentElement.style.setProperty(cssVarNameFor(d), `${num}${UNIT[d.$type]}`);
}, [num, d]);
```

Where `cssVarNameFor(d: FieldDescriptor): string` is a small new helper co-located in
`editor.tsx`, built from `d.path` — this is the part that needs `build-tokens.mjs`'s exact naming
convention confirmed, not assumed.

**Reverting a live-only preview on error/escape:** `ColorRow`'s existing `Escape` handler resets
`text` to `d.value` — since the effect above re-runs whenever `text` changes, escaping already
un-previews for free. Same for a failed `commit()`: `d.value` stays the old value, so the next
`router.refresh()` (which happens even on failure paths that don't early-return before it) will
naturally re-sync the inline style to the real committed value. Confirm this actually happens
(it might not, if `runWrite`'s early `return` on `!result.ok` skips `router.refresh()` — check
`editor.tsx`'s `runWrite` before assuming) — if it doesn't self-correct, this task needs an
explicit "reset the inline style property back to `d.value` on write failure" step too.

- [ ] Confirm the CSS var naming convention (read `build-tokens.mjs`, don't assume).
- [ ] Confirm the error-path revert behavior (read `runWrite`, don't assume).
- [ ] Implement `cssVarNameFor` + the two `useEffect`s.
- [ ] Manual verification (no automated test — this is real-browser visual behavior, same
      reasoning `ui-fretboard-playhead`'s spec used for skipping a test requirement): open
      `/design-system`, drag a slider, confirm the change appears on the live editor page itself
      instantly (the editor page uses the tokens too — its own `Button`/`Slider`/`ColorField` are
      rendered with `@guitar-tabs/design-system` components), before the debounced commit fires.
- [ ] `npm run verify`.
- [ ] Checkpoint commit.

---

### Task 3: Shared hover/press/focus state primitive

**What already exists, so this task doesn't re-invent it:** interaction states are already
formula-driven from `semantic.state.hoverOpacity`/`focusOpacity`/`pressedOpacity` via
`color-mix()` (see `DESIGN.md`'s "Component behavior expectations" and `Button.tsx`'s
`PRIMARY_HOVER` constant) — liftkit's `StateLayer` doesn't bring a new *concept* here, since we
already derive states from opacity tokens rather than hand-picking hover colors. What it does
bring: **one shared implementation instead of every component writing its own `color-mix()`
string.** Today `Button.tsx` has its own `PRIMARY_HOVER` Tailwind arbitrary-value string; a
`Slider`/`ColorField`/`SegmentedControl` audit (do this first, at spec-writing time — don't assume
their current state) will show whatever each one does today.

**Files:**
- Create: `app/packages/design-system/src/components/StateOverlay.tsx` — a small internal
  (non-exported from `index.ts`) helper component, not a new public primitive: an absolutely
  positioned `<span>` using `background-color: currentColor`, opacity driven by CSS attribute
  selectors on parent `:hover`/`:active`/`:focus-visible`, magnitude read from the existing
  `--state-hover-opacity`/`--state-pressed-opacity`/`--state-focus-opacity` custom properties
  (not hardcoded percentages like liftkit's `0.16`/`0.5`/`0.35` — ours are already tokens, keep
  them tokens).
- Create: `app/packages/design-system/src/components/StateOverlay.css` (or inline via existing
  Tailwind arbitrary-value convention — match whatever `ColorField.tsx`/`Slider.tsx` already do,
  confirm at spec time rather than introducing a second styling convention into a 4-component
  package).
- Modify: `Button.tsx` (replace `PRIMARY_HOVER` usage with `<StateOverlay />`), and whichever of
  `ColorField.tsx`/`Slider.tsx`/`SegmentedControl.tsx` the audit above finds duplicating the same
  pattern.

**Interfaces:**
- Produces: `<StateOverlay />` — no props needed for the common case (reads `currentColor` from
  its parent, like liftkit's default). The one prop worth keeping from liftkit's version:
  `forcedState?: "hover" | "active"` for a case like "this option is already selected, so it
  should always show at hover-opacity even when the mouse isn't over it" — confirm at spec time
  whether `SegmentedControl` actually needs this before adding it (YAGNI otherwise).

- [ ] Audit `ColorField.tsx`, `Slider.tsx`, `SegmentedControl.tsx` for existing hover/focus/press
      CSS — document exactly what each does today in the task's spec (this is the "check current
      code before drafting" step; don't write the spec from `Button.tsx`'s pattern alone and
      assume the other three match it).
- [ ] Write `StateOverlay.tsx` + its CSS.
- [ ] Refactor `Button.tsx` to use it; run `npm run verify` — no visual regression (manual check:
      hover/press/focus a button in the running app, compare before/after).
- [ ] Refactor whichever other components the audit flagged.
- [ ] **Optional, cheap, same file — `forced-colors: active` support.** Windows/some browsers'
      forced-colors mode overrides custom-painted colors with OS system colors, which can flatten
      a `currentColor`+opacity overlay to invisible (research finding). Since this task is already
      touching `StateOverlay.css`, add one `@media (forced-colors: active)` block redefining the
      state-opacity custom properties using system color keywords (e.g. `Highlight`) — small
      enough to fold in here, not worth its own task. Verify manually (Windows/forced-colors
      emulation in devtools), same "no automated test" reasoning as the rest of this task.
- [ ] `npm run verify`.
- [ ] Checkpoint commit.

---

### Task 4: Dark/light theme switcher

**What already exists:** `build-tokens.mjs` already emits both `[data-theme="light"]` and
`[data-theme="dark"]` CSS blocks from `tokens.json`'s base + `dark` blocks (confirmed by reading
`app/app/design-tokens.generated.css`). `tokens.json`'s `dark` block already has real, distinct
values (not placeholders). The only thing hardcoding the app to dark-only is
`app/app/_components/StudioShell.tsx:11`'s literal `data-theme="dark"`. This task is almost
entirely UI + persistence, not token/build work — scope it that way, don't let it balloon into
touching the generator.

**Files:**
- Modify: `app/app/_components/StudioShell.tsx` — replace the hardcoded `data-theme="dark"` with
  state.
- Create: `app/hooks/useThemeMode.ts` — `() => { mode: "light" | "dark", toggle: () => void }`,
  backed by `localStorage` (key: `"guitar-tabs-theme"`), falling back to
  `window.matchMedia("(prefers-color-scheme: dark)")` on first load if nothing is stored yet.
- Modify: wherever `MetronomeControls`/`DetailToolbar`-style small controls already live (check
  `DetailToolbar.tsx` — it's already the home for compact toggle-style controls like "Note
  sound", per its own comment referencing `StringOrientationToggle`) — add a theme toggle button
  there, not a new floating UI element.
- Test: none required (a `localStorage`-backed React hook + a DOM attribute — this project's
  `node --test` runner has no DOM/browser harness, same reasoning `ui-fretboard-playhead`'s spec
  used; manual visual check is the real gate here).

**Interfaces:**
- Produces: `useThemeMode(): { mode: "light" | "dark"; toggle: () => void }`.
- Consumes (in `StudioShell.tsx`): replace `<div data-theme="dark" ...>` with
  `<div data-theme={mode} ...>` where `mode` comes from `useThemeMode()`.

- [ ] Write `useThemeMode.ts`.
- [ ] Wire it into `StudioShell.tsx`.
- [ ] Add the toggle button to `DetailToolbar.tsx` (confirm exact placement/styling convention by
      reading that file first, not guessing from `StringOrientationToggle`'s pattern alone).
- [ ] Manual check: toggle in the browser, reload the page, confirm it persisted; confirm every
      view (Sheet/Fretboard/Ascii, the `/design-system` editor itself) reads correctly in both
      modes — this is the first time light mode will actually be seen live, so this is also
      informal QA of Task 1's generated (or hand-authored, if Task 1 hasn't shipped yet) light
      values.
- [ ] `npm run verify`, `npm run stage`.
- [ ] Checkpoint commit.

---

### Task 5: Multi-brand inheritance with per-token reset-to-parent

`docs/BACKLOG.md` item 14, quoted directly (that file is not being edited right now — see the
note above): *"One main design system holds the source-of-truth token values. Any surface that
needs a different look — the backlog board, the eventual local processing UI, or anything else
deemed to need a different look and feel — gets its own child design system that can override
individual token values on top of the main one. Any overridden value must be resettable back to
the main system's value per-token, not an all-or-nothing fork."* Its listed dependency ("the
token playground reaching a stable, exportable set") is satisfied — the system shipped via PR
#20 — so this is unblocked now, just never re-surfaced. Its "Cons" section already asks the right
question: *"something that can tell 'this value was deliberately overridden' from 'this value is
just inherited'"* and *"build-time... vs. runtime"* — both resolved below rather than left open,
since leaving them open is exactly the kind of unstated judgment call this project's own
execution loop (§5.1 of `WEB_APP_WORKFLOW.md`) exists to catch.

**External validation for this design:** Shopify Polaris models a runtime theme switch as a named
token-overlay selection on its `AppProvider` (a `theme` prop accepting a `ThemeName`) rather than
a separate mechanism from its base tokens — i.e. real systems treat "theme" and "brand variant" as
the same underlying mechanism (a named overlay), which is exactly what reusing the `dark`-block
overlay shape for child-brand overrides below does. Not a new task, just confirms this design
direction rather than inventing a second, parallel mechanism.

**Resolved decisions (make these explicit in this task's own spec too, don't silently inherit
them from this plan without saying so):**
- **Build-time, not runtime.** `generateCSS` already runs at `predev`/`prebuild`/`prestage`
  (Task 3's cutover) and reads one `active-brand.json`-selected directory. A child brand gets its
  own `active-brand.json` (or an equivalent per-surface build invocation) pointing at its own
  directory; there is no client-side merge, no extra runtime cost, and no new build-time
  dependency beyond the existing script.
- **"Inherited" vs. "overridden" is structural, not value-based.** A child brand's `tokens.json`
  contains *only the leaves it overrides* — if a leaf is absent, it's inherited from the parent,
  full stop. This is the same shape `tokens.json`'s own `dark` block already uses to overlay
  `semantic.color` onto the base tree (and `contrast.test.mjs` already has a working `deepMerge`
  for exactly this shape — reuse it, don't write a second merge function). Comparing values (e.g.
  "override happens to equal the parent's current value") is explicitly the wrong test — it
  can't tell "deliberately overridden to the same value" from "never overridden," and would break
  the moment the parent's value changes.
- **Reset-to-parent means deleting the leaf from the child's `tokens.json`**, not copying the
  parent's current value into it — copying would look identical today but silently stops
  inheriting future parent changes, which defeats the entire point of the feature.

**Files:**
- Create: `app/packages/design-system/brands/<child-brand-name>/tokens.json` (a first real child
  — read `docs/backlog-board/DESIGN.md` per item 14's own text and decide, at spec-writing time,
  whether migrating the backlog board's hand-pulled palette to a real child brand is in-scope for
  this task or a fast-follow; don't silently expand scope to include it without saying so).
- Modify: `app/packages/design-system/brands/<child-brand-name>/` needs a way to declare its
  parent — e.g. a sibling `brand.json` with `{ "parent": "default" }` (exact shape is a real
  decision for the task's spec, not fixed here).
- Modify: `app/packages/design-system/src/build-tokens.mjs` — `resolveBrandDir`/`generateCSS`
  need a merge step: if the resolved brand has a `parent`, recursively resolve the parent's tree
  first (supporting more than one level of inheritance is explicitly YAGNI — cap at one level,
  parent-of-a-parent is out of scope unless a real second use case shows up), then `deepMerge`
  the child's `tokens.json` on top before proceeding exactly as today.
- Modify: `app/packages/design-system/src/token-writes.mjs` — `applyReset` needs a
  parent-brand-aware variant (or a new function) that deletes the leaf from the child's tree
  instead of copying from `tokens.default.json`, when operating on a child brand. Decide at spec
  time whether this is a new `applyResetToParent` or a mode flag on existing `applyReset` — don't
  silently overload the existing function's meaning without documenting the change.
- Modify: `app/app/design-system/editor.tsx` / `FieldDescriptor` (`field-descriptors.mjs`) —
  `isModified` today means "differs from `tokens.default.json`"; a child brand's editor needs a
  parallel `isInheritedFromParent` so the UI can show "inherited" vs. "overridden" distinctly,
  and the revert button's label/behavior changes accordingly on a child brand.
- Test: `build-tokens.test.mjs` (golden CSS output for a 2-brand parent/child fixture),
  `token-writes.test.mjs` (reset-to-parent deletes rather than copies).

**Interfaces:**
- Produces: `resolveBrandTree(brandDir): { tree, parentBrandDir: string | null }` (or equivalent —
  exact naming is a spec-time decision) that `generateCSS` consumes instead of a bare
  `JSON.parse(readFileSync(...))`.
- Produces: whatever reset function Task 5 lands on, consumed by
  `app/app/api/design-system/tokens/route.ts`'s existing `action` dispatch (add a case, don't
  restructure the dispatch).

- [ ] Decide, in this task's own spec: is migrating `docs/backlog-board/`'s palette to a real
      child brand in-scope, or is a synthetic test-fixture child brand enough for this task?
- [ ] Write the parent-resolution + merge logic, with a test fixture (a `default` + one child
      brand pair) proving: a leaf present only in `default` resolves for the child; a leaf
      present in the child overrides it; `deepMerge`'s existing semantics (reused, not
      reimplemented) are what's actually doing the merging.
- [ ] Run tests, confirm failing, implement, confirm passing.
- [ ] Write the reset-to-parent logic + its test (deletes, doesn't copy — assert the leaf is
      literally absent from the child's `tokens.json` afterward, not just value-equal to parent).
- [ ] Wire the editor UI's inherited/overridden distinction.
- [ ] `npm run verify`; manually build both brands (`predev`/whatever the per-surface build
      invocation ends up being — decided at spec time) and visually confirm the child renders
      with its overrides while inheriting everything else.
- [ ] Update `docs/BACKLOG.md` item 14's status, once that file is confirmed clear of the
      concurrent session's uncommitted changes.
- [ ] Checkpoint commit.

---

### Task 6: Token orphan-detection test

Sourced from external research (see `app/packages/design-system/SELF-EVALUATION.md`'s anti-pattern
section), not liftkit or the backlog. A generator (Task 1) makes it easy to leave old
hand-authored token paths orphaned when a brand switches over to generated values, and unused
tokens are a named, common source of design-system bloat ("add noise without adding value...
tempt developers to reach for the wrong thing"). Small and standalone — fits this project's
existing all-in-house `node --test` convention rather than pulling in an external linter
(Design Token Kit, a Stylelint plugin) for a 4-component package.

**Files:**
- Create: `app/packages/design-system/src/token-usage.test.mjs`

**Interfaces:** none new — this is a test-only task, reading existing files.

- [ ] Write a test that: (1) walks `tokens.json` via the existing `collectLeafPaths`
      (`token-writes.mjs`) to get every leaf path, (2) greps `app/packages/design-system/src/**`
      and `app/app/**`/`app/components/**` for `var(--...)` and `{path.to.token}` occurrences,
      (3) asserts every `component.*` and `semantic.*` leaf is referenced at least once somewhere
      (primitive-layer leaves are expected to be referenced only via `{...}` aliases from
      semantic, not directly — exclude them from the "must be directly used" check, confirm this
      distinction at spec time rather than assuming it needs no explanation).
- [ ] Run against the current tree, confirm it passes today (if it doesn't, that's a real finding
      to report, not a bug in the test — investigate before assuming the test is wrong).
- [ ] `npm run verify`.
- [ ] Checkpoint commit.

---

### Task 7: Per-component sidebar navigation

User-requested (2026-09-20), revised same day to add an explicit "All variables" entry — not from
liftkit or research. Today's editor (`editor.tsx`) renders every section — semantic sections, then
all four components' sections — as one long scrolling page. This task adds a sidebar with **five**
entries: **All variables** (today's full flat page, unchanged, for global edits from one place)
and the four `component.*` sections (`SECTIONS` entries with `group: "Components"` — `Button`,
`ColorField`, `Slider`, `SegmentedControl`) for narrower, single-component edits. "All variables"
is a real, named, clickable sidebar item — not an implicit default/no-selection state — so the
sidebar always shows the user exactly where they are and both scopes (global vs. per-component)
are equally first-class, reachable the same way.

**Files:**
- Modify: `app/app/design-system/editor.tsx` — add a `selectedView: "all" | ComponentSectionKey`
  state (default `"all"`); render a sidebar with all five entries alongside the existing content;
  `"all"` renders exactly what the page renders today (all sections, unchanged); a component
  selection renders only that component's fields (`fieldsFor(key)`) plus a live-rendered instance
  of the actual component, instead of scrolling to find it in the flat list.
- Modify: the per-component detail area also renders one live instance of the actual component
  (`import { Button, ColorField, Slider, SegmentedControl } from "@guitar-tabs/design-system"`)
  with representative sample props, so a token edit is visible on a real rendered instance, not
  just as a hex/number in a field row — this is the live-preview gap from the start of this
  conversation, now scoped to exactly the place it matters most (per-component editing). "All
  variables" does not get this live-instance treatment — it's the global/bulk view, matching
  today's page exactly.

**Interfaces:** none new exported — this is a `editor.tsx`-internal restructuring. No change to
`field-descriptors.mjs`, `token-writes.mjs`, or the API route.

- [ ] Confirm current `editor.tsx` structure/props one more time immediately before writing this
      task's spec (it will have changed if Tasks 1b/2 landed first — re-read, don't assume the
      version described earlier in this plan is still current).
- [ ] Implement the sidebar (five entries: "All variables" + four components) + `selectedView`
      state.
- [ ] Implement "All variables" as exactly today's page (a straight extraction, no behavior
      change) and the per-component detail area's fields list (reuse `fieldsFor`/`FieldRow`
      unchanged).
- [ ] Add the live-rendered component instance to the per-component detail area, one per
      component type (four small render branches, not a generic "renders any component"
      abstraction — YAGNI until a fifth component exists).
- [ ] `npm run verify`; manually click through "All variables" and all four components, confirm
      "All variables" is pixel-identical to today's page, and each component's fields + live
      instance both render and update together.
- [ ] Checkpoint commit.

**A real spec for this task has been written** (per the execution loop, `WEB_APP_WORKFLOW.md` §5):
`docs/specs/design-system-editor-sidebar.md`, ready to relay to the execution model.

---

### Task 8: Exception-vs-brand-wide edit scope, staged changes, explicit Save

User-requested (2026-09-20), not from liftkit or research. Builds on Task 7's per-component view.
Today, every field edit auto-commits on blur (`ColorRow`)/after a 200ms debounce (`SliderRow`) via
`runWrite` → `POST /api/design-system/tokens` → `router.refresh()`. This task changes that model
for edits made inside a Task 7 component panel: edits are held locally until an explicit "Save"
action, and each edit carries a scope choice — an **exception** (this component only) or a
**brand-wide style change** (cascades to every component sharing the same underlying token).

**How "brand-wide" is actually possible without new schema:** a `component.*` leaf like
`component.button.primaryBackground` is either an alias (`rawValue` = `"{semantic.color.accent}"`,
`isAlias: true` — both already computed by `buildFieldDescriptors`, `field-descriptors.mjs:88`)
or a literal. When it's an alias, "brand-wide" means writing the new value to the **aliased
semantic path** (`d.rawValue.slice(1, -1)`, e.g. `"semantic.color.accent"`) instead of to
`d.path` — every other component whose own leaf also aliases that same semantic path picks up
the change automatically, because `resolveValue` re-resolves the alias live; no new "which
components share this token" tracking needed, the existing reference graph already *is* that
information. "Exception" means the ordinary `applyWrite(d.path, value)` — unchanged from today's
behavior, just no longer auto-committed (see below).

**Resolved decision — when "brand-wide" isn't offered:** if `d.isAlias` is `false` (the field is
already a literal, not aliasing any shared token), there's nothing to cascade *to* — offer only
"exception" in that case, don't show a meaningless disabled-by-definition second option. Confirm
at spec time whether this should show as a disabled radio (visible but greyed, with a tooltip
explaining why) or be hidden entirely — a real UX call, not fixed here.

**"Ability to reverse to brand" for an exception:** this is the existing Revert button/`applyReset`
— already restores a leaf to `tokens.default.json`'s value at that path, which for an
never-touched component leaf is the alias reference back to the shared semantic token. Confirm at
spec time that `tokens.default.json` still holds that leaf as an alias (i.e. nobody has previously
used "Set as default" — `applySetAsDefault` — to bake a literal into the defaults file for that
exact path); if it has, Revert legitimately won't restore the alias, and that's correct existing
behavior, not a bug this task needs to fix.

**Staged changes + explicit Save:**

**Files:**
- Modify: `app/app/design-system/editor.tsx` (Task 7's component detail panel) — replace
  `ColorRow`/`SliderRow`'s auto-commit-on-blur/debounce with local pending-edit state: a
  `Map<path, { value: string; scope: "exception" | "brand" }>` (or equivalent), held at the
  `Editor` component level so a "Save" bar can span all of a component's pending edits at once.
  Task 2's live-DOM-preview mutation (`document.documentElement.style.setProperty`) still fires
  on every change regardless of pending/saved state — **this task changes when a value is
  persisted to disk, not the instant-visual-feedback mechanism Task 2 built.** State the
  supersession explicitly in this task's spec: Task 2's auto-commit-on-blur is what's being
  replaced here; Task 2's live-preview effect is being kept and reused as-is.
- Add a "Save changes (`N`)" button, visible only when the pending-edits map is non-empty, that
  sends every pending edit in one batch.
- Modify: `app/app/api/design-system/tokens/route.ts` — new `action: "batch-write"`,
  `{ edits: { path: string; value: string }[] }`.
- Modify: `app/packages/design-system/src/token-writes.mjs` — add
  `applyBatchWrite(tokensTree, edits: { path, value }[])`: validates every edit first (reusing
  `validateWriteValue`), and applies **all-or-nothing** — if any single edit fails validation,
  none are written. A partially-applied explicit Save would be worse than today's auto-commit
  model, not an improvement; don't ship a partial-apply path.
- Test: `token-writes.test.mjs` — `applyBatchWrite` cases: all-valid batch applies every edit;
  one invalid edit in a batch of three applies none of them; a `"brand"`-scoped edit resolves to
  the alias target path, not the originating component path (this is the core new behavior —
  test it directly, not just "batch write works").

**Interfaces:**
- Produces: `applyBatchWrite(tokensTree, edits: { path: string; value: string }[]): { ok: true,
  tree } | { ok: false, error }` — same result shape as `applyWrite`/`applyResetAll`, so
  `route.ts` handles it identically to the existing actions.
- Consumes (in `editor.tsx`): for a pending edit `{ path, value, scope }` on a `FieldDescriptor
  d`, resolve the write path as `scope === "brand" ? d.rawValue.slice(1, -1) : d.path` before
  adding it to the batch sent to `applyBatchWrite`.

- [ ] Write `applyBatchWrite` + its tests (all-valid, one-invalid-rejects-all, brand-scope
      resolves to the alias target).
- [ ] Run, confirm failing, implement, confirm passing.
- [ ] Wire the pending-edits state + Save button into Task 7's detail panel.
- [ ] Wire the exception/brand-wide radio per field, disabled/hidden per the resolved decision
      above when `d.isAlias` is `false`.
- [ ] **Decide and document, in this task's own spec, what happens to unsaved pending edits when
      the user switches to a different component or closes the panel** — discard silently, warn,
      or persist across navigation until an explicit Save/Discard. Not resolved here; pick one
      and write it down, don't leave it implicit.
- [ ] `npm run verify`; manually: edit two fields on one component with different scopes, confirm
      neither writes to disk until Save is clicked, confirm the "brand" one changes a second
      component that shares the same token, confirm Revert still works pre- and post-Save.
- [ ] Checkpoint commit.

## Self-Review

**Spec coverage:** liftkit review findings map 1:1 — generative color → Task 1/1b, live preview →
Task 2, `StateLayer` → Task 3, theme switcher (user's explicit add) → Task 4, multi-brand
inheritance + per-token reset (user's explicit add, = `BACKLOG.md` item 14) → Task 5, orphan-token
detection (research finding) → Task 6, per-component sidebar (user's explicit add) → Task 7,
exception-vs-brand-wide staged edits with explicit Save (user's explicit add) → Task 8. No gaps.
Research findings assessed as "overkill for now"
(Storybook-class docs, token versioning/changelog, `prefers-reduced-motion` tokens) are recorded
in `SELF-EVALUATION.md` rather than turned into tasks nobody asked for — deliberately not adding
scope the project doesn't need yet, per this session's own bloat lessons.

**Placeholder scan:** Task 1's tone indices are explicitly flagged as "verify against real values,
don't trust blind" rather than asserted as correct — that's a known open question for the task's
own spec to resolve empirically (via the contrast test), not a placeholder standing in for
missed work. Task 2/3/4 each name the exact file to read before writing code, where this plan
doesn't already know the answer (CSS var naming convention, other components' current hover CSS,
`DetailToolbar.tsx`'s exact layout) — consistent with this session's own lesson about not
drafting specs from assumption.

**Type consistency:** `generateNeutralRamp`/`generateAccentPair` (Task 1) return shapes are
consumed as-is by `applyGenerateFromSeed` (Task 1b) with no renaming. `useThemeMode`'s return
shape (Task 4) is used directly in `StudioShell.tsx` with no renaming.

**Task independence, explicitly:** Tasks 1/1b, 2, 3, 4, 5, 6, 7, and 8 touch disjoint files
except: all touch `app/packages/design-system/` broadly; Tasks 1b/2 both touch `editor.tsx`
(different sections) — sequence 1/1b before 2 if both are in flight; Task 5 also touches
`editor.tsx` (`isInheritedFromParent`) and `build-tokens.mjs`/`token-writes.mjs` (same files Tasks
1/1b/2 touch) — Task 5 is the largest and riskiest task before Task 8 (it changes what "reset"
*means* on a child brand, not just adding a new one); Task 6 only reads existing files and has no
ordering dependency — run it whenever, including first.

**Tasks 7 and 8 have a hard, explicit dependency chain, unlike everything else in this plan:**
Task 8 restructures `editor.tsx`'s commit model (auto-commit-on-blur → staged edits + explicit
Save) *inside the per-component panel Task 7 creates* — Task 8 cannot be written or reviewed
meaningfully before Task 7 exists, and Task 8's own spec explicitly supersedes Task 2's
auto-commit behavior (while keeping Task 2's live-preview mutation mechanism) — sequence 2 → 7 →
8 strictly, not "any order" like the rest of this plan's tasks.
