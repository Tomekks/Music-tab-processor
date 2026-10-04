---
description: Level 2 review of the active task's brief - answers the mandatory questions in docs/rules/review.md
allowed-tools: Bash(bash scripts/start.sh:*), Bash(bash scripts/check-review.sh:*), Bash(bash scripts/measure.sh:*)
---
Read `docs/rules/review.md` (the mandatory questions) and the active task file (`bash scripts/start.sh ""` names it; in a worktree, run it there).

Answer all eight questions once, one line each with evidence (`file:line`, or a command and its output), under `## Review` in the task file. Check each claim against the live code before writing "sound". Then run `bash scripts/check-review.sh <task file>` (must print nothing and exit 0) and `bash scripts/measure.sh mark <task> review-done`. Do not start the builder. Report in 3 lines: what you found, what you changed in the brief, what the owner decides.
