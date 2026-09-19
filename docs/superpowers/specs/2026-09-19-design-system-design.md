# Design System — Design

**Status:** brainstormed in chat 2026-09-19. Next step per `docs/WEB_APP_WORKFLOW.md` §2
(Architectural tier): `superpowers:writing-plans`, which slices this into per-task spec files
in `docs/specs/` for handoff to the execution model (musespark via OpenCode).

## Problem

`app/` currently has three independent, hand-rolled sets of design tokens that drift from each
other by hand: `app/app/globals.css` (`--color-background`, `--color-accent`...),
`docs/backlog-board/index.html` (`--bg`, `--panel`, `--accent`...), and
`docs/patch-bay/index.html` (`--ground`, `--surface`, `--signal`...). Code comments in
`globals.css` explicitly acknowledge the drift ("update both by hand — same manual-sync
convention"). There is also a one-off prototype, `app/design_system/index.html`, that lets you
tune a handful of values visually and copy-paste CSS into `globals.css` by hand — the right idea,
but not wired into anything, not a source of truth, and not reusable.

This design defines a real design token system: tokenized (Figma-importable), lightweight
(only what exists in the app today), visual (a live in-app editor, not copy-paste), extendable
(multi-brand-ready from day one), and modular (a standalone package, portable to future
projects and survivable across a future full tech-stack rebuild).

## Scope

**In scope now (Phase 0):** the main app (`app/`) only.

**Explicitly out of scope:** `docs/backlog-board/index.html` and `docs/patch-bay/index.html`
keep their own hand-rolled tokens for now. Not migrated as part of this work.

**Phase 1 (later, separate spec when it happens):** the control panel project. Extends the
component layer (§5) with whatever it actually needs, as needed — not built speculatively now.

**Eventual full tech-stack rebuild (later, out of scope for any current spec):** see §7,
"Surviving a rebuild." This design's job is to make that rebuild cheap when it happens, not to
do any of that work now.

## 1. Layered architecture

Two layers, because tokens (data) and components (framework-bound code) have fundamentally
different lifespans:

- **Layer 0 — tokens + generated CSS.** Plain JSON plus a Node build script that emits plain CSS
  custom properties. No framework dependency. Survives any future rebuild (React, Vue, Svelte,
  vanilla, whatever) unchanged, because it's just data and CSS.
- **Layer 1 — component primitives.** React components (Phase 0: the handful the token editor
  itself needs; Phase 1: whatever the control panel needs). These consume Layer 0's CSS
  variables/classes and contain no design decisions of their own — no hardcoded colors, spacing,
  or state logic. Kept this thin, a future rebuild in a different framework is a mechanical
  reskin (same class/variable names, new markup syntax), not a redesign.

Explicitly rejected: Web Components as a portability strategy for Layer 1. Real, working
portability, but real engineering cost (shadow DOM, custom-element registration, framework
interop shims) that buys something not needed until the rebuild actually happens. Contradicts
"lower upfront work."

## 2. Package structure

`app/` becomes an npm-workspaces root (already uses npm — `package-lock.json` present, no other
lockfile):

```
app/
  package.json          # add "workspaces": ["packages/*"]
  next.config.ts         # add transpilePackages: ["@guitar-tabs/design-system"]
  packages/
    design-system/
      package.json       # name: "@guitar-tabs/design-system", private, unpublished
      brands/
        default/
          tokens.json         # live, editor-writable — source of truth for current values
          tokens.default.json # factory values, git-tracked, never touched by the editor
          DESIGN.md            # per-brand prose principles (see §4)
      src/
        build-tokens.mjs   # tokens.json -> CSS (plain JS, no compile step needed to run it)
        resolve.mjs         # {path.to.token} reference resolver, shared by build + API route
        components/         # React primitives (Phase 0: 4 components, see §6)
        index.ts
  app/
    app/
      design-tokens.generated.css   # build output, gitignored, imported by globals.css
      design-system/page.tsx        # the visual editor (dev-only, see §5)
      api/design-system/tokens/route.ts   # write/reset API (dev-only, see §5)
```

Real, independently-versioned workspace package from day one (not deferred to extraction time),
per explicit preference: this will be reused by the control panel project next, and by a fully
different tech stack after that. Version stays unpublished/private (`"private": true`) until an
actual second consumer needs it installed from somewhere — no semver discipline to invent for a
package with one consumer.

**Discipline to hold going forward:** nothing gets added to this package "for future
flexibility" that isn't serving `app/` or the control panel today. Extraction to a second
project is the forcing function that reveals what actually needs to be generic — solve that
problem when it's real, not speculatively.

## 3. Token schema — three-layer, brand-wrapped

Three-layer structure (primitive → semantic → component), matching both the W3C Design Tokens
Community Group format (what Figma token plugins expect) and Material Design 3's independently
validated `ref`/`sys`/`comp` model. A brand wrapper means adding a second brand later is adding
a sibling folder under `brands/`, not restructuring anything that reads this file.

```json
{
  "$schema": "https://design-tokens.org/schema.json",
  "primitive": {
    "color": {
      "blue600": { "$value": "#2563eb", "$type": "color" },
      "white":   { "$value": "#ffffff", "$type": "color" }
    }
  },
  "semantic": {
    "color": {
      "background":  { "$value": "#ffffff", "$type": "color" },
      "foreground":  { "$value": "#171717", "$type": "color" },
      "accent":      { "$value": "{primitive.color.blue600}", "$type": "color" },
      "onAccent":    { "$value": "{primitive.color.white}", "$type": "color" },
      "border":      { "$value": "#e4e4e7", "$type": "color" },
      "surface":     { "$value": "#ffffff", "$type": "color" },
      "surfaceText": { "$value": "#141413", "$type": "color" },
      "surfaceHover":       { "$value": "#f0efe9", "$type": "color" },
      "surfaceActive":      { "$value": "#141413", "$type": "color" },
      "surfaceActiveText":  { "$value": "#faf9f5", "$type": "color" }
    },
    "state": {
      "hoverOpacity":   { "$value": 0.08, "$type": "number" },
      "focusOpacity":   { "$value": 0.10, "$type": "number" },
      "pressedOpacity": { "$value": 0.12, "$type": "number" }
    },
    "radius": { "base": { "$value": "12px", "$type": "dimension" } },
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
    "layout": { "sidebarWidth": { "$value": "240px", "$type": "dimension" } }
  },
  "component": {},
  "dark": {
    "semantic": {
      "color": {
        "background": { "$value": "#1c1d1f", "$type": "color" },
        "foreground": { "$value": "#ededed", "$type": "color" },
        "border":     { "$value": "#353434", "$type": "color" },
        "surface":            { "$value": "#535353", "$type": "color" },
        "surfaceText":        { "$value": "#ffffff", "$type": "color" },
        "surfaceHover":       { "$value": "#5c5c5c", "$type": "color" },
        "surfaceActive":      { "$value": "#ffffff", "$type": "color" },
        "surfaceActiveText":  { "$value": "#212121", "$type": "color" }
      }
    }
  }
}
```

Starting values are pulled from the **actual current, production** `app/app/globals.css` — not
from the unused IBM Plex Sans/Mono references in the old `design_system/index.html` prototype,
which never made it into the real app (`globals.css`'s `body` still says
`font-family: Arial, Helvetica, sans-serif`, and Geist is what's actually wired via `next/font`).
This drift between the prototype and the real app is itself evidence for why a single source of
truth matters. `component` starts empty — Phase 0's four components (§6) populate it as they're
built, following the convention in §6.1.

`tokens.default.json` is a byte-for-byte copy of `tokens.json` at the moment this system ships,
committed to git, never written to by the editor or its API. It is the reset target (§5.2).

### Color roles adopted from Material Design 3 (validated, not copied wholesale)

- **Every fill color gets a paired "on-color"** for guaranteed-readable text/icons on top of it
  (`accent`/`onAccent`, `surface`/`surfaceText`, `surfaceActive`/`surfaceActiveText` — the last
  two already existed; `onAccent` is the one addition this design makes).
- **Interactive states are derived, not hand-picked**, via `color-mix()` using the
  `semantic.state.*Opacity` tokens: `color-mix(in srgb, var(--color-accent) 92%,
  var(--color-on-accent) 8%)` for hover, etc. One formula, consistent everywhere, and the
  opacities are themselves brand-adjustable (a "loud" brand can run 14/16/20%, a "quiet" one
  4/6/8%) — not just the base colors.

**Explicitly not adopted:** Material's full 26-role palette, its `container`/`variant` role
pairs, algorithmic tonal-palette generation (HCT color space) from a single seed color,
elevation-via-tonal-overlay, or its specific visual language. All of that is speculative for an
app with roughly five colors today. The `container`/`variant` naming pattern is worth reusing
*if* a second emphasis level is ever actually needed (e.g. a soft badge vs. a primary button) —
noted here as a naming convention to reach for then, not built now.

## 4. Per-brand `DESIGN.md` — principles, not just values

Alongside `tokens.json`, each brand gets a prose document: atmosphere/mood, color roles and
*why* (not just what), typography rules, component behavior expectations, motion philosophy,
and an explicit anti-patterns list — modeled on the `stitch-skill` `DESIGN.md` pattern already
informally in use in this repo (`globals.css` references `docs/studio-theme/DESIGN.md`,
generated via `npx getdesign add claude`). `tokens.json` says "the accent color is `#2563eb`";
`DESIGN.md` says "this brand is calm and functional — avoid decorative motion, use cards only
when they signal real hierarchy." One is data for machines, the other is judgment for whoever
(human or execution model) builds the next component.

Baseline content to include now (adapted from Material's states-and-variants guidance, not
invented): state priority order (`disabled > loading > active > focus > hover > default`), focus
ring spec (2px ring, 2px offset), and WCAG AA contrast minimums (4.5:1 body text, 3:1 large
text/UI components) — so these aren't reinvented per-component later.

## 5. Build pipeline and visual editor

### 5.1 Build pipeline

`packages/design-system/src/build-tokens.mjs`:

1. Reads the active brand's `tokens.json`.
2. Resolves `{path.to.token}` references recursively (algorithm adapted from the
   `ui-ux-pro-max` design-system skill's `generate-tokens.cjs` `resolveReference` — reimplemented
   directly, not depended on).
3. Emits CSS matching **this app's existing conventions**, not a generic template: a `:root`
   block with all resolved custom properties, a `@theme inline` block promoting only
   `--color-*` keys into Tailwind's utility namespace (mirroring the existing comment in
   `globals.css`: "Only color tokens are promoted..."), and `[data-theme="dark"]` /
   `[data-theme="light"]` override blocks — matching the attribute-based theming already wired
   for `/studio`, not the `.dark`-class convention some reference material uses.
4. Writes to `app/app/design-tokens.generated.css` — inside the Next app itself, not the
   package's own output directory, so Next's dev-server file watcher reliably picks up changes
   and hot-reloads. The package owns the *logic* (portable); the app owns *where the output
   lands* (app-specific, gitignored, regenerated on every build).

`app/app/globals.css` gets one added line: `@import "./design-tokens.generated.css";`.

The build also has to run once before the editor ever gets a chance to trigger it — on a fresh
checkout, after `npm install`, or after pulling a teammate's edit to `tokens.json` directly.
`app/package.json`'s `dev` script runs `build-tokens.mjs` once before starting `next dev` (a
`predev` script, or `dev` itself changed to `node ../packages/design-system/src/build-tokens.mjs
&& next dev`), so `design-tokens.generated.css` always exists and is current before the app
needs it — not only after someone has used the editor at least once.

