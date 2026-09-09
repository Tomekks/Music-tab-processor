# CodeScene MCP integration — status

Resumable tracking file. **Read this first if picking this up cold.** The audit scan itself is done (`app/` + `pipeline/`, 26 files) — what's left is entirely decisions, listed at the bottom.

## Setup (done)

- `.mcp.json` at repo root (untracked — no secret in it) registers the server via `npx @codescene/codehealth-mcp`. `/plugin marketplace add` did not work in this desktop-app environment; this manual path did, after a restart.
- Oddity, not investigated: both `mcp__codescene__*` and `mcp__plugin_codescene_codescene__*` tool namespaces appeared after the restart — possibly a duplicate registration. Hasn't caused a visible problem; worth a look if anything acts strange.
- Access token set via the server's own `set_config` tool (key `access_token`) — never written to any repo file, stored in `~/Library/Application Support/codehealth-mcp` by the server itself. Two tokens were pasted into chat before the working one was found (one wrong, one correct) — **both should be treated as exposed**; not yet added to `docs/PENDING_ACTIONS.md`.
- `verify_installation`: 4/4 pass. **This is a standalone license, not a full Cloud account** — hotspots, technical-debt goals, code ownership, and usage-overview tools are all unavailable and can't be turned on without upgrading the account. Only local Code Health analysis (`code_health_score`, `code_health_review`, etc.) works.

## Scan results — done, 26 files, all Green or perfect

**`app/` (17 files):** 13 perfect 10s. `lib/renderTab.ts`: 9.84 — `renderAsciiTab` has a Bumpy Road (2 nested-conditional bumps, lines 12–46). 3 files (`FretboardDiagram.tsx`, `db/schema.ts`, `drizzle.config.ts`, `next.config.ts`) returned `null`/"Could not determine" — a tool limitation (file size doesn't explain it), not a code-quality finding, not investigated further.

**`pipeline/` (9 files):** 5 perfect 10s. `ingest.py` 9.68 (`_probe_audio`, cc=10), `transcribe.py` 9.68 (`transcribe`, cc=10), `publish.py` 9.68 (`_load_env`, 2 complex conditionals), `tab_generate.py` **8.95**, lowest in the repo (`_render_ascii`: Bumpy Road + nesting at threshold + cc=9).

## Triage — done

- **`publish.py`'s `_load_env`** — dismissed. Already documented and deliberate: `s05_publish/STATUS.md` calls it "a minimal hand-rolled parser, not `python-dotenv` — avoided a new dependency for two lines."
- **`tab_generate.py`'s `_render_ascii`, `ingest.py`'s `_probe_audio`, `transcribe.py`'s `transcribe`** — real, new findings (checked against `pipeline/*/STATUS.md` and `docs/audio-tools/tab-generation.md`; none previously documented). Proposed as one `docs/BACKLOG.md` item — **not yet confirmed by the user, not yet added.**
- **`lib/renderTab.ts`'s `renderAsciiTab`** — also a real, new finding, same shape as the three above. **Left out of the proposed backlog item by mistake — fold it in when adding.**

## Decisions — resolved 2026-09-09

1. ~~Confirm the backlog item~~ — done, item #10 in `docs/BACKLOG.md` (4 functions, `renderTab.ts` included). Deliberately low priority, tied to the pipeline's own later audit.
2. ~~One-time or recurring?~~ — recurring. Next run targeted ~2026-09-18/19, before the trial expires 2026-09-21, paired with the next `docs/DRIFT_CHECK.md` full drift check. See `PROCEDURE.md`.
5. ~~Add token rotation to `docs/PENDING_ACTIONS.md`~~ — done.

## Decisions still open

3. **Pursue a full CodeScene Cloud account** (for hotspots/tech-debt costing) or stay standalone? Not decided. `PROCEDURE.md` flags trying this before the trial expires.
4. **Commit `.mcp.json`?** No secret in it, confirmed working — still not committed, your call.
6. **Adopt the proposed coding/architecture principles** (complexity ceiling, no Bumpy Roads, pre-commit Code Health gate, cost-before-fix) into `docs/decisions/stack-and-tooling.md`? Proposed in chat 2026-09-09, not yet written into the file — awaiting explicit confirmation.
