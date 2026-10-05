# Scorecard

One row per finished task, added by the builder's report. After about 10 rows, read it before choosing a
model for a task type (`docs/rules/models.md`). Don't guess before then.

| Date | Task | Builder model | First try? | Fix rounds | Owner test failed? | Tokens / cost | Note |
|---|---|---|---|---|---|---|---|
| 2026-10-03 | CC stage-duration summary (2 new files) | muse-spark-1.3 | yes (via delegate.sh, no retry) | 1 (Claude added a test after a mutation check; brief's test 5 was too weak) | not yet (owner check matched real data) | ~594k tokens, $0.01 | Muse answered at once; scope, verify and deliverable checks all passed |

## Effort test (started 2026-10-04, STOPPED 2026-10-04: Muse `#high` is the default builder, deepseek the backup; no more parallel double runs)
Owner decision: every builder task from now on runs twice in parallel, in two worktrees from the same brief commit, with `BUILDER_MODEL=opencode-go/muse-spark-1.3-contributor#low` and `#high` (variants defined in `opencode.json`). Judge in this order: first-try verify pass and scope, defects found in read-through and owner checklist, spec compliance (stopped with a question instead of guessing), then tokens/cost/time. Only one of the two gets merged. Tell the owner if cost per task starts rising. CAVEAT: `delegate.sh` takes tokens/cost as the difference of two machine-wide `opencode stats` snapshots, so two builders running at the same time each include the other's usage; per-run tokens need another source (per-session figures from opencode, not yet checked) before the table can be trusted. Also: copy `docs/work/runs/<task>.log` out before removing a worktree (it is gitignored). Open: the probe that proves the provider honors `reasoningEffort` was inconclusive (2026-10-04).

| Date | Task | Effort | First try? | Fix rounds | Defects found | Tokens / cost / time | Merged? | Note |
|---|---|---|---|---|---|---|---|---|
| 2026-10-04 | 1d save path | default (not set; before the test) | yes | 0 | 0 | 87,929 tok, $0.02, 227s | yes | baseline only |
| 2026-10-04 | 1e Foundations page | low | no, stopped at finish.sh (stale `Written against`, my mistake); work verified, fixed by Claude | 0 builder fixes; 1 Claude fix (brief) | 2 minor: two unneeded `@ts-ignore`; none functional | 88,276 tok, $0.01, 179s | not decided | verify PASS, scope OK, 5 tests, asked a question instead of guessing; aria-hidden swatch, followed the brief's `{#if}` text rule |
| 2026-10-04 | 1e Foundations page | high | no, same finish.sh stop; then API crash (`tool_choice`) at the very end | 0 builder fixes; same Claude fix | 3 minor: `any` in two callbacks, swatch without aria-hidden, literal text inside `{#if}` | 69,315 tok, $0.01, 205s | not decided | verify PASS, scope OK, 5 tests (longer file); about the same code
| 2026-10-04 | 1e2 preview fits canvas | low | no: `tool_choice` API crash at the very end, no commit; my brief had backticks in the Modify-only block that `verify-task` read as missing files; Claude fixed the brief and ran `finish.sh` | 0 builder fixes; 1 Claude fix (brief) | 0 found | 58,999 tok, $0.01, 151s | yes | picked by owner; more accurate scaled height than high |
| 2026-10-04 | 1e2 preview fits canvas | high | no: same API crash and brief problem (it also edited the task file to remove the backticks; reverted) | 0 builder fixes; same Claude fix | 1 minor: height uses the whole page times the scale (heading and padding scaled too) | 110,964 tok, $0.02, 205s | no | same design as low; about 2x the tokens |
| 2026-10-04 | 1f color editing | low | no: same `tool_choice` API crash at the end, no commit; my brief again had backticks in the Modify-only block (a paragraph Muse placed there, my review missed it); both code runs passed verify, Claude fixed the brief and ran `finish.sh` | 0 builder fixes; 1 Claude fix (brief) | 1 shared: after leaving Foundations and coming back, the staged color is kept but the preview iframe ignores it (the resend on `load` fires before the preview's listener exists); Cmd+Z works only on Foundations; changes list shoves the page layout; everything else on the checklist works | 97,069 tok, $0.01, 181s | | key handler only on the Foundations page |
| 2026-10-04 | 1f color editing | high | no: same crash and same brief problem | 0 builder fixes; same Claude fix | 1 shared: same lost-resend defect; everything else works (Cmd+Z on any page, changes list is a dropdown, "1 unsaved change" singular) | 147,161 tok, $0.02, 283s | | key handler in the layout, so Cmd+Z works on any page; ~1.5x tokens |
| 2026-10-04 | Workbench Playwright specs (10) | high | no: same end-of-run API crash; code passed verify-task, Claude ran `finish.sh` | 4 failing specs fixed by Claude (selectors, base URL) | 0 test-quality defects found by 11 mutation checks | 190,290 tok, $0.02, 245s | | builder cannot run Playwright; Claude runs and mutates; found a real 127.0.0.1 origin bug |

## Second opinion (trial from 2026-10-04)
`/review` runs a cheap blind second reviewer (`scripts/review-second.sh`), Claude answers separately, then compares. After 3-5 rows: keep for Level 2 only, keep for both, or drop. Counts are real catches (checked against the code) except the last column.

| Date | Task | Level | Only the cheap model caught | Only Claude caught | Cheap model's false or noisy claims | Tokens / time |
|---|---|---|---|---|---|---|
| 2026-10-04 | 1e brief | 1 (non-blind first run) | 2 (in the first, non-blind run: descriptions out of scope, unused `raw`) | 2 (reuse of `buildFieldDescriptors`, `import.meta.url` path), found in the 8-question pass | 0 | ~48k tok, 48s |
| 2026-10-04 | 1e brief, blind rerun | 1 | 0 (it reached the same one real finding on its own: descriptions are out of scope) | 0 (my extras were context, not defects: `cssVar` feeds 1f; 7 of 16 rows have no description) | 0 | ~46k tok, 97s |
| 2026-10-04 | 1g0 brief | 1 (blind) | 1 (new spec could pass with an empty picker wrapper; fixed in the brief) | 0 (both of us listed the same spec lines using the alpha label; my extras were context) | 0 (its note that `verify-task.sh` runs no browser spec is true and matched my own bullet) | ~48k tok, 92s |
| 2026-10-04 | 1g0 expansion (Reset, steady tabs) | 1 (blind, deepseek #high) | 3 (button chrome not reset by `.edited`; stale error after Reset; redundant `sendTokens`) | 2 (spec must prove the scroll started at 400; Reset must be tested as one undo step via Cmd+Z) | 0 (4th point, picker check sound, matched mine) | 203s |
| 2026-10-04 | 1e2 brief (Muse high draft) | 2 (blind) | 0 | 3 (theme set by the root `ThemeProvider` runs after the child's effect so a one-time light set loses; height must be the scaled height; "full canvas width" vs 32px canvas padding) | 5 (focus ring clipping and empty-list collapse are wrong: the iframe holds the Preview page not the Colors list; 127.0.0.1 cut is irrelevant; "7 not ~8 tests" is nitpicking; cited `useThemeMode.ts:30-31`, which does not exist) | ~79k tok, 106s |
| 2026-10-04 | 1f brief (Muse high draft) | 1 (blind) | 1 minor (the Setup line still said "before the build" though the install was committed; fixed) | 1 (turned the shared "UI untested" finding into a fix: pure `previewVars` plus its test, and a reload/page-switch checklist item; it only named the gap) | 2 ("cut the picker" contradicts the plan's chosen library; "cross-page store is untraceable" is wrong, the layout's top bar needs a shared store) | ~31k tok, 58s |
| 2026-10-05 | 1f4 polish 3 brief | 1 (blind) | 2 (list needs `cssVarNameForPath` since the panel has only `path`; helper had no file in scope) | 1 (e2e is not run by `verify-task.sh`, Cmd+Z-after-Reset is my own add) | 0 (it also named the e2e gap, same as mine) | ~35k tok, 101s |

## Brief drafts (trial from 2026-10-04)
Muse drafts the brief, Claude reviews the diff and fixes what is wrong. Count real defects Claude had to fix (checked against the code).

| Date | Task | Drafter | Defects Claude fixed | What they were | Time |
|---|---|---|---|---|---|
| 2026-10-04 | 1f color editing | Muse high | 4 | status text needs `+layout.svelte` and a shared store, neither in Modify-only; staged values lost when the iframe loads late (no resend on `load`); Cmd+Z would hijack text-field undo; existing disabled Save button contradicted "no Save". Also flagged an open question for 1g (semantic tokens are references, not hex) | draft ~4 min; tokens not measured |

## Model switches
One line each: date, task, from → to, why (`docs/rules/models.md`).

## Brief critics (trial from 2026-10-04)
Claude drafts the brief; Muse `#low` (then deepseek-v4.1-flash if needed) reads it blind via `delegate.sh --critique`. Compare with the old way (cheap-model draft): bug rounds per task and bugs per round after build. After 3-5 rows: keep, add the second critic permanently, or drop.

| Date | Task | Critic(s) | Gaps only the critic found (real) | Gaps only Claude found | Critic false or noisy claims | Bug rounds after build | Tokens / time |
|---|---|---|---|---|---|---|---|
