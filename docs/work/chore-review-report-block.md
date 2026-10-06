# Task: Shared report block in /review (review-upgrade task A)

Status: active
Branch: docs/review-upgrade-plan
Next: owner checks the Report block, then merge with the plan PR.
Written against: 8e5653c
Template: quick

## What changes for you
After `/review` you get its answers plus one short report block with the same four parts every review will use: found, lessons, **Folded in**, **Not folded in (and why)**.

## Scope
**Modify only:**
- `.claude/commands/review.md`
- `docs/rules/review.md`

**Do NOT touch:**
- `contracts/`, config, secrets, `scripts/`, `process.md`, `models.md`, `docs/work/scorecard.md`, anything not listed above

## Rules
- `review.md` (command): replace the closing "Report in 5 lines: ..." sentence with an instruction to write the shared report block under `## Review`, after the answers, and print the same block in chat. Keep the second-opinion comparison lesson as the "lessons" part. Keep the scorecard row instruction.
- `docs/rules/review.md`: add a "Report block" section (under 80 words) naming the four parts in order: Found, Lessons, **Folded in**, **Not folded in (and why)**. State that code review (task B) uses the same block under `## Code review`.
- Each of Folded in and Not folded in says "none" when empty; Not folded in always gives a reason.
- The report block adds no line that `check-review.sh` miscounts: it counts non-blank lines under `## Review` for Level 2 and needs at least 8, so extra lines are harmless. Confirm by running it.

## Acceptance checks
- Run: `bash scripts/check-rules.sh` / Expected: its only complaint is `process.md is 84 lines (cap 70)`, which already fails today and is task C's job; no other line
- Run: `grep -c "Not folded in" .claude/commands/review.md docs/rules/review.md` / Expected: each file at least 1
- Run: `bash scripts/check-review.sh docs/work/feat-ds-workbench-save-bar.md; echo $?` / Expected: `0`
- Run: `git diff --stat` / Expected: only the two files above

## Owner checklist
- [ ] Read the "Report block" section in `docs/rules/review.md` → four parts, in the order above, plain words

## Questions
(none open)

## Report
Done 2026-10-06. check-rules: only the process.md 84-line complaint; grep counts 1 and 1; check-review exit 0; diff touches only the two files.
