# Review upgrade (code review step, shared report format, leaner process rules)

**Status (2026-10-06):** Grill done (owner answers below). No task files yet.

**Next task:** A (Level 1 report block in `/review`; no brief yet: write it in `docs/work/`).

## Goal
Catch bugs before the owner test with a cheap blind code reviewer, give the owner one plain report shape for every review, and stop `process.md` from growing without limit.

## Decisions (2026-10-06 grill)
- Freeze rule ("no process changes until 3 more tasks") is deleted. New rule instead: before any `process.md` change, Claude checks the request against the current file for a clash or bloat and reports it before editing.
- Code reviewer: `git diff master...HEAD` plus the brief's acceptance checks; no builder log; read-only, fresh session; deepseek-v4.1-flash#high (backup Muse), modelled on `scripts/review-second.sh`; flags only correctness or requirement gaps with `file:line`.
- Runs after `verify` passes and before the report, on every builder run, for the first 5 tasks with a scorecard row. After that the owner decides: Level 1 and 2, or Level 2 only.
- Claude reads the diff itself at Level 1 and 2 while the reviewer runs, writes its own bullets first, then opens the reviewer's findings (replaces today's spot-check, so tokens stay about equal).
- Scorecard table "Code review", one row per task: findings, real, false, fix rounds caused, bugs the owner test found that it missed. Keep if it caught 2+ real bugs verify and Claude missed; drop if false findings outnumber real ones. One planted-flaw test: a deliberate off-by-one on a throwaway branch.
- One shared report shape for brief review and code review: found, lessons, **Folded in**, **Not folded in (and why)**. Brief review under `## Review`, code review under `## Code review`.
- Rules cap becomes 900 words per `docs/rules/*.md` (was 70 lines); `check-rules.sh` counts words and fails when a script has no header comment on line 2. No script index document.
- `process.md` is tightened in place (84 lines, 1,257 words today), no new file; split only if still over 900.
- `/wrap` trim: end every wrap with one block "Needs you before you close" (each action its own bash block; if nothing, "Nothing needed. Safe to close."); keep sweep, commit, `Next:` lines, PR list; usage recording (step 10) stays but runs silently and is reported only if the call fails; compaction (step 9) becomes on request only, after checking nothing else reads the 60-line size.

## Tasks (in order)
| Task | What | Level |
|---|---|---|
| A | `/review` ends with the shared report block (`.claude/commands/review.md`, `docs/rules/review.md`) | 1 |
| C | Word cap + script-header check in `check-rules.sh`; tighten `process.md` under 900 words; replace the freeze rule with the clash/bloat check | 1 |
| D | `/wrap` trim in `.claude/commands/wrap.md` (see decision above; word count before/after) | 1 |
| B | Code-review script, scorecard table, `process.md`/`models.md` edits, planted-flaw test | 2 (shell) |

## Cautions
- Task C: every cut keeps the concrete step, name or number; no rewrite into an abstraction a model could misread. Show owner the before/after words and each cut line. Model ids live only in `models.md`.
- Skills commit `34f7b4b` (grill-with-docs, grilling, domain-modeling) sits on `chore/track-grill-skills`, not merged.
