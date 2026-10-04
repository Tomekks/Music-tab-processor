# Task: design system workbench, three-column shell (slice 1, task 1b2)

Status: active
Branch: feat/ds-workbench-shell
Next: STOPPED — finish.sh blocked by prep-commit file in scope check; see ## Questions.
Written against: 33c7e0d

## What changes for you
Run `npm --prefix tools/Design_System run dev` and open http://127.0.0.1:5174. You see the workbench frame from the wireframe: a top bar (title "Design System" and a disabled Save), a left sidebar (280 wide) with Glossary, Foundations and the five Components (Button, Color Field, Icon Button, Segmented Control, Slider), a middle canvas, and a right inspector (320 wide). Clicking a Component opens its own page with its name as the title; the canvas and inspector are empty placeholders. The top bar and both sidebars stay put, and each column scrolls on its own. Nothing else (brand switcher, preview, saving) exists yet.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/registry.ts`
- `tools/Design_System/src/lib/registry.test.ts`
- `tools/Design_System/src/routes/+layout.svelte`
- `tools/Design_System/src/routes/+page.svelte`
- `tools/Design_System/src/routes/components/[slug]/+page.svelte`
- `tools/Design_System/src/routes/components/[slug]/+page.ts`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above
- `tools/Design_System/AGENTS.md` (written by Claude in the prep commit; the builder cannot edit it), `package.json`, `vite.config.ts`, `src/hooks.server.ts`, `src/lib/server/`
- `tools/Control_Centre/`, `app/`

## Size
Files touched: 6, all new except `+page.svelte` (replaces the placeholder). Expected diff: about 150 lines. New tests: 3.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Review
Level 1: reviewer checks (a) page never scrolls, each column does, (b) unknown slug gives a 404, (c) no brand CSS imported.

## Steps
- [x] Read `tools/Design_System/AGENTS.md`, `src/routes/+page.svelte`, `src/app.html`. Wireframe for reference only: `docs/plans/2026-10-01-design-system-workbench/wireframes/workbench-structure-v10.wireframe.json`.
- [x] Write `registry.test.ts` first (3 cases below), see it fail.
- [x] Write `registry.ts`: `COMPONENTS` (array of `{ slug, name }`: button "Button", color-field "Color Field", icon-button "Icon Button", segmented-control "Segmented Control", slider "Slider", in that order) and `findComponent(slug)` returning the entry or `undefined`.
- [x] Write `+layout.svelte`: grid filling the viewport (`height: 100vh`, `overflow: hidden`): top bar 56px (title "Design System", disabled "Save" button), below it three columns 280px / flexible / 320px with 1px borders between panels. Left column: Glossary and Foundations as plain non-linking text rows (those pages come later), a "Components" caption, then one link per `COMPONENTS` entry to `/components/<slug>`; the current one is marked (`aria-current="page"` plus a bold look). Canvas renders `{@render children()}`. Inspector shows the text "Inspector". Each of the three columns has `overflow-y: auto`. Neutral hard-coded colors, system font.
- [x] Write `+page.svelte` (heading "Design System workbench", one line "Pick a Component on the left."), `components/[slug]/+page.ts` (`load` returns the entry via `findComponent`, throws `error(404, "Unknown component")` otherwise) and `components/[slug]/+page.svelte` (shows the name as an `<h1>`).
- [x] Break each rule once (see below), see the matching test fail, restore.
- [ ] Run `bash scripts/verify-task.sh`, fill `## Report`, run `bash scripts/finish.sh`.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Put anything else in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: PASS footer, `svelte-check` 0 errors.
- Registry tests (each fails if its rule is broken): (1) `COMPONENTS` has exactly the five names in the order above; (2) slugs are unique; (3) `findComponent("button")` returns Button and `findComponent("nope")` returns `undefined`.

## Owner checklist
- [ ] Run `npm --prefix tools/Design_System run dev`, open http://127.0.0.1:5174 → the frame shows top bar, left list, canvas, inspector
- [ ] Click "Slider" → title "Slider", the Slider row is marked, the other columns do not move
- [ ] Shrink the window height → the page never scrolls; the left list scrolls by itself
- [ ] Open http://127.0.0.1:5174/components/nope → a 404 page
- [ ] Stop the server (Ctrl+C), then `lsof -i :5174` → prints nothing

## Questions
- `bash scripts/finish.sh` refuses with `check-scope: FAIL, changed outside 'Modify only': tools/Design_System/AGENTS.md`. That file was added by the prep commit `33c7e0d` (on top of Written-against `9ad1158`), not by this build — the working tree only adds/touches the six `Modify only` files plus this task file (`git status --porcelain` confirms). The builder may not touch `AGENTS.md` (explicit Do NOT touch) and cannot rewrite the prep commit. How should the checkpoint commit proceed: allow-list the prep-commit file in the scope check, move Written-against to `33c7e0d`, or something else? STOPPED here; no commit made.

## Report
- `bash scripts/verify-task.sh` → PASS footer (typecheck ✓, lint ✓, unit 49/49, design-system 133/133; DS workbench 9 tests pass) → ✓
- Registry test (1) five names in order → passes; broke order once → that test failed → ✓
- Registry test (2) slugs unique → passes; duplicated a slug once → that test failed → ✓
- Registry test (3) findComponent button/nope → passes; compared `name` instead of `slug` once → that test failed → ✓
- `svelte-check` 0 errors (via verify-task typecheck ✓) → ✓
- Owner checklist (dev server, click-through, 404 page, port check): Not run (builder allow-list has no `run dev`; left for owner).

Break-rule lines: order swapped → "COMPONENTS has exactly the five names in order" failed; slug duplicated → "slugs are unique" failed; lookup by `name` → 'findComponent("button")…' failed. Each restored, all 3 pass after.

Decisions the spec didn't settle: test imports `./registry.ts` (copied sibling `origin.test.ts` style, matches `rewriteRelativeImportExtensions`); layout/`+page.ts` import `$lib/registry.js` (standard SvelteKit TS mapping); active link via `page.url.pathname` from `$app/state` (copied Control_Centre layout pattern); `load` typed as `PageLoad`, slug page data as `PageData` from `./$types`; inactive links omit `aria-current` (Svelte drops `undefined`).
Spec facts wrong: none. Noticed but not touched: none.

### Checkpoint (written by scripts/finish.sh)
```
 docs/work/feat-ds-workbench-shell.md               |  33 +++++--
 tools/Design_System/src/lib/registry.test.ts       |  20 ++++
 tools/Design_System/src/lib/registry.ts            |  11 +++
 tools/Design_System/src/routes/+layout.svelte      | 105 +++++++++++++++++++++
 tools/Design_System/src/routes/+page.svelte        |   2 +-
 .../src/routes/components/[slug]/+page.svelte      |   7 ++
 .../src/routes/components/[slug]/+page.ts          |  11 +++
 7 files changed, 178 insertions(+), 11 deletions(-)
```
