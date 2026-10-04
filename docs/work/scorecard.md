# Scorecard

One row per finished task, added by the builder's report. After about 10 rows, read it before choosing a
model for a task type (`docs/rules/models.md`). Don't guess before then.

| Date | Task | Builder model | First try? | Fix rounds | Owner test failed? | Tokens / cost | Note |
|---|---|---|---|---|---|---|---|
| 2026-10-03 | CC stage-duration summary (2 new files) | muse-spark-1.3 | yes (via delegate.sh, no retry) | 1 (Claude added a test after a mutation check; brief's test 5 was too weak) | not yet (owner check matched real data) | ~594k tokens, $0.01 | Muse answered at once; scope, verify and deliverable checks all passed |

## Effort test (started 2026-10-04)
Owner decision: every builder task from now on runs twice in parallel, in two worktrees from the same brief commit, with `BUILDER_MODEL=opencode-go/muse-spark-1.3-contributor#low` and `#high` (variants defined in `opencode.json`). Judge in this order: first-try verify pass and scope, defects found in read-through and owner checklist, spec compliance (stopped with a question instead of guessing), then tokens/cost/time. Only one of the two gets merged. Tell the owner if cost per task starts rising. Open: the probe that proves the provider honors `reasoningEffort` was inconclusive (2026-10-04).

| Date | Task | Effort | First try? | Fix rounds | Defects found | Tokens / cost / time | Merged? | Note |
|---|---|---|---|---|---|---|---|---|
| 2026-10-04 | 1d save path | default (not set; before the test) | yes | 0 | 0 | 87,929 tok, $0.02, 227s | yes | baseline only |

## Model switches
One line each: date, task, from → to, why (`docs/rules/models.md`).