Explicitly not adopted from the Tailwind-integration reference material: storing colors as
space-separated HSL triplets for opacity-modifier support. That's a Tailwind v3 workaround; this
app is on Tailwind v4 (`@theme inline`), which resolves `bg-accent/50`-style opacity modifiers
via `color-mix()` regardless of the underlying color format. Not needed.

### 5.2 Visual editor

`app/app/design-system/page.tsx` + `app/app/api/design-system/tokens/route.ts`. Built from the
design system's own components (§6) — the editor is itself the first real consumer of the
package it edits.

**Reachability:** dev-only. Both the page and the API route are gated behind
`process.env.NODE_ENV !== "production"`. `npm run stage` (a production build) shows the app
styled with whatever was last saved, but the editor and its disk-writing endpoint are not
reachable there — the write path can never exist in anything resembling a real deployment.

**Editing model — per-token, per-brand, never whole-file:**

- The write API takes a token *path* (e.g. `semantic.color.accent`) and a value, and edits only
  that path inside the current brand's `tokens.json`.
- Every editable field in the UI shows a small revert control **only when its current value
  differs from `tokens.default.json` at that same path** — a direct comparison at render time,
  no extra state to track.
- **Reset is per-value, not per-file or cross-brand.** Clicking revert on one field copies just
  that path's value from `tokens.default.json` into `tokens.json`. Because each brand has its
  own `tokens.json`/`tokens.default.json` pair, a reset can never cross into a different brand
  by construction.
