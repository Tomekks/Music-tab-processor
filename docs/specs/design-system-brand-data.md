# Task spec: Design system — workspace scaffold + brand data

Implements Task 1 of `docs/superpowers/plans/2026-09-19-design-system.md`. Read that task's
section before starting — this file is the actionable slice of it, not a replacement for it.

## 1. Scope

- `app/package.json`: add `"workspaces": ["packages/*"]`. **Not touching `next.config.ts` /
  `transpilePackages` in this task** — that only matters once the package ships `.tsx` (Task 4),
  and adding it now would couple a Next config change to a task that ships no code Next needs to
  transpile.
- `app/packages/design-system/package.json` (**new**): `{"name": "@guitar-tabs/design-system",
  "version": "0.0.0", "private": true, "type": "module", "engines": {"node": ">=22"}}` — matching
  `app/package.json`'s existing `engines` convention. No dependencies yet — React is added in a
  later task (Task 4), not this one. No `"exports"` field yet either: nothing imports from this
  package until Task 2, and a speculative exports map for paths that don't exist yet is exactly
  the kind of premature structure this design avoids (see Global Constraints).
- `app/packages/design-system/active-brand.json` (**new**): `{ "brand": "default" }`.
- `app/packages/design-system/brands/default/tokens.json` (**new**): exact content in §3.
- `app/packages/design-system/brands/default/tokens.default.json` (**new**): a copy of
  `tokens.json` at creation time — copy the file (`cp`), don't retype it, so there's no
  transcription drift on day one. This is what makes the two files identical *right now*; it's
  not an ongoing system invariant to maintain by hand going forward — once the editor exists
  (a later task), the two files will legitimately diverge in formatting as individual paths get
  written. The property that has to hold going forward is *semantic* parity (same paths, same
  values), which a later task (Task 2) enforces with a real test — this task's job is just to
  get that starting pair right.
- `app/packages/design-system/brands/default/DESIGN.md` (**new**): exact content in §3.
- `app/packages/design-system/README.md` (**new**, small): exact content in §3. Without this, a
  reader with no memory of this conversation finding a new `packages/design-system/` folder full
  of JSON has no way to know it's real, what owns it, or that `tokens.json`/`tokens.default.json`
  aren't meant to be hand-edited independently — this repo's own `START_HERE.md` calls that kind
  of orientation gap out explicitly ("the walk test").
- **`app/package-lock.json` will also change** — `npm install` after adding `workspaces`
  restructures the lockfile for the new workspace package. This is expected, not a mistake; it's
  in the file allowlist (§6) for exactly this reason.
- No `.env`/credential contact. Nothing in this task changes what the running app renders —
  `app/app/globals.css` is untouched, nothing reads `tokens.json` yet. That wiring is a later
  task (Task 3 of the plan), deliberately kept separate.

## 2. Non-goals

- No changes to `app/app/globals.css` or any other file under `app/app/`.
- No build script, no resolver, no CSS generation — that's the next task. This task is data and
  config only.
- No `component.*` token entries — `"component": {}` stays empty; a later task (Task 4) adds to
  it.
- No React dependency added to `packages/design-system/package.json` yet.
- Don't "fix" or improve any of the values below relative to what's actually in
  `app/app/globals.css` today, even if something looks improvable (e.g. don't retune a color).
  This task's job is a faithful, traceable transcription of the codebase as it stands — live
  where a value is actually reachable, as-authored where it isn't (§3 states which is which for
  every value) — not a redesign.
- No `"exports"` field and no `transpilePackages` change (see §1) — both are deferred to the
  task that actually needs them.

## 3. Interface

**`app/packages/design-system/active-brand.json`:**

```json
{ "brand": "default" }
```

**`app/packages/design-system/brands/default/tokens.json`** (and byte-identical
`tokens.default.json`):

