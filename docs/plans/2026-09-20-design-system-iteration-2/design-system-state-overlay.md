# Task spec: Shared hover/press/focus state primitive (Task 3)

> **Landed:** commit `40d2fdd` — `state-overlay.test.mjs` 3/3 passing (`node --test
> components/state-overlay.test.mjs`, verified 2026-09-20). Visual eyeball check (byte-identical
> hover, new pressed tint, disabled guards) still open — see this spec's own §7. Archived per
> `WEB_APP_WORKFLOW.md` §5a.

Corresponds to Task 3 of `docs/plans/2026-09-20-design-system-iteration-2/2026-09-20-design-system-iteration-2.md` (Track
A, runs after 5a/5b, before Task 6 — Task 6's baseline run assumes this task has already landed;
see that spec's §0). Written against
`app/packages/design-system/src/components/Button.tsx`,
`app/packages/design-system/src/components/ColorField.tsx`,
`app/packages/design-system/src/components/Slider.tsx`,
`app/packages/design-system/src/components/SegmentedControl.tsx`,
`app/packages/design-system/brands/default/tokens.json`, and
`app/packages/design-system/brands/default/DESIGN.md` directly — if any of these have changed
since this spec was written, stop and re-read before implementing, per `WEB_APP_WORKFLOW.md` §3.

## 0. Audit + resolved decisions (verified while writing this spec, not left open)

**The plan's own audit step, done here.** All four components were read in full. Only
`Button.tsx` has the pattern Task 3 is meant to generalize — a `color-mix()` background overlay
driven by a `--state-*-opacity` custom property:

```
const PRIMARY_HOVER =
  "hover:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-hover-opacity)),var(--color-on-accent)_var(--state-hover-opacity))]";
```

The other three do **not** duplicate this pattern, each for a different reason — none of them
need touching by this task:

- **`ColorField.tsx` / `SegmentedControl.tsx`** both have a `MUTED_TEXT` constant
  (`text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-opacity),transparent)]
  hover:text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-hover-opacity),transparent)]`).
  This is a **text-color** opacity fade, driven by its own dedicated token pair
  (`state.mutedTextOpacity`/`mutedTextHoverOpacity`), not `hoverOpacity`/`pressedOpacity` — a
  structurally different primitive (color-mix toward `transparent`, not toward an overlay color;
  applies to `text`, not `background-color`). Not the pattern this task generalizes; left as-is.
- **`Slider.tsx`** is a native `<input type="range">` styled via Tailwind's `accent-accent`
  utility (the browser-native thumb/fill affordance) — no custom `color-mix()` overlay of any
  kind, hover or otherwise. An absolutely-positioned overlay `<span>` can't attach usefully to a
  native range control's internal shadow-DOM parts. Out of scope.
- **`SegmentedControl.tsx`'s** active-tab styling (`border-accent text-accent`) is a persistent
  *selected* state (like a tab's `aria-selected`), not a momentary hover/press overlay — a
  different concern. Its inactive-tab hover uses the same `MUTED_TEXT` text-fade as `ColorField`,
  covered above.

**Conclusion: only `Button.tsx` needs this task's helper.** Per the plan's own conditional
("unless the audit... finds a case a plain string genuinely can't express") and its stated
helper-first preference, this task writes a plain function, not a `<StateOverlay />` component —
confirmed, not just defaulted to.

**Real gap found: `state.pressedOpacity` is defined in `tokens.json` but consumed nowhere.**
`Button.tsx` only ever implements a hover overlay; there is no pressed/active state anywhere in
this package today, despite `DESIGN.md`'s "Component behavior expectations" explicitly naming all
three (`"Interactive states (hover/focus/pressed) are derived from the base color plus the
state.hoverOpacity/focusOpacity/pressedOpacity tokens via color-mix()"`) and its state-priority
list (`disabled > loading > active > focus > hover > default`) already assuming an active/pressed
state exists. **This task closes that gap**: the shared helper is used for both hover (existing,
refactored) and pressed (new) on `Button`'s primary variant — squarely inside "hover/press/focus
state primitive," the task's own name, not scope creep.

**Resolved: no focus color-mix overlay added.** `DESIGN.md`'s bullet above also names `focus`
among the three, but every component's actual focus treatment today is
`semantic.focus.ringWidth`/`ringOffset`/`ringColor` — an outline ring (`FOCUS_RING`, identical
across all four components) — not a background color-mix. `DESIGN.md`'s own separate "Focus ring"
bullet documents this as the real, current focus mechanism. Layering a second,
`state.focusOpacity`-driven background overlay on top of an already-visible focus ring is a new
visual behavior nothing in this codebase asks for today — adding it would be inventing a UI
change, not generalizing an existing one. **`state.focusOpacity` is left unconsumed by this
task, on purpose.** It's real, pre-existing debt (not created by this task) — flagged explicitly
for `docs/specs/design-system-token-orphan-detection.md` (Task 6, which runs immediately after
this one) rather than silently patched over here. This task's helper still accepts any opacity
token by parameter, so a future task can add a genuine focus-overlay use case (if one turns up)
with only a one-word widening of its `pseudo` union — no restructuring of the helper itself.

**File location: `components/state-overlay.mjs`, not `components/StateOverlay.tsx`.** The plan's
own "Files" section named a `.tsx` path on the assumption of a component; since the resolved shape
is a plain function (§ above), it follows this package's existing non-JSX-logic naming (`resolve.mjs`,
`deep-merge.mjs`) rather than component `.tsx` casing — `.mjs`, not `.tsx`, and kept inside
`components/` since it's component-specific (not a generic cross-package utility like
`deep-merge.mjs`). No `StateOverlay.css` — nothing here needs a stylesheet; the function returns a
single Tailwind arbitrary-value string, exactly like the code it replaces.

