# Scorecard

One row per finished task, added by the builder's report. After about 10 rows, read it before choosing a
model for a task type (`docs/rules/models.md`). Don't guess before then.

| Date | Task | Builder model | First try? | Fix rounds | Owner test failed? | Tokens / cost | Note |
|---|---|---|---|---|---|---|---|
| 2026-10-03 | CC stage-duration summary (2 new files) | muse-spark-1.3 | yes (via delegate.sh, no retry) | 1 (Claude added a test after a mutation check; brief's test 5 was too weak) | not yet (owner check matched real data) | ~594k tokens, $0.01 | Muse answered at once; scope, verify and deliverable checks all passed |

## Effort test (started 2026-10-04)
Owner decision: every builder task from now on runs twice in parallel, in two worktrees from the same brief commit, with `BUILDER_MODEL=opencode-go/muse-spark-1.3-contributor#low` and `#high` (variants defined in `opencode.json`). Judge in this order: first-try verify pass and scope, defects found in read-through and owner checklist, spec compliance (stopped with a question instead of guessing), then tokens/cost/time. Only one of the two gets merged. Tell the owner if cost per task starts rising. CAVEAT: `delegate.sh` takes tokens/cost as the difference of two machine-wide `opencode stats` snapshots, so two builders running at the same time each include the other's usage; per-run tokens need another source (per-session figures from opencode, not yet checked) before the table can be trusted. Also: copy `docs/work/runs/<task>.log` out before removing a worktree (it is gitignored). Open: the probe that proves the provider honors `reasoningEffort` was inconclusive (2026-10-04).

| Date | Task | Effort | First try? | Fix rounds | Defects found | Tokens / cost / time | Merged? | Note |
|---|---|---|---|---|---|---|---|---|
| 2026-10-04 | 1d save path | default (not set; before the test) | yes | 0 | 0 | 87,929 tok, $0.02, 227s | yes | baseline only |
| 2026-10-04 | 1e Foundations page | low | no, stopped at finish.sh (stale `Written against`, my mistake); work verified, fixed by Claude | 0 builder fixes; 1 Claude fix (brief) | 2 minor: two unneeded `@ts-ignore`; none functional | 88,276 tok, $0.01, 179s | not decided | verify PASS, scope OK, 5 tests, asked a question instead of guessing; aria-hidden swatch, followed the brief's `{#if}` text rule |
| 2026-10-04 | 1e Foundations page | high | no, same finish.sh stop; then API crash (`tool_choice`) at the very end | 0 builder fixes; same Claude fix | 3 minor: `any` in two callbacks, swatch without aria-hidden, literal text inside `{#if}` | 69,315 tok, $0.01, 205s | not decided | verify PASS, scope OK, 5 tests (longer file); about the same code
| 2026-10-04 | 1e2 preview fits canvas | low | no: `tool_choice` API crash at the very end, no commit; my brief had backticks in the Modify-only block that `verify-task` read as missing files; Claude fixed the brief and ran `finish.sh` | 0 builder fixes; 1 Claude fix (brief) | 0 found | 58,999 tok, $0.01, 151s | yes | picked by owner; more accurate scaled height than high |
| 2026-10-04 | 1e2 preview fits canvas | high | no: same API crash and brief problem (it also edited the task file to remove the backticks; reverted) | 0 builder fixes; same Claude fix | 1 minor: height uses the whole page times the scale (heading and padding scaled too) | 110,964 tok, $0.02, 205s | no | same design as low; about 2x the tokens |

## Second opinion (trial from 2026-10-04)
`/review` runs a cheap blind second reviewer (`scripts/review-second.sh`), Claude answers separately, then compares. After 3-5 rows: keep for Level 2 only, keep for both, or drop. Counts are real catches (checked against the code) except the last column.

| Date | Task | Level | Only the cheap model caught | Only Claude caught | Cheap model's false or noisy claims | Tokens / time |
|---|---|---|---|---|---|---|
| 2026-10-04 | 1e brief | 1 (non-blind first run) | 2 (in the first, non-blind run: descriptions out of scope, unused `raw`) | 2 (reuse of `buildFieldDescriptors`, `import.meta.url` path), found in the 8-question pass | 0 | ~48k tok, 48s |
| 2026-10-04 | 1e brief, blind rerun | 1 | 0 (it reached the same one real finding on its own: descriptions are out of scope) | 0 (my extras were context, not defects: `cssVar` feeds 1f; 7 of 16 rows have no description) | 0 | ~46k tok, 97s |
| 2026-10-04 | 1e2 brief (Muse high draft) | 2 (blind) | 0 | 3 (theme set by the root `ThemeProvider` runs after the child's effect so a one-time light set loses; height must be the scaled height; "full canvas width" vs 32px canvas padding) | 5 (focus ring clipping and empty-list collapse are wrong: the iframe holds the Preview page not the Colors list; 127.0.0.1 cut is irrelevant; "7 not ~8 tests" is nitpicking; cited `useThemeMode.ts:30-31`, which does not exist) | ~79k tok, 106s |

## Model switches
One line each: date, task, from → to, why (`docs/rules/models.md`).
