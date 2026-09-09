# Guide

If you're an AI agent with no memory of this project, the real entry point is [`START_HERE.md`](../START_HERE.md) at the repo root, not this file — it will send you here next, among other places.

## The reading policy — read this part first

Several documents in this project are **indexes**, not the full content: `docs/DECISIONS.md`, `app/STATUS.md`, and `docs/AUDIOPROCESSINGTOOLS.md`. Each summarizes its topics in a couple of sentences and tells you exactly which file to open next if your task actually touches that topic. **Read the index in full; open a topic file only when the index tells you to.** This is deliberate, not an accident of growth — see `docs/DOCUMENTATION_PRINCIPLES.md` for the full reasoning and the standing rules that keep it this way.

Everything else in this project follows **the three homes** principle: *why* something was decided lives in `docs/decisions/`; *what's true right now* lives in `app/status/` or a pipeline stage's own `STATUS.md`; *exactly how something behaves or renders* lives in that component's own `RULES.md`. A single fact has exactly one correct home — if you're about to write down something you already wrote elsewhere, you're probably in the wrong file.

## The map

```
START_HERE.md              — the bootstrap: read this first, always
AGENTS.md                  — working rules, read in full (not an index)
CLAUDE.md                  — points Claude Code specifically at the above

docs/
  GUIDE.md                 — this file: how the docs are organized
  ARCHITECTURE.md          — what's actually built, how data flows (a diagram)
  BACKLOG.md               — ideas under consideration: dump, triage, prioritize
  backlog-board/            — local drag-and-drop board that generates BACKLOG.md; open index.html directly
  DECISIONS.md             — index → docs/decisions/
  decisions/
    hosting-and-deployment.md
    pipeline-tool-choices.md
    backlog-and-scope.md
    display-modes.md
    stack-and-tooling.md
    structure-and-methodology.md
    safety-principles.md
  AUDIOPROCESSINGTOOLS.md  — index → docs/audio-tools/
  audio-tools/
    separation.md
    transcription.md
    tab-generation.md
    ingestion.md
  DOCUMENTATION_PRINCIPLES.md — the standing rules this map itself follows
  DRIFT_CHECK.md            — the audit procedure (read in full, a checklist)
  DRIFT_LOG.md               — history of every audit run (skim the tail)
  SESSION_HANDOFF.md         — how to pause/switch AI sessions cleanly
  PENDING_ACTIONS.md         — what only a human can actually go do
  specs/                     — precise, mechanical task specs for AI agents

app/
  STATUS.md                 — index → app/status/
  status/
    deployment.md
    database-and-analytics.md
    song-views.md
    design-system.md
  components/*.RULES.md     — how a specific component renders (Fretboard, Sheet)

pipeline/
  VERIFY.md                 — pipeline-wide current state + handoff walkthrough
  sNN_stage/STATUS.md        — one per stage, what/reads/writes/status (small, not indexed)

research/00_spike/
  RESULTS.md                 — Phase 0 checkpoint history, public, no song content

contracts/
  *.schema.json               — the data-shape agreements between modules
```

## What each tier is for

- **`docs/` root files** — plain language, for a human keeping track of their own project, and for an AI orienting cold. What things do, why they exist, what's been decided and why.
- **`docs/decisions/`, `docs/audio-tools/`, `app/status/`** — the depth behind their index files. Open one only when your task actually touches that topic, per the reading policy above.
- **`docs/specs/`** — precise, mechanical task specifications for AI coding agents: exact inputs/outputs, file locations, and a concrete "done when" checklist. No room to improvise structure.
- **Component `RULES.md` files** — living, added-to-over-time rendering rules for one specific component, kept next to its code rather than in a central doc.

`docs/DECISIONS.md` (the index) plus this file plus `docs/ARCHITECTURE.md` should be enough for a coding agent starting cold to understand *why* things are the way they are; open the relevant `docs/decisions/*.md` file for the actual depth on any one topic. There is no separate "planning notes" document that this repo depends on being able to read — everything that matters was brought into the repo itself for exactly that reason.