```json
{
  "primitive": {
    "color": {
      "accent": { "$value": "#ae97f7", "$type": "color" },
      "ink": { "$value": "#141413", "$type": "color" },
      "paper": { "$value": "#faf9f5", "$type": "color" },
      "white": { "$value": "#ffffff", "$type": "color" }
    }
  },
  "semantic": {
    "color": {
      "background": { "$value": "{primitive.color.paper}", "$type": "color" },
      "foreground": { "$value": "{primitive.color.ink}", "$type": "color" },
      "accent": { "$value": "{primitive.color.accent}", "$type": "color" },
      "onAccent": { "$value": "{primitive.color.ink}", "$type": "color" },
      "border": { "$value": "#e6dfd8", "$type": "color" },
      "surface": { "$value": "{primitive.color.white}", "$type": "color" },
      "surfaceText": { "$value": "{primitive.color.ink}", "$type": "color" },
      "surfaceHover": { "$value": "#f0efe9", "$type": "color" },
      "surfaceActive": { "$value": "{primitive.color.ink}", "$type": "color" },
      "surfaceActiveText": { "$value": "{primitive.color.paper}", "$type": "color" }
    },
    "state": {
      "hoverOpacity": { "$value": 0.08, "$type": "number" },
      "focusOpacity": { "$value": 0.10, "$type": "number" },
      "pressedOpacity": { "$value": 0.12, "$type": "number" },
      "disabledOpacity": { "$value": 0.5, "$type": "number" }
    },
    "focus": {
      "ringWidth": { "$value": "2px", "$type": "dimension" },
      "ringOffset": { "$value": "2px", "$type": "dimension" },
      "ringColor": { "$value": "{semantic.color.accent}", "$type": "color" }
    },
    "radius": {
      "base": { "$value": "12px", "$type": "dimension" }
    },
    "space": {
      "1": { "$value": "4px", "$type": "dimension" },
      "2": { "$value": "8px", "$type": "dimension" },
      "3": { "$value": "12px", "$type": "dimension" },
      "4": { "$value": "16px", "$type": "dimension" },
      "6": { "$value": "24px", "$type": "dimension" },
      "8": { "$value": "32px", "$type": "dimension" }
    },
    "typography": {
      "sans": { "$value": "var(--font-geist-sans)", "$type": "fontFamily" },
      "mono": { "$value": "var(--font-geist-mono)", "$type": "fontFamily" }
    },
    "layout": {
      "sidebarWidth": { "$value": "240px", "$type": "dimension" }
    }
  },
  "component": {},
  "dark": {
    "semantic": {
      "color": {
        "background": { "$value": "#1c1d1f", "$type": "color" },
        "foreground": { "$value": "#ededed", "$type": "color" },
        "border": { "$value": "#353434", "$type": "color" },
        "surface": { "$value": "#535353", "$type": "color" },
        "surfaceText": { "$value": "{primitive.color.white}", "$type": "color" },
        "surfaceHover": { "$value": "#5c5c5c", "$type": "color" },
        "surfaceActive": { "$value": "{primitive.color.white}", "$type": "color" },
        "surfaceActiveText": { "$value": "#212121", "$type": "color" }
      }
    }
  }
}
```

**Where every value comes from** (so this is checkable, not asserted):

| Token | Value | Source in `app/app/globals.css` |
|---|---|---|
| `primitive.color.paper` | `#faf9f5` | `[data-theme="light"] { --background: ... }` — reused 2×, see the primitive-reuse note below |
| `primitive.color.ink` | `#141413` | `[data-theme="light"] { --foreground: ... }` — reused 4× |
| `primitive.color.white` | `#ffffff` | `[data-theme="light"] { --color-surface: ... }` and `[data-theme="dark"]`'s `--color-surface-text`/`--color-surface-active` — reused 3× across both themes |
| `primitive.color.accent` | `#ae97f7` | bare `:root { --color-accent: ... }` — not redefined per theme, so theme-invariant here too (no `dark.semantic.color.accent` entry); promoted to a primitive regardless of reuse count since it's the one named brand color, not because it repeats |
| `semantic.color.border` (light) | `#e6dfd8` | `[data-theme="light"] { --color-border: ... }` — used once, stays a literal |
| `semantic.color.surfaceHover` (light) | `#f0efe9` | `[data-theme="light"] { --color-surface-hover: ... }` — used once, stays a literal |
| `dark.semantic.color.background`/`foreground`/`border`/`surface`/`surfaceHover`/`surfaceActiveText` | as listed | `[data-theme="dark"] { ... }`, same key names — each used once, stays a literal |
| `radius.base` | `12px` | `:root { --radius: ... }` |
| `space.1`–`space.8` | `4/8/12/16/24/32px` | `:root { --space-1: ... }` through `--space-8` |
| `layout.sidebarWidth` | `240px` | `:root { --sidebar-width: ... }` |
| `typography.sans`/`mono` | `var(--font-geist-sans)` / `var(--font-geist-mono)` | `@theme inline { --font-sans: var(--font-geist-sans); ... }` — raw CSS pointing at Next's own `next/font`-generated variables, not a `{path}` token reference; a later task's resolver passes non-`{`-prefixed values through unchanged, so this is intentional. **Known limitation, not fixed in this task:** this value is meaningless to a Figma import (a plugin needs a real font-family name, not a CSS variable). Documented as an excluded/needs-translation token in the Figma-export task rather than restructured here, since Figma import isn't built until then. |
| `focus.ringWidth`/`ringOffset`/`state.disabledOpacity` | `2px` / `2px` / `0.5` | **New — not in `globals.css`.** Nothing in the app implements a focus ring or disabled state via tokens today. Added because `DESIGN.md` (below) states these as rules; without a token backing them, that prose would be an unenforceable promise. Conventional starting values (2px is a standard visible-but-not-heavy ring; 0.5 opacity is the common disabled convention), not derived from anything existing. |

