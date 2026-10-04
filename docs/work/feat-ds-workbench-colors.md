# Task: design system workbench, Foundations page with the preview and the color token list (slice 1, task 1e)

Status: active
Branch: feat/ds-workbench-colors
Next: create the two effort-test worktrees (#low, #high) from the brief commit and run scripts/delegate.sh in each. checkJs change approved and committed (098cb81).
Written against: 098cb81

## What changes for you
In the workbench (`http://localhost:5174`) the "Foundations" row in the left sidebar becomes a link to a new page `/foundations`. The page shows, top to bottom: a "Preview" window (an iframe of the web app's `/workbench-preview`, so the five real Components) and a "Colors" list with one row per color token of the default brand: a color swatch, the token's name, its CSS variable (for example `--color-accent`), its current value as hex, and its description (or "(no description yet)"). Read-only: nothing can be edited or saved yet (task 1f). The web app must be running on port 3000 for the preview to show; otherwise the window stays empty.

## Scope
**Modify only:**
- `tools/Design_System/src/routes/+layout.svelte`
- `tools/Design_System/src/routes/foundations/+page.server.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `tools/Design_System/src/lib/server/colorTokens.ts`
- `tools/Design_System/src/lib/server/colorTokens.test.ts`

**Do NOT touch:**
- `contracts/`, config (including `tsconfig.json`, `vite.config.ts`), secrets, `app/` (including `app/packages/design-system/`), anything not listed above

## Size
Files touched: 5 (4 new, 1 changed). Expected diff: ~180 lines. New tests: 6.

## Risk
Triggers: none (read-only; reads the default brand's `tokens.json` on the server through the package's existing `readTokens`; no new network listener; the iframe loads `localhost:3000`, the page the app already serves only in dev). Review level: 1.

## Review
1. Story: yes. The story is "see tokens and the preview in the workbench" (plan slice 1 task 1e); every file serves it (page, loader, list function, sidebar link); the only addition beyond the plan row is the empty-list text.
2. Touches: only the `Foundations` sidebar `<span>` (`tools/Design_System/src/routes/+layout.svelte:17`) and the existing Component links keep working; no write path, no change under `app/` (Do NOT touch list).
3. Reuse: FOUND AND FIXED. `buildFieldDescriptors` (`app/packages/design-system/src/field-descriptors.mjs:91`) already returns path, `$type`, resolved `value`, `rawValue`, `description`; the brief now reuses it instead of a hand-written tree walk, plus `readTokens` (`save-tokens.mjs:26`) and `cssVarNameForPath`.
4. Simplest: already read-only, no search, no grouping, no dark values; cut candidate kept out: no per-section headings (one flat list of 16).
5. Unspecified, now specified: production build path (`import.meta.url` breaks inside `build/`, brief now uses `process.cwd()`); empty list text added; unreadable `tokens.json` becomes `error(500, message)`; web app stopped = empty iframe (owner checklist item 2). Left open: iframe URL is hard-coded `localhost:3000`.
6. Weak spots: the 6 tests cover only `listColorTokens`; the page, the iframe and the sidebar link are checked by `verify-task` for types only (`scripts/verify-task.sh:37-39` runs `npm run verify` = svelte-check + tests), so a blank page would still pass: covered by owner checklist items 1-3, not by an automatic check.
7. Irreversible: nothing (no delete, no write, no schema, no `contracts/`). Exposure: the workbench stays on `127.0.0.1:5174` behind the host guard (`src/hooks.server.ts`); the iframe only loads `localhost:3000/workbench-preview`, which is a 404 in production (1c); no framing headers in `app/next.config.ts` (grep found none).
8. Checked against live code: `readTokens` signature and error text (`save-tokens.mjs:26,32,38`); 16 color-typed leaves under `semantic` and the cssVar names `--color-accent`, `--background`, `--focus-ring-color` (node run); import from the workbench renders real values in dev and `npm run check` goes 252 errors → 0 with `checkJs` off (probe, committed `098cb81`); all five Modify-only paths pass `check-brief.sh` (builder deny list, `.opencode/agents/builder.md:23-44`). NOT checked: that the web app's dev server starts for the owner's checklist without a database (run from the main checkout, which has `.env.local`); the builder's test run with the new descriptor import.

## Steps
- [ ] Read `app/packages/design-system/src/save-tokens.mjs` (`readTokens(brandDir)` returns `{ tree, version }` and throws a message naming the file), `resolve.mjs` (`resolveValue(tree, value)`), `css-var-naming.mjs` (`cssVarNameForPath(path)`), and the shape of `app/packages/design-system/brands/default/tokens.json` (`semantic.color.*`, each token `{ $value, $type: "color", $description? }`; `$value` is a literal hex or a reference like `{primitive.color.accent}`).
- [ ] Write the tests first in `src/lib/server/colorTokens.test.ts` (style of `src/lib/registry.test.ts`: `node:test`, `node:assert/strict`, import the `.ts` file with its extension), with a small fixture tree of your own, never the real file; the fixture may only use token sections that exist in `SECTIONS` in `field-descriptors.mjs` (for example `semantic.color`, `semantic.radius`, `semantic.focus`, `component.button`), each leaf with `$value` and `$type`. They must fail before the next step.
- [ ] Write `src/lib/server/colorTokens.ts`: `export function listColorTokens(tree)` returning an array of `{ path, cssVar, raw, value, description }`. Do not walk the tree yourself: reuse `buildFieldDescriptors(tree, tree)` from `../../../../../app/packages/design-system/src/field-descriptors.mjs` (five levels up reaches the repo root; passing the same tree twice is fine, `isModified` is not used) and keep the descriptors with `$type === "color"` whose `section` starts with `semantic.` (this includes `semantic.focus.ringColor`; component tokens are not listed). Map each to `path` (its `path`), `cssVar` (`cssVarNameForPath(path)` from `.../css-var-naming.mjs`), `raw` (its `rawValue`), `value` (its `value`, already resolved) and `description` (its `description`, already `""` when absent). Errors from `buildFieldDescriptors` (a dangling reference, an unknown token section) pass through unchanged.
- [ ] Write `src/routes/foundations/+page.server.ts`: a `load` that calls `readTokens` on the default brand folder, `resolve(process.cwd(), "../../app/packages/design-system/brands/default")` with `resolve` from `node:path` (not `import.meta.url`: in the production build the file moves into `build/` and the relative path would be wrong; `npm run dev` and `npm start` both run from `tools/Design_System`), then `listColorTokens(tree)`, and returns `{ tokens, previewUrl: "http://localhost:3000/workbench-preview" }`. If anything throws, call SvelteKit's `error(500, <the message>)` so the page shows the message instead of a crash.
- [ ] Write `src/routes/foundations/+page.svelte` (Svelte 5 runes, like `src/routes/components/[slug]/+page.svelte`): an `<h1>Foundations</h1>`; a "Preview" section with `<iframe title="Preview" src={data.previewUrl}>` (full width, 420px high, 1px `#e0e0e0` border); a "Colors" section with one row per token: swatch (24px square, `background: {value}`, 1px `#e0e0e0` border), the `path`, the `cssVar`, the `value`, and the description (or the text `(no description yet)` in `#666666`); if `tokens` is empty show the text `No color tokens found.` Neutral hard-coded tool colors only (see `tools/Design_System/AGENTS.md`); build any text that depends on a condition in the script, not inside an `{#if}` (that file explains why).
- [ ] In `src/routes/+layout.svelte` turn the `Foundations` `<span class="row">` into `<a class="row link" href="/foundations">` with the same active look (`class:active`, `aria-current`) as the Component links, active when `page.url.pathname === "/foundations"`.
- [ ] Run `bash scripts/verify-task.sh`; fix until it passes.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git.)
- Run: `bash scripts/verify-task.sh` / Expected: last line `verify-task: PASS`.
- `listColorTokens` includes only `$type: "color"` nodes under `semantic` (a fixture with a `semantic.radius.base` dimension token and a `component.button.x` color token: neither appears) → test "ignores non-color tokens and everything outside semantic".
- A reference resolves to the final literal (`{primitive.color.accent}` → `#ae97f7`), `raw` keeps the reference → test "resolves references and keeps the raw value".
- A literal value passes through (`value === raw`) → test "literal values pass through".
- CSS names come from the package function, including a bare key and a nested group (`semantic.color.background` → `--background`, `semantic.color.accent` → `--color-accent`, `semantic.focus.ringColor` → `--focus-ring-color`) → test "cssVar matches the package naming".
- Order is file order and a missing `$description` becomes `""` → test "keeps file order; missing description is an empty string".
- A dangling reference (`{primitive.color.nope}`) makes `listColorTokens` throw an error whose message contains `primitive.color.nope` → test "dangling reference throws and names the reference".

## Owner checklist
- [ ] Start the web app (`cd app && npm run dev`, port 3000) and the workbench (`cd tools/Design_System && npm run dev`, port 5174), open `http://localhost:5174/foundations` → the page shows a Preview window with the five Components and a Colors list with 16 rows (15 `semantic.color.*` plus `focus.ringColor`), each with a swatch matching its hex; the Foundations sidebar row is bold.
- [ ] Stop the web app (Ctrl+C on port 3000), reload the workbench page → the Colors list still shows; the Preview window is empty (expected: nothing to show).
- [ ] Click a Component in the sidebar, then Foundations again → both pages load without errors.
- [ ] Nothing was written: `git status --short` shows no change under `app/packages/design-system/brands/`; stop both servers and `lsof -i :3000 -i :5174` prints nothing.

## Open
- DONE (owner yes 2026-10-04, commit 098cb81): set `"checkJs": false` in `tools/Design_System/tsconfig.json`. Reason (probed 2026-10-04 in this worktree): importing the package's `.mjs` files from the workbench makes `npm run check` type-check them and report 252 errors; with `checkJs` off the same probe reports 0 errors, and the dev server rendered the real hash and values. It is a config change, so it needs a yes; Claude commits it before the build (the builder may not touch config).
- Layout choice made without the owner: the preview sits above the color list on one page. The wireframe `foundations-v5` puts the preview in the canvas; 1f will move the editing controls into the inspector.

## Questions
(none open)

## Report
<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line
per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts,
anything noticed but not touched. Mark anything not run as `Not run`.>
