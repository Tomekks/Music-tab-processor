# CodeScene audit procedure

The reusable "how" — `STATUS.md` in this folder is the "what happened last time." Read both; this one doesn't change often, that one does.

## Target for the next run

**~2026-09-18/19**, before the trial license expires **2026-09-21**. Pair with the next `docs/DRIFT_CHECK.md` full drift check — do this first, since its findings feed into "is the architecture drifting from principles."

## Setup (skip if already connected)

1. Confirm tools are live: search for `codescene` tools. If missing, reload the session (`.mcp.json` at repo root handles registration — `/plugin marketplace add` does not work in this desktop-app environment).
2. `verify_installation` with the repo path — confirms auth + connectivity before spending any calls on real analysis.
3. Token lives in `~/Library/Application Support/codehealth-mcp` via the server's own `set_config`/`login` tools — never in a repo file.

## Baseline pass (what we did this time)

1. List real source files per scope (skip `node_modules`, `.next`, `__pycache__`, generated files).
2. `code_health_score` per file — cheap, one number.
3. `code_health_review` on anything below 10 — gets the actual smell breakdown.
4. Triage every finding against `pipeline/*/STATUS.md`, `app/status/*.md`, and relevant `docs/decisions/*.md` **before** treating it as real — several "findings" turn out to already be documented, deliberate tradeoffs (see `publish.py`'s `_load_env` in the last run).

## What to try for more depth this time

- **Attempt real Cloud/API access** (hotspots, technical-debt goals) before the trial expires — this run was standalone-only (local Code Health scoring), which is why hotspots/ownership/tech-debt tools were unavailable. Worth checking if the trial unlocks them, since after expiry that option may close.
- **`analyze_change_set`** on the diff since the last audit's commit, instead of re-scanning every file cold — cheaper and shows what actually changed, not just a fresh snapshot.
- **`code_health_refactoring_business_case`** on any real finding before deciding fix-vs-backlog — turns "this looks complex" into an actual number.
- **Adopt `pre_commit_code_health_safeguard`** as an ongoing habit (see the stack-and-tooling.md proposal) rather than only running it as a periodic audit.

## Known quirks from last time

- Files scoring `null`/"Could not determine" (`FretboardDiagram.tsx`, `db/schema.ts`, `drizzle.config.ts`, `next.config.ts`) — not explained by file size. Worth a fresh look if it recurs; low priority otherwise.
- `mcp__codescene__*` and `mcp__plugin_codescene_codescene__*` both appeared as separate tool namespaces after setup — possible duplicate registration, harmless so far, not investigated.
- Standalone vs. Cloud account changes which tools are registered — a token change requires a session restart to take effect.

## Scope

Last run: `app/` + `pipeline/`. Not yet covered: `docs/backlog-board/index.html`, `research/` scripts. Worth deciding whether those are in scope going forward.