**No `forced-colors: active` support.** The plan's optional §ask ("Windows/some browsers' forced-
colors mode...") is out of scope for this task: it belongs to `StateOverlay.css`, a file that no
longer exists under the helper-first resolution above (there is no separate CSS file for this
task to "already be touching"). Not picked up elsewhere in this plan either — flag as a possible
future backlog item if it matters, don't add it here.

## 1. Scope

Add `stateOverlayClassName(pseudo, opacityVar, baseColorVar?, overlayColorVar?)` to a new
`components/state-overlay.mjs`, generalizing `Button.tsx`'s existing `PRIMARY_HOVER` color-mix
string into a reusable function. Refactor `Button.tsx`'s primary variant to use it for both hover
(existing behavior, byte-identical output) and pressed/active (new, closes the `pressedOpacity`
gap in §0).

Files this task may touch:
- `app/packages/design-system/src/components/state-overlay.mjs` (new)
- `app/packages/design-system/src/components/state-overlay.test.mjs` (new)
- `app/packages/design-system/src/components/Button.tsx`

No other file changes. **Not** `ColorField.tsx`, `Slider.tsx`, `SegmentedControl.tsx` (§0: audited,
none apply), not `tokens.json` (no new tokens needed — `pressedOpacity` already exists), not
`index.ts` (the helper is internal, not a public export). `.env`/credentials are not involved.

## 2. Non-goals

- **No `<StateOverlay />` component, no `StateOverlay.css`.** §0's audit resolves this
  definitively — a helper function is sufficient; don't build the component "just in case."
- **No focus color-mix overlay.** §0 resolves this explicitly — `state.focusOpacity` stays
  unconsumed by this task. Don't add one to make Task 6's later orphan check happier; that would
  be inventing UI behavior to satisfy a test, backwards from the actual goal.
- **No `forced-colors: active` handling.** §0 — the file it would have lived in no longer exists
  under this task's resolved shape.
- **No change to `ColorField.tsx`, `Slider.tsx`, or `SegmentedControl.tsx`.** §0's audit found
  none of them duplicate the pattern this task generalizes.
