# Review (Level 2 questions)

Used when a task's Risk line says `Review level: 2`. Claude answers **all eight, once**, in the task file under
`## Review`: one line per question, each ending in evidence (a `file:line` or a command and its output). "None" counts
as an answer only with that evidence. More than about 8 files to look at: return "too vague". `/review` loads this
file; `scripts/delegate.sh` refuses to start the builder until `## Review` holds 8 answers (`scripts/check-review.sh`).

1. Does the spec serve the user story, and is anything in it not traceable to that story?
2. What existing behavior does it touch or break?
3. Is there existing code to reuse instead of writing new code?
4. What is the simplest version, and what could be cut?
5. Which cases are unspecified (empty, error, theme, viewport)?
6. Could any acceptance check pass even if the feature were broken?
7. What can't be undone (deletes, schema, `contracts/`), and what does it expose (network, shell, secrets, who can reach it)?
8. Which spec claim wasn't checked against the code, including what the builder is allowed to edit
   (the deny list in `.opencode/agents/builder.md`)?

Reviewers are read-only, flag only correctness or requirement gaps, never invent findings, and say "sound" in one
line when it is. Verify a review's claims against the code before acting on them.
