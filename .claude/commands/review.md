---
description: Review of the active task's brief by its Risk level - Level 1 answers 3 questions, Level 2 answers all eight (docs/rules/review.md)
allowed-tools: Bash(bash scripts/start.sh:*), Bash(bash scripts/check-review.sh:*), Bash(bash scripts/measure.sh:*), Bash(bash scripts/review-second.sh:*)
---
Read `docs/rules/review.md` (the questions) and the active task file (`bash scripts/start.sh ""` names it; in a worktree, run it there). Find its `Review level:` in the Risk section (a `Template: quick` task has no Risk section: it is Level 1 by definition).

- Level 0: say there is nothing to review and stop.
- Level 1: answer only questions 1, 4 and 6, at most 5 bullets total.
- Level 2: answer all eight questions once, one line each.

Second opinion (Level 1 and 2): BEFORE answering, run `bash scripts/review-second.sh <task file>`. A cheap model answers the same questions blind and saves them to a log; do NOT open that log, and do not read its output beyond the script's own status lines, until your own answers are written. If it says NOT BLIND or fails, say so and go on without it.

Every answer carries evidence (`file:line`, or a command and its output). Check each claim against the live code before writing "sound". Write the answers under `## Review` in the task file, replacing anything already there. Then run `bash scripts/check-review.sh <task file>` (must print nothing and exit 0) and `bash scripts/measure.sh mark <task> review-done`. Now open the log and compare both answers. Check each of the other model's claims against the code before believing it. Add one row to the "Second opinion" table in `docs/work/scorecard.md` (counts of real catches only it made, only you made, and its false or noisy claims). Do not start the builder. Report in 5 lines: what you found, what you changed in the brief, what the owner decides, and 2 lines on what the comparison taught you (where the two views differed and which was right).