- **No `forcedState` prop.** The plan floated this (liftkit's "always show hover-opacity even
  without a real hover" case) but gated it on the audit finding a real need. It didn't — nothing
  in this package today needs an always-on overlay. YAGNI; add it only when a real component
  needs it.

## 3. Interface / exact changes

### 3.1 `components/state-overlay.mjs` (new)

```js
/**
 * Tailwind arbitrary-value class for a background-color state overlay,
 * color-mixed from a base color toward an overlay color at the magnitude of
 * a --state-*-opacity custom property (a token -- re-derives live if a
 * brand edits it, never a hardcoded percentage). Generalizes what
 * Button.tsx's PRIMARY_HOVER used to inline for hover only; the pressed
 * (`"active"` pseudo) case is new -- see this task's spec §0 for why
 * `focus` deliberately does not get one.
 * @param {"hover" | "active"} pseudo Tailwind pseudo-class variant prefix.
 * @param {string} opacityVar e.g. "--state-hover-opacity" or
 *   "--state-pressed-opacity".
 * @param {string} [baseColorVar] defaults to the accent/on-accent pair --
 *   the only pair any component needs today (§0).
 * @param {string} [overlayColorVar]
 * @returns {string}
 */
export function stateOverlayClassName(
  pseudo,
  opacityVar,
  baseColorVar = "--color-accent",
  overlayColorVar = "--color-on-accent",
) {
  return `${pseudo}:[background-color:color-mix(in_srgb,var(${baseColorVar})_calc(100%_-_var(${opacityVar})),var(${overlayColorVar})_var(${opacityVar}))]`;
}
```

### 3.2 `components/state-overlay.test.mjs` (new)

```js
import test from "node:test";
import assert from "node:assert/strict";
import { stateOverlayClassName } from "./state-overlay.mjs";

test("stateOverlayClassName(hover) matches Button's original PRIMARY_HOVER string exactly", () => {
  assert.equal(
    stateOverlayClassName("hover", "--state-hover-opacity"),
    "hover:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-hover-opacity)),var(--color-on-accent)_var(--state-hover-opacity))]",
  );
});

test("stateOverlayClassName(active) builds the pressed overlay with a different opacity token", () => {
  assert.equal(
    stateOverlayClassName("active", "--state-pressed-opacity"),
    "active:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-pressed-opacity)),var(--color-on-accent)_var(--state-pressed-opacity))]",
  );
});

test("stateOverlayClassName accepts a custom base/overlay color pair", () => {
  assert.equal(
    stateOverlayClassName("hover", "--state-hover-opacity", "--color-foo", "--color-bar"),
    "hover:[background-color:color-mix(in_srgb,var(--color-foo)_calc(100%_-_var(--state-hover-opacity)),var(--color-bar)_var(--state-hover-opacity))]",
  );
});
```

The first test is the byte-equality proof that refactoring `Button.tsx` to call this function
instead of inlining the string is behavior-preserving for the hover case.

### 3.3 `Button.tsx`

Add the import, and replace the `PRIMARY_HOVER` constant + add a new `PRIMARY_PRESSED` one:

```ts
import { stateOverlayClassName } from "./state-overlay.mjs";
```

```ts
// Derived from state.hoverOpacity/pressedOpacity per DESIGN.md (re-derives live if a
// brand edits the token), not hardcoded percentages. See state-overlay.mjs.
const PRIMARY_HOVER = stateOverlayClassName("hover", "--state-hover-opacity");
const PRIMARY_PRESSED = stateOverlayClassName("active", "--state-pressed-opacity");
```

In `variantClasses`, the primary branch gains `PRIMARY_PRESSED` alongside `PRIMARY_HOVER`, and the
existing disabled-hover guard (`disabled:hover:bg-[var(--component-button-primary-background)]`,
already there so a disabled button doesn't show the hover tint) gets a matching disabled-active
guard for the same reason:

```ts
const variantClasses =
  variant === "primary"
    ? `border-transparent bg-[var(--component-button-primary-background)] text-[var(--component-button-primary-text)] ${PRIMARY_HOVER} ${PRIMARY_PRESSED} disabled:hover:bg-[var(--component-button-primary-background)] disabled:active:bg-[var(--component-button-primary-background)]`
    : // unchanged — secondary variant has no color-mix overlay of any kind today (§0: not in scope)
      `border-[var(--component-button-secondary-border)] bg-[var(--component-button-secondary-background)] text-[var(--component-button-secondary-text)] hover:bg-surface-hover`;
```

Nothing else in `Button.tsx` changes — the secondary variant, `FOCUS_RING`, `DISABLED`, and the
rest of the component body are untouched.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Primary button, disabled, mouse held down over it | No pressed tint — `disabled:active:bg-[var(--component-button-primary-background)]` overrides back to the flat background, matching the existing disabled-hover guard's reasoning. |
| Secondary button, any state | Unchanged — no overlay of any kind, exactly as before this task. |
| A brand overrides `state.pressedOpacity` to `0%` | Pressed overlay resolves to fully transparent (color-mix at 0% overlay color) — no code branch needed, the formula already handles it, same as `hoverOpacity` today. |

## 5. Forbidden patterns

- No hardcoded opacity percentages — always through `--state-*-opacity` custom properties.
- No new npm dependencies.
- No touching `.env`/credentials.
- **No `<StateOverlay />` component and no new CSS file** — §0/§2 resolve this; don't reintroduce
  the plan's original (superseded) file list.
- **No focus color-mix overlay** — §0/§2.

## 6. File allowlist

- `app/packages/design-system/src/components/state-overlay.mjs` (new)
- `app/packages/design-system/src/components/state-overlay.test.mjs` (new)
- `app/packages/design-system/src/components/Button.tsx`

## 7. Acceptance criteria

- `npm run verify` passes — typecheck, lint, and `node --test` including this task's 3 new tests
  in `state-overlay.test.mjs`, with no existing test's count or content changed.
- `git diff --stat` shows only the files in §6 (plus the two new files).
- Manual check: run the app, open a view with a primary `Button` (e.g. `/design-system` editor,
  or wherever else a primary-variant button renders), hover it and confirm the tint is visually
  unchanged from before this task, then press-and-hold it and confirm a new, distinct (heavier —
  12% vs 8% per `tokens.json`) tint appears while held and disappears on release. Confirm a
  disabled primary button shows neither tint under hover or a mouse-down attempt.

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` matches §6.
- Manual check above passed.
- Self-check (per `WEB_APP_WORKFLOW.md` §3): before reporting back, confirm every concrete claim
  in the report — file list, test count (existing + 3 new), the byte-equality claim for the hover
  string (§3.2's first test) — against what's actually on disk and what `npm run verify` printed.
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).

## 9. Stop-conditions

- If `Button.tsx`'s `PRIMARY_HOVER` string, `variantClasses` structure, or the disabled-hover
  guard pattern have changed since this spec was written (e.g. a different color-mix formula),
  **stop and ask** rather than adapting silently — §3.2's byte-equality test depends on the exact
  current string.
- If `ColorField.tsx`, `Slider.tsx`, or `SegmentedControl.tsx` have gained a `color-mix()`
  background overlay since this spec's audit (§0) — i.e. the audit's conclusion no longer holds —
  **stop and ask** before deciding whether to extend this task's scope to them.
- If `tokens.json`'s `state.pressedOpacity` no longer exists or has been renamed, **stop** — this
  task has a hard dependency on it (§0/§3.3).
