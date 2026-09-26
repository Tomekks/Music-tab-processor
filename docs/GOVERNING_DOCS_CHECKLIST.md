# Governing docs — manual audit checklist

Tiered by how essential each is. Tier 1-2 shape every task; Tier 3-6 are reference,
consulted by topic rather than read cover-to-cover. Written 2026-09-26 as a one-time
personal audit aid — a snapshot, not a maintained index (that's `docs/GUIDE.md`'s job).

## Tier 1 — Read these first, always (the actual rules)

| File | What it governs |
|---|---|
| `START_HERE.md` | The bootstrap — tells any AI/human what to read, in order |
| `AGENTS.md` | The hard rules: safety principles, engineering posture, where things live |
| `docs/GUIDE.md` | The map of every doc and what it's for |
| `docs/ARCHITECTURE.md` | How data actually flows through the system |
| `CONTEXT.md` | Design-system domain glossary (Brand, Main brand, etc.) |
| `CLAUDE.md` | Just an `@AGENTS.md` pointer, no separate content |

## Tier 2 — How work actually happens (process)

| File | What it governs |
|---|---|
| `docs/WEB_APP_WORKFLOW.md` | Index for all `app/` work — supersedes Superpowers for that scope |
| `docs/web-app-workflow/tiering.md` | Trivial/Bounded/Architectural classification + the tier-announcement rule |
| `docs/web-app-workflow/spec-template.md` | How a task spec is written |
| `docs/web-app-workflow/execution-loop.md` | The write→relay→implement→checkpoint loop |
| `docs/web-app-workflow/token-discipline.md` | Output hygiene, session-preference rules |
| `docs/DEVELOPMENT_PROCESS.md` | The full change process end to end, LIVE vs PLANNED table |
| `docs/DOCUMENTATION_PRINCIPLES.md` | Why the docs are structured the way they are (the rules behind the rules) |
| `docs/DRIFT_CHECK.md` | The periodic audit procedure |
| `docs/SESSION_HANDOFF.md` | Now just the 5-bullet quick checkpoint |

## Tier 3 — Why things are the way they are (read by topic, not cover-to-cover)

| File | What it governs |
|---|---|
| `docs/DECISIONS.md` | Index into the 10 files below |
| `docs/decisions/0001`–`0010` | Project scope, hosting, pipeline tools, backlog philosophy, display modes, stack/tooling, structure/methodology, safety principles, agent workflow tooling, brand-management architecture |

## Tier 4 — What's true right now (reference, open only when touching that area)

| File | What it governs |
|---|---|
| `app/STATUS.md` | Index into `app/status/*.md` |
| `app/status/*.md` (6 files) | home-page, deployment, design-system, engineering-practices, song-views, database-and-analytics |
| `pipeline/VERIFY.md` | Pipeline's current state + how to verify it |
| `pipeline/s01`–`s05/STATUS.md` | Each pipeline stage's own state |
| `docs/AUDIOPROCESSINGTOOLS.md` + `docs/audio-tools/*.md` | Tool research catalog per pipeline stage |

## Tier 5 — What's planned / being worked on

| File | What it governs |
|---|---|
| `docs/BACKLOG.md` | Ideas under consideration, triaged |
| `docs/PENDING_ACTIONS.md` | What only you (a human) can go do |
| `docs/plans/<slug>/` (12 folders) + `docs/plans/specs/` | Individual task plans and specs |

## Tier 6 — History, not rules (skim, don't study)

| File | What it governs |
|---|---|
| `docs/DRIFT_LOG.md` + `docs/DRIFT_LOG_archive.md` | Log of past audit runs |
| `docs/AGENT_TOOLING_LOG.md` | What's installed into the coding agent, when |
| `README.md` | Public-facing pitch, not internal governance |

**If you only have time for a real audit of a handful:** `AGENTS.md`, `docs/GUIDE.md`,
`docs/WEB_APP_WORKFLOW.md` + its 4 topic files, and `docs/DOCUMENTATION_PRINCIPLES.md`
are the ones that actually shape how every task gets done — everything in Tiers 3-6
is reference material you consult per-topic, not something to read straight through.
