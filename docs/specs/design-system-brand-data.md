# Task spec: Design system — workspace scaffold + brand data

Implements Task 1 of `docs/superpowers/plans/2026-09-19-design-system.md`. Read that task's
section before starting — this file is the actionable slice of it, not a replacement for it.

## 1. Scope

- `app/package.json`: add `"workspaces": ["packages/*"]`.
- `app/next.config.ts`: add `transpilePackages: ["@guitar-tabs/design-system"]` to the exported
  config object (alongside the existing `rewrites()`).
- `app/packages/design-system/package.json` (**new**): `{"name": "@guitar-tabs/design-system",
  "version": "0.0.0", "private": true}`. No dependencies yet — React is added in a later task
  (Task 4), not this one.
- `app/packages/design-system/active-brand.json` (**new**): `{ "brand": "default" }`.
- `app/packages/design-system/brands/default/tokens.json` (**new**): exact content in §3.
- `app/packages/design-system/brands/default/tokens.default.json` (**new**): byte-identical copy
  of `tokens.json` at creation time — copy the file, don't retype it, so there's no chance of a
  transcription drift between the two on day one.
- `app/packages/design-system/brands/default/DESIGN.md` (**new**): exact content in §3.
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
- Don't "fix" or improve any of the values below relative to what's actually live in
  `app/app/globals.css` today, even if something looks improvable (e.g. don't retune a color).
  This task's job is a faithful, traceable copy of current reality, not a redesign.

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
      "onAccentInk": { "$value": "#141413", "$type": "color" }
    }
  },
  "semantic": {
    "color": {
      "background": { "$value": "#faf9f5", "$type": "color" },
      "foreground": { "$value": "#141413", "$type": "color" },
      "accent": { "$value": "{primitive.color.accent}", "$type": "color" },
      "onAccent": { "$value": "{primitive.color.onAccentInk}", "$type": "color" },
      "border": { "$value": "#e6dfd8", "$type": "color" },
      "surface": { "$value": "#ffffff", "$type": "color" },
      "surfaceText": { "$value": "#141413", "$type": "color" },
      "surfaceHover": { "$value": "#f0efe9", "$type": "color" },
      "surfaceActive": { "$value": "#141413", "$type": "color" },
      "surfaceActiveText": { "$value": "#faf9f5", "$type": "color" }
    },
    "state": {
      "hoverOpacity": { "$value": 0.08, "$type": "number" },
      "focusOpacity": { "$value": 0.10, "$type": "number" },
      "pressedOpacity": { "$value": 0.12, "$type": "number" }
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
        "surfaceText": { "$value": "#ffffff", "$type": "color" },
        "surfaceHover": { "$value": "#5c5c5c", "$type": "color" },
        "surfaceActive": { "$value": "#ffffff", "$type": "color" },
        "surfaceActiveText": { "$value": "#212121", "$type": "color" }
      }
    }
  }
}
```

**Where every value comes from** (so this is checkable, not asserted):

| Token | Value | Source in `app/app/globals.css` |
|---|---|---|
| `semantic.color.background` (light) | `#faf9f5` | `[data-theme="light"] { --background: ... }` |
| `semantic.color.foreground` (light) | `#141413` | `[data-theme="light"] { --foreground: ... }` |
| `semantic.color.border` | `#e6dfd8` | `[data-theme="light"] { --color-border: ... }` (also the bare `:root` value — same in both) |
| `semantic.color.surface` (light) | `#ffffff` | `[data-theme="light"] { --color-surface: ... }` |
| `semantic.color.surfaceText`/`surfaceHover`/`surfaceActive`/`surfaceActiveText` (light) | as listed | same `[data-theme="light"]` block |
| `dark.semantic.color.*` | as listed | `[data-theme="dark"] { ... }`, same key names |
| `primitive.color.accent` / `semantic.color.accent` | `#ae97f7` | bare `:root { --color-accent: ... }` — not redefined per theme in the real CSS, so it's theme-invariant here too (no `dark.semantic.color.accent` entry) |
| `radius.base` | `12px` | `:root { --radius: ... }` |
| `space.1`–`space.8` | `4/8/12/16/24/32px` | `:root { --space-1: ... }` through `--space-8` |
| `layout.sidebarWidth` | `240px` | `:root { --sidebar-width: ... }` |
| `typography.sans`/`mono` | `var(--font-geist-sans)` / `var(--font-geist-mono)` | `@theme inline { --font-sans: var(--font-geist-sans); ... }` — these aren't `{path}` token references, they're raw CSS pointing at Next's own `next/font`-generated variables; a later task's resolver passes non-`{`-prefixed values through unchanged, so this is intentional, not a mistake |

