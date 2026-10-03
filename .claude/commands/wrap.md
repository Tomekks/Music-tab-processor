---
description: End a session cleanly - tick the task checklist, update Next, save the task file
allowed-tools: Bash(bash scripts/start.sh:*), Bash(gh pr view:*), Bash(git status:*), Bash(git diff:*), Bash(git add docs/work/*), Bash(git commit:*)
---
Run `bash scripts/start.sh ""` to find the active task file, then:

1. Tick only the checklist items that are actually done (check `git status` and `git diff --stat`; do not tick from memory).
2. Add each decision made in chat this session as one line in the task file.
3. Rewrite its `Next:` line so a new session can continue cold. Name any open worktree, unmerged PR and local-only leftover (they are invisible to `/start` in another folder).
4. If the task is finished and merged, set its `Status:` to `done`. If a PR exists for this branch, check its state and CI (`gh pr view`) and put any failure in `Next:`.
5. Compact the file to about 60 lines: fold finished steps into one-line Done entries, delete sections that are no longer true or that contradict `Next:` (git keeps history). A cold session must be able to trust every line.
6. Commit only the task file as a checkpoint (`git add docs/work/<task>.md`, one commit). Do not push.
7. Report in 3 lines: what is done, what is left, what the owner does first next time.

If anything unrelated is uncommitted, name it but do not touch it.
