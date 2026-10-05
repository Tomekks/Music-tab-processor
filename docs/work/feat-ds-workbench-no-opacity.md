
# Task: Workbench solid colors only, Reset button, steady tabs (1g0, expanded)

Status: done
Branch: feat/ds-workbench-no-opacity
Next: done. Owner checks passed 2026-10-05; merged to master (9f57283), local only, NOT pushed. Next slice: 1g (Save, Discard, save states) after polish 3 (1f4).
Written against: 7fd3ec0
Usage at session end: 5h=4% weekly=50% ctx=34%; measure total 13 marks, 2986s.

## What changes for you
The `/foundations` color picker loses its opacity field; a typed transparent color (`rgba(255,0,0,0.5)`, `#ff000080`) is refused with "Not a solid color — kept the old value.", while names, short hex and `rgb()` work as before (tokens allow only `#rgb`/`#rrggbb`; real opacity is parked). On an edited row the "Edited" label is now a **Reset** button (back to the saved value as one undo step; Cmd+Z restores the edit). Switching Color/Focus tabs no longer jumps the page.

## Scope
Modify only: `tools/Design_System/src/lib/colorEdit.ts`, `colorEdit.test.ts`, `tools/Design_System/src/routes/foundations/+page.svelte`, `app/e2e/workbench/colors.spec.ts`. Do NOT touch `contracts/`, config, secrets, `package.json`, `docs/*`, other `app/` files, the package layer, save states (1g). Delete: none.

## Size
4 files. First build ~50 lines + expansion ~70 more. Tests: 2 unit; +2 browser specs and 1 changed.

## Risk
Triggers (deletes, contracts, shell/network, schema, deploy, secrets): none. Review level: 1.

## Review
- Q1: the solid-color rule and tab fix trace to the owner's 1f/1g0 check (no-jump root cause reproduced: Color `scrollHeight` 1663 vs Focus 753, canvas 744, scroll 400 clamps to 9); Reset matches "single-token reset" in the plan.
- Q4: Reset reuses `stagedStore.stage(path, fileValue, fileValue)` (one history step, no new store code); tab fix is a grown-only `min-height` on `.color-list`.
- Q6: `verify-task.sh` runs no browser spec, so both expansions are spec-only; the tab spec asserts scroll started at 400, the Reset spec also presses Cmd+Z expecting `#ff0000`.
- Second reviewer (deepseek #high, blind) fixes folded into the brief: bare button needs chrome reset; stale error cleared on Reset; `sendTokens()` not called (the `$effect` re-posts); Next line was stale.

## Steps
- Done — `colorEdit.test.ts`: `normalizeColor` returns `null` when alpha < 1; transparent refused, `#ff0000`/`red` normalise.
- Done — `+page.svelte`: `ColorPicker` gets `isAlpha={false}`; error text changed to "Not a solid color — kept the old value."
- Done — `colors.spec.ts`: expected text updated, the alpha-survives test deleted, popover used as the open-marker, new "no opacity field + typed rgba refused" test.
- Done — Expansion A Reset: `Edited` span replaced by a `Reset {varName}` button staging the file value (one undo step), clearing the stale error, resetting the draft, no `sendTokens()` call; spec updated + Reset/Undo spec added.
- Done — Expansion B steady tabs: grown-only `min-height` on the list, tracked via `bind:clientHeight`; spec scrolls canvas to 400 and checks it stays.
- Done — `bash scripts/verify-task.sh` PASS.

## Acceptance checks
- Run `bash scripts/verify-task.sh` → `verify-task: PASS`.
- Rules → unit test (solid vs transparent) + new specs (no opacity/typed rgba; Reset one undo step; tab scroll).
- Claude after build: ports 3000/5174 free, then `cd app && npm run test:e2e:workbench` → all pass.

## Owner checklist
- [ ] Open `/foundations`, click a swatch → the picker shows no opacity field.
- [ ] Type `rgba(255,0,0,0.5)` in a hex field and press Enter → old value stays, row says "Not a solid color — kept the old value."
- [ ] Type `red` → stages `#ff0000`, row shows a **Reset** button instead of "Edited"; press Reset → saved color, Cmd+Z → `red` returns.
- [ ] Scroll down the Color list, click Focus → no jump; click Color → same.

## Decisions (chat, 2026-10-04)
- Alias: saving a semantic color replaces its link with a plain hex (keep 1d); opacity hidden for now (real support parked). Committed on master as 50c9ea2.
- Process: brief critics (Muse, then deepseek) at default effort; blind second reviewer deepseek-v4.1-flash#high (backup Muse#high); builder Muse#high, ONE run (the low/high test is stopped).
- 1g split into 1g (server endpoint, staged-edit logic, WORKBENCH_BRAND_DIR copy switch) and 1g-ui (top bar Save/Discard + specs); order 1g0, 1g, 1g-ui.
- Reset replaces "Edited" (file value, one undo step); tab switch must not jump (grown-only min-height).
- Corner artifact on ColorField previews: no longer appears; not reproduced; closed.
- Stop commands use the listener-only form; `scripts/stop-launch-check.sh` enforces it (5a4b534, 152802f).

## Questions
(none open; Muse default-effort critic read 2026-10-04: "clear" on the first version)

## Report
- Build PASS (typecheck ✓ lint ✓ unit 65/65, 207 tests) — breaking the alpha check fails the transparent rule test as expected; browser specs are run by Claude, not the builder.
- `verify-task.sh` covers no browser specs, so `isAlpha={false}`, the Reset button and the tab fix are browser-spec-only (same gap as the first build).
- Checkpoints: first build 5 files (+40/-32), expansion 3 files (+89/-8); both VERIFY: PASS.
