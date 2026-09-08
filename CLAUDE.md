# For Claude Code (or any other coding agent starting cold here)

You have no memory of any prior conversation about this project — that's expected, not a problem. Everything you need to get oriented is in this repo. Read, in order:

1. `AGENTS.md` — the working rules and safety principles for any model making changes here. Read this first, always.
2. `docs/GUIDE.md` — what this project is and how its docs are organized.
3. `docs/ARCHITECTURE.md` — how data flows through the system (there's also a live diagram linked from there).
4. `docs/DECISIONS.md` — which tools were chosen and why, so you don't re-litigate settled choices without a real reason.

Current state (2026-09-08): past Phase 0. The full pipeline (`pipeline/s01_ingest` through `s05_publish`) and the hosted Next.js app (`app/`) are real, implemented, tested, and deployed live at https://app-six-psi-70.vercel.app. For the actual current status — what's done, what's open, what's next — read `pipeline/VERIFY.md` and each stage's own `STATUS.md`, not this file; this file only points you to where to look, deliberately, so it doesn't itself go stale the way this line just had to be corrected.
