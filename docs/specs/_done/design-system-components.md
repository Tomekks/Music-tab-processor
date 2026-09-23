# Task spec: Design system — component primitives (ColorField, Slider, SegmentedControl, Button)

Implements Task 4 of `docs/superpowers/plans/2026-09-19-design-system.md`. Read that task's
section first. Depends on Task 1 (`docs/specs/design-system-brand-data.md`), Task 2
(`docs/specs/design-system-resolver-and-build.md`), and Task 3
(`docs/specs/design-system-cutover.md`), all implemented and verified on
`task/design-system-brand-data` (not yet merged to `master`). Work from that branch.

**This is the first task that ships React/`.tsx` code in `packages/design-system`** (Layer 1,
design spec §1) and the first that needs `next.config.ts`'s `transpilePackages`. Tasks 1–3 were
additive and inert; this one is still additive (no existing file's *behavior* changes — nothing
in `app/app/` imports these components yet, that's Task 6), but it's the first time this
package's code, not just its data, has to satisfy the "no hardcoded design values" constraint
directly.

**Revision note:** this spec was reviewed before implementation began (no components exist yet).
The review found the original draft's `component.*` theme-invariance workaround, YAGNI-violating
aliases, hardcoded opacity values, and several cheap-now/breaking-later gaps in the component
interfaces. The decisions below were made explicitly in response to that review and are now
binding for this task:

| Question | Decision |
|---|---|
| Fix `build-tokens.mjs`'s theme-invariance gap, or route around it? | **Fix it** (§0(a)) |
| Ship `disabled` on the four components now, or defer? | **Ship it now** (§3.1, §4) |
| Is `SegmentedControl` meant to replace `TabSelector.tsx`? | **No — permanent coexistence.** No prop-compatibility or migration effort required. Arrow-key nav and a required `ariaLabel` are still added because they're correctness issues, not compatibility ones (§4.3). |
| Button vertical padding: match existing 6px, or keep the new 8px? | **Match existing 6px** — a new `space["1.5"]` token is added since no exact match exists (§3.1). |
| `foreground/40` / `foreground/70`: tokenize, or replace with a color role? | **Tokenize** — new `semantic.state.mutedTextOpacity` / `mutedTextHoverOpacity` tokens (§3.1). |
| Primary button hover's literal `92%`/`8%`: leave hardcoded, or derive from `state.hoverOpacity`? | **Derive it** — `hoverOpacity` (and, for consistency of representation within the same section, `focusOpacity`/`pressedOpacity`/`disabledOpacity`) convert to percentage-string tokens so the hover formula can reference `var(--state-hover-opacity)` directly (§3.1, §3.3). Folded in per explicit instruction, widening this task's touch on Tasks 2–3's already-shipped `state.*` tokens. |
| `MetronomeControls.tsx`'s dead zinc button and border-hover-disappearance: leave flagged, or fix? | **Fix both**, narrowly, in this task (§1, §4.4a) — folded in per explicit instruction. This makes the "nothing in this task has a visible consumer yet" claim in the intro false for this one file; a manual `npm run stage` check is added to §8 because of it. |

## 0. Two things verified while writing this spec that change what it asks for

Both were checked directly against the real code/toolchain, not assumed — see
`[[verify-review-claims-independently]]`.

**(a) `generateCSS()` does not make `component.*` tokens theme-aware — and this task fixes that,
rather than routing around it.** Read `packages/design-system/src/build-tokens.mjs` directly
(lines 99–102): the `component.*` walk emits every leaf into `:root` exactly once, resolved
against the *base* (light) tree, with no `[data-theme="dark"]` override counterpart the way
`semantic.color` gets (lines 125–133 build that override block only from
`tokens.dark.semantic.color`). Concretely: `border`, `surface`, `surfaceText`, `surfaceHover`,
`surfaceActive`, and `surfaceActiveText` all differ between `tokens.json`'s base `semantic.color`
and its `dark.semantic.color` block — so a `component.*` token that referenced any of those would
silently freeze at its **light**-theme literal in `:root`, with nothing to override it for
`[data-theme="dark"]`.

**The fix (small, targeted, does not touch resolution semantics elsewhere):** in the
`component.*` emission loop, when a leaf's `$value` is a `{semantic.color.<key>}` reference and
`<key>` is one of the theme-varying keys (i.e. present in `tokens.dark.semantic.color`), emit a
`var()` alias to that color's own promoted CSS variable (`var(--color-border)`,
`var(--surface-text)` per `THEME_ONLY_COLOR_KEYS`'s bare naming, etc.) instead of resolving it to
a literal. Every other leaf (non-color, or a theme-invariant color like `accent`/`onAccent`)
resolves exactly as it does today, via `resolveValue`. This is a genuine alias, not a resolved
snapshot: a `component.*` custom property that aliases a theme-varying color inherits the
`[data-theme]` override automatically, because CSS variable references re-resolve live — no
per-theme duplication of `component.*` properties is needed. Net addition to
`build-tokens.mjs`: a small helper that detects a direct single-reference `$value` pointing at a
theme-varying `semantic.color.*` key, plus a branch in the existing `component.*` loop (§0(a) of
the review: "~10 lines"). No change to `resolve.mjs`, to how `semantic.*` or `@theme inline` are
emitted, or to the `[data-theme]` override block logic.

This means, unlike the original draft, `component.*` tokens in this task are **not** restricted to
`accent`/`onAccent`/non-color sections — a component may reference any semantic color, theme-
varying or not, and get correct behavior in both themes automatically. §3.1 below tokenizes the
full visible surface of all four components (including the previously-excluded borders,
secondary-variant colors, and inactive/track colors) for exactly this reason: with the alias fix
in place, leaving them untokenized would mean Task 6's schema-driven editor (which walks
`tokens.json` and renders one field per leaf) can never expose them, for no remaining technical
reason.

