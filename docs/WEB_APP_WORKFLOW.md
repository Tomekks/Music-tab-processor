# Web App Workflow

**This file is an index, not the full workflow** — read this to get oriented and to know which
topic file to open; the details live in `docs/web-app-workflow/`. **This file must stay an
index.** New process rules go into the matching topic file (or a new one, following
`docs/DOCUMENTATION_PRINCIPLES.md`) — not appended here.

Governs all work in `app/` and any Turso schema change. Design rationale and the discussion
behind these choices: `docs/superpowers/specs/2026-09-19-web-app-workflow-design.md`.

This replaces the Superpowers-driven process in `AGENTS.md` for `app/` work specifically — the
pipeline (`pipeline/`, ML stages) keeps using that process unchanged. Every safety rule in
`AGENTS.md`'s "Safety & trust principles" (per-file edit approval, ask before every commit or
push, no credentials in chat, the three-way push/deploy question, etc.) still applies here in
full — nothing below loosens those.

## Topic index

**Task tiering (§1–2)** — Trivial / Bounded / Architectural, and what each tier actually requires
(spec or not, brainstorming or not, plan + status page for Architectural work). When in doubt,
pick the heavier tier. *Open if your task touches: deciding how much process a new `app/` change
needs.* → `docs/web-app-workflow/tiering.md`

**Spec template (§3)** — the required sections for a Bounded/Architectural spec (user story
through stop-conditions), the S/Full tiering rule specific to this project (Full is for real user
data or a deploy — everything else defaults to S regardless of file count), what's safe to trim
vs. never cut, and the "no empirical claim without evidence" rule. *Open if your task touches:
writing a spec file in `docs/plans/`.* → `docs/web-app-workflow/spec-template.md`

**Checkpoint commits and the execution loop (§4–6)** — checkpoint-commit timing (commit-and-report,
not ask-first), the full spec-relay loop (write → relay → clarify → implement → self-check →
report → Claude's narrow spot-check → checkpoint → stage → the three-way push question), the
report-format evidence rules, keeping context small across a multi-spec plan, and known
`app/e2e/` `webServer` caveats. *Open if your task touches: relaying a spec to the execution
model, reviewing its report, or running `app/e2e/` tests.* → `docs/web-app-workflow/execution-loop.md`

**Token discipline (§7)** — output hygiene, session-freshness preference, handoff-note rules, and
the Claude/execution-model division of labor (Claude designs and reviews, the execution model
builds). *Open if your task touches: keeping a multi-spec plan or long session's token cost
down.* → `docs/web-app-workflow/token-discipline.md`
