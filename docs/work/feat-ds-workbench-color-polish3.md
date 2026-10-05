# Task: Foundations colors polish 3 (1f4)

Status: active
Branch: feat/ds-workbench-color-polish3
Next: owner approves the "What changes for you" line, then Level 1 review, then builder run.
Written against: 0481a9f
Template: quick

## What changes for you
The color picker opens beside the swatch you clicked and stays fully on screen; the unsaved-changes list looks like the color list and each line reads `background  [swatch] #faf9f5 → [swatch] #a89444  Reset` on one row, in a box that fits its content; every edited color has a Reset (in the list and on its row) that drops just that edit.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/stagedEdits.ts`
- `tools/Design_System/src/lib/stagedEdits.test.ts`
- `tools/Design_System/src/lib/staged.svelte.ts`
- `tools/Design_System/src/lib/pickerPosition.ts` and `pickerPosition.test.ts` (new: the placement helper, one file per pure helper like `previewHeight.ts`)
- `tools/Design_System/src/routes/+layout.svelte`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `app/e2e/workbench/colors.spec.ts` (update the changes-panel spec for the new row text; add one Reset spec)

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- the generated CSS, Save and Discard (task 1g), other token types, the web app

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Rules
- `resetEdit(state, path)` removes only that path's entry from `staged`, adds one history step (so Cmd+Z brings the edit back) and clears `future`; unknown path returns the state unchanged. Test fails if other entries are touched or no history step is added.
- Picker position: on open it is placed to the right of the clicked swatch (8px gap), and its top is clamped so the whole popover stays inside the viewport (flip left if there is no room on the right). One pure helper with a test for: fits as is, too low, too far right.
- Changes list row, one line: CSS variable name without `--` (same as the color list, not `semantic.color.…`), derived in the layout with `cssVarNameForPath(path)` imported from `app/packages/design-system/src/css-var-naming.mjs` (pure, no imports; the same import `lib/server/colorTokens.ts:4` uses), because the panel only has the staged `path`, old swatch + hex, `→`, new swatch + hex, Reset. Reuse the color list's swatch size and code style; the box width fits its content (no fixed `min-width: 360px`).
- Reset in the changes list and the Reset on the edited color row call the same store `reset(path)`. When the last edit is reset the label reads "0 unsaved changes" and the list shows "No unsaved changes."
- Keep accessible names stable: the top-bar button still matches `/unsaved change/`; the panel keeps `data-testid="changes-panel"`.

## Acceptance checks
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule "Reset touches one entry": the `stagedEdits` test fails if another path is removed or `past` is unchanged.
- Rule "picker stays in viewport": the helper test fails on the too-low and too-far-right cases.

## Owner checklist
- [ ] Click a swatch near the bottom and the right of the window: the picker opens beside it, fully visible
- [ ] Change two colors: the unsaved list shows one line per color, box fits the content, same look as the color list
- [ ] Reset on one line removes only that color (preview returns to the file color); the other stays; Cmd+Z brings it back
- [ ] Edited rows show Reset next to "Edited"; Reset on the last edit gives "0 unsaved changes"
- [ ] Preview still lists the five Components, States default / hover / pressed / disabled (no change expected)

## Review
- Q1 serves the story: every rule maps to one of your three points (picker position, one-line list, Reset); nothing extra. The Cmd+Z-restores-a-reset line is my addition, not yours (`stagedEdits.ts:43` shows every normal edit already adds a history step, so Reset staying consistent costs nothing).
- Q4 simplest: one pure `resetEdit` (about 6 lines, same shape as the delete branch at `stagedEdits.ts:34-38`), one placement helper, and the list row reuses markup that exists at `+layout.svelte:48-64`. Cuttable: the "flip left" case if the picker always fits to the right; I kept it because the window is as narrow as 1024.
- Q6 acceptance gap: `verify-task.sh` runs `npm run verify` (typecheck and unit tests, `verify-task.sh:37-39`) and only prints a reminder for e2e (`:43-44`), so the updated `colors.spec.ts` is NOT run by the gate and the one-line row layout, the Reset buttons and the "0 unsaved changes" label have no failing-test gate. Fix: the builder's report must say the e2e spec was `Not run`, and the owner checklist covers those; I run `npm run test:e2e` myself after the build (check the port 3000 stale-server first).
- Q6 second gap: the placement helper test proves the maths, not that the page calls it; the owner checklist's "swatch near bottom and right" is the only check of that.
- Second opinion (checked against code, both real): the panel has only `path` (`+layout.svelte:5-35`), so the var name needs `cssVarNameForPath` (now named in the Rules); the helper had no file in scope (new `pickerPosition.ts` added to scope). Its other points repeat my Q6 gap.
- Spec had no Risk line (`/review` reads it); added `Review level: 1`.

## Questions
(none open)

## Report
