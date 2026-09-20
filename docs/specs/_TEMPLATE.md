# Task spec: <name>

Target size: ~2,000 words max. Keep the §3 structure from `docs/WEB_APP_WORKFLOW.md`
(Scope, Non-goals, Interface, Bad-case table, Forbidden patterns, Allowlist, Acceptance,
Done, Stop-conditions) — but link sources instead of quoting them: point at the plan /
design-doc section, the live file + lines, the decision doc. Revision history and
decision tables go in the PR, not the spec. (Why: specs are read at least twice and
hand-carried through a human relay; the 2026-09 design-system specs ran 3,000–5,400
words, ~10× this template, and every pasted paragraph is re-read on each leg.)

## Goal
One sentence: what this task accomplishes.

## Reads
- Contract / file / API this task consumes, with exact shape (link to `contracts/*.schema.json` where relevant).

## Writes
- Contract / file this task produces, with exact shape.

## Constraints
- Anything from `AGENTS.md` especially relevant here.

## Done when
- [ ] Concrete, checkable condition 1
- [ ] Concrete, checkable condition 2
- [ ] A test exists and passes
- [ ] The relevant `STATUS.md` is updated
