
→ Read docs/work/feat-ds-workbench-save-bar.md 
# Task: Workbench save bar and browser specs (1g-ui)

Status: active
Branch: feat/ds-workbench-save-bar
Next: (usage at wrap: 5h 19%, weekly 59%, ctx 22%; measure total 26 marks over about 3.2 h) ROUND 4 not built yet (toast for all status messages, tooltip wrap/right-anchor, their specs; steps marked ROUND 4, brief critic-checked and amended, Written against current). Start `bash scripts/delegate.sh docs/work/feat-ds-workbench-save-bar.md` (Muse #high, steps 100) after `lsof -nP -iTCP:3000 -iTCP:5174 -sTCP:LISTEN` is empty; then Claude runs `cd app && npm run test:e2e:workbench`, break-checks (spec (b) must be red on the old tooltip CSS), then owner checklist, then PR (ask owner: push?). Local only: this worktree and branch feat/ds-workbench-save-bar; nothing pushed.
Written against: 1ad43a3 (round 4; rounds 1-3 committed)

## What changes for you
The top bar gets a working **Save** button and a **Discard** link beside "N unsaved changes". Save writes staged color edits to `tokens.json` through the 1g endpoint, then reloads the file; **Revert** writes the previous hex values back and says "Reverted" for 5 s. Discard clears the staged edits and says "Discarded N changes" with **Undo** for 5 s. If the file changed on disk, Save stops, names `tokens.json`, writes nothing and offers **Review changes** and **Reload** (Reload re-reads the file, keeps your edits on top). If read-only or the write fails, the message says nothing was written until **Dismiss** or a retry works; edits stay staged and **Retry save** replaces Save.
Decision 2026-10-05: on an edited alias row show "Will unlink from main" next to "Edited"/Reset; saving replaces the link with its own hex and never changes the primitive. `listColorTokens` gains `isAlias: boolean` (`field-descriptors.mjs:112`); reconnect-to-main parked for slice 2.

## Scope
Setup done by Claude before the build (the builder cannot edit config): `app/playwright.workbench.config.ts` copies `brands/default` to the OS temp folder and sets `WORKBENCH_BRAND_DIR`, only when that variable is not already set (workers inherit the parent's env), so the workbench server and specs see the same copy.

**Modify only:** `tools/Design_System/src/lib/server/colorTokens.ts`, `.../colorTokens.test.ts`, `tools/Design_System/src/lib/saveState.ts`, `.../saveState.test.ts`, `tools/Design_System/src/routes/+layout.svelte`, `tools/Design_System/src/routes/foundations/+page.svelte`, `app/e2e/workbench/save.spec.ts`, `app/e2e/workbench/colors.spec.ts`, `app/e2e/workbench/helpers.ts`.

**Do NOT touch:** `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above; `app/` other than the two e2e files, the package layer, the endpoint and store from 1g (call them, do not change them).

**Delete (approved with this brief):** None.

## Size
Files touched: 9 (colors.spec.ts added in round 4). Expected diff: ~450 lines. New tests: ~8 unit, ~7 browser.

## Risk
Triggers: none added by this task (it calls the 1g endpoint; specs write only to the temp copy). Review level: 1.

## Review
Level 1 (questions 1, 4, 6), 2026-10-05.
- Q1 serves the story: Save, Discard, Undo and the seven states trace to plan row 1g and `wireframes/save-states-v1`; the disabled Save at `routes/+layout.svelte:52` is the only thing replaced, and 1g's `sync`/`discard`/`loadedVersion` exist at `staged.svelte.ts` (merged, `9edd6f8`). "Will unlink from main" traces to the 2026-10-05 owner decision.
- Q4 simplest: the new `sync` effect is a separate small `$effect`, not an edit of the existing `data.tokens` effect (`+page.svelte:46-54`). Nothing cuttable except "Review changes", which reuses the existing changes popover (`+layout.svelte:57`); kept.
- Q6 FIXED: the temp copy is created only when `WORKBENCH_BRAND_DIR` is unset (workers load the config and inherit the parent's env). Unit tests cannot catch a broken top bar; only the browser specs do, each broken once. "Will unlink" gets a `colorTokens.test.ts` `isAlias` test plus one Save-spec line. Not checked: `invalidateAll()` re-running `load`; the Save spec's "count back to nothing" proves it end to end.

## Steps
- Done (rounds 1-3, committed): `saveState.ts`/`.test.ts` — `buildSaveBody`, `describeSaveFailure`, `discardedLabel`, and round 2's `savedLabel(secondsLeft)` (5→1) + `revertBody(before, loadedVersion)`.
- Done: `colorTokens.ts`/`.test.ts` — `isAlias` on `ColorToken`/`listColorTokens`.
- Done: `foundations/+page.svelte` — "Will unlink from main" for staged alias rows (same size as Reset) plus the `$effect` calling `stagedStore.sync(data.tokens, data.version)`.
- Done: `routes/+layout.svelte` — the seven `wireframes/save-states-v1` states replacing the disabled Save, then round 2's Save countdown with **Revert** (`revertBody`, "Reverted" 5 s, failed Revert shows only **Dismiss**).
- Done: `save.spec.ts` + `resetBrandCopy()` in `helpers.ts` (writes to the temp copy only, throws if the variable is unset); round 3 added the countdown-clear asserts.
- [ ] ROUND 4 (owner, 2026-10-05; the toast REPLACES where states 4-7 show their message). `routes/+layout.svelte`: every status message (Saved countdown + Revert, Reverted, Discarded + Undo, failed + Dismiss/Retry save, changed on disk + Review changes/Reload) and its buttons move out of the top bar into one toast: `position: fixed`, top of the page, horizontally centred (`left: 50%; transform: translateX(-50%)`), above everything (`z-index` over the picker popover's 20 and the tooltip's 30), `role="status"`, same texts, same accessible button names, same timers and clearing rules as now. The top bar then never changes except for the existing count button, **Discard** and **Save** (shown while something is staged; Save reads "Saving..." while saving). Retry save: while a failed toast shows, the toast holds the **Retry save** button and the bar's Save is hidden, as the toast now carries the retry.
- [ ] ROUND 4 (owner, tooltip clipped under the Inspector, seen on the `accent` row): in `foundations/+page.svelte` the `.tooltip` (line ~409) is one unwrapped line centred on the icon inside the scrolling canvas column, so a long description runs past the canvas edge. Make it wrap (`white-space: normal`, `width: max-content`, `max-width: 240px`) and anchor its right edge to the icon (`right: 0; left: auto; transform: none`) so it grows leftwards, away from the Inspector. No new colors, no JS.
- [ ] ROUND 4 specs in `save.spec.ts` and `colors.spec.ts` (update, do not delete, existing assertions; text and button names are unchanged so most keep passing): (a) after Discard the toast (`getByRole("status")`) is visible, horizontally centred within 4 px of the viewport centre and its top is under 100 px, it is not inside the top bar, and the bar's height and the count button's `y` are the same as just before Discard; (b) with `page.setViewportSize({ width: 1000, height: 720 })` first, hovering the `accent` info icon shows the tooltip fully inside the canvas (`.canvas`).
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Claude runs the specs.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: failure kinds and labels → `saveState.test.ts` fails if a message stops saying nothing was written or stops naming `tokens.json`, or if `changed-on-disk` stops returning kind `"changed"` (assert `kind` in every case).
- Claude after the build: `lsof -i :3000 -i :5174` clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass; Claude breaks each new behavior once (round 1's five, plus Revert and the countdown) to see its spec fail; `git status` shows the real `brands/default/tokens.json` untouched.

## Owner checklist
Looks and feel only (specs check behavior); this uses the real file, so the last step reverts it.
- [ ] On `/foundations` change `accent`, press Save → status reads "Saved" with a countdown 5 to 1 and a Revert button, then clears; `git diff --stat` shows only `app/packages/design-system/brands/default/tokens.json`; the web app shows the new accent.
- [ ] Press Save then Revert within 5 s → "Reverted"; `git diff` shows `semantic.color.accent` as a plain `#...` value (the link is not restored, expected).
- [ ] Press Discard on another edit → "Discarded 1 change" and Undo; the top bar does not jump between states.
- [ ] Revert: `git checkout app/packages/design-system/brands/default/tokens.json`; `git status` is clean for that file.

## Decisions (2026-10-05, in chat)
- Revert writes the old resolved hex back; a token linked to a primitive stays a plain hex (no exact-file restore).
- All status messages and their buttons live in one fixed top-centre toast (round 4); the bar keeps count, Discard, Save. Count button keeps showing at 0 changes (existing specs assert it).
- Muse is not a brief critic; deepseek-v4.1-flash#max is, glm-5.3-flash#high the backup (commits 1844ff7, fc2ae68 on chore/sync-local-master). Builder steps raised to 100. Builder cost rounds 1-3: about 285k tokens, $0.04, 9 min.

## Questions
(none open; round 4 deepseek#max critic asked 2, both real, folded in: spec (a) asserts bar height and count `y`, not `x`; spec (b) uses a 1000 px viewport so it can fail. Claude confirms spec (b) is red on the old CSS in the break-check.)

## Report
- Rounds 1-3 built and committed; `bash scripts/verify-task.sh` → PASS each time (typecheck, lint, unit 65/65, design-system 142/142; e2e not run by the script).
- Checkpoints: round 1 (9 files, +375/-1), round 2 (6 files, +160/-29), round 3 (2 files, +16/-3); all VERIFY: PASS, pre-commit: OK.
- Break-each round 2: broken `savedLabel` text and `revertBody` value both failed their tests, restored. Spec fact wrong: NONE. Noticed but not touched: none new.
- Claude e2e after round 3: `npm run test:e2e:workbench` → 22 passed; each new behavior broken once (Save, Discard, Undo-clear, Reload, Retry, unlink label, Revert, countdown) and its spec failed (the countdown spec needed a stronger assert, fixed in round 3); real `tokens.json` untouched (owner's own Save test reverted by owner). Round 4 not yet built.
