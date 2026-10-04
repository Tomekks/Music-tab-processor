# Task: design system workbench, three-column shell (slice 1, task 1b2)

Status: active
Branch: feat/ds-workbench-shell
Next: review the brief, then `bash scripts/check-brief.sh docs/work/feat-ds-workbench-shell.md`, then `delegate.sh`.
Written against: 9ad1158

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
- [ ] Read `tools/Design_System/AGENTS.md`, `src/routes/+page.svelte`, `src/app.html`. Wireframe for reference only: `docs/plans/2026-10-01-design-system-workbench/wireframes/workbench-structure-v10.wireframe.json`.
- [ ] Write `registry.test.ts` first (3 cases below), see it fail.
- [ ] Write `registry.ts`: `COMPONENTS` (array of `{ slug, name }`: button "Button", color-field "Color Field", icon-button "Icon Button", segmented-control "Segmented Control", slider "Slider", in that order) and `findComponent(slug)` returning the entry or `undefined`.
- [ ] Write `+layout.svelte`: grid filling the viewport (`height: 100vh`, `overflow: hidden`): top bar 56px (title "Design System", disabled "Save" button), below it three columns 280px / flexible / 320px with 1px borders between panels. Left column: Glossary and Foundations as plain non-linking text rows (those pages come later), a "Components" caption, then one link per `COMPONENTS` entry to `/components/<slug>`; the current one is marked (`aria-current="page"` plus a bold look). Canvas renders `{@render children()}`. Inspector shows the text "Inspector". Each of the three columns has `overflow-y: auto`. Neutral hard-coded colors, system font.
- [ ] Write `+page.svelte` (heading "Design System workbench", one line "Pick a Component on the left."), `components/[slug]/+page.ts` (`load` returns the entry via `findComponent`, throws `error(404, "Unknown component")` otherwise) and `components/[slug]/+page.svelte` (shows the name as an `<h1>`).
- [ ] Break each rule once (see below), see the matching test fail, restore.
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
(none open)

## Report
<Filled by the builder when done.>
