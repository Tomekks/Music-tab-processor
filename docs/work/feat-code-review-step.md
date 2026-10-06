# Task: Blind code review step (review-upgrade task B)

Status: active
Branch: docs/review-upgrade-plan
Next: owner approves "What changes for you"; then `/review` (Level 2, 8 answers); then Claude builds (script, test, docs edits, planted-flaw run).
Written against: 2d00bb4

## What changes for you
After a build passes `verify`, Claude runs `bash scripts/review-code.sh <task file>`. A cheap model that has not seen the builder's log reads the branch diff and the brief's checks and lists only real bugs or gaps (each with `file:line`). Claude reads the same diff first and writes its own bullets, then opens the cheap model's list. Both go in the task file under `## Code review` in the shared report shape (Found, Lessons, Folded in, Not folded in and why). A new "Code review" table in the scorecard counts what each caught. It runs for the first 5 tasks that get a scorecard row; then you decide: Level 1 and 2, Level 2 only, or drop it.

## Scope
**Modify only:**
- `scripts/review-code.sh` (new)
- `scripts/test-review-code.sh` (new)
- `docs/work/scorecard.md`
- `docs/rules/process.md`
- `docs/rules/models.md`
- `docs/rules/review.md`

**Do NOT touch:**
- `contracts/`, config, secrets, `scripts/review-second.sh`, `scripts/run-builder.sh`, `opencode.json`, anything not listed above

## Size
Files touched: 6. Expected diff: ~160 lines (script ~60, test ~60, docs ~40). New tests: ~9, all with a fake `opencode` (no model call).

## Risk
Triggers: shell (a new script that starts a model) and network (it sends the diff to the opencode-go model; same path and secrets rules as `review-second.sh`). Nothing is deleted. Review level: 2.

## Review
(Level 2: one line per question in docs/rules/review.md, with evidence. Not yet written: run `/review`.)

## Steps
- [ ] `scripts/review-code.sh <task-file> [--show]`, copied in shape from `scripts/review-second.sh`: same header block, same `opencode-go/` only and no `-free` check, same `env -i` run through `scripts/oc-run.sh`, same blind check, same exit codes (0 saved, 1 not blind or no answer, 2 refused, 3 model did not answer). Default model `opencode-go/deepseek-v4.1-flash#high`, override `REVIEW_MODEL` (backup Muse, named in the header like `review-second.sh`).
- [ ] Inputs: write `docs/work/runs/<name>.code-diff.patch` from `git diff master...HEAD` and `docs/work/runs/<name>.code-brief.md` holding only the task's `## Acceptance checks` section. Refuse (exit 2) if the diff is empty, or if the diff is over 3,000 lines (say so; the owner decides to split or skip).
- [ ] Prompt: read-only (`--agent plan`), read those two files and the repo files the diff touches; do not open anything under `docs/work/` except those two files and no `*.log`; flag only correctness or requirement gaps, each with `file:line` and a one-line failing case; no redesign, no style notes; "sound" in one line if nothing found; at most 8 findings. Answer saved to `docs/work/runs/<name>.code-review.log`; the script prints only the saved path, blindness and token/time, not the findings (`--show` prints them).
- [ ] Blind = the log shows no read of the real task file or of a builder log (`docs/work/runs/<name>.log`); otherwise print NOT BLIND, exit 1.
- [ ] `scripts/test-review-code.sh`: fake `opencode` like `test-review-second.sh`.
- [ ] `docs/work/scorecard.md`: add table "Code review (trial from 2026-10-06)" with columns Date, Task, Findings, Real, False, Fix rounds it caused, Owner-test bugs it missed, Tokens / time; one line above it with the keep/drop rule: keep if it caught 2+ real bugs that `verify` and Claude missed; drop if false findings outnumber real ones; decide after 5 rows.
- [ ] `docs/rules/models.md`: one row "Blind code reviewer": same model and backup as the second reviewer, read-only, fresh session. No model id appears anywhere else in `process.md` or `review.md`.
- [ ] `docs/rules/review.md`: add a "Code review" paragraph (under 80 words): input is the diff plus the acceptance checks, no builder log; Claude reads the diff itself and writes its bullets first, then opens the findings (this replaces the final-diff spot-check); report goes under `## Code review` in the shared report block.
- [ ] `docs/rules/process.md`: insert as step 5b after Check: "**Code review** (first 5 scorecard rows, then the owner decides): after `verify` passes, `bash scripts/review-code.sh <task file>`; see `docs/rules/review.md`." Cut the same number of words elsewhere in `process.md` so it stays at or under 900 (`bash scripts/check-rules.sh`). Each cut shown to the owner as in task C.
- [ ] Planted-flaw test: on a throwaway branch `chore/planted-flaw`, copy a small existing function, introduce one off-by-one, write a minimal task file whose acceptance check would pass anyway, run the script for real, and record in the scorecard whether it was caught. Revert: give the owner `git checkout docs/review-upgrade-plan && git branch -D chore/planted-flaw` (a delete needs the owner's yes).

## Acceptance checks
(Claude builds this one directly; no builder run, so these are run by Claude.)
- Run: `bash scripts/test-review-code.sh` / Expected: `test-review-code: PASS`
- Run: `bash scripts/check-rules.sh; echo $?` / Expected: `check-rules: OK` and `0` (header on line 2 of both new scripts, `process.md` at most 900 words)
- Run: `bash scripts/review-code.sh docs/work/feat-code-review-step.md; echo $?` on a branch with an empty diff against master / Expected: `2` and a message naming the empty diff
- Run: `grep -rn "deepseek\|muse" docs/rules/process.md docs/rules/review.md | grep -v "^docs/rules/process.md.*opencode-go"` / Expected: no model id added to either file by this task (the existing plan-critique and brief-critic ids in `process.md` stay as they are)
- Run: `git diff --stat master...HEAD -- scripts docs/rules docs/work/scorecard.md` / Expected: only the six files above plus the earlier tasks' files
- For logic: each rule below names its test (in `test-review-code.sh`):
  - non-empty diff and level any: exit 0, answer saved, findings not printed without `--show`
  - the saved prompt names the diff file and the brief file, not the task file
  - brief copy contains Acceptance checks and nothing else (no Review or Report text)
  - empty diff: exit 2, model not called
  - diff over 3,000 lines: exit 2, model not called
  - free-tier or non-`opencode-go/` model: exit 2
  - reviewer that reads the real task file or the builder log: exit 1, "NOT BLIND"
  - silent model: exit 3
  - no task file or no `## Acceptance checks`: exit 2

## Owner checklist
- [ ] Read the planted-flaw result in the scorecard → the table says caught or missed, with the line it flagged or the reason it did not
- [ ] Run the two delete commands Claude gives you for `chore/planted-flaw` → the branch is gone and you are back on `docs/review-upgrade-plan`

## Questions
(none open)

## Report
