---
description: Say which step of the flow this task is on and exactly what the owner needs to do next
allowed-tools: Bash(bash scripts/start.sh:*), Bash(gh pr list:*), Bash(git worktree list:*)
---
Run `bash scripts/start.sh "" --no-mark` (read-only: no measure row). If it names an active task, read only that file; if it lists several, ask the user which one and wait.

**No active task:** answer from the output instead: each pending plan with its `next task:` line (say so if a plan has none), then open loops from `gh pr list` (unmerged PRs and their CI state) and `git worktree list` (worktrees still holding work), then the count of parked ideas. End with what the owner does first. Never read plan files in full.

Answer in 3 to 5 plain lines for a non-programmer:
1. Which step of `docs/rules/process.md` the task is on (size, brief, review, build, check, report, owner test, ship).
2. What is done, from the ticked checklist and the `Report`.
3. What the owner must do now (approve the "What changes for you" block, run the owner checklist, or answer a Question), with the exact command if there is one.
4. What you will do after that.

Add one line for open loops (unmerged PR, worktree with unmerged work) when there are any. Do not start any work or change any file. If the task file is missing, stale or has open Questions, say so first.
