# Task: lean process (branch `lean-process`, PR #59)

Status: active
Branch: lean-process
Next: PR #59 is not merged yet. Its CI on c9d516d: `verify` passed, `e2e-design-system` FAILED once (test staged-save #10 read the old token value right after a revert; 37 passed, 1 failed). The same check passed on the two earlier commits and c9d516d changed only docs, so it looks like a timing flake in an app test, not our change: re-run the failed job (`gh run rerun --failed`, run id 37147295336, owner OK), then merge #59 when green (owner asked to merge). If it fails again, that test needs a look before merging. Then retarget PR #60 (feat/cc-stage-durations, stacked on lean-process) to master and merge it, then remove the worktree `../guitar_tab_processor-feat-cc-stage-durations` (owner OK). Then the trial: 3 more real tasks via delegate.sh (one Quick, one Full with a Delete list). This file has one unpushed edit (pushing restarts CI, so push after the merge decision).

**Goal (done):** replace the heavy old workflow with the lean one. Picture of how a task moves today: `docs/WORKFLOW.html`. Old-vs-new and build progress: `docs/PROCESS.html`. Rules: `AGENTS.md` and `docs/rules/`. Open the HTML files in a browser.

## Current state (2026-10-03)
- **Built and committed:** rules + caps (`check-rules.sh`), `/start` `/next` `/wrap`, `scripts/delegate.sh` (pre-flight, builder via `oc-run`, `check-scope`, `verify-task`, `finish`, ~10-line summary, scorecard row), quick and full templates, `--critique` cold read, `new-worktree.sh [--quick]` (installs app + Control Centre, tokens, hides `.venv`), approved deletions via the brief's `Delete:` list.
- **Removed:** opencode reviewer, `run-reviewer.sh`, `oc-health.sh`, `test-agents.sh`, Superpowers plugin (owner uninstalled). Six skills turned off in gitignored `.claude/settings.local.json`.
- **Old workflow docs:** 11 files carry a SUPERSEDED banner; nothing moved or deleted (a move would break links in ~10 kept files). `critique-prompt.md` left as is.
- **Proven with a real model, once:** Control Center stage durations (`stageDurations`, PR #60): Muse, first try, verify 162/162, ~594k tokens, $0.01. Claude's review caught 2 untested rules (fixed, `8e0d845`).
- **Not yet proven with a real model:** Delete list, `--critique`, Quick template, break-and-restore rule, retry and deepseek fallback, a cheap model drafting the brief (Claude wrote it so far).
- **Process is frozen** until 3 more real tasks run; only a real failure reopens it (`docs/rules/process.md`, "Changing the process").

## Decisions to remember
- Builder = `opencode-go/muse-spark-1.3-contributor`; fallback `opencode-go/deepseek-v4.1-flash`, only after asking the owner. Never `-free` ids (one free-model canary run on 2026-10-02 touched only a fake file).
- Builder shell is an allow-list (read-only git, tests, the two scripts); Claude reviews the diff; builder cannot delete, push or go online.
- Build a script only after a real failure or a step done twice. Mechanical before reasoning. Pipeline checks only when pipeline files change.
- Delegation pays off across many tasks, not on tiny ones; Level 0 changes need no brief.
- `scripts/new-worktree.sh` branches from `master`; until `lean-process` merges, pass `--base lean-process`.

## Later (not before the trial)
- **P4:** decide move/delete of the old workflow docs, using the scorecard. **P5:** Playwright layout spike.
- Loose ends: derive check-brief's headings from the templates; run check-rules in pre-commit when rule files are staged + a CI job (touches `.githooks/` and `.github/`, ask first).
- Control Center next steps are in `docs/plans/2026-09-24-control-center/` (quality grilling, then tempo control); the design-system workbench is in `docs/plans/2026-10-01-design-system-workbench/`.

## Watch-outs
- The pre-redaction backups (tags, refs/original, old objects) were deleted 2026-10-03. Never `git push --tags` or `--all`.
- Flaky test to look at later: `app/e2e/design-system/staged-save.spec.ts:334` ("All-variables edits still auto-commit") failed once in CI on a docs-only commit; reads the tokens file right after the revert response.
- `~/.config/opencode/opencode.json` contains a Figma client secret (exposed once in chat); rotate it if sensitive.
- opencode CLI is 2.0.20; the desktop app is 1.18.x and shares the database.
- The working directory can drift mid-session: run `pwd` before writing absolute paths.
- Untracked, not ours: `.claude/skills/`, `app/packages/design-system/brands/{byebye,heyhey}/`.

## Questions
(none open)
