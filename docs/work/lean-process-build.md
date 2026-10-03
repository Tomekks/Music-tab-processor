# Task: build the lean process (branch `lean-process`)

Status: active
Branch: lean-process
Next: plan step 7: one real small task through scripts/delegate.sh (draft the task file, owner approves the brief, run, Claude reviews the diff), then the decision gate. Ask owner first about the stale int-test worktree (uncommitted old script edits, blocks a merge).

**Goal:** replace the heavy old workflow with the lean one described in `docs/PROCESS.html` (open it in a
browser). Safety nets: tag `pre-lean`, tarballs in `~/Backups/`, old docs stay in place until step P3b.

## Resume (read this first in a new session)
Read only this file (start with 'Where we stopped'), then the rules files named under Done. Skip `START_HERE.md` and the walk test
(`CLAUDE.md` now loads `AGENTS.md`; the old docs stay until P3b). Check `pwd` and the branch first.

## Where we stopped (2026-10-02 night) - read this first tomorrow
Step E is committed (`3c5733d`); the owner dry run (stop 3) has NOT happened. Integration check results:
- **Works (tested for real):** `new-worktree.sh --base lean-process` (real install, no env files copied, hooks on, `.venv`
  linked); `verify-task.sh` and `verify-pipeline.sh --all` PASS inside the worktree; agents/MCP-off visible to opencode;
  permissions (probe agent): edits to code and task file allowed, `scripts/`, `docs/rules/`, `package.json`, `.env*`,
  `git diff --no-index`, `git log --output`, compound shell tricks all denied; builder end to end in a scratch repo
  (deepseek): one commit, scope OK, honest report.
- **Not working / unresolved:**
  1. `run-reviewer.sh` on a real task in the real worktree: **timed out at 240 s with no output** (deepseek). Same agent
     worked in scratch dirs. Next: in the worktree run `opencode run --standalone --agent reviewer -m opencode-go/deepseek-v4.1-flash --print-logs --log-level debug "say hi"` and compare with a scratch dir.
  2. **Muse** (default builder) stopped answering mid-session, even for "say hi" (provider side?). Retry once with a tiny
     task; check `opencode stats --models --days 1`. Until it answers, set `BUILDER_MODEL=opencode-go/deepseek-v4.1-flash`.
  3. Transient: the first `opencode debug agents` / `mcp list` right after a config change or in a new dir can print
     nothing; repeat it. Not a config bug.
- **Added after that (`ba9a0b9`):** `scripts/oc-run.sh` (kills dead runs in 60 s: no output / stalled / total), `oc-health.sh`
  (45 s "is opencode answering" check, run it first), `test-agents.sh` (9 permission probes, 27 s, all held). The reviewer
  worked in the real worktree once the endpoint recovered; the earlier hang was a provider outage, not the script.
- **Reviewer finding to fix:** `verify-task.sh` passes even when the task's deliverable file is missing; acceptance checks
  must assert the deliverable exists (a test, or a check in verify).
- **Leftover to clean (ask first):** throwaway worktree `../guitar_tab_processor-int-test` (branch `int-test`, filled task
  file `docs/work/int-test.md`, untracked). Use it to retest the reviewer, then run the builder there, then
  `git worktree remove ../guitar_tab_processor-int-test` and delete branch `int-test`.
- **Then:** stop 3 = dry run on a small real task (draft task file, owner approves the "What changes for you" block,
  builder, then reviewer).

## Simplified plan (agreed 2026-10-03; supersedes "Next (P3)" order until the gate passes)
Why: 2026-10-02 integration was flaky (provider outage + opencode 2.0.20 rough edges) and over-built (~800 lines of glue,
none run on a real task). Cost was Claude tokens spent debugging plumbing, not opencode ($0.07 / 800k tokens in 3 days).
Principle: check facts after the work (scope, verify, deliverable exists), not prevention rules before it.
1. DONE. `-free` leak traced: one session (2026-10-02 19:33), a builder canary test run without `-m` on a fake file, so opencode used its default free model. No repo content, no other sessions. Real path (`run-builder.sh`) always passes `-m` and rejects `*free*`; delegate.sh must do the same.
2. DONE. `verify-task.sh` fails when any `Modify only` path is missing (red/green shown in a scratch repo, shellcheck clean).
3. DONE cf87300 (tested with a fake opencode: pre-flight stop, model down, no commit, out of scope, success + deletion + env scrub; NOT yet with a real model). `scripts/delegate.sh <task>`: the only thing Claude runs. Brief + branch + drift check, builder via `oc-run.sh`,
   `check-scope`, `verify-task`; prints ~10 lines with a plain failure reason (model down / stalled / out of scope /
   verify failed). Builder gets a normal shell with a short deny list (`git push*`, curl/wget, `rm -rf`, `.env*`,
   `contracts/`, anything outside the worktree), tested once by hand. Logs go to `docs/work/runs/` (gitignored), not mktemp.
4. Drop: opencode reviewer (Claude reviews the diff), `test-agents.sh`, `oc-health.sh` (60 s no-output kill covers it),
   the ~40-rule permission matrix, scorecard-from-stats.
5. Muse: primary builder; on exit 125/126 `delegate.sh` retries once, then STOPS and prints "Muse down, recommend
   `opencode-go/deepseek-v4.1-flash`, switch?". Claude asks the owner; on yes, re-run with `BUILDER_MODEL`. No silent
   switch. Never `-free`.
