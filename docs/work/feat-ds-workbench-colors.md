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
(Level 1: the reviewer's bullets go here.)

## Steps
- [ ] Read `app/packages/design-system/src/save-tokens.mjs` (`readTokens(brandDir)` returns `{ tree, version }` and throws a message naming the file), `resolve.mjs` (`resolveValue(tree, value)`), `css-var-naming.mjs` (`cssVarNameForPath(path)`), and the shape of `app/packages/design-system/brands/default/tokens.json` (`semantic.color.*`, each token `{ $value, $type: "color", $description? }`; `$value` is a literal hex or a reference like `{primitive.color.accent}`).
- [ ] Write the tests first in `src/lib/server/colorTokens.test.ts` (style of `src/lib/registry.test.ts`: `node:test`, `node:assert/strict`, import the `.ts` file with its extension), with a small fixture tree of your own, never the real file. They must fail before the next step.
- [ ] Write `src/lib/server/colorTokens.ts`: `export function listColorTokens(tree)` returning an array of `{ path, cssVar, raw, value, description }`. It walks `tree.semantic` only, in file order, and includes a node only if it has `$value` and `$type === "color"` (this includes `semantic.focus.ringColor`). `path` is the dotted path (`semantic.color.accent`), `cssVar` is `cssVarNameForPath(path)`, `raw` is the stored `$value`, `value` is `resolveValue(tree, raw)`, `description` is `$description` or `""`. Import the two helpers from `../../../../../app/packages/design-system/src/resolve.mjs` and `.../css-var-naming.mjs` (five levels up reaches the repo root). A reference that cannot be resolved lets `resolveValue`'s error through unchanged.
- [ ] Write `src/routes/foundations/+page.server.ts`: a `load` that calls `readTokens` on the default brand folder (`new URL("../../../../../app/packages/design-system/brands/default", import.meta.url)` turned into a path with `fileURLToPath` from `node:url`), then `listColorTokens(tree)`, and returns `{ tokens, previewUrl: "http://localhost:3000/workbench-preview" }`. If anything throws, call SvelteKit's `error(500, <the message>)` so the page shows the message instead of a crash.
- [ ] Write `src/routes/foundations/+page.svelte` (Svelte 5 runes, like `src/routes/components/[slug]/+page.svelte`): an `<h1>Foundations</h1>`; a "Preview" section with `<iframe title="Preview" src={data.previewUrl}>` (full width, 420px high, 1px `#e0e0e0` border); a "Colors" section with one row per token: swatch (24px square, `background: {value}`, 1px `#e0e0e0` border), the `path`, the `cssVar`, the `value`, and the description (or the text `(no description yet)` in `#666666`). Neutral hard-coded tool colors only (see `tools/Design_System/AGENTS.md`); build any text that depends on a condition in the script, not inside an `{#if}` (that file explains why).
- [ ] In `src/routes/+layout.svelte` turn the `Foundations` `<span class="row">` into `<a class="row link" href="/foundations">` with the same active look (`class:active`, `aria-current`) as the Component links, active when `page.url.pathname === "/foundations"`.
- [ ] Run `bash scripts/verify-task.sh`; fix until it passes.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git.)
- Run: `bash scripts/verify-task.sh` / Expected: last line `verify-task: PASS`.
- `listColorTokens` includes only `$type: "color"` nodes under `semantic` (a fixture with a `semantic.radius.base` token and a `component.button.x` color token: neither appears) → test "ignores non-color tokens and everything outside semantic".
- A reference resolves to the final literal (`{primitive.color.accent}` → `#ae97f7`), `raw` keeps the reference → test "resolves references and keeps the raw value".
- A literal value passes through (`value === raw`) → test "literal values pass through".
- CSS names come from the package function, including a bare key and a nested group (`semantic.color.background` → `--background`, `semantic.focus.ringColor` → `--focus-ring-color`) → test "cssVar matches the package naming".
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
