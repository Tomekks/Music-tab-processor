
# Task: Workbench save bar and browser specs (1g-ui)

Status: active
Branch: feat/ds-workbench-save-bar
Next: PR #64 open (verify and e2e-design-system green), waiting on owner to merge; owner checklist passed 2026-10-05. Worktree ../guitar_tab_processor-feat-ds-workbench-save-bar stays until merged. After merge: set Status done, remove worktree, pick the next plan row. (usage at wrap: 5h 24%, weekly 59%, ctx 10%; total: 30 marks, 17662s between first and last)

## What changes for you
Top bar gets a working **Save** and **Discard** beside "N unsaved changes". Save writes staged color edits to `tokens.json` via the 1g endpoint and reloads; **Revert** writes the previous hex values back and says "Reverted" 5 s. Discard clears staged edits and says "Discarded N changes" with **Undo** 5 s. If the file changed on disk, Save stops, names `tokens.json`, writes nothing and offers **Review changes** and **Reload**. If read-only or the write fails, the message says nothing was written until **Dismiss** or a retry works; edits stay staged and **Retry save** replaces Save.
Decision 2026-10-05: on an edited alias row show "Will unlink from main"; saving replaces the link with its own hex and never changes the primitive. `listColorTokens` gains `isAlias`; reconnect-to-main parked for slice 2.

## Scope
Setup by Claude: `app/playwright.workbench.config.ts` copies `brands/default` to the OS temp folder and sets `WORKBENCH_BRAND_DIR` only when unset, so server and specs share the copy.
Modify only: `colorTokens.ts`, `colorTokens.test.ts`, `saveState.ts`, `saveState.test.ts`, `routes/+layout.svelte`, `foundations/+page.svelte`, `app/e2e/workbench/{save.spec.ts,colors.spec.ts,helpers.ts}`.
Do NOT touch: `contracts/`, config, secrets, `package.json`, `docs/*`, anything else; `app/` beyond the two e2e files, the package layer, the endpoint and store from 1g (call them, do not change). Delete: None.

## Size
Files touched: 9. Expected diff: ~450 lines. New tests: ~8 unit, ~7 browser.

## Risk
Triggers: none added (calls the 1g endpoint; specs write only to the temp copy). Review level: 1.

## Review
Level 1 (questions 1, 4, 6), 2026-10-05.
- Q1 serves the story: Save, Discard, Undo and the seven states trace to plan row 1g and `wireframes/save-states-v1`; only the disabled Save was replaced.
- Q4 simplest: the new `sync` effect is a separate small `$effect`; "Review changes" reuses the existing changes popover; nothing cuttable.
- Q6 FIXED: temp copy made only when `WORKBENCH_BRAND_DIR` is unset; only the browser specs catch a broken top bar, each broken once.
Written against: 1ad43a3 (round 4; rounds 1-3 committed)

## Steps
- Done (rounds 1-3, committed): `saveState.ts`/`.test.ts`, `colorTokens.ts`/`.test.ts` `isAlias`, `foundations/+page.svelte` "Will unlink" + `sync`, `routes/+layout.svelte` seven states + Revert, `save.spec.ts` + `resetBrandCopy()`.
- Done: ROUND 4 `+layout.svelte` — all status messages and buttons moved out of the bar into one fixed top-centre toast (`role="status"`), same texts, names and timers; bar keeps count, Discard, Save.
- Done: ROUND 4 tooltip — wraps (`max-width: 240px`) and right-anchors to the icon.
- Done: ROUND 4 specs — toast visible/centred/under 100 px/not in the bar, bar height and count `y` unchanged; tooltip inside `.canvas` at 1000×720.
- Done: `bash scripts/verify-task.sh` → PASS.

## Acceptance checks
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: failure kinds and labels → `saveState.test.ts` fails if a message stops saying nothing was written or stops naming `tokens.json`, or if `changed-on-disk` stops returning kind `"changed"`.
- Claude after the build: `lsof -i :3000 -i :5174` clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass; each new behavior broken once; real `tokens.json` untouched.

## Owner checklist
- Done: Save on `accent` → "Saved" countdown 5→1 + Revert; diff shows only `tokens.json`; app shows the new accent.
- Done: Save then Revert within 5 s → "Reverted"; accent is a plain hex (link not restored).
- Done: Discard → "Discarded 1 change" + Undo; the bar does not jump.
- Done: `git checkout ...tokens.json`; clean.

## Decisions (2026-10-05, in chat)
- Revert writes the old resolved hex back; a linked token stays a plain hex.
- All status messages and buttons live in one fixed top-centre toast; the bar keeps count, Discard, Save.
- Muse is not a brief critic; deepseek-v4.1-flash#max is, glm-5.3-flash#high the backup. Builder steps 100.

## Questions
(none open; round 4 critic asked 2, both folded in: spec (a) asserts bar height and count `y`; spec (b) uses a 1000 px viewport.)

## Report
- Rounds 1-3 built and committed; verify PASS each time. Round 4 verify PASS (unit 65/65, design-system 142/142, workbench 61/61).
- Round 4 built by Muse#high, checkpoint 88b9c34. Claude e2e: 24 passed. Break-checks: old tooltip CSS and `position: static` toast each failed its spec, restored. Real `tokens.json` untouched.
- Decisions the spec didn't settle: failed toast holds Dismiss + Retry only; changed toast keeps bar Discard + Save; isSaving keeps disabled Discard + Saving...; toast after `.shell` div, top 12px. NONE affecting contracts. Spec fact wrong: NONE. Noticed but not touched: NONE.
