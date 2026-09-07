# Guide

This project has two tiers of documentation, on purpose:

- **This tier** (`docs/GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/AUDIOPROCESSINGTOOLS.md`, `docs/DRIFT_CHECK.md`, `docs/DRIFT_LOG.md`) — plain language, for a human keeping track of their own project. What things do, why they exist, what's been decided and why.
- **`docs/specs/`** — precise, mechanical task specifications for AI coding agents: exact inputs/outputs, file locations, and a concrete "done when" checklist. No room to improvise structure.

Start with `docs/ARCHITECTURE.md` for the big picture, then `docs/DECISIONS.md` for the full reasoning behind why specific tools and approaches were chosen over the alternatives — not just the conclusion, the actual "why," written to stand on its own. `docs/AUDIOPROCESSINGTOOLS.md` is different: it's a living catalog of every tool found for each pipeline stage — tried or not, with pros/cons — kept so a research pass never starts from zero.

`docs/DECISIONS.md` is meant to be self-contained: if you're a coding agent (Claude Code, OpenCode, or anything else) starting a session in this repo with no memory of how any of this was decided, that file plus this one and `docs/ARCHITECTURE.md` should be enough. There is no separate "planning notes" document that this repo depends on being able to read — everything that matters was brought into the repo itself for exactly that reason.
