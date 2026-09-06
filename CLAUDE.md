# For Claude Code (or any other coding agent starting cold here)

You have no memory of any prior conversation about this project — that's expected, not a problem. Everything you need to get oriented is in this repo. Read, in order:

1. `AGENTS.md` — the working rules and safety principles for any model making changes here. Read this first, always.
2. `docs/GUIDE.md` — what this project is and how its docs are organized.
3. `docs/ARCHITECTURE.md` — how data flows through the system (there's also a live diagram linked from there).
4. `docs/DECISIONS.md` — which tools were chosen and why, so you don't re-litigate settled choices without a real reason.

Current state: Phase 0 (`research/00_spike/`) — proving the core audio pipeline works before any real app or pipeline code exists. Nothing under `pipeline/` is implemented yet; each stage's `STATUS.md` says so.