5b. Logs (owner: no bloat): raw log in `docs/work/runs/<task>.log`, last 200 lines, colour codes stripped, overwritten
   per run, newest 10 kept. Claude reads only delegate.sh's ~10-line summary and the task file `## Report`; the raw
   log only on failure, via `tail -40`. Full history is already in opencode's own database.
6. Claude-side budget: two failed builder runs for non-provider reasons -> stop and report, no more plumbing debugging.
7. One real small task in the existing `int-test` worktree (reuse, then remove with owner OK).
8. Decision gate: record pass/fail + reason here. Two non-provider failures -> drop opencode, use a Haiku subagent.
8a. Deletions (owner agreed 2026-10-03): builder cannot delete. Brief has an optional `**Delete (approved with this brief):**` list; owner approves it at the brief; finish.sh `git rm`s exactly those; check-scope allows them. Builder shell is an ALLOW-list (stricter than the deny-list first agreed; owner said approve, will critique after).
8b. Owner agreed 2026-10-03: looser builder shell with short deny list; Claude reviews the diff (no opencode reviewer). Flow is drawn in `docs/PROCESS.html` ("Claude hands a task to opencode"); owner reviews it before delegate.sh is written.
9. Deferred until the gate passes: F (/next, /wrap), G (skill pruning), I (Superpowers removal), P3b, loose ends.

## Done (committed unless noted)
- P0 `7806ccf`: verify footer, `npm run coverage`, pre-commit runs verify for staged `app/`, Stop hook.
- P1 `ac07158`: `docs/PROCESS.html` (old vs new, risks, commands, progress).
- P2 `d3cef64`: rule ledger in `docs/work/ledger/` (242 rules: 160 KEEP / 20 MERGE / 26 SUPERSEDED / 37 DROP;
  296 incident lines → 33 lessons). Owner rulings: `ledger/decisions.md`. Gaps G1–G10: `ledger/incident-table.md`.
- P3 step A `3d8cbf1`: `docs/rules/{process,verify,executor,models}.md` written and accepted.
- P3 step B `20464bf`: new `AGENTS.md` (68 lines), area `AGENTS.md` files, `CLAUDE.md` → `@AGENTS.md`.
- `/start` `386847e` + update: `.claude/commands/start.md`, `scripts/start.sh`; session rules now in `AGENTS.md`.
  Owner set: ~10 new tests per task max; caps `AGENTS.md` ≤ 80 lines, rules files ≤ 70.
- P3 step C `d562c9c`: `scripts/{check-rules,verify-pipeline,new-worktree,check-brief}.sh`, verify footer
  with count + time, rule-id claims moved to `docs/rules/covers.txt`, `shellcheck` installed (all scripts clean).

- P3 step D `5850d80`: `docs/work/{TEMPLATE,scorecard,missed}.md`; new-worktree creates the task file.
- P3 step E (this checkpoint): `.opencode/agents/{builder,reviewer}.md` (default deny, tested), `opencode.json`,
  `scripts/{run-builder,run-reviewer,check-scope,finish,verify-task}.sh`. Tested end to end in a scratch repo
  with deepseek (builder obeyed, one commit, scope OK). **Owner stop 3 is the dry run on a real task.**
  Lessons: `opencode run` ignores an agent's `model` (always `-m`); a project `model` key hangs every run;
  custom tools and `/exec` don't work in 2.0.20; muse stopped responding mid-session (provider side).

## Next (P3, in order; each ends with an owner stop)
- **Loose ends (small):** derive check-brief's heading list from TEMPLATE.md; run check-rules in pre-commit when rule files
  are staged + a CI job; delete the unused `.opencode/agents/delegate-builder.md` (owner OK needed); scorecard row from
  `opencode stats` in run-builder.sh.
- **F** `/next`, `/wrap` skills calling scripts. **G** skill pruning via `skillOverrides` (off: design, brand, slides,
  ui-styling, banner-design, design-system, grill-me, find-skills; keep grilling, domain-modeling, grill-with-docs,
  wireframe, code-review, ui-ux-pro-max). **H** full dry run of the flow on a harmless task.
- **I** Remove Superpowers (owner runs the uninstall) after `grep -r "superpowers:"` is clean in kept files → **stop 4**.
- **P3b** (separate approval) move old docs to `docs/_old/` + `MAP.md` + `restore-old-docs.sh`. Then a trial of
  2–3 real tasks, then P4 delete, P5 Playwright layout spike.

## Decisions to remember
- `scripts/new-worktree.sh` branches from `master`; until `lean-process` merges, use `--base lean-process` or the worktree lacks the template and scripts.
- Reviewer = `opencode-go/deepseek-v4.1-flash`; builder = `opencode-go/muse-spark-1.3-contributor`. Never `-free` ids.
- Mechanical before reasoning. Pipeline checks only when pipeline files change. `.opencode/` is gitignored today.
- Hand opencode jobs through `scripts/ledger/classify.sh` style: isolated temp dir, 7-minute timeout, validated output.

## Watch-outs
- opencode CLI was upgraded 1.17.9 → 2.0.20; the desktop app is 1.18.x and shares the database. If the app misbehaves, tell Claude.
- `~/.config/opencode/opencode.json` contains a Figma client secret (exposed once in chat); rotate it if sensitive.
- Primary working directory drifts in some sessions: run `pwd` before writing absolute paths.
- Untracked, not ours: `.claude/skills/`, `app/packages/design-system/brands/{byebye,heyhey}/`.

## Questions
(none open)