**Provenance:** every "current" value above is as of commit `96d9ed0` (2026-09-18, the last
commit that touched `app/app/globals.css` as of this spec being written). If `globals.css` has
changed since, see §9 — don't silently prefer whichever version is newer without flagging it.

**Primitives exist only where a value is reused ≥2×, or is the one named brand color.** `ink`
(4 uses: `foreground`, `onAccent`, `surfaceText`, `surfaceActive`), `paper` (2 uses: `background`,
`surfaceActiveText`), and `white` (3 uses, spanning both themes: light `surface`, dark
`surfaceText`, dark `surfaceActive`) each back a real, counted repetition — not a guess at future
reuse. `accent` is the one exception: promoted regardless of count because it's *the* brand
accent, not because it repeats. Everything else in `semantic.color` (`border`, `surfaceHover`,
and every literal in the `dark` block not listed as a primitive reference above) is used exactly
once and stays a plain literal — giving those their own primitive entries would be structure with
no payoff, exactly the "aspirational" three-layer ceremony this rule exists to avoid.

**Two more things that need explaining, not just copying:**

- **Why the light values, when the app currently only renders dark?** `data-theme="dark"` is
  hardcoded on `StudioShell` (`app/app/_components/StudioShell.tsx`), which wraps the entire
  shipped app (`app/app/page.tsx`; `/studio` is only a redirect to `/`). So `[data-theme="dark"]`
  is genuinely the only theme rendered anywhere today, and its values are what this schema's
  `dark.semantic.color` block holds. `[data-theme="light"]`'s values are real code, just
  currently unreached (kept in `globals.css` itself "in case a manual light toggle is wanted
  later") — captured here as the schema's base `semantic.color` set, matching the shape the
  design spec expects (a light base + a `dark` override block). Two things this schema
  deliberately does **not** use as a source: the bare `:root` defaults and the
  `@media (prefers-color-scheme: dark)` override — neither is reachable through any current
  route (nothing outside `StudioShell` renders, and `StudioShell` always sets `data-theme`), so
  neither reflects anything actually live.
- **How does `dark` merge with the base set — and why doesn't `surface` reference
  `background`?** A later task's build script deep-merges `dark.semantic.*` over the base
  `semantic.*`: any path present under `dark` overrides the base value at that same path; any
  path *absent* from `dark` (everything outside `dark.semantic.color` — `accent`, `onAccent`,
  `state`, `focus`, `radius`, `space`, `typography`, `layout`, and any color key a theme doesn't
  redefine) resolves from the base set unchanged. This is why `accent`/`onAccent` have no
  `dark.semantic.color` entry — the real CSS never redefines them per theme, so neither does this
  schema. On `surface` specifically: `globals.css`'s bare `:root` does define
  `--color-surface: var(--background)` — a real relationship, but it lives entirely in the same
  dead block covered above. The **live** `[data-theme="light"]`/`[data-theme="dark"]` blocks each
  set `--color-surface` to its own value, independent of that theme's own `--background` (light:
  `#ffffff` vs. `#faf9f5`; dark: `#535353` vs. `#1c1d1f`) — not derived from it. `surface` *is*
  written as a reference in this schema, just to the shared `white` primitive (because the light
  value happens to be reused elsewhere, per the rule above), never to `background` — that
  reference would resolve to a color that was never actually rendered.

**`onAccent` is new — not copied from anywhere, computed.** `globals.css` has no existing
"text on accent" color, because nothing in the app today fills a background with `--color-accent`
(it's used as text/border color, e.g. `app/app/_components/TabSelector.tsx`'s active-tab
styling). This design adds `onAccent` so a future filled-background component (Phase 1's control
panel) has a defined, contrast-checked answer. Computed via the standard WCAG relative-luminance
formula (sRGB → linear → weighted luminance → contrast ratio — not reproduced here; a later
task's contrast test re-derives and enforces this same arithmetic programmatically, so it isn't
just asserted once and trusted): against `accent` (`#ae97f7`), white text scores **2.45:1** —
fails the 4.5:1 minimum badly. `ink` (`#141413` — already meaningful in this codebase as the
light-theme foreground color, not an invented value) scores **7.52:1** — passes with real margin.
That's why `onAccent` points at `primitive.color.ink`, not white.