- A secondary **"reset all changes in this brand"** action exists for convenience, gated behind
  a confirmation ("reset everything you've changed in this brand?") — larger blast radius than a
  single-field revert, which needs no confirmation since it's trivially redoable.
- A **"set as new default"** action per field: copies the current (edited) value into
  `tokens.default.json` too, so the two files match again and the revert control disappears for
  that field. This is how "I like this change enough to keep it" is expressed — deliberately a
  separate, slightly heavier action from an everyday edit, not something hit by accident.
- Basic write validation: the API rejects a token path that doesn't exist in the schema, or a
  malformed value (invalid hex, non-numeric spacing/opacity) with a clear error, rather than
  writing something broken.
- Explicitly out of scope: multi-tab concurrent-edit safety, and a full undo/redo history beyond
  current-vs-default. Single-user local dev tool; git history plus per-field reset already
  covers the realistic cases.

Each successful write/reset calls the build function (§5.1) in-process before responding, so the
generated CSS is always in sync with `tokens.json` and Next's HMR picks up the change
immediately across the whole running app — not just an isolated preview stage like the current
`design_system/index.html` prototype.

## 6. Component scope (Phase 0)

Only what the editor itself needs to exist, per "only what exists now, add as developed":

| Component | Why it's needed now |
|---|---|
| `ColorField` | swatch + hex text input, for editing color tokens |
| `Slider` | numeric drag input, for radius/spacing/opacity values |
| `SegmentedControl` | theme picker / light-dark preview toggle — extracted from the existing pattern in `app/app/_components/TabSelector.tsx`, not invented |
| `Button` | save / reset / "set as new default" actions |

