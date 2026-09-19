# Design System Implementation Plan

> **For whoever picks this plan up:** this plan does **not** use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Per
> `docs/WEB_APP_WORKFLOW.md` §2 (Architectural tier), which governs all `app/` work in this repo,
> each task below becomes its own spec file in `docs/specs/` (using that doc's §3 template) and is
> implemented by the execution model (musespark via OpenCode) — Claude has no direct tool access
> to that model, and relays specs and results by hand through the user. Follow
> `docs/WEB_APP_WORKFLOW.md` §5's execution loop for each task, in the order below.

**Goal:** Build the tokenized, multi-brand-ready, visually-editable design token system specced
in `docs/superpowers/specs/2026-09-19-design-system-design.md`.

**Architecture:** A standalone npm-workspace package (`app/packages/design-system`) holding a
three-layer JSON token schema and a Node build script that emits plain CSS, consumed by the Next
app via a generated, gitignored stylesheet. A dev-only in-app editor writes directly to the
token file and triggers a rebuild, so Next's own HMR refreshes the whole running app on every
edit — this supersedes the iframe/`postMessage` "bridge mode" previously sketched as a "planned
next" step in `app/status/design-system.md`; no bridge is needed because the editor lives inside
the same running app rather than embedding it.

**Tech Stack:** Next.js 16 / React 19 / Tailwind CSS v4 (already in use), Node's built-in test
runner (`node --test`, matching the existing `app/package.json` convention — no new test
framework), npm workspaces.

**Spec:** `docs/superpowers/specs/2026-09-19-design-system-design.md` — every task below cites
the section it implements. Read both before starting any task.

## Global Constraints

(Copied verbatim from the spec; every task's scope implicitly includes these.)

- No hardcoded design values outside `tokens.json` — components and generated CSS only ever
  reference tokens (spec §1, §3, §6.1).
- Starting token values come from the **actual current** `app/app/globals.css`, not the old
  gitignored `app/design_system/index.html` prototype (spec §3).
- The editor and its write API must be unreachable in a production build — `next build`
  prerenders routes by default, so both need `export const dynamic = "force-dynamic"` and a
  `NODE_ENV === "production"` guard, not just "don't link to it" (spec §5.2).
- Reset is always per-token-path and per-brand, never whole-file (spec §5.2).
- `packages/design-system` stays framework-agnostic at the token/build layer (Layer 0); only
  `src/components/` may import React (Layer 1) (spec §1).
- Nothing gets added "for future flexibility" that isn't serving this build or the control panel
  today (spec §2).

---

## File structure

```
app/
  package.json                                   # Task 1, 3: workspaces field, build/dev hooks
  next.config.ts                                 # Task 1: transpilePackages
  .gitignore                                      # Task 3: ignore generated CSS
  scripts/verify.sh                               # Task 2: run package tests
  status/design-system.md                         # Task 7: retire superseded "bridge" note
  packages/design-system/
    package.json                                  # Task 1
    active-brand.json                              # Task 1
    README.md                                      # Task 7
    brands/default/
      tokens.json                                  # Task 1 (data), Task 4 (component blocks)
      tokens.default.json                          # Task 1 (data), Task 4 (component blocks)
      DESIGN.md                                     # Task 1
    src/
      resolve.mjs                                   # Task 2
      resolve.test.mjs                              # Task 2
      build-tokens.mjs                              # Task 2
      tokens-validation.test.mjs                     # Task 2 (path parity + shape validation)
      components/
        ColorField.tsx                              # Task 4
        Slider.tsx                                  # Task 4
        SegmentedControl.tsx                        # Task 4
        Button.tsx                                  # Task 4
      index.ts                                      # Task 4
  app/
    globals.css                                    # Task 3
    design-tokens.generated.css                    # generated, not committed (Task 3 wires it)
    api/design-system/tokens/route.ts               # Task 5
    design-system/page.tsx                          # Task 6
```

Files that change together stay together: the brand data (`tokens.json` + `tokens.default.json`
+ `DESIGN.md`) is one task; the resolver and the tests that prove it works are one task; the
risky cutover (deleting old tokens, wiring build hooks) is isolated into its own small task
rather than folded into a bigger one, per the design spec's own §5.1.1 reasoning.

---

## Task 1: Workspace scaffold + brand data

**Implements:** spec §2 (package structure, active-brand seam), §3 (token schema, starting
values), §4 (per-brand `DESIGN.md`).

**Files:**
- Modify: `app/package.json` — add `"workspaces": ["packages/*"]`
- Modify: `app/next.config.ts` — add `transpilePackages: ["@guitar-tabs/design-system"]`
- Create: `app/packages/design-system/package.json` — `"name": "@guitar-tabs/design-system"`,
  `"private": true`, no dependencies yet (React added in Task 4)
- Create: `app/packages/design-system/active-brand.json` — `{ "brand": "default" }`
- Create: `app/packages/design-system/brands/default/tokens.json` — full three-layer schema per
  spec §3's example, with values read directly from the **current** `app/app/globals.css`
  (`--background: #ffffff` / `#0a0a0a` dark, `--color-accent: #ae97f7`, `--color-border:
  #e6dfd8`, the `--color-surface*` family for both `[data-theme="light"]` and
  `[data-theme="dark"]`, `--radius: 12px`, `--space-1..8`, `--sidebar-width: 240px`), plus the
  one new token this design adds: `semantic.color.onAccent` and the three
  `semantic.state.*Opacity` values (spec §3's "Color roles adopted from Material Design 3").
  `component: {}` (empty — Task 4 populates it).
- Create: `app/packages/design-system/brands/default/tokens.default.json` — byte-identical copy
  of the above at creation time.
- Create: `app/packages/design-system/brands/default/DESIGN.md` — prose per spec §4: atmosphere,
  color roles and why, typography rules, state priority order
  (`disabled > loading > active > focus > hover > default`), focus ring spec (2px ring, 2px
  offset), WCAG AA minimums (4.5:1 body text, 3:1 large text/UI components), anti-patterns list.
  Base the atmosphere/voice description on how the app is actually described in
  `app/STATUS.md`/`docs/PRODUCT.md` — don't invent a brand personality from scratch.

**Interfaces:**
- Produces: the `tokens.json` / `tokens.default.json` shape every later task reads — top-level
  keys `primitive`, `semantic` (with `color`, `state`, `radius`, `space`, `typography`,
  `layout`), `component` (empty), `dark.semantic.color`. `active-brand.json`'s `{ "brand": string
  }` shape, read by Tasks 2, 3, 5.

**Acceptance criteria:**
- `npm install` succeeds from `app/` (workspace resolves).
- `npm run verify` still passes unchanged (nothing wired into the build yet — this task is data
  and config only, no behavior change to the running app).
- Manual check: every value in `tokens.json` traces back to a real line in the current
  `app/app/globals.css` — no invented values.

**Stop-conditions:** if a value needed for the schema isn't actually present in
`app/app/globals.css` (i.e. something in spec §3's example doesn't have a real source), stop and
ask rather than inventing a plausible-looking default.

---

## Task 2: Reference resolver, build script, and tests

**Implements:** spec §5.1 (points 1–3), §5.1.2 (all three tests).

**Files:**
- Create: `app/packages/design-system/src/resolve.mjs` — exports a function that takes a token
  tree and a `{path.to.token}`-style reference string (or a raw value) and returns the resolved
  value. Non-`{`-prefixed values (e.g. `var(--font-geist-sans)`) pass through unresolved (spec
  §5.1 point 2). Detects a reference cycle and throws a clear, specific error rather than
  recursing unboundedly.
- Create: `app/packages/design-system/src/resolve.test.mjs` — multi-hop reference resolves
  correctly; a reference to a nonexistent path throws; a circular reference (`{a}` → `{b}` →
  `{a}`) throws instead of hanging or crashing the process (spec §5.1.2, test 1).
- Create: `app/packages/design-system/src/build-tokens.mjs` — reads `active-brand.json`, reads
  that brand's `tokens.json`, resolves every value via `resolve.mjs`, emits CSS text (does not
  yet write to `app/app/` — that wiring is Task 3, deliberately, so this task doesn't touch the
  running app). Output shape per spec §5.1 point 3: a `:root` block with every resolved custom
  property, a `@theme inline` block promoting only `--color-*` keys, and
  `[data-theme="dark"]`/`[data-theme="light"]` override blocks from `tokens.json`'s `dark` key —
  matching the app's existing attribute-based theming, not a `.dark`-class convention.
- Create: `app/packages/design-system/tokens-validation.test.mjs` — two checks (spec §5.1.2,
  tests 2–3): every token path present in `tokens.json` is also present in `tokens.default.json`
  and vice versa (and the reverse doesn't hold either way); every leaf across both files has both
  `$value` and `$type`, and `$type` is one of `color` / `dimension` / `number` / `fontFamily`.
- Modify: `app/packages/design-system/package.json` — add `"test": "node --test src/**/*.test.mjs"`.
- Modify: `app/scripts/verify.sh` — add a line running `npm test --workspace
  @guitar-tabs/design-system` (or `packages/design-system`, whichever npm workspace syntax
  resolves correctly from `app/` — verify locally) after the existing unit-test step.

**Interfaces:**
- Consumes: `tokens.json` / `tokens.default.json` / `active-brand.json` shapes from Task 1.
- Produces: `resolve(tree, value)` from `resolve.mjs` (used again by the API route in Task 5 for
  validating writes), and `buildCSS()` (or equivalent named export) from `build-tokens.mjs` that
  returns the generated CSS as a string — Task 3 is what calls it and writes the result to disk.

**Acceptance criteria:**
- `npm test --workspace @guitar-tabs/design-system` passes (all three tests green).
- `npm run verify` passes with the new test step included.

**Stop-conditions:** if resolving a value produces something that doesn't look like valid CSS
(e.g. `undefined` leaking into the output) for any token in the real `tokens.json` from Task 1,
stop and ask — don't silently emit broken CSS.

---

## Task 3: Cutover — wire the build into `dev`/`build`, replace hand-rolled tokens

**Implements:** spec §5.1 ("the build has to run before anything..."), §5.1.1 (cutover).

This is the highest-risk task in the plan — the design spec calls this out explicitly (§5.1.1)
and requires it be one atomic change, not spread across other tasks. Keep it small and isolated
for exactly that reason.

**Files:**
- Modify: `app/package.json` — add `"tokens:build": "node packages/design-system/src/build-tokens.mjs"`,
  `"predev": "npm run tokens:build"`, `"prebuild": "npm run tokens:build"`. (npm runs
  `pre<script>` automatically before `<script>` — no other wiring needed.) `build-tokens.mjs`'s
  main entrypoint (invoked when run directly, vs. imported by Task 5's API route) writes its
  output to `app/app/design-tokens.generated.css`.
- Modify: `app/.gitignore` — add `/app/design-tokens.generated.css`.
- Modify: `app/app/globals.css` — add `@import "./design-tokens.generated.css";`, and **in the
  same change**, delete every hand-rolled token definition it now supersedes: the `--background`
  /`--foreground` defaults, the `--color-accent`/`--color-border`/`--color-surface*` family, the
  `@theme inline` block's color promotions, the `prefers-color-scheme: dark` override, and the
  `[data-theme="light"]`/`[data-theme="dark"]` blocks. Keep anything that isn't a token — per the
  spec, that's only the `body { font-family: ... }` rule, which already reads token variables
  rather than duplicating them.

**Interfaces:**
- Consumes: `build-tokens.mjs`'s output from Task 2.
- Produces: nothing new for later tasks — this task's job is making the existing app run on the
  new system, not adding a surface.

**Acceptance criteria:**
- `npm run verify:full` passes (this is the CI-equivalent path, and exercises `npm run build` →
  `prebuild` → `next build`, which is exactly the scenario this task exists to keep from failing
  on a clean checkout).
- Manual check (per `docs/WEB_APP_WORKFLOW.md` §5 step 8): `npm run stage`, look at `/` and
  `/studio` — confirm colors, spacing, and both light/dark themes look the same as before this
  change. This is the human judgment call the automated checks can't make.

**Stop-conditions:** if anything visually shifts on `/` or `/studio` during the manual check,
stop — don't guess which hand-rolled value the generated CSS is supposed to match, go back and
compare Task 1's `tokens.json` against the exact pre-cutover `globals.css` line by line.

---

## Task 4: Component primitives

**Implements:** spec §6 (all four components), §6.1 (the add-a-component convention, applied to
each).

**Files:**
- Create: `app/packages/design-system/src/components/ColorField.tsx` — swatch + hex text input.
- Create: `app/packages/design-system/src/components/Slider.tsx` — numeric drag input, used for
  radius/spacing/opacity values.
- Create: `app/packages/design-system/src/components/SegmentedControl.tsx` — extracted from the
  existing pattern in `app/app/_components/TabSelector.tsx` (read that file first — reuse its
  approach to `role="tablist"`/`aria-selected`, don't design a new one).
- Create: `app/packages/design-system/src/components/Button.tsx` — used for save/reset/"set as
  new default" actions in Task 6.
- Create: `app/packages/design-system/src/index.ts` — barrel export of all four.
- Modify: `app/packages/design-system/package.json` — add `react`, `react-dom` as peer
  dependencies (not regular dependencies — the app already provides them).
- Modify: `app/packages/design-system/brands/default/tokens.json` and `tokens.default.json` —
  add a `component.colorField`, `component.slider`, `component.segmentedControl`,
  `component.button` block for each, referencing semantic tokens only (spec §6.1 — never a
  hardcoded value in a `component.*` block).

**Interfaces:**
- Consumes: the generated CSS custom properties from Task 3 (via Tailwind classes or
  `var(--...)`, never a hardcoded value), the `component.*` token blocks this task adds.
- Produces: `ColorField`, `Slider`, `SegmentedControl`, `Button` from
  `@guitar-tabs/design-system` — exact prop signatures are this task's implementer's call, but
  Task 6 (the editor page) needs, at minimum: `ColorField(value: string, onChange: (v: string) =>
  void, onReset?: () => void)`, `Slider(value: number, onChange: (v: number) => void, min:
  number, max: number, step: number)`, `SegmentedControl(options: {value: string; label:
  string}[], value: string, onChange: (v: string) => void)`, `Button(onClick: () => void,
  variant?: "primary" | "secondary", children: React.ReactNode)`. Confirm exact names/types
  match what's actually implemented before writing Task 6's spec.

**Acceptance criteria:**
- `npm run verify` passes (typecheck + lint; these components have no consumer yet, so there's
  nothing to visually check in isolation — real visual verification happens in Task 6, their
  actual consumer, not here).

**Stop-conditions:** none specific — this is a self-contained, low-ambiguity task.

---

## Task 5: Token write/reset API route

**Implements:** spec §5.2 ("Editing model" and "Reachability," the API-route half).

**Files:**
- Create: `app/app/api/design-system/tokens/route.ts` — `export const dynamic =
  "force-dynamic"`. Every handler checks `process.env.NODE_ENV === "production"` first and
  returns a 404 before doing anything else (spec §5.2 "Reachability"). Handles:
  - **write**: token path + value → validate path exists in the schema and value matches its
    `$type` (reject invalid hex for `color`, non-numeric for `dimension`/`number`) → write to the
    current brand's `tokens.json` at that path → call `build-tokens.mjs`'s exported build
    function in-process → respond.
  - **reset** (single path): same as write, but the value comes from `tokens.default.json` at
    that path instead of the request body.
  - **reset-all**: every path in `tokens.json` that differs from `tokens.default.json` gets
    reset, in one call — this is the "reset all changes in this brand" action (spec §5.2);
    the confirmation UI for it belongs in Task 6, not here.
  - **set-as-default**: token path → copies the current value from `tokens.json` into
    `tokens.default.json` at that path.

**Interfaces:**
- Consumes: `resolve.mjs`'s exports (Task 2, for validating a reference-style value) and
  `build-tokens.mjs`'s build function (Task 2).
- Produces: the route's request/response shape — pin down exact JSON bodies (e.g. `{path:
  string, value: string | number}` for write, `{path: string}` for reset/set-default) since
  Task 6 is this route's only consumer and needs to match it exactly.

**Acceptance criteria:**
- `npm run verify` passes.
- Manual check via `curl` or a REST client against `npm run dev`: a write to a known color path
  changes `tokens.json` and regenerates `design-tokens.generated.css`; a request in a
  `NODE_ENV=production` process (`npm run stage`) returns 404 for every handler.

**Stop-conditions:** if validating a value's `$type` turns out to need more than a simple
regex/range check for any token currently in the schema, stop and ask rather than guessing at
validation rules the spec didn't specify.

---

## Task 6: Visual editor page

**Implements:** spec §5.2 ("Schema-driven, not hand-built per field," "Reachability," the page
half of the editing model).

**Files:**
- Create: `app/app/design-system/page.tsx` — calls `notFound()` (from `next/navigation`) when
  `process.env.NODE_ENV === "production"`, `export const dynamic = "force-dynamic"`.
- Create supporting client component(s) as needed for interactivity (implementer's call whether
  the whole page is a client component or splits into a thin server wrapper + client form —
  either is fine, not load-bearing).

**Behavior (schema-driven, spec §5.2):**
- Walks the active brand's `tokens.json`, groups fields by top-level section (`color`, `radius`,
  `space`, `typography`, `state`, then each `component.<name>` block), and renders one field per
  leaf token dispatched on `$type`: `color` → `ColorField`, `dimension`/`number` → `Slider`,
  anything else → a plain read-only text display (safe fallback — not an interactive field).
- Each field shows a revert control only when its current value differs from
  `tokens.default.json` at that path (direct comparison at render time).
- A "reset all changes in this brand" action, behind a confirmation dialog.
- A "set as new default" action per field.
- Every write/reset/set-default calls Task 5's API route; a successful response means the CSS
  was already regenerated server-side — no extra client-side rebuild trigger needed, just a
  refetch of the current `tokens.json` state to re-render.

**Interfaces:**
- Consumes: `ColorField`/`Slider`/`SegmentedControl`/`Button` from Task 4, the exact request/
  response shapes from Task 5.

**Acceptance criteria:**
- `npm run verify` passes.
- Manual check in `npm run dev`: open `/design-system`, edit a color, confirm the change appears
  live elsewhere in the running app (e.g. `/`) via HMR with no manual refresh; click that field's
  revert control, confirm it returns to the default; confirm `/design-system` 404s under
  `npm run stage`.

**Stop-conditions:** if the schema-driven rendering hits a token shape not anticipated by Task
1's schema (something without a clean `$type` mapping to one of the three field kinds), stop and
ask rather than silently guessing a field type.

---

## Task 7: Documentation — component convention, Figma export, retire the old status note

**Implements:** spec §6.1 (documented, not just practiced), §7 (Figma export path), and closes
out `app/status/design-system.md`'s now-superseded "planned next" section.

**Files:**
- Create: `app/packages/design-system/README.md` — the add/remove-a-component convention (spec
  §6.1: create the file, add a `component.<name>` block referencing semantic tokens only,
  document new behavior patterns in `DESIGN.md`; to remove, delete the file, delete the block,
  grep for stray references first) and the Figma export path (spec §7: install Tokens Studio for
  Figma, point it at `brands/default/tokens.json` — no code needed).
- Modify: `app/status/design-system.md` — replace the "Planned next (not built): a live 'bridge'
  mode..." paragraph with a short note describing what actually shipped (this package, the
  in-app editor) and why the bridge idea turned out to be unnecessary (the editor lives inside
  the running app rather than embedding it, so every open tab gets the update via normal HMR,
  no `postMessage` protocol needed). Point to `app/packages/design-system/README.md` and the
  design spec for detail rather than duplicating it here, matching this file's existing style
  (a short pointer, not a full explanation).

**Optional, human judgment call — not part of this task's required scope:** delete the
superseded `app/design_system/index.html` prototype now that the real system exists. It's
gitignored and harmless either way; leaving it costs nothing but a slightly confusing local
folder. Flagging it so the decision is made deliberately rather than by default.

**Acceptance criteria:** manual review — the README accurately describes the convention as
actually implemented in Tasks 1–6 (not the spec's plan, the real result), and
`app/status/design-system.md` no longer describes a bridge-mode plan that isn't happening.

---

## Self-review

**Spec coverage:** §1 (layering) → Tasks 1, 2, 4 (the Layer 0/Layer 1 split is enforced by which
files each task touches). §2 (package structure, active-brand seam) → Task 1. §3 (schema,
Material-derived additions) → Task 1. §4 (`DESIGN.md`) → Task 1. §5.1 (build pipeline) → Task 2.
§5.1.1 (cutover) → Task 3. §5.1.2 (tests) → Task 2. §5.2 (editor + API) → Tasks 5, 6. §6
(components) → Task 4. §6.1 (convention) → Tasks 4 (applied), 7 (documented). §7 (Figma) → Task
7. §8 (rebuild survivability) is a property of how Tasks 1–6 are built, not a task of its own —
no gap. §9/§10 are explicitly out of scope / informational — nothing to implement.

**Placeholder scan:** no TBD/TODO; every task names exact files and exact behavior. The one
deliberate "implementer's call" (Task 6's server/client component split) is flagged as
explicitly non-load-bearing, not a gap.

**Type/interface consistency:** `resolve.mjs`'s export is used identically in Task 2 (build
script) and Task 5 (API route validation) — same function, not two implementations. Task 4's
component prop shapes are pinned down concretely enough for Task 6 to consume without
re-guessing. Task 5's request/response shapes are the single contract Task 6 codes against — no
task downstream invents a different shape.

**Sequencing check (the user's requirement):** each task depends only on prior *completed* tasks
(1→2→3→4→5→6→7, strictly linear, no task requires a later one to exist). No two tasks touch the
same file while both are in flight — later edits to `tokens.json` (Task 4) happen only after
Task 1 is committed. Each task has its own `npm run verify`-based or explicit manual acceptance
criterion, independent of whether later tasks have started. No two tasks duplicate work. Task
size stays narrow (one concern, a handful of files) throughout — Task 6 is the largest, and it's
bounded by "one page, consuming an already-fixed API contract and already-built components,"
not an open-ended design problem.
