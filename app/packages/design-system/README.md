# @guitar-tabs/design-system

The token/component source of truth for `app/`'s UI, and eventually a second project (the
control panel) and beyond. Full architecture:
`docs/superpowers/specs/2026-09-19-design-system-design.md`. Build order:
`docs/plans/2026-09-19-design-system/2026-09-19-design-system.md`.

**Don't hand-edit `tokens.json` and `tokens.default.json` independently.**
`brands/default/tokens.json` is the live, current values; `tokens.default.json` is the factory
reset target. They're meant to be kept in sync through the in-app editor (at `/design-system`) or
deliberate, matching edits to both — not casual one-off changes to just one.

## What lives here

- **Brand data** — `brands/default/tokens.json` (live values), `brands/default/tokens.default.json`
  (factory reset target), `brands/default/DESIGN.md` (principles, not just values — see spec §4).
- **Build script + resolver** — `src/build-tokens.mjs` resolves `{path}` references and emits the
  generated CSS custom properties; `src/resolve.mjs` is the resolver it's built on.
- **4 components** — `src/components/`: `ColorField`, `Slider`, `SegmentedControl`, `Button`.
  Each consumes only CSS custom properties/Tailwind classes from the generated stylesheet (no
  hardcoded values) and has a matching `component.<name>` block in `tokens.json`.
- **Token write/reset API route** — lives at `app/app/api/design-system/tokens/route.ts`, i.e.
  **not** inside this package. The route owns HTTP + disk; the pure validation/mutation logic it
  delegates to (`applyWrite`, `applyReset`, `applyResetAll`, `applySetAsDefault`) lives here, in
  `src/token-writes.mjs`.
- **Editor page** — `app/app/design-system/page.tsx` + `editor.tsx`, also outside this package,
  consumes the components and the API route above for live in-browser token tuning.

## Add-a-component convention (spec §6.1)

**Adding:** create the file in `src/components/`, add a `component.<name>` token block that
references semantic tokens only (never a hardcoded value), document it in `brands/default/DESIGN.md`
if it introduces a new behavior pattern.

**Removing:** delete the component file, delete its `component.<name>` block, grep the codebase to
confirm nothing else references those specific token paths before deleting them — prevents orphaned
dead tokens in either direction.

## Where the pure logic lives

`src/token-writes.mjs` and `src/field-descriptors.mjs` hold all the logic that doesn't need a
filesystem, network, or React — both are covered by `node --test` (`token-writes.test.mjs`,
`field-descriptors.test.mjs`). The thin layers around them are manually verified rather than unit
tested: `route.ts` (owns HTTP + disk, delegates to `token-writes.mjs`) and the editor page's
adapters that call it from the browser.

## Figma export

No code needed. `tokens.json`'s shape (`$value`/`$type`, `{path}` references,
`primitive`/`semantic`/`component` layers) is already the format the **Tokens Studio for Figma**
plugin imports natively. Point it at `brands/default/tokens.json` when Figma import is actually
needed.

One caveat: typography tokens (`semantic.typography.sans`/`.mono`) hold CSS `var()` passthroughs
(`var(--font-geist-sans)`), not literal font names — they won't import as usable font choices in
Figma as-is.

## Tests and verification

`npm test --workspace @guitar-tabs/design-system` — 45 tests passing, 0 failing.

`npm run verify` (from `app/`) is the merge gate — runs across the whole `app/` workspace, not just
this package.
