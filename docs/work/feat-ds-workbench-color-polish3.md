
# Task: Foundations colors polish 3 (1f4)

Status: done
Branch: feat/ds-workbench-color-polish3
Next: DONE and merged (eb4a357, local only, NOT pushed). Open leftovers, remove only on owner yes: worktrees `../guitar_tab_processor-feat-ds-workbench-color-polish3`, `-polish3-low`, `-polish3-high` (stopped-builder edits only), the 6 merged old ones (`ds-colors-low`, `color-edit-high`, `color-polish`, `e2e`, `preview-fit`, `preview-fit-low`) and 7 unmerged ones not yet listed to the owner (`ds-colors-high`, `color-edit`, `color-edit-low`, `colors`, `preview-fit-high`, `save-bar`, `save-ui`). Owner also never ticked the 5th checklist item (five Components). Next slice: 1g Save/Discard (server side first, then 1g-ui). Usage at wrap: weekly 55%, 5h 30%, ctx 271k; measure: 11 marks, 7515s; builder ~134k tok over the runs that did work (80k + 55k); this session also did process/docs work beyond polish 3.
Written against: 4bc3889
Template: quick

## What changes for you
The color picker opens beside the swatch you clicked and stays fully on screen; the unsaved-changes list looks like the color list and each line reads `color-accent  [swatch] #faf9f5 → [swatch] #a89444  Reset` on one row, in a box that fits its content.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/pickerPosition.ts` (new: the placement helper)
- `tools/Design_System/src/lib/pickerPosition.test.ts` (new)
- `tools/Design_System/src/routes/+layout.svelte`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `app/e2e/workbench/colors.spec.ts`
**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `stagedEdits.ts` and `staged.svelte.ts`, the generated CSS, Save and Discard (1g), other token types, the web app

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Rules
- Picker position: on open placed to the right of the clicked swatch (8px gap), top clamped so the whole popover stays inside the viewport (flip left if no room on the right). Test covers: fits as is, too low, too far right.
- Changes list row, one line: CSS variable name without `--` (same as the color list), derived with `cssVarNameForPath(path)` imported from `app/packages/design-system/src/css-var-naming.mjs`; old swatch + hex, `→`, new swatch + hex, Reset. Reuse the color list's swatch size and code style; box width fits its content.
- Reset in the changes list does what the row's Reset (1g0) does: `stagedStore.stage(path, entry.was, entry.was)` (one undo step). When the last edit is reset the label reads "0 unsaved changes" and the list shows "No unsaved changes."
- Keep accessible names stable: top-bar button matches `/unsaved change/`; panel keeps `data-testid="changes-panel"`; row's `Reset {varName}` button name unchanged (list's button named differently, e.g. `Reset {varName} in changes`).

## Acceptance checks
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule "picker stays in viewport": the helper test fails on the too-low and too-far-right cases.

## Owner checklist
- [x] Done: picker opens beside a bottom/right swatch, fully visible; two colors give a one-line-per-color list that looks like the color list; Reset on one line removes only that color and Cmd+Z brings it back; resetting the last edit gives "0 unsaved changes"
- [ ] Preview still lists the five Components, States default / hover / pressed / disabled (no change expected)

## Review
- Q1 serves the story: every rule maps to the owner's points; nothing extra. Re-scoped 2026-10-05 after 1g0 merged: the row Reset exists, so no new store code.
- Q4 simplest: Reset in the list calls the existing `stagedStore.stage(path, was, was)`, one placement helper, list row reuses markup at `+layout.svelte:48-64`. Kept "flip left" because the window is as narrow as 1024.
- Q6 acceptance gap: `verify-task.sh` runs `npm run verify` (typecheck and unit tests) and only reminds for e2e, so `colors.spec.ts` is NOT run by the gate; the builder reported it `Not run`, and Claude ran `npm run test:e2e`.
- Q6 second gap: the placement helper test proves the maths, not that the page calls it; the owner checklist's "swatch near bottom and right" is the only check of that.
- Second opinion (both real): the panel has only `path`, so the var name needs `cssVarNameForPath`; the helper had no file in scope (new `pickerPosition.ts` added).
- Spec had no Risk line; added `Review level: 1`.

## Decisions (chat, 2026-10-05)
- Builder = ONE Muse `#high` run; the low/high double run is stopped.
- Merged 1g0 before polish 3; polish 3 re-scoped to drop Reset-on-row (the list Reset reuses `stagedStore.stage(path, was, was)`).
- Docs: old process docs to `docs/old_workflow_docs/`, 11 finished plans to `docs/plans/done_and_committed/`; kept BACKLOG, docs/CONTEXT, AUDIOPROCESSINGTOOLS in `docs/`.
- Builder runs browser specs through `scripts/run-e2e.sh` (allow-listed); Claude reads PASS/FAIL; the brief names the break-on-purpose check.
- Owner checklists open with a launch block then human checks only; briefs check open branches/worktrees for file overlap first.
- `/start` lists active tasks in other worktrees and flags rules changed since "Written against"; `check-brief` refuses bare file names under Modify only; `delegate.sh` auto-finishes a crashed run when scope and verify pass.
- Permission-denied builder report logged in `docs/work/missed.md` (cause not found).

## Questions
(none open)

## Report
Built by Muse #high in two runs (first died on a network error mid-run; second reached the code already written, then could not run its checks and stopped). Claude ran the checks and finished it.
- `bash scripts/verify-task.sh` -> `verify-task: PASS` (unit 39/39 in Design_System) ✓
- Rule "picker stays in viewport": `pickerPosition.test.ts` passes in `verify` ✓. Not run: a mutation of the helper; no browser spec covers placement.
- `bash scripts/run-e2e.sh` -> `PASS (workbench) 14 passed (13.1s)` ✓
- Mutation: Reset click in the changes list set to a no-op -> `FAIL ... 1 failed 13 passed`; reverted, tree clean ✓
- Decisions the spec didn't settle: NONE found in the diff.
- Observed: builder log says `Permission denied: shell` on `git status --porcelain`; cause not found.
