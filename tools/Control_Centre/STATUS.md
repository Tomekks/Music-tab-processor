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
controls, logs and records arrive in slices 2+.

**Run it:** `npm run dev` → `http://localhost:5173` (runs `tokens` first via `predev`).
**Production:** `npm run build && npm run start` (binds `127.0.0.1:5173` only —
never a bare `node build`).
**Verify:** `npm run verify` (`svelte-check` + `node --test`).

**Reads:** `pipeline/` (later slices, via `PIPELINE_ROOT` in `src/lib/server/config.ts`).
**Writes:** nothing outside its own gitignored `data/` (later slices).

Verified on Node v26.3.1 only. Plan: `docs/plans/2026-09-24-control-center/`.
Spec: `docs/plans/2026-09-24-control-center/control-center-slice-1-shell.md`.