**`app/packages/design-system/brands/default/DESIGN.md`:**

```markdown
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
- `surface`/`surfaceText` and `surfaceActive`/`surfaceActiveText` — one step off the page
  background, for a control or row that needs to read as a distinct element (a song row, a
  button). `surfaceActive` is a hard inversion (dark theme: white fill, near-black text), used
  for a genuinely selected/pressed state, not a hover.
- `border` — hairline dividers and outlines. Low contrast against `surface` by design; this app
  favors quiet structure over visible boxes.

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
```

**`app/packages/design-system/README.md`:**

```markdown
# @guitar-tabs/design-system

The token/component source of truth for `app/`'s UI, and eventually a second project (the
control panel) and beyond. Full architecture:
`docs/superpowers/specs/2026-09-19-design-system-design.md`. Build order:
`docs/superpowers/plans/2026-09-19-design-system.md`.

**Don't hand-edit `tokens.json` and `tokens.default.json` independently.**
`brands/default/tokens.json` is the live, current values; `tokens.default.json` is the factory
reset target. They're meant to be kept in sync through the in-app editor (once it exists) or
deliberate, matching edits to both — not casual one-off changes to just one.

Status as of this file: brand data only (colors, spacing, typography as JSON). No build script,
no components, no editor yet — see the plan above for what's next and in what order.
```

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A value in `app/app/globals.css` that this spec's table doesn't account for | Stop and ask (see §9) — don't guess where it belongs |
| `tokens.json` and `tokens.default.json` end up out of sync after the initial copy | Re-copy — `cp brands/default/tokens.json brands/default/tokens.default.json` — don't hand-edit either to match the other |

## 5. Forbidden patterns

- No hardcoded value inside `component` (it's `{}` — nothing to violate yet, but don't add
  anything to it in this task).
- No retuning, "improving," or simplifying any color/spacing value relative to what's actually in
  `app/app/globals.css` today.
- No touching `.env`, credentials, or anything under `app/app/`.

## 6. File allowlist

- `app/package.json` (modified)
- `app/package-lock.json` (modified — `npm install` regenerates this after the `workspaces` field
  is added; expected, not a mistake, don't try to avoid touching it)
- `app/packages/design-system/package.json` (new)
- `app/packages/design-system/active-brand.json` (new)
- `app/packages/design-system/brands/default/tokens.json` (new)
- `app/packages/design-system/brands/default/tokens.default.json` (new)
- `app/packages/design-system/brands/default/DESIGN.md` (new)
- `app/packages/design-system/README.md` (new)

`app/next.config.ts` is **not** in this task's allowlist (see §1/§2 — `transpilePackages` moved
to the task that ships `.tsx`).

## 7. Acceptance criteria

- `cd app && npm install` succeeds (workspace resolves cleanly).
- `npm ls @guitar-tabs/design-system` (from `app/`) shows the workspace package resolved, not an
  error — confirms the workspace link actually worked, not just that `install` exited 0.
- Both JSON files parse: `node -e "JSON.parse(require('fs').readFileSync('packages/design-system/brands/default/tokens.json','utf8')); JSON.parse(require('fs').readFileSync('packages/design-system/brands/default/tokens.default.json','utf8')); console.log('ok')"`
  (run from `app/`) prints `ok` — a mechanical check that catches a JSON syntax error a visual
  read might not.
- `cd app && npm run verify` passes, unchanged from before this task — nothing here is wired
  into the build yet, so behavior of the running app is identical.
- Manual check: `diff <(cat app/packages/design-system/brands/default/tokens.json)
  <(cat app/packages/design-system/brands/default/tokens.default.json)` produces no output right
  now (this task creates them as an exact copy — see §1 for why this isn't an ongoing invariant
  to defend, just what "copy the file" produces today).

## 8. Definition of done

`npm run verify` passes + `npm ls` and the JSON.parse checks both pass + `git diff --stat`
matches the allowlist (8 files: 6 new, 2 modified) + the manual diff check above shows no output
+ checkpoint commit (ask-first per `AGENTS.md`).

## 9. Stop-conditions

- If any value this spec's table cites turns out not to match the actual current
  `app/app/globals.css` (e.g. the file has changed since this spec was written), stop and ask —
  don't silently use whichever value is newer without flagging the discrepancy.
- If `npm install` fails after adding the `workspaces` field (a dependency conflict, an existing
  `packages/` path collision, anything unexpected), stop and ask rather than working around it.
- If anything about `onAccent`'s computed value seems wrong on inspection (it should read as a
  dark, near-black ink tone, not anything else), stop and ask before proceeding — don't
  recompute a different value unprompted.
