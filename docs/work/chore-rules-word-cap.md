# Task: Word cap, script-header check, shorter process.md (review-upgrade task C)

Status: active
Branch: docs/review-upgrade-plan
Next: owner reads the cut list in the Report; then merge with the plan PR.
Written against: 59810a1
Template: quick

## What changes for you
`scripts/check-rules.sh` measures rule files in words (900 max each) instead of lines (70), and fails if a script has no comment on line 2. `process.md` drops from 1,257 words to under 900, and the "no process changes until 3 more tasks" rule becomes "before changing `process.md`, Claude checks the request against the current file for a clash or bloat and reports it first". I show you the before/after word count and every line cut before the commit.

## Scope
**Modify only:**
- `scripts/check-rules.sh`
- `docs/rules/process.md`

**Do NOT touch:**
- `contracts/`, config, secrets, other `docs/rules/*.md`, `docs/rules/covers.txt`, `docs/work/ledger/`, anything not listed above

## Rules
- Word cap: each `docs/rules/*.md` is counted with `wc -w`; over 900 prints `TOO LONG: <file> is N words (cap 900)` and fails. `AGENTS.md` keeps its 80-line cap.
- Header check: every `scripts/*.sh` must have a `#` comment on line 2; a script without one prints `NO HEADER: <file>` and fails. All scripts pass today (checked: none missing).
- Tightening keeps every concrete step, name, command and number; cuts only repetition and narration. No rewrite into an abstraction a model could misread. Model ids stay as they are (they move to `models.md` only in task B).
- Every rule id in `covers.txt` for `process.md` still has its rule present: `check-rules.sh` must show no UNCLAIMED or UNKNOWN line.
- The freeze rule (line 74) is replaced by the clash/bloat check; the "problem seen, change, how the owner will know, what it adds" proposal line stays.
- Line 81 is updated to say "each rules file ≤ 900 words".
- Planted test: a copy of a script with line 2 blanked makes the header check fail (run on a temp copy, not the repo).

## Acceptance checks
- Run: `bash scripts/check-rules.sh; echo $?` / Expected: `check-rules: OK` and `0`
- Run: `wc -w docs/rules/*.md` / Expected: every file under 900, `process.md` under 900 (was 1257)
- Run: `grep -n "3 more" docs/rules/process.md` / Expected: no output
- Run: `grep -n "clash" docs/rules/process.md` / Expected: one match in "Changing the process"
- Run: header test in a temp dir (script with blank line 2) / Expected: `NO HEADER` printed and exit 1
- Run: `git diff --stat` / Expected: only the two files above

## Owner checklist
- [ ] Read the before/after word count and the list of cut lines in my report → nothing you rely on is gone

## Questions
(none open)

## Report
Words: `process.md` 1257 -> 897 (cap 900). `bash scripts/check-rules.sh` -> `check-rules: OK`, exit 0. `grep "3 more"` -> no output; `grep clash` -> 1 match (line 68). Header check: 0 scripts lack a line-2 comment today; planted blank-line-2 case detected by the same `sed|grep` test inline (not run through the script itself).
Content cut (not just reworded), for owner review:
- Duplicated elsewhere: "Before swapping a tool or library..." (AGENTS.md); reviewer rules and "over ~8 files: too vague" (review.md); the report extras (executor.md step 2); "Deploy from the repo root" and the exact three-way wording (AGENTS.md); bug-first sentence (AGENTS.md Debugging).
- Dropped outright: "stay in one session for closely related work", "Claude designs and reviews... spot-check", "Output stays terse... scripts compute", "Keep narration short", "that replaces the old drift log", the Muse "clear on three briefs" anecdote (still in models.md), "Claude only runs the checks and reports", "A slice whose critique found nothing real is recorded as such", "trial 2026-10-04" and "from 2026-10-05" dates.
- Put back at owner request: "Verified claims get one line; list only what couldn't be confirmed" (now in `review.md`), "Owner-only to-dos live in the task file" (`process.md`).
- Also cut to make room: "Checkpoint commit, then report" (AGENTS.md), "`/next` says which step", wording of the missed.md line.
- Freeze rule replaced by the clash/bloat check (line 68).
Decisions the spec didn't settle: NONE.
