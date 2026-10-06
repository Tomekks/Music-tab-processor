# Task: Workbench sidebar toggles (show or hide Navigation and Inspector)

Status: active
Branch: feat/ds-workbench-sidebar-toggles
Next: owner approves "What changes for you"; then critic (`delegate.sh --critique`), Level 1 review, builder
Written against: ffc4af5

## What changes for you
Two small icon buttons appear in the top bar, to the left of the "N unsaved changes", Discard and Save buttons. The first (icon `panel-left`) shows or hides the left Navigation sidebar; the second (icon `square-dashed-mouse-pointer`) shows or hides the right Inspector. When a sidebar is hidden, the middle canvas grows to fill its space; with both hidden the canvas fills the whole window under the top bar. Both sidebars start open on every page load (hiding is not remembered). Staged edits, Save and Discard are not affected.
Decisions 2026-10-05 (chat): the buttons are a small Svelte `IconButton` for the workbench (the real one is React, for the web app), ghost look and 44 px like the real one; icons come from `@lucide/svelte`, which Claude already installed (same version as Control Center, commit `ffc4af5`).

## Scope
**Modify only:**
- `tools/Design_System/src/lib/IconButton.svelte` (new)
- `tools/Design_System/src/lib/layoutColumns.ts` (new)
- `tools/Design_System/src/lib/layoutColumns.test.ts` (new)
- `tools/Design_System/src/routes/+layout.svelte`
- `app/e2e/workbench/sidebars.spec.ts` (new)

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json` and the lockfile (the dependency is already installed), `docs/*`, anything not listed above. Not the Foundations or Component pages, the staged-edit store, the save logic, or the toast: only the top bar markup and the body grid in `+layout.svelte` change.

## Size
Files touched: 5. Expected diff: ~220 lines. New tests: ~4 unit, ~5 browser.

## Risk
Triggers: none beyond one new dependency, already added by Claude (workbench-only, already used by Control Center). Review level: 1.

## Review
Level 1 (questions 1, 4, 6), 2026-10-05.
- Q1 serves the story: toggles, canvas fill, no persistence and unchanged edits trace to the owner's request and the two chat answers.
- Q4 simplest: no storage, no animation, hidden sidebars removed with `{#if}`; the only extra file is a pure column function so the grid can be unit-tested; nothing cuttable.
- Q6: the unit test catches a wrong column string; only the browser specs catch a missing toggle, a sidebar that stays visible or a canvas that does not grow, so each is broken once after the build. Grid auto-placement with a removed first child is covered by spec (b)/(d).

## Steps
- [ ] `layoutColumns.test.ts` first (fails before the code): `bodyColumns(navOpen, inspectorOpen)` returns the CSS `grid-template-columns` string: both open `"200px 1fr 320px"` (today's value), nav closed `"1fr 320px"`, inspector closed `"200px 1fr"`, both closed `"1fr"`.
- [ ] `layoutColumns.ts`: the function above, nothing else.
- [ ] `IconButton.svelte`: props `icon` (an `@lucide/svelte` component), `label` (string, used as `aria-label` and `title`), `pressed` (boolean, becomes `aria-pressed`), `onclick`. A 44 × 44 px `<button type="button">`, transparent background, no border, icon 20 px in the page text color, hover background `#f0f0f0`, visible keyboard focus outline, `cursor: pointer`. Plain neutral colors like the rest of the workbench chrome (no design tokens).
- [ ] `+layout.svelte`: two `$state` booleans `navOpen` and `inspectorOpen`, both `true` at load (no storage). Inside the top bar's `.controls`, before the existing "unsaved changes" button, add two `IconButton`s: `PanelLeft` with label "Navigation" and `pressed={navOpen}`; `SquareDashedMousePointer` with label "Inspector" and `pressed={inspectorOpen}`; each flips its boolean. The `.body` grid uses `bodyColumns(navOpen, inspectorOpen)` as its `grid-template-columns` (inline style); wrap the `<nav class="sidebar">` and `<aside class="inspector">` in `{#if navOpen}` / `{#if inspectorOpen}` so a hidden sidebar is removed, and keep `<main class="canvas">` always. Do not change any other markup, script or style, including the save, discard and toast code.
- [ ] `sidebars.spec.ts`: browser specs (see Acceptance checks). Use `openFoundations` from `helpers.ts`; do not edit `helpers.ts`.
- [ ] `bash scripts/verify-task.sh`.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git; Claude runs the browser specs.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: the four open/closed combinations give the four column strings, both-open being today's value → `layoutColumns.test.ts` fails if any is wrong.
- UI: `sidebars.spec.ts` (a) both toggles are visible, named "Navigation" and "Inspector", both `aria-pressed="true"`, and both sit to the left of the "unsaved changes" button (compare `boundingBox().x`); (b) clicking "Navigation" hides the `nav` (not visible), sets `aria-pressed="false"`, and the canvas (`main`) gets wider by at least 150 px; clicking again restores both; (c) the same for "Inspector" (`aside`); (d) both closed: the canvas width is at least the viewport width minus 2 px, and its left edge is at x 0; (e) a hidden sidebar does not affect edits: stage `color-accent` as `red`, hide and show both toggles, the count still reads "1 unsaved change" and the hex field still reads `#ff0000`; (f) after a page reload both are visible again.
- Claude after the build: `lsof -nP -iTCP:3000 -sTCP:LISTEN` and `-iTCP:5174` clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass (including the existing top-bar specs in `save.spec.ts`: the bar height and the count's `y` do not change); each new spec broken once (e.g. leave the `{#if navOpen}` off, flip an icon label); real `tokens.json` untouched.

## Owner checklist
Launch (Claude gives the free-port check, start and stop blocks when it is time).
- [ ] Look at the top bar → two icon buttons sit before "unsaved changes"; the left one is the panel icon, the right one the dashed-square pointer icon.
- [ ] Click each toggle → its sidebar disappears and the canvas grows; click again → it returns; both hidden → canvas fills the window.
- [ ] Hide a sidebar, stage a color change, Save → nothing else moves or breaks; reload the page → both sidebars are back.

## Questions
clear

## Report
(Filled by the builder.)
