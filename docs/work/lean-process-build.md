# Task: lean process (merged to master via PR #59, 2026-10-03)

Status: active
Branch: master
Next: nothing is open for the lean process. Next real work is the trial: 3 real tasks via delegate.sh (one Quick, one Full with a Delete list); wait for real work, do not invent tasks. Local master is 4 commits ahead of origin (all docs or command edits: task file x3, `.claude/commands` x1); master is protected, so they go out in a PR together with the next real change (owner asked for no separate PR). Open PRs #54-#58 are dependabot, not ours (#54 is a real break: react-dom 19.3.0 needs a newer react than the pinned 19.2.8; close it or bump both). No worktrees, no local-only leftovers.

**Goal (done):** replace the heavy old workflow with the lean one. Picture of how a task moves today: `docs/WORKFLOW.html`. Old-vs-new and build progress: `docs/PROCESS.html`. Rules: `AGENTS.md` and `docs/rules/`. Open the HTML files in a browser.

## Current state (2026-10-03)
- **On master (merged 2026-10-03):** rules + caps (`check-rules.sh`), `/start` `/next` `/wrap`, `scripts/delegate.sh` (pre-flight, builder via `oc-run`, `check-scope`, `verify-task`, `finish`, ~10-line summary, scorecard row), quick and full templates, `--critique` cold read, `new-worktree.sh [--quick]` (installs app + Control Centre, tokens, hides `.venv`), approved deletions via the brief's `Delete:` list.
- **Removed:** opencode reviewer, `run-reviewer.sh`, `oc-health.sh`, `test-agents.sh`, Superpowers plugin (owner uninstalled). Six skills turned off in gitignored `.claude/settings.local.json`.
- **Old workflow docs:** 11 files carry a SUPERSEDED banner; nothing moved or deleted (a move would break links in ~10 kept files). `critique-prompt.md` left as is.
- **Proven with a real model, once:** Control Center stage durations (`stageDurations`, merged in #60): Muse, first try, verify 162/162, ~594k tokens, $0.01. Claude's review caught 2 untested rules (fixed, `8e0d845`).
- **Not yet proven with a real model:** Delete list, `--critique`, Quick template, break-and-restore rule, retry and deepseek fallback, a cheap model drafting the brief (Claude wrote it so far).
- **Process is frozen** until 3 more real tasks run; only a real failure reopens it (`docs/rules/process.md`, "Changing the process").

## Decisions to remember
- Builder = `opencode-go/muse-spark-1.3-contributor`; fallback `opencode-go/deepseek-v4.1-flash`, only after asking the owner. Never `-free` ids (one free-model canary run on 2026-10-02 touched only a fake file).
- Builder shell is an allow-list (read-only git, tests, the two scripts); Claude reviews the diff; builder cannot delete, push or go online.
- Build a script only after a real failure or a step done twice. Mechanical before reasoning. Pipeline checks only when pipeline files change.
- Delegation pays off across many tasks, not on tiny ones; Level 0 changes need no brief. Do not delegate wireframes or overview pages (no mechanical check); do delegate building an approved wireframe as UI code.
- Plans stay in `docs/plans/` and live tasks in flat `docs/work/`; no regrouping by project (56 files reference those paths). Add a `docs/plans/README.md` index only if finding a plan becomes a real problem.
- `/start` `/next` ask which task when several are active; `/wrap` sets `Status: done` on finished tasks and checks PR CI (added 2026-10-03 after real failures).
- `scripts/new-worktree.sh` branches from `master` (the lean process is on master now, no `--base` needed).

## Later (not before the trial)
- **P4:** decide move/delete of the old workflow docs, using the scorecard. **P5:** Playwright layout spike.
- Loose ends: derive check-brief's headings from the templates; run check-rules in pre-commit when rule files are staged + a CI job (touches `.githooks/` and `.github/`, ask first).
- Control Center next steps are in `docs/plans/2026-09-24-control-center/` (quality grilling, then tempo control); the design-system workbench is in `docs/plans/2026-10-01-design-system-workbench/`.

## Watch-outs
- The pre-redaction backups (tags, refs/original, old objects) were deleted 2026-10-03. Never `git push --tags` or `--all`.
- A PR retargeted to master gets no CI (the workflow listens only to opened, pushed and reopened): close and reopen the PR to start it.
- `e2e-design-system` is flaky in CI, not caused by our PRs: master commit 750ee0e passed on 2026-10-01 and failed on a re-run 2026-10-02; different tests fail on different runs (staged-save #10 on PR #59, deploy-status #4 on PR #58). Dependabot PR #54 (react-dom 19.3.0) is a real break: `npm ci` ERESOLVE, react is pinned at 19.2.8; it needs react bumped together. #54 and #58 are not ours.
- `~/.config/opencode/opencode.json` contains a Figma client secret (exposed once in chat); rotate it if sensitive.
- opencode CLI is 2.0.20; the desktop app is 1.18.x and shares the database.
- The working directory can drift mid-session: run `pwd` before writing absolute paths.
- Untracked, not ours: `.claude/skills/`, `app/packages/design-system/brands/{byebye,heyhey}/`.

## Questions
(none open)