**(b) `build-tokens.test.mjs` pins an exact golden CSS string that this task's new `component.*`
tokens, and the `build-tokens.mjs` alias-emission change, will both change.** Because this spec's
`build-tokens.mjs` change is new logic (not just new data, as the original draft assumed), **the
exact golden string cannot be hand-derived here** — it must be generated by running the real,
updated `generateCSS()` against the exact token additions in §3.1, in the same commit that changes
both files. Do not write a "close enough" expected string and adjust the implementation to match
it; write the implementation first, run it, and paste its real output into `EXPECTED` (same
discipline as Task 3's golden test, per §10's stop-condition). **The plan's Task 4 file list
doesn't mention `build-tokens.mjs` or `build-tokens.test.mjs`; this spec's file allowlist (§6)
corrects that** — both now change in this task (`build-tokens.mjs` for the alias fix, the test for
its golden output).

## 1. Scope

- `app/next.config.ts`: add `transpilePackages: ["@guitar-tabs/design-system"]` to the existing
  config object (alongside the existing `rewrites()` — don't remove or restructure that).
- `app/packages/design-system/package.json`: add a `peerDependencies` field:
  `{ "react": "^19", "react-dom": "^19" }` (peer, not regular — the app already provides both;
  matches the versions actually installed at the repo root, `19.2.8`).
- `app/packages/design-system/src/build-tokens.mjs`: add the theme-varying-color alias branch to
  the `component.*` emission loop (§0(a)). This is the one deliberate exception to Tasks 1–3's
  "don't touch the build script" precedent — narrowly scoped to that one loop.
- `app/packages/design-system/brands/default/tokens.json` and `tokens.default.json`: add the
  `component.colorField`, `component.slider`, `component.segmentedControl`, `component.button`
  blocks, plus `semantic.space["1.5"]` and `semantic.state.mutedTextOpacity` /
  `mutedTextHoverOpacity` — identical in both files (§3.1).
- `app/packages/design-system/src/build-tokens.test.mjs`: update the pinned `EXPECTED` golden
  string to include the new `component.*` lines and the two new `semantic` additions, generated
  from the real, updated `generateCSS()` (§0(b)).
- Create `app/packages/design-system/src/components/{ColorField,Slider,SegmentedControl,Button}.tsx`
  (§4) and `app/packages/design-system/src/index.ts` (barrel export of all four plus their prop
  types, §4.5).
- `semantic.state.hoverOpacity`, `focusOpacity`, `pressedOpacity`, `disabledOpacity`: convert
  `$value` from a bare number to a percentage string (`"8%"`, `"10%"`, `"12%"`, `"50%"`), matching
  the representation `mutedTextOpacity`/`mutedTextHoverOpacity` use, so all five `state.*Opacity`
  tokens are var()-substitutable into a CSS percentage position (§3.1). This is a format change to
  tokens Tasks 2–3 already shipped — grep confirms (while writing this revision) the only
  consumers of these four are `build-tokens.test.mjs`'s golden string and `DESIGN.md`'s prose
  (`state.hoverOpacity`/etc., referenced by name, not by assumed numeric type) — no code multiplies
  or otherwise treats them as JS numbers, so the format change is safe.
- `app/components/MetronomeControls.tsx`: delete the dead duplicate "Reset to start" `<button>`
  (§4.4a) and correct `border-surface`/`hover:border-surface-hover` to `border-border` on the
  three surviving buttons, matching the same `border` semantic-role correction §4.4 makes inside
  the new `Button` component. **This is a real, user-visible fix** (two reset buttons currently
  render side by side) — unlike the rest of this task, it has an immediate consumer, so §8 adds a
  manual visual check for it.
- No `.env`/credential contact. Otherwise, no changes to `app/app/` — nothing else in this task
  has a consumer yet (that's Task 6).

## 2. Non-goals

- No changes to `app/app/_components/TabSelector.tsx`, and no prop-compatibility effort between it
  and `SegmentedControl` — the two coexist permanently (decision table, above). `SegmentedControl`
  reuses `TabSelector`'s `role="tablist"`/`aria-selected` approach as a starting point, not a
  target it must stay compatible with.
- No pressed/`:active` mouse-down styling beyond hover + the new `disabled` treatment (§4.4). Not
  required by any acceptance criterion here or in Task 6.
- No visual regression tooling, no Storybook, no new test framework — these components have no
  real consumer until Task 6, so there is nothing to visually verify here (§7).
- No `container`/`variant` role pairs (design spec §3's "explicitly not adopted" list) — Button's
  `primary`/`secondary` variants map directly to existing role pairs (`accent`/`onAccent`,
  `surface`/`surfaceText`), not a new naming scheme.
- No migration of `MetronomeControls.tsx`'s buttons onto the new `Button` component itself — that's
  Task 6's job (wiring real consumers). This task's touch on that file (§1, §4.4a) is limited to
  deleting the dead duplicate button and correcting the border-color class; the buttons stay
  hand-rolled Tailwind, not `<Button>` instances, until Task 6.
- Multi-tab / concurrent-edit safety — not applicable to these components; they hold no state of
  their own beyond what their props describe.

## 3. Interface / exact changes

### 3.1 Token additions — `tokens.json` and `tokens.default.json` (identical in both)

Two additions to `semantic` (needed by the component tokens below), plus the full `component`
block, replacing the current `"component": {}`.

**New `semantic` leaves:**

```json
"space": {
  "1.5": { "$value": "6px", "$type": "dimension" }
}
```

(added alongside the existing `space` keys, same section — not a new section). Named `"1.5"` to
match Tailwind's own spacing-scale naming for this exact value (`space-1.5` = `1.5 * 4px`), the
same convention the existing `1`/`2`/`3`/`4`/`6`/`8` keys already follow. Added because
`MetronomeControls.tsx`'s existing buttons use `py-1.5` (6px) and the button-height decision
(above) is to match that exactly — no existing token was close enough.

```json
"state": {
  "hoverOpacity": { "$value": "8%", "$type": "percentage" },
  "focusOpacity": { "$value": "10%", "$type": "percentage" },
  "pressedOpacity": { "$value": "12%", "$type": "percentage" },
  "disabledOpacity": { "$value": "50%", "$type": "percentage" },
  "mutedTextOpacity": { "$value": "40%", "$type": "percentage" },
  "mutedTextHoverOpacity": { "$value": "70%", "$type": "percentage" }
}
```

**The first four keys already exist** (as bare numbers, `$type: "number"`, values `0.08`/`0.10`/
`0.12`/`0.5`) — this task **converts their `$value`/`$type` in place** to percentage strings,
rather than only adding the two new muted-text keys. Reason: all six of these are the same kind of
token (an opacity fed into `color-mix()`/`opacity`), and DESIGN.md's "derived, not hand-picked"
rule (§3, `[[verify-review-claims-independently]]` — checked directly, not assumed) only holds if
they're actually usable as a live `var()` inside a CSS percentage position; a bare `0.08` is not a
valid CSS `<percentage>` token, so the existing four could never have driven `color-mix()` the way
DESIGN.md already claims they do. This is a deliberate, in-place format change to tokens Tasks 2–3
already shipped, not a new orthogonal pair — confirmed before making it that nothing outside
`build-tokens.test.mjs`'s golden string and `DESIGN.md`'s prose consumes these by name (§1), so no
other code depends on the old numeric `$type`.

**`component` block**, in **exactly this key order** (determines generated CSS line order — the
implementer captures the real order from running `generateCSS()`, per §0(b); do not hand-guess
it):

```json
"component": {
  "colorField": {
    "swatchSize": { "$value": "{semantic.space.6}", "$type": "dimension" },
    "radius": { "$value": "{semantic.radius.base}", "$type": "dimension" },
    "fontFamily": { "$value": "{semantic.typography.mono}", "$type": "fontFamily" },
    "border": { "$value": "{semantic.color.border}", "$type": "color" },
    "background": { "$value": "{semantic.color.surface}", "$type": "color" },
    "text": { "$value": "{semantic.color.surfaceText}", "$type": "color" }
  },
  "slider": {
    "trackColor": { "$value": "{semantic.color.border}", "$type": "color" }
  },
  "segmentedControl": {
    "gap": { "$value": "{semantic.space.6}", "$type": "dimension" },
    "border": { "$value": "{semantic.color.border}", "$type": "color" }
  },
  "button": {
    "paddingX": { "$value": "{semantic.space.3}", "$type": "dimension" },
    "paddingY": { "$value": "{semantic.space['1.5']}", "$type": "dimension" },
    "radius": { "$value": "{semantic.radius.base}", "$type": "dimension" },
    "fontFamily": { "$value": "{semantic.typography.sans}", "$type": "fontFamily" },
    "primaryBackground": { "$value": "{semantic.color.accent}", "$type": "color" },
    "primaryText": { "$value": "{semantic.color.onAccent}", "$type": "color" },
    "secondaryBackground": { "$value": "{semantic.color.surface}", "$type": "color" },
    "secondaryText": { "$value": "{semantic.color.surfaceText}", "$type": "color" },
    "secondaryBorder": { "$value": "{semantic.color.border}", "$type": "color" }
  }
}
```

Confirm `resolve.mjs`'s reference-parsing handles the `{semantic.space['1.5']}` path syntax
(a numeric-looking key with a literal dot in it) correctly against a plain `.` path-splitter — if
it doesn't, use whatever bracket/quote convention `resolve.mjs` already supports for non-identifier
keys, or fall back to `"button.paddingY": { "$value": "6px", "$type": "dimension" }` as a literal
(documented exception, not silently swapped) if no reference syntax works cleanly. This is the one
place in §3.1 where the "every leaf is a reference" rule (§6) may need a narrow, called-out
exception — verify against the real `resolve.mjs` before writing the literal fallback.

`accentColor`/`activeColor` from the original draft (slider, segmentedControl) are **removed**:
both resolved to `semantic.color.accent` with no divergence from the semantic token, which is
exactly the "for future flexibility" pattern the design spec's Global Constraints forbid. `Slider`
now consumes `accent-accent` directly (the existing promoted Tailwind color, no arbitrary-value
syntax needed) and `SegmentedControl`'s active state consumes `border-accent text-accent` directly
— both matching `TabSelector.tsx`'s current classes exactly, with no redundant alias. `radius`
tokens for `colorField`/`button` are kept as `component.*` leaves (not consumed directly via
`rounded-[var(--radius)]`) only because the design spec's own convention (§6.1: "a `component.<name>`
token block ... references semantic tokens only") treats radius as a normal per-component
tokenizable property, matching `button.radius`/`colorField.radius`'s prior treatment; if a reviewer
judges this still redundant given there's only one radius token in the whole schema, collapsing
both to `rounded-[var(--radius)]` directly is an equally valid, smaller alternative — noted here as
a judgment call, not settled.

| Token | References | Why |
|---|---|---|
| `colorField.swatchSize` | `semantic.space.6` (24px) | No dedicated size scale exists; closest existing token to a reasonable clickable swatch |
| `colorField.radius` | `semantic.radius.base` | The only radius token in the schema |
| `colorField.fontFamily` | `semantic.typography.mono` | DESIGN.md: mono for anything numeric/tabular — a hex code qualifies |
| `colorField.border` | `semantic.color.border` | Theme-varying; now tokenizable and editor-visible thanks to §0(a)'s fix |
| `colorField.background` | `semantic.color.surface` | Same |
| `colorField.text` | `semantic.color.surfaceText` | Same |
| `slider.trackColor` | `semantic.color.border` | Track color, previously left as a bare Tailwind default; now tokenized and theme-aware |
| `segmentedControl.gap` | `semantic.space.6` | Matches `TabSelector.tsx`'s `gap-6` exactly |
| `segmentedControl.border` | `semantic.color.border` | The tablist's bottom border, previously untokenized |
| `button.paddingX` | `semantic.space.3` (12px) | Matches `MetronomeControls.tsx`'s `px-3` |
| `button.paddingY` | `semantic.space['1.5']` (6px) | Matches `MetronomeControls.tsx`'s `py-1.5` exactly (decision table, above) |
| `button.radius` | `semantic.radius.base` | The only radius token in the schema |
| `button.fontFamily` | `semantic.typography.sans` | UI text, per DESIGN.md |
| `button.primaryBackground` | `semantic.color.accent` | First real use of `accent` as a fill; DESIGN.md already anticipates this |
| `button.primaryText` | `semantic.color.onAccent` | DESIGN.md: contrast-safe pairing already computed and tested (Task 2's `contrast.test.mjs`) |
| `button.secondaryBackground` | `semantic.color.surface` | Matches `MetronomeControls.tsx`'s secondary buttons |
| `button.secondaryText` | `semantic.color.surfaceText` | Same |
| `button.secondaryBorder` | `semantic.color.border` | Same — see §4.4 for the one deliberate correction versus that file's literal class |

### 3.2 `build-tokens.test.mjs` — updated golden string

**Do not hand-write this.** After implementing §0(a)'s `build-tokens.mjs` change and §3.1's token
additions, run the real `generateCSS(resolveBrandDir())` and paste its actual output into
`EXPECTED`, replacing the current golden string. Diff the new output against the current one mentally before committing: the expected changes are
(1) `--space-1-5` (or equivalent — verify `kebab()`'s handling of the `1.5` key) plus
`--state-muted-text-opacity`/`--state-muted-text-hover-opacity`; (2) the four existing
`--state-*-opacity` lines changing from bare numbers (`0.08`) to percentage strings (`8%`); (3)
the new `--component-*` lines, some of which will now be `var(--color-...)` aliases rather than
resolved literals per §0(a)'s fix (e.g. `--component-colorfield-border: var(--color-border);` not
`--component-colorfield-border: #e6dfd8;`). If anything else in the golden string changes, that's
a sign the `build-tokens.mjs` change touched something it shouldn't have — stop and investigate
before updating the test to match (§10).

### 3.3 Styling convention for all four components (read before writing any of them)

Every visual property that has a token (§3.1, plus any color already promoted by `@theme inline`)
is consumed via a **Tailwind v4 arbitrary-value class bound to the CSS custom property** —
verify these patterns compile against this repo's actual installed `@tailwindcss/postcss` version
before relying on them (the original draft verified against `4.3.3`; re-check
`node_modules/tailwindcss/package.json` hasn't moved past `4.x` before implementing):

- Color: `bg-[var(--component-button-primary-background)]`,
  `text-[var(--component-button-primary-text)]`,
  `border-[var(--component-colorfield-border)]` (confirm exact generated property names against
  §3.2's real output — kebab-casing of `colorField` may or may not insert a hyphen at the
  case boundary; use whatever `kebab()` actually produces, not a guess).
- Spacing: `px-[var(--component-button-padding-x)]`, `py-[...]`,
  `gap-[var(--component-segmented-control-gap)]`.
- Radius: `rounded-[var(--component-button-radius)]`.
- Native range accent and track: `accent-accent` (existing promoted color, no arbitrary value
  needed now that the redundant `slider.accentColor` alias is removed) plus
  `[&::-webkit-slider-runnable-track]:bg-[var(--component-slider-track-color)]` /
  the Firefox equivalent (`[&::-moz-range-track]:bg-[...]`) if track styling is actually needed —
  confirm the native default track rendering (unstyled) is acceptable for Phase 0 before adding
  vendor-prefixed selectors; if it is, `slider.trackColor` still exists as a real, editor-visible
  token even if this component doesn't consume it as CSS yet (a legitimate reason for a
  `component.*` leaf with no current consumer: Task 6's schema-driven editor will still render a
  field for it, and it costs nothing to have ready for the day the track *is* styled).
- Font family: `[font-family:var(--component-button-font-family)]` — **not** `font-[var(...)]`
  (confirmed by direct test in the original draft that bare `font-[...]` resolves to
  `font-weight`, not `font-family`; re-verify if Tailwind's version has changed).
- A theme-varying color with an existing promoted utility not routed through a `component.*`
  token (there should be few or none left after §3.1's expansion, but if one is found while
  implementing) — plain class name (`border-border`, `bg-surface`, etc.), same as
  `app/app/_components/*.tsx` already does.
- Focus ring, on every interactive element these components render (buttons, the range input, the
  hex text input) — DESIGN.md specifies this and nothing in the app implements it yet (confirmed:
  no `focus-visible` usage anywhere outside `node_modules`), so this task is the first place it
  actually exists:
  `focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]`.
- Disabled state (new — see decision table): `disabled:opacity-[var(--state-disabled-opacity)]
  disabled:cursor-not-allowed` on every native interactive element (`<button>`, `<input>`), using
  the native `disabled` attribute rather than an ARIA attribute so browser default behavior
  (no pointer events, no focus, no `onClick`/`onChange` firing) comes for free.
- Muted/inactive text (`ColorField`'s reset affordance, `SegmentedControl`'s inactive tab —
  replaces the original draft's hardcoded `text-foreground/40 hover:text-foreground/70`):
  `text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-opacity),transparent)]
  hover:text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-hover-opacity),transparent)]`.
  Verify Tailwind v4's arbitrary-value parser accepts a `var()` reference inside `color-mix()`
  inside a bracketed color utility (it should, since the whole bracket content is passed through
  as a raw CSS value) before relying on it; if it doesn't compile, fall back to computing the two
  color-mix strings at build time in `build-tokens.mjs` as additional `component.*`-style derived
  properties and stop to report that the runtime-`var()` approach didn't hold, rather than
  silently reintroducing a hardcoded opacity.
- Primary Button's hover state, now genuinely derived per DESIGN.md's rule rather than a hardcoded
  literal:
  `hover:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-hover-opacity)),var(--color-on-accent)_var(--state-hover-opacity))]`
  — with `hoverOpacity` now a percentage-string token (§3.1), `calc(100% - var(--state-hover-opacity))`
  correctly yields `92%` today and re-derives automatically if a brand edits `hoverOpacity` later
  (Task 6's editor makes this editable, and this is now the first place that edit actually has a
  visible effect). Verify Tailwind v4's arbitrary-value parser accepts `calc()` nested inside
  `color-mix()` inside a bracketed `background-color` value — the whole bracket is passed through
  as raw CSS, so it should, but confirm against the real compiled output before relying on it
  (§10). Secondary Button's hover uses the
  existing `surfaceHover` token directly (`hover:bg-surface-hover`), matching how the rest of the
  app already treats it as its own literal.
- Anything with no token in this schema at all (border **width** — no `semantic.border.width`
  token exists; text size/weight) uses Tailwind's own default scale as a plain class (`border`,
  `text-sm`, `font-semibold`), matching `MetronomeControls.tsx`/`TabSelector.tsx`.
- `value` passed into `ColorField`'s swatch background (`style={{ backgroundColor: value }}`) is
  the live color being edited, not a design-system value — a literal there is the field doing its
  job, not a constraint violation.

## 4. Components

All four components: export their prop-type interface by name (not an inline anonymous type) so
Task 6 can `import type { ButtonProps } from "@guitar-tabs/design-system"` mechanically instead of
re-deriving signatures from source. All accept an optional `className?: string`, merged with the
component's own classes (last, so a caller can override) — Task 6's editor layout needs to
position/space these without every call site growing a wrapper `<div>`.

### 4.1 `ColorField.tsx`

```ts
export interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}
```

Swatch (a non-focusable `<span aria-hidden>`, sized
`w-[var(--component-colorfield-swatch-size)] h-[var(--component-colorfield-swatch-size)]`,
`rounded-[var(--component-colorfield-radius)] border border-[var(--component-colorfield-border)]`,
`style={{ backgroundColor: value }}`) next to a text `<input>` (hex value,
`[font-family:var(--component-colorfield-font-family)]
bg-[var(--component-colorfield-background)] text-[var(--component-colorfield-text)]
border border-[var(--component-colorfield-border)]
rounded-[var(--component-colorfield-radius)]` plus the focus-ring and disabled classes from §3.3).
Input gets `maxLength={7}`, `spellCheck={false}`, `autoComplete="off"`, `inputMode="text"`, and
`aria-label="Hex color value"` when `label` is not provided (so the field has an accessible name
either way — via the wrapping `<label>` when present, via `aria-label` when not).

`onReset`, when provided, renders as a real `<button type="button" aria-label="Reset to default">`
(the muted-text treatment from §3.3), **placed as a sibling after the `<label>`, not nested inside
it** — nesting it inside the label means a click on the reset button also triggers label
activation (refocusing the hex input), which is the wrong behavior for a reset control. `label`,
when provided, wraps only the swatch+input pair, not the reset button.

### 4.2 `Slider.tsx`

```ts
export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  showValue?: boolean;
}
```

A native `<input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-accent ..."/>` plus
the focus-ring and disabled classes from §3.3. Native range inputs already provide correct
keyboard behavior and screen-reader semantics for free — no custom drag/pointer logic. No custom
track styling by default (§3.3 — `slider.trackColor` exists as a token but isn't consumed as CSS
in Phase 0 unless the native default proves visually insufficient during implementation).

`showValue` (defaults `true`): when true, renders the current numeric `value` next to the slider
(a plain `<span>`, tabular via `[font-family:var(--component-colorfield-font-family)]` reused for
consistency, or a dedicated `slider.fontFamily` token if that reuse reads wrong once built) — so
Task 6's call sites don't each duplicate this readout. `label`, when provided, wraps the whole
control (slider + value readout), same association pattern as `ColorField`.

Out-of-range `value` (outside `[min, max]`): the native `<input>` clamps its own *displayed*
position but the React-controlled `value` prop is not itself clamped by this component — if a
caller passes an out-of-range value, the input's visual position and the `value` this component
was given can desync until the caller corrects it. This component does not own reconciling that;
whichever caller can produce an out-of-range value (Task 5/6) owns clamping before it reaches
here.

### 4.3 `SegmentedControl.tsx`

```ts
export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}
```

`ariaLabel` is **required**, not optional (original draft made it optional with no default, which
produces an unlabeled `role="tablist"` — an a11y violation, not a variant, when omitted). Every
Task 6 call site must supply one.

Generalizes `TabSelector.tsx`'s structure (read that file first) from a hardcoded `Tab` union to
an `options` array — reusing its pattern as a starting point, not maintaining prop compatibility
with it (decision table: permanent coexistence, no migration). `role="tablist"`, one
`role="tab" aria-selected={...}` `<button disabled={disabled}>` per option, `-mb-px border-b-2`
underline treatment. Container: `flex gap-[var(--component-segmented-control-gap)]
border-b border-[var(--component-segmented-control-border)]`. Active option:
`border-accent text-accent` (direct semantic reference, no redundant alias — see §3.1). Inactive
option: `border-transparent` plus the muted-text treatment from §3.3 (replaces the original
draft's hardcoded `text-foreground/40 hover:text-foreground/70`). Same `px-3 py-2 text-base
font-semibold transition-colors` structural classes as `TabSelector`, plus the focus-ring and
disabled classes from §3.3 (new for this component, not backported to `TabSelector`).

**Arrow-key navigation** (WAI-ARIA APG tabs pattern — left/right arrow moves focus and selection
between tabs, `Home`/`End` jump to first/last): add a `keydown` handler on the tablist container.
`TabSelector.tsx` doesn't have this either; adding it only to the new component without a plan to
backport it means the two diverge in behavior, not just in prop shape — acceptable given permanent
coexistence is the explicit decision, but call this out in the component's own comment so it
reads as a known, deliberate gap in `TabSelector`, not an oversight in `SegmentedControl`.

### 4.4 `Button.tsx`

```ts
export interface ButtonProps {
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

`variant` defaults to `"secondary"`. Renders `<button type="button" disabled={disabled} ...>` —
`type="button"` is required explicitly; without it, a `<button>` inside any future `<form>`
(Task 6's editor page is the obvious future case) defaults to `type="submit"` and can trigger an
accidental form submission. Shared structural classes: `inline-flex items-center justify-center
gap-1.5 border text-sm font-semibold transition-colors cursor-pointer
disabled:cursor-not-allowed rounded-[var(--component-button-radius)]
px-[var(--component-button-padding-x)] py-[var(--component-button-padding-y)]
[font-family:var(--component-button-font-family)]` plus the focus-ring and disabled-opacity
classes from §3.3.

- `primary`: `bg-[var(--component-button-primary-background)]
  text-[var(--component-button-primary-text)] border-transparent
  hover:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-hover-opacity)),var(--color-on-accent)_var(--state-hover-opacity))]`
  — the derived formula from §3.3 (this is the single source for it; if this text and §3.3 ever
  disagree, §3.3 is authoritative), disabled via
  `disabled:hover:bg-[var(--component-button-primary-background)]` or equivalent so hover doesn't
  visually fire on a disabled button.
- `secondary`: `bg-[var(--component-button-secondary-background)]
  text-[var(--component-button-secondary-text)]
  border-[var(--component-button-secondary-border)] hover:bg-surface-hover` — **no
  `hover:border-*` class.** Now fully tokenized (§3.1) rather than a mix of tokens and direct
  Tailwind classes. Uses `secondaryBorder` → `semantic.color.border`, the same correction versus
  `MetronomeControls.tsx`'s literal `border-surface` class that §4.4a makes in that file
  (DESIGN.md: "hairline dividers and outlines" is what `border` exists for). Deliberately does
  **not** add a `hover:border-surface-hover` class the way the original draft and
  `MetronomeControls.tsx`'s pre-fix code both did — that's exactly the bug §4.4a fixes in the
  other file (the border color converging with the hover background color, so it visually
  vanishes). Leaving `border-[var(--component-button-secondary-border)]` unchanged through hover
  keeps the border visible, consistent with the fix made to `MetronomeControls.tsx` in the same
  task.

### 4.4a `MetronomeControls.tsx` — dead button + border-hover fix (folded in, not part of the new component set)

Read the file first (`app/components/MetronomeControls.tsx`, currently two adjacent
`<button onClick={onReset} aria-label="Reset to start" title="Reset to start">` elements — the
second, styled with hardcoded `border-zinc-300 text-zinc-700 hover:bg-zinc-50`, is a dead
duplicate that currently renders as a second, fully functional "Reset to start" button next to
the first). This task:

- **Deletes the second (zinc-styled) `<button>` entirely** — not just its styling. One
  "Reset to start" button should render, not two.
- On the three surviving buttons (reset, play/pause, and both branches of the MIDI-sound toggle),
  replaces `border-surface` with `border-border` and removes `hover:border-surface-hover` (keeping
  `hover:bg-surface-hover`) — the `border` semantic role exists specifically for hairline
  outlines (DESIGN.md), and letting the border stay `border-border` through the hover state (a
  distinct color from `surfaceHover`) keeps the border visible against the hover background,
  instead of the two colors matching and the border visually vanishing.
- Does **not** replace these hand-rolled `<button>` elements with the new `Button` component —
  that migration is Task 6's (§2). This is a same-file, same-structure CSS-class correction only.
- Does **not** touch the tempo `<input>` or its `border-surface` (out of scope — not a button, not
  part of what this fix targets; leave as-is unless it's trivially the same one-line change while
  already editing the file, in which case make it for consistency, but don't go looking for more).

Because this file already has a real consumer (it renders in the live app), this is the one part
of Task 4 that needs the manual visual check §8 adds: `npm run stage`, look at the metronome
controls, confirm exactly one reset button renders and its border stays visible on hover.

### 4.5 `index.ts`

Barrel, including prop types:

```ts
export { ColorField } from "./components/ColorField";
export type { ColorFieldProps } from "./components/ColorField";
export { Slider } from "./components/Slider";
export type { SliderProps } from "./components/Slider";
export { SegmentedControl } from "./components/SegmentedControl";
export type { SegmentedControlProps } from "./components/SegmentedControl";
export { Button } from "./components/Button";
export type { ButtonProps } from "./components/Button";
```

Each component file starts with `"use client";` (all four use event handlers — matches the
existing precedent in `StudioTabs.tsx`/`MetronomeControls.tsx`). The barrel file itself does not
need the directive.

## 5. Bad-case behavior

| Case | Required behavior |
|---|---|
| A `component.*` token in §3.1 references a theme-varying color | Now correctly handled via §0(a)'s alias fix — no longer a bad case, this is the expected path |
| `ColorField`'s `value` is not a valid CSS color string | No validation here — this component is a dumb display/input pair; validating hex input is Task 5's job |
| `Slider`'s `value` is outside `[min, max]` | No clamping by this component (§4.2) — the caller owns it |
| `disabled` is true and the caller still calls `onChange`/`onClick` some other way (e.g. programmatically) | Not this component's job to prevent — `disabled` gates the native element's own interaction, not arbitrary caller code |

## 6. Forbidden patterns

- No hardcoded hex color, raw pixel value, or raw opacity number in any of the four component
  files — every such value must be a `var(--...)` reference (a `component.*`/`semantic.*` token,
  or an existing promoted semantic/Tailwind theme value), or (`ColorField`'s swatch only) the live
  `value` prop itself.
- No new `component.*` leaf that isn't a `{semantic.*}` reference (§3.1's one narrow, called-out
  exception aside), and no new `component.*` leaf whose value is a duplicate of a semantic token
  with zero divergence (the accentColor/activeColor removal in §3.1 is what this rule would have
  caught).
- No touching `resolve.mjs`. `build-tokens.mjs` changes **are** in scope this task, narrowly to
  the `component.*` alias branch (§0(a)) — do not touch anything else in that file.
- No touching `.env` or credentials.

## 7. File allowlist

- `app/next.config.ts` (modify)
- `app/packages/design-system/package.json` (modify)
- `app/packages/design-system/src/build-tokens.mjs` (modify — §0(a) only)
- `app/packages/design-system/brands/default/tokens.json` (modify)
- `app/packages/design-system/brands/default/tokens.default.json` (modify)
- `app/packages/design-system/src/build-tokens.test.mjs` (modify)
- `app/packages/design-system/src/tokens-validation.test.mjs` (modify — add `"percentage"` to
  `KNOWN_TYPES`; §3.1 introduces that `$type` and this Task 2 test would otherwise reject every
  new token as malformed)
- `app/packages/design-system/src/components/ColorField.tsx` (create)
- `app/packages/design-system/src/components/Slider.tsx` (create)
- `app/packages/design-system/src/components/SegmentedControl.tsx` (create)
- `app/packages/design-system/src/components/Button.tsx` (create)
- `app/packages/design-system/src/index.ts` (create)
- `app/components/MetronomeControls.tsx` (modify — §4.4a only)

## 8. Acceptance criteria

- `npm test --workspace @guitar-tabs/design-system` passes. Test count will be **higher than 19**
  now that `build-tokens.mjs` itself has new logic (§0(a)) — if the existing suite has no test
  exercising the alias branch directly, add one (a token referencing a theme-varying color emits
  a `var()` alias, not a literal, in both `:root` and stays correctly overridden per `[data-theme]`)
  rather than relying solely on the golden-string test to catch a regression there. Record the
  actual before/after count in the PR description; don't assert a specific number here since it
  depends on how many new tests are added.
- `npm run verify` passes (typecheck + lint + unit tests).
- **Manual visual check, unlike the rest of this task:** `npm run stage`, look at the metronome
  controls (§4.4a's only real, live consumer in this task) — confirm exactly one "Reset to start"
  button renders and its border doesn't disappear on hover. Everything else in this task still has
  no visual check because nothing else consumes these components yet (Task 6).
- `git diff --stat` matches the file allowlist (§7): 8 modified, 5 created.

## 9. Definition of done

`npm test --workspace @guitar-tabs/design-system` passes + `npm run verify` passes + `git diff
--stat` matches the allowlist + checkpoint commit (ask-first per `AGENTS.md`, made routinely per
`docs/WEB_APP_WORKFLOW.md` §4 once verified — see `[[checkpoint-commit-policy]]`).

## 10. Stop-conditions

- If `npm test --workspace @guitar-tabs/design-system` fails on the golden-output test (§3.2) with
  a diff other than exactly the expected new lines (two `semantic` additions, the `component.*`
  block, some as `var()` aliases per §0(a)), stop — don't hand-edit `EXPECTED` to match whatever
  the code actually produced without first confirming the diff is exactly what §3.1/§0(a) predict;
  an unexpected additional change is a sign the `build-tokens.mjs` edit touched more than the one
  intended branch.
- If the `{semantic.space['1.5']}` reference syntax (§3.1) doesn't parse cleanly against the real
  `resolve.mjs`, stop and confirm the literal-value fallback is acceptable before using it —
  don't silently swap in a literal without flagging it.
- If any of the Tailwind arbitrary-value class patterns in §3.3 don't compile the way this spec
  says they do (different installed Tailwind/PostCSS version, or the `var()`-inside-`color-mix()`
  muted-text pattern doesn't parse), stop and ask rather than guessing at alternate syntax — check
  `node_modules/tailwindcss/package.json`'s version first.
- If a component ends up needing a visual property with no matching token anywhere in the schema
  and no existing Tailwind default reasonably covers it, stop and ask rather than inventing a new
  semantic or primitive token on the spot.
- **Rollback:** everything this task touches is git-tracked.
  `git checkout -- app/next.config.ts app/packages/design-system/package.json
  app/packages/design-system/src/build-tokens.mjs
  app/packages/design-system/brands/default/tokens.json
  app/packages/design-system/brands/default/tokens.default.json
  app/packages/design-system/src/build-tokens.test.mjs
  app/components/MetronomeControls.tsx && rm -f
  app/packages/design-system/src/components/ColorField.tsx
  app/packages/design-system/src/components/Slider.tsx
  app/packages/design-system/src/components/SegmentedControl.tsx
  app/packages/design-system/src/components/Button.tsx
  app/packages/design-system/src/index.ts`
  restores the pre-task state, **provided Tasks 1–3 are committed on this branch before this
  task starts** (verify `git status` is clean on `task/design-system-brand-data` first — if it
  isn't, `git checkout --` may overshoot into uncommitted Task 1–3 work; commit or stash those
  first, per `[[checkpoint-commit-policy]]`).

---
**Landed:** commit `602d268` (Iteration 1, Task 4). ColorField/Slider/SegmentedControl/Button confirmed in active use throughout this session's design-system work.
