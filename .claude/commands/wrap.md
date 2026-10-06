---
description: Leave the repo clean and /start accurate - sweep, commit leftovers, ask before deleting, update task and plan Next lines
allowed-tools: Bash(bash scripts/start.sh:*), Bash(bash scripts/measure.sh:*), Bash(bash scripts/compact-task.sh:*), mcp__ccd_session_mgmt__get_usage, mcp__ccd_session_mgmt__set_session_title, Bash(gh pr view:*), Bash(git status:*), Bash(git diff:*), Bash(git add docs/work/*), Bash(git commit:*), Bash(gh pr list:*), Bash(git worktree list:*), Bash(git branch:*), Bash(git cherry:*), Bash(git log:*)
---
Run `bash scripts/start.sh "" --no-mark` first. A task may or may not be active; the sweep always runs.

**A. Sweep (always)**
1. `git status`, `git worktree list`, `gh pr list`. Commit tracked leftovers that belong to this session's work, locally, one commit. Name anything unrelated and ask what to do; never touch it.
2. For each worktree and local branch other than this one, say whether it is merged, a superseded run (`git cherry master <branch>`), or holds unmerged work or uncommitted files. Show the list as keep / delete-candidate. Delete nothing yourself: give the owner the exact commands (`git worktree remove`, `git branch -d`), since deletes need a separate yes and may be blocked.
3. Open PRs: state and CI (`gh pr view`); list what is waiting on the owner.
4. Plans: for each plan touched this session, update its `**Next task:**` line (one line: task id, name, where its brief is). `/start` and `/next` read it.

**B. Task file (only if a task is active)**
5. Tick only checklist items that are actually done (check `git status` and `git diff --stat`; not from memory).
6. Add each decision made in chat as one line in the task file.
7. Rewrite its `Next:` line so a new session can continue cold. Name any open worktree, unmerged PR and local-only leftover.
8. If the task is finished and merged, set `Status:` to `done`. If a PR exists for this branch, put any CI failure in `Next:`.
9. Compact the file to about 60 lines: `bash scripts/compact-task.sh docs/work/<task>.md`. On exit 0, read `git diff` of the task file and keep it only if no fact a cold session needs was lost (otherwise `cp .git/compact-last.md docs/work/<task>.md`). On exit 1 or 2 compact by hand: fold finished steps into one-line Done entries, delete sections that are no longer true or contradict `Next:`.
10. Record usage: `get_usage`, then `bash scripts/measure.sh mark <task> session-end "5h=<n> weekly=<n> ctx=<n>"`, then `bash scripts/measure.sh report <task>`; put its total line in `Next:` or the Report.
11. Commit the task file and any plan edit as one local checkpoint (`git add docs/work/<task>.md` and the plan file). Do not push.
12. Rename this session with `set_session_title` (`session_id: "self"`) to `<task id> <short name>: <state>` (done, building, waiting on owner). If it fails, say so and continue.

**C. Ideas and report**
13. Parked ideas: if `start.sh` printed an `ideas:` line, show the numbered ideas; for each say whether this session's work finished it (cite the commit or file) or "no evidence". Ask which to remove; delete only lines the owner names, one yes per wrap.
14. Report in 3 lines: what is done, what is still open (PRs, worktrees, blocked on you), what the owner does first next time. Say how many times the owner asked to "explain simpler".

Never push. If anything unrelated is uncommitted, name it but do not touch it.
