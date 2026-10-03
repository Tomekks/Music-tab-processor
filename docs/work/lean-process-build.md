# Task: build the lean process (branch `lean-process`)

Status: active
Branch: lean-process
Next: P3 step C (scripts: check-rules.sh, verify-pipeline.sh, new-worktree.sh, check-brief.sh; footer duration + test count), then D, E, F (/next, /wrap), G, H, I.

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
- **Leftover to clean (ask first):** throwaway worktree `../guitar_tab_processor-int-test` (branch `int-test`, filled task
  file `docs/work/int-test.md`, untracked). Use it to retest the reviewer, then run the builder there, then
  `git worktree remove ../guitar_tab_processor-int-test` and delete branch `int-test`.
- **Then:** stop 3 = dry run on a small real task (draft task file, owner approves the "What changes for you" block,
  builder, then reviewer).

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
