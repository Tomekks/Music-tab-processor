# Control Center

A single-user, local-only admin web app (SvelteKit + TypeScript, `adapter-node`) that
gives button-driven control over this project's pipeline and tools. Localhost-only by
construction: dev/preview bind `127.0.0.1:5173`, production starts with
`HOST=127.0.0.1 PORT=5173`, and every request passes an Origin/Host guard
(`src/lib/server/origin.ts`). See `CONTEXT.md` for the domain vocabulary
(Native module / Integrated tool / Module registry / Manifest).

**Status:** slice 1 done — shell + scaffold. Header, grey sidebar ("Audio processing",
"Design System ↗" linking out to the `app/` dev server), empty `/audio` page, all in the
design system's live tokens (synced at build/dev time, never hand-copied). Pipeline
controls, logs and records arrive in slices 2+. Layout verified by eye on localhost (2026-09-29).

**Run it:** `npm run dev` → `http://localhost:5173` (runs `tokens` first via `predev`).
**Production:** `npm run build && npm run start` (binds `127.0.0.1:5173` only —
never a bare `node build`).
**Verify:** `npm run verify` (`svelte-check` + `node --test`).

**Reads:** `pipeline/` (via `PIPELINE_ROOT` in `src/lib/server/config.ts`): `pipeline/manifest.json` (the command whitelist) and `pipeline_runs/*/metadata.json` (read only, plus folder listing).
**Writes:** its own gitignored `data/` (one execution slot per stage: state, log, exit code, `records.jsonl`, `picked.json`); new run folders under `pipeline_runs/` via the single whitelisted `s01_ingest` command. Known limit: `s01_ingest` hard-codes its output to `<repo>/pipeline_runs/`, so `CC_PIPELINE_ROOT` cannot redirect where runs are written until the pipeline changes.

**Status:** slice 2 done — ingest through the UI. `/audio` step 1 runs the manifest's `s01_ingest` as a detached process (log + pid + exit files in `data/`), with server-side Browse (`osascript`), append-only `records.jsonl` ("started"/"finished"), file-derived status, and 1 s polling. Fix (2026-09-29): Browse creates `data/` on first use, cancel matches macOS "cancelled" wording, dialog via System Events + hint. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-2-ingest.md`.

Verified on Node v26.3.1 only. **Accepted `npm audit` finding (2026-09-29):** 3 low, all one advisory (GHSA-pxg6-pf52-xh8x, `cookie` < 0.7.0, pulled in by `@sveltejs/kit`). Control Center sets and reads no cookies and binds to 127.0.0.1, so it is unreachable; never run `npm audit fix --force` (it proposes downgrading Kit to 0.0.30). Resolves with a Kit release that bumps `cookie`. Plan: `docs/plans/2026-09-24-control-center/`.
Spec: `docs/plans/2026-09-24-control-center/control-center-slice-1-shell.md`.
