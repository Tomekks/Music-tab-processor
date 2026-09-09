# Stack and tooling

Part of `docs/decisions/` — see `docs/DECISIONS.md` for the index and the reading policy.

## Stack: Next.js + TypeScript, and the reliability toolkit for cheap/free models

Several JavaScript frameworks would technically work for the eventual web app. Next.js's specific advantage here is that it's the most widely used React framework in existence — which matters because the actual implementation work is done by small, free/cheap coding-agent models (via OpenCode, with a cheap frontier model as fallback when a free one stalls). Those models have seen vastly more correct Next.js code in training than any less common alternative, meaning fewer hallucinated APIs and fewer subtly-wrong patterns. Next.js is also made by the same company as Vercel, minimizing friction for the free-tier hosting path planned for later.

TypeScript is part of the stack specifically as a reliability mechanism, not just convention — it's one piece of a broader answer to an explicit concern: the developer doesn't fully trust free/cheap models to produce correct output unsupervised, and wanted concrete things built in to catch mistakes rather than relying on manual review alone. The resulting toolkit, roughly in order of how cheap they are to set up versus how much they catch:

- **Type/schema checking at the module boundaries** (TypeScript on the app side, and the `contracts/*.schema.json` files checked as real, importable files rather than described only in comments or code) — the single highest-leverage item, because a model that violates the agreed data shape gets an immediate, automatic error instead of a silent bug discovered later by ear.
- **A test written alongside every task, not after** — ordinary unit tests where the logic is deterministic (guitar-logic modules), "golden file" comparisons against a known-good prior output where it isn't (ML pipeline stages), so a refactor that quietly breaks something is caught automatically.
- **Linting and formatting enforced automatically**, so output stays consistent regardless of which model or which day produced it.
- **A small CI check (GitHub Actions) running tests and linting on every commit** — an objective, always-on, boring signal that doesn't require reading every diff by hand.
- **Small, scoped commits/PRs per task** — makes it trivial to revert one bad chunk without losing everything around it, and keeps each unit of AI-generated work small enough to actually review.
- **An explicit, written "done when…" checklist in every task spec** (see `docs/specs/`) — most drift happens because a vague instruction left room to improvise; a concrete acceptance list closes that room.
- **Periodic "walk tests"** (see `AGENTS.md`) as a manual spot-check layered on top of all of the above, not a replacement for it.