**Two things that need explaining, not just copying:**

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
- **Why isn't `surface` written as a reference to `background`?** `globals.css`'s bare `:root`
  does define `--color-surface: var(--background)` — a real relationship. But that's the same
  dead block from the point above. The **live** `[data-theme="light"]`/`[data-theme="dark"]`
  blocks each set `--color-surface` to its own independent literal, deliberately different from
  that theme's `--background` (light: `#ffffff` vs. `#faf9f5`; dark: `#535353` vs. `#1c1d1f`) —
  not a mirrored value in the code that's actually reachable. Writing `surface` as
  `{semantic.color.background}` here would produce a color that was never actually rendered.
  Capture it as the literal it actually is.

**`onAccent` is new — not copied from anywhere, computed.** `globals.css` has no existing
"text on accent" color, because nothing in the app today fills a background with `--color-accent`
(it's used as text/border color, e.g. `app/app/_components/TabSelector.tsx`'s active-tab
styling). This design adds `onAccent` so a future filled-background component (Phase 1's control
panel) has a defined, contrast-checked answer. Against `accent` (`#ae97f7`), white text gives a
WCAG contrast ratio of **2.45:1** — fails the 4.5:1 minimum badly. `#141413` (already meaningful
in this codebase — it's the light-theme `foreground`/ink color, not an invented value) gives
**7.52:1** — passes with real margin. That's why `onAccent` points at
`primitive.color.onAccentInk` (`#141413`), not white. A later task adds an automated test that
checks this arithmetic; this value was chosen to already pass it, not left for that test to
catch.

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

- Interactive states (hover/focus/pressed/disabled) are derived from the base color plus the
  `state.*Opacity` tokens via `color-mix()`, not hand-picked per component. See the design spec,
  §3, for the exact formula.
- State priority when more than one applies at once: `disabled > loading > active > focus >
  hover > default`.
- Focus ring: 2px, 2px offset, in the accent color.
- Contrast minimum: WCAG AA — 4.5:1 for body text, 3:1 for large text (18px+) and UI components.
  Every accent/on-accent and surface/surface-text pairing in this brand's tokens is expected to
  meet this; a later task enforces it as a test, not just this statement.

## Anti-patterns

- No decorative motion. This is a practice tool someone opens dozens of times a session —
  animation should communicate state changes, not add personality.
- No card-nesting. Rows and controls read as flat, bordered elements, not stacked boxes.
- Cards/containers only when they signal real hierarchy, not by default.
```

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A value in `app/app/globals.css` that this spec's table doesn't account for | Stop and ask (see §9) — don't guess where it belongs |
| `tokens.json` and `tokens.default.json` end up not byte-identical | Copy the file after writing `tokens.json`, don't hand-type both — a drift here breaks the reset feature two tasks from now |

## 5. Forbidden patterns

- No hardcoded value inside `component` (it's `{}` — nothing to violate yet, but don't add
  anything to it in this task).
- No retuning, "improving," or simplifying any color/spacing value relative to what's actually in
  `app/app/globals.css` today.
- No touching `.env`, credentials, or anything under `app/app/`.

## 6. File allowlist

- `app/package.json`
- `app/next.config.ts`
- `app/packages/design-system/package.json` (new)
- `app/packages/design-system/active-brand.json` (new)
- `app/packages/design-system/brands/default/tokens.json` (new)
- `app/packages/design-system/brands/default/tokens.default.json` (new)
- `app/packages/design-system/brands/default/DESIGN.md` (new)

## 7. Acceptance criteria

- `cd app && npm install` succeeds (workspace resolves cleanly).
- `cd app && npm run verify` passes, unchanged from before this task — nothing here is wired
  into the build yet, so behavior of the running app is identical.
- Manual check: `diff <(cat app/packages/design-system/brands/default/tokens.json)
  <(cat app/packages/design-system/brands/default/tokens.default.json)` produces no output (the
  two files are identical).

## 8. Definition of done

`npm run verify` passes + `git diff --stat` matches the allowlist (7 files, 5 new + 2 modified)
+ the manual diff check above shows no output + checkpoint commit (ask-first per `AGENTS.md`).

## 9. Stop-conditions

- If any value this spec's table cites turns out not to match the actual current
  `app/app/globals.css` (e.g. the file has changed since this spec was written), stop and ask —
  don't silently use whichever value is newer without flagging the discrepancy.
- If `npm install` fails after adding the `workspaces` field (a dependency conflict, an existing
  `packages/` path collision, anything unexpected), stop and ask rather than working around it.
- If anything about `onAccent`'s computed value seems wrong on inspection (it should read as a
  dark, near-black ink tone, not anything else), stop and ask before proceeding — don't
  recompute a different value unprompted.
