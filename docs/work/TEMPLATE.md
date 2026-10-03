# Task: <<short name>>

Status: active
Branch: <<branch name>>
Next: <<one line: the very next step>>
Written against: <<commit hash>>

## What changes for you
<<2-4 plain sentences: what you will see or be able to do after this. The owner approves this block.>>

## Scope
**Modify only:**
- `<<path>>`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above

## Size
Files touched: <<N>>. Expected diff: <<~lines>>. New tests: <<N, max about 10>>.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): <<none | list>>. Review level: <<0 | 1 | 2>>.

## Steps
- [ ] <<step, in order, one line each; tick as you go>>

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Put anything else in the owner checklist.)
- Run: `<<command>>` / Expected: <<exact output or footer line>>

## Owner checklist
- [ ] <<one action>> → <<one expected result>>

## Questions
(none open)

## Report
<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line
per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts,
anything noticed but not touched. Mark anything not run as `Not run`.>
