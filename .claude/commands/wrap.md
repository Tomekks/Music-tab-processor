---
description: End a session cleanly - tick the task checklist, update Next, save the task file
allowed-tools: Bash(bash scripts/start.sh:*), Bash(git status:*), Bash(git diff:*), Bash(git add docs/work/*), Bash(git commit:*)
---
Run `bash scripts/start.sh ""` to find the active task file, then:

1. Tick only the checklist items that are actually done (check `git status` and `git diff --stat`; do not tick from memory).
2. Add each decision made in chat this session as one line in the task file.
3. Rewrite its `Next:` line so a new session can continue cold.
4. Commit only the task file as a checkpoint (`git add docs/work/<task>.md`, one commit). Do not push.
5. Report in 3 lines: what is done, what is left, what the owner does first next time.

If anything unrelated is uncommitted, name it but do not touch it.
