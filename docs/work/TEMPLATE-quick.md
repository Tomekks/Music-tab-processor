# Task: <<short name>>

Status: active
Branch: <<branch name>>
Next: <<one line: the very next step>>
Written against: <<commit hash>>
Template: quick

## What changes for you
<<one sentence: what you will see or be able to do. The owner approves it.>>

## Scope
**Modify only:**
- `<<path>>`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above

## Rules
- <<one behaviour per line; each gets a test that fails if that rule is broken>>

## Acceptance checks
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`

## Owner checklist
Launch (if it needs servers): free-port check, start and stop commands, one per code block. Then human checks only.
- [ ] <<one action>> → <<one expected result>>

## Questions
(none open)

## Report
