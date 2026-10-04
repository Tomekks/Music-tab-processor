---
description: Review of the active task's brief by its Risk level - Level 1 answers 3 questions, Level 2 answers all eight (docs/rules/review.md)
allowed-tools: Bash(bash scripts/start.sh:*), Bash(bash scripts/check-review.sh:*), Bash(bash scripts/measure.sh:*)
---
Read `docs/rules/review.md` (the questions) and the active task file (`bash scripts/start.sh ""` names it; in a worktree, run it there). Find its `Review level:` in the Risk section.

- Level 0: say there is nothing to review and stop.
- Level 1: answer only questions 1, 4 and 6, at most 5 bullets total.
- Level 2: answer all eight questions once, one line each.

Every answer carries evidence (`file:line`, or a command and its output). Check each claim against the live code before writing "sound". Write the answers under `## Review` in the task file, replacing anything already there. Then run `bash scripts/check-review.sh <task file>` (must print nothing and exit 0) and `bash scripts/measure.sh mark <task> review-done`. Do not start the builder. Report in 3 lines: what you found, what you changed in the brief, what the owner decides.
