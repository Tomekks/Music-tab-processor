# Task: Foundations shows every token group, read-only (slice 2, task 2a)

Status: active
Branch: feat/ds-workbench-all-tokens
Next: run the builder (delegate.sh), then Claude browser specs and break-check, then owner checklist
Written against: 73c0657

## What changes for you
The Foundations page keeps its Preview and Colors exactly as they are. Below Colors it now lists the other groups of design values, each under its own heading: Space, Radius, Typography, State opacities, Focus ring and Layout (20 values today). Each row shows the name, the real value (a linked value shows what it resolves to) and its description, or "No description yet". A short "On this page" row of links at the top jumps to each group, Colors included. Nothing here can be edited or saved yet: that is tasks 2b and 2c.
Decision 2026-10-05: the dark value is not read here. Only the 12 color tokens have one, so it comes with the Mode toggle (2d).

## Scope
**Modify only:**
- `tools/Design_System/src/lib/server/otherTokens.ts` (new)
- `tools/Design_System/src/lib/server/otherTokens.test.ts` (new)
- `tools/Design_System/src/routes/foundations/+page.server.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `app/e2e/workbench/groups.spec.ts` (new)

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above. Not the package layer (`app/packages/design-system/`), not `colorTokens.ts`, the save endpoint, `+layout.svelte`, or the staged-edit store: call them, do not change them. The Colors section, preview iframe and top bar keep their code and behavior.

## Size
Files touched: 5. Expected diff: ~250 lines. New tests: ~6 unit, ~4 browser.

## Risk
Triggers: none (read-only; nothing is written). Review level: 1.

## Review
Level 1 (questions 1, 4, 6), 2026-10-05.
- Q1 serves the story: group list, resolved values, descriptions and jump links trace to plan row 2a; dark value dropped from 2a because only color tokens have one (checked in `tokens.json`).
- Q4 simplest: reuses `buildFieldDescriptors` and `SECTIONS`; plain-text rows, no tooltip or inputs; nothing cuttable.
- Q6: unit tests catch a color leaking in or wrong order; only the browser specs catch a missing heading or a dead link, so each is broken once after the build.

## Steps
- [ ] `otherTokens.test.ts` first (fails before the code), `node:test` like `colorTokens.test.ts`: (a) no color token and no `primitive`/`dark`/`component` path appears; (b) group order and headings as in the next step; (c) an alias value is resolved (`value`) while `rawValue` keeps the `{...}`; (d) missing `$description` gives `""`; (e) a group with no tokens is omitted; (f) space tokens come out ascending (`1`, `1_5`, `2`...).
- [ ] `otherTokens.ts`: `listOtherTokenGroups(tree)` calls `buildFieldDescriptors(tree, tree)` (as `colorTokens.ts` does), drops `$type === "color"`, keeps only `semantic.*` sections, and returns groups in this order: `semantic.space`, `semantic.radius`, `semantic.typography`, `semantic.state`, `semantic.focus`, `semantic.layout`. Each group: `{ key: "space", section, heading, tokens }` (`key` is the last part of the section, `heading` comes from `SECTIONS` in `field-descriptors.mjs`). Each token: `{ path, cssVar, value, rawValue, description, isAlias }` (`cssVar` from `cssVarNameForPath`). A group with no tokens is left out. Tokens keep the order `buildFieldDescriptors` gives (numbers ascending).
- [ ] `+page.server.ts`: add `groups: listOtherTokenGroups(tree)` to the returned data; keep `tokens`, `previewUrl`, `version` and the error handling as they are.
- [ ] `+page.svelte`: add an "On this page" row of links (Preview, Colors, then each group) using `href="#group-<key>"`; give the Colors section `id="group-colors"` and the Preview section `id="group-preview"`; after the Colors section render one `<section id="group-<key>">` per group: an `<h2>` with the heading, then rows showing `varName` (cssVar without the leading `--`, in `<code>`), the value, and the description in plain text or a dimmed "No description yet". Plain text, no tooltip, no inputs, no buttons in these rows. Do not change any existing markup, script logic or style of the Colors section.
- [ ] `groups.spec.ts`: browser specs (see Acceptance checks). Use `openFoundations` from `helpers.ts`; do not edit `helpers.ts`.
- [ ] `bash scripts/verify-task.sh`.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git; Claude runs the browser specs.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: a color token never appears in a group, and groups come in the order above → `otherTokens.test.ts` (a), (b) fail if broken.
- Rule: an alias shows its resolved value, the file's literal stays in `rawValue` → test (c).
- UI: `groups.spec.ts` (a) headings Space, Radius, Typography, State opacities, Focus ring, Layout are visible, and the row `space-4` shows `16px` and `state-hover-opacity` shows `8%`; (b) clicking the "Space" link in "On this page" brings the Space heading into view (`toBeInViewport`); (c) the Colors section still shows the hex field for `color-accent` and the Preview iframe is still visible (nothing was displaced); (d) no `input` inside the new group sections.
- Claude after the build: `lsof -i :3000 -i :5174` clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass; each new spec broken once (drop one group, point one link at a wrong id); real `tokens.json` untouched (`git status` clean there).

## Owner checklist
Launch (Claude gives the free-port check and start and stop blocks when it is time).
- [ ] Open Foundations: below Colors, six groups with their values and descriptions → they match what you expect from the design system (space 4 is 16px, hover opacity 8%).
- [ ] Click each link in "On this page" → the page scrolls to that group; Colors and Preview still work, and editing a color still stages a change.

## Questions
(none open; deepseek-v4.1-flash#max critique said "clear".)

## Report
(Filled by the builder.)
