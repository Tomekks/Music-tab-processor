# Scorecard

One row per finished task, added by the builder's report. After about 10 rows, read it before choosing a
model for a task type (`docs/rules/models.md`). Don't guess before then.

| Date | Task | Builder model | First try? | Fix rounds | Owner test failed? | Tokens / cost | Note |
|---|---|---|---|---|---|---|---|
| 2026-10-03 | CC stage-duration summary (2 new files) | muse-spark-1.3 | yes (via delegate.sh, no retry) | 1 (Claude added a test after a mutation check; brief's test 5 was too weak) | not yet (owner check matched real data) | ~594k tokens, $0.01 | Muse answered at once; scope, verify and deliverable checks all passed |

## Model switches
One line each: date, task, from → to, why (`docs/rules/models.md`).