Each lives in `packages/design-system/src/components/`, consumes only CSS custom
properties/Tailwind classes from the generated stylesheet (no hardcoded values), and gets a
matching `component.<name>` block added to `tokens.json`. The control panel (Phase 1) extends
this list with whatever it actually needs, when it needs it — not built speculatively now.

### 6.1 Convention: adding or removing a component

**Adding:** create the file in `src/components/`, add a `component.<name>` token block that
references semantic tokens only (never a hardcoded value), document it in the brand's
`DESIGN.md` if it introduces a new behavior pattern.

**Removing:** delete the component file, delete its `component.<name>` block, grep the codebase
to confirm nothing else references those specific token paths before deleting them (prevents
orphaned dead tokens either direction).

**Explicitly out of scope, any phase:** a browser UI that generates or deletes component *code*.
Components are authored directly in the repo by a developer or execution model — the editor's
job stays scoped to tuning token *values*. A visual "browse all current components" gallery
inside the editor is a reasonable Phase 1+ addition once there's enough real components to make
one worth building — not now, nothing to browse yet.

## 7. Figma export

No code needed now. `tokens.json`'s shape (`$value`/`$type`, `{path}` references,
`primitive`/`semantic`/`component` layers) is already the format the **Tokens Studio for
Figma** plugin imports natively. When Figma import is actually needed: install Tokens Studio,
point it at `packages/design-system/brands/default/tokens.json`. Documented here as a future
step, not built as tooling now.

## 8. Surviving a future full tech-stack rebuild

Layer 0 (§1) — `tokens.json`, `tokens.default.json`, `DESIGN.md`, and the generated CSS output —
carries over to any future stack unchanged: it's JSON, prose, and plain CSS custom properties,
none of it React- or Next.js-specific. Layer 1 (the four-then-more React components) gets
reimplemented once, on purpose, at rebuild time, in whatever the new stack is — cheap *because*
each component was kept thin (markup + token references, no embedded design decisions) per the
discipline in §1 and §6. This is the realistic ceiling for "no lock-in" on interactive
components without adopting Web Components, which was explicitly rejected as not worth the
upfront cost (§1).

## 9. Deferred / explicitly out of scope

- Migrating `docs/backlog-board/index.html` and `docs/patch-bay/index.html` onto this system.
- The control panel's own component needs (Phase 1 — separate spec when that project starts).
- `/impeccable audit`/`critique`/`polish` integration — a good fit once real components exist to
  point it at, using the brand's `DESIGN.md` + `PRODUCT.md` as context, but a workflow layered on
  top later, not part of this build.
- Material Design's full 26-role color system, algorithmic tonal-palette generation, and
  elevation-via-tonal-overlay (§3).
- A visual component gallery inside the editor (§6.1) — once there's enough to browse.
- Undo/redo history beyond current-vs-default, and multi-tab concurrent-edit safety (§5.2).
- Web Components or any other framework-portability mechanism beyond "keep Layer 1 thin" (§1, §8).

## 10. Prior art consulted

- `Skills/impeccable-main` — an AI-agent design-critique/guidance skill (not a token system or
  component library). No architectural influence on this design; noted in §9 as a later,
  separate integration.
- `Skills/ui-ux-pro-max-skill-main`'s `design-system` sub-skill — source of the three-layer
  token architecture and the reference-resolution algorithm (§3, §5.1). Not depended on; the
  relevant pieces are reimplemented directly to keep this package free of a large,
  multi-purpose (slides/logos/banners/brand) toolkit dependency.
- `Skills/taste-skill-main`'s `stitch-skill` — source of the per-brand `DESIGN.md` pattern (§4),
  already informally present in this repo via `docs/studio-theme/DESIGN.md`.
- Material Design 3 web docs (`m3.material.io`) — source of the paired on-color convention and
  opacity-derived interactive states (§3), validated against the three-layer schema
  independently.
