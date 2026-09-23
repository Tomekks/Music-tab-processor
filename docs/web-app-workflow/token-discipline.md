# Token discipline (`docs/WEB_APP_WORKFLOW.md` §7)

Part of the `app/` workflow — see `docs/WEB_APP_WORKFLOW.md` for the index.

Four rules that keep per-task token cost down. They apply to both sides of the relay
(Claude-orchestrated and execution-model sessions) unless noted.

- **Output hygiene.** Prefer terse flags first (`pytest -q`, `git status --short`,
  `git diff --stat`, `tail` on build logs). Report "pass/fail + diff-stat," never paste raw
  logs into chat. Scripts compute; agents read results.
- **Session preference (soft rule).** Prefer a fresh session when the next task is unrelated
  to what's already loaded — stale context is re-billed every turn. Long-running *related*
  work may stay in one session; continuity (schemas, write models, backlog context carried
  across passes) is real value, not waste.
- **Handoff directive.** Any handoff note authored by hand keeps decisions and file paths,
  drops tool outputs. (No new mechanism — harness auto-compact already exists; this only
  governs what a human writes down.)
- **Division of labor.** Claude designs and reviews; the execution model builds. Claude doesn't
  implement, run, or test a prototype while writing a spec (`docs/web-app-workflow/spec-template.md`)
  — that's the same work paid for twice once the execution model builds it for real. Claude's
  post-execution review is a spot-check, not an independent re-run
  (`docs/web-app-workflow/execution-loop.md` §5 step 6), because the execution model already
  self-checked before reporting (§5 step 4). Net effect: token cost shifts toward the execution
  model actually doing the work, and away from Claude re-deriving it.
