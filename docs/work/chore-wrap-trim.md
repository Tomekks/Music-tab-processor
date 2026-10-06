# Task: /wrap trim (review-upgrade task D)

Status: active
Branch: docs/review-upgrade-plan
Next: owner approves this brief; then edit `wrap.md`.
Written against: d89668f
Template: quick

## What changes for you
`/wrap` ends with one block, "Needs you before you close", listing only what you must do (each command in its own bash block), or "Nothing needed. Safe to close." Usage recording happens silently and is mentioned only if it fails. Task-file compaction runs only when you ask.

## Scope
**Modify only:**
- `.claude/commands/wrap.md`

**Do NOT touch:**
- `contracts/`, config, secrets, `scripts/` (including `compact-task.sh`), other commands, anything not listed above

## Rules
- Step 9 (compaction) becomes "only if the owner asks"; the command and its read-the-diff safeguard stay. Checked: nothing except `wrap.md` mentions the 60-line size (grep of `scripts`, `.claude`, `docs/rules`, `AGENTS.md`, templates).
- Step 10 (usage) keeps `get_usage` and both `measure.sh` calls but says: do not print them; report only if a call fails. The total line still goes in `Next:` or the Report.
- Steps 13-14 become: ideas list as today; then the final block "Needs you before you close": open PRs waiting on you, delete-candidates (exact commands, one per bash block), unrelated uncommitted files, ideas awaiting a yes. If none: "Nothing needed. Safe to close." Keep the "explain simpler" count as one short line.
- Kept unchanged: sweep (1-4), task-file steps 5-8, 11-12, "Never push".
- Word count of `wrap.md` before (537) and after is reported.

## Acceptance checks
- Run: `wc -w .claude/commands/wrap.md` / Expected: at most 537
- Run: `grep -c "Needs you before you close" .claude/commands/wrap.md` / Expected: 1
- Run: `grep -c "Safe to close" .claude/commands/wrap.md` / Expected: 1
- Run: `grep -n "Never push" .claude/commands/wrap.md` / Expected: still present
- Run: `git diff --stat` / Expected: only `wrap.md` (plus this task file)

## Owner checklist
- [ ] Next time you run `/wrap`, it ends with the "Needs you before you close" block and shows no usage numbers

## Questions
(none open)

## Report
