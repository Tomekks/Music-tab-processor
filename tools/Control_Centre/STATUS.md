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

**Reads:** `pipeline/` (via `PIPELINE_ROOT` in `src/lib/server/config.ts`): `pipeline/manifest.json` (the command whitelist), `pipeline_runs/*/metadata.json` (read only, plus folder listing) and `pipeline_runs/*/tab.json` (read only, for the tab preview, only when step 4 is done and current).
**Writes:** its own gitignored `data/` (one execution slot per stage: state, log, exit code, `records.jsonl`, `picked.json`); new run folders under `pipeline_runs/` via the single whitelisted `s01_ingest` command. Known limit: `s01_ingest` hard-codes its output to `<repo>/pipeline_runs/`, so `CC_PIPELINE_ROOT` cannot redirect where runs are written until the pipeline changes.

**Status:** slice 2 done — ingest through the UI. `/audio` step 1 runs the manifest's `s01_ingest` as a detached process (log + pid + exit files in `data/`), with server-side Browse (`osascript`), append-only `records.jsonl` ("started"/"finished"), file-derived status, and 1 s polling. Fix (2026-09-29): Browse creates `data/` on first use, cancel matches macOS "cancelled" wording, dialog via System Events + hint. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-2-ingest.md`.

**Status:** slice 3a done — Start and status for steps 2–4 on the newest run. `pipeline/manifest.json` holds all four stages. The runner split `startStage` into `startAudioStage` (step 1, unchanged behaviour) and `startRunStage` (steps 2–4, `-- <runsDir>/<runId>` from a `resolveRunDir`-validated ID) over one private spawn; per-run status (`runStepStatus`) and gating (`canStart`: nothing live + previous step done) live in `runner.ts`; the slot-to-run link is the "started" record's `runId` (state file unchanged). Newest run via `listRuns`; one `?/startStage` action (`400 badStage`/`badRun`, `409` + reason); `StepRow` adds Interrupted and `Running · m:ss`; polling runs while any step is running. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-3a-steps.md`.

**Status:** slice 3a polish done. Manifest stages gained a `reveal` folder; `reveal.ts` (`resolveRevealDir` + `openInFinder`) backs a `?/reveal` action that runs `open` on the `resolveRunDir`-validated folder — the client sends only stage/run IDs. UI: **Show in Finder** per row, a title spinner while running, status-dot colours (`--status-done/failed/error` in `src/lib/status-colors.css`), removed the "log appears"/"Waiting…" text, and fixed the `Army— The` subtitle spacing bug. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-3a-polish.md`.

**Status:** slice 3b done — Stop for steps 2–4. Each manifest stage gained a `temp` list (`s02` `_demucs_raw`, `s03` `_basic_pitch_raw` + `_transcribe_input.wav`); `stop.ts` exports `isInsideRun` (structural: the entry stays inside the run folder) and `isSafeEntry` (that plus the protected names `metadata.json`/`source.*`, case-insensitive), checked at manifest load for `temp` and again at delete time for every `produces` and `temp` entry. `runner.ts` `stopStage` SIGTERMs the process group (`kill(-pid)`), judges death by group liveness (`groupAlive`, SIGKILL after 2 s), and only once the group is empty deletes that stage's own `produces` files newer than the execution's start plus its `temp` entries — never step 1, `source.*` or `metadata.json` — then writes a `stopped` finished record. `runStepStatus` gains `Stopped` (hollow dot); a `?/stopStage` action (`400`/`409`/`500`) plus a confirm dialog listing `stopPreview` backs a **Stop** button on a running row. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-3b-stop.md`.

**Status:** slice 3c done — previous-runs picker, Out of date, "Done (no record)". `runs.ts` gained `readRunSummary` (the audio page's former `readNewestRun`, generalised to any listed run ID) and `pickRun` (raw `?run=` → newest fallback with a `notFound` flag; IDs validated via `resolveRunDir`, never a client path). `runner.ts` `runStepStatus` returns `noRecord` (done with files but no finished record: a hand-made run) and `outOfDate` (a `requires` file newer than the oldest `produces` file, done steps only, no cascade); `overwriteGate` refuses a no-record re-run without `confirmed=1`, enforced server-side in `?/startStage` (`409 needsConfirmation`) and asked client-side via native `confirm()` listing the server-computed `overwritePreview`. Step 1 keeps its global status; after its Start succeeds the client navigates to `/audio`. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-3c-runs.md`.

**Status:** slice 4 done — tab preview. `src/lib/tab.ts` (pure, not under `$lib/server` because the browser component imports `pitchClassName`) exports `buildTabPreview` (first `PREVIEW_SECONDS = 30` of a run's `tab.json`: notes grouped by exact `startTimeSec`, sorted, file order kept, per-step `index`/`startTimeSec` retained for the later metronome; any bad `string`/`startTimeSec` → `null`). `+page.server.ts` reads `tab.json` in `load` only when the `s04_tab` step is `done && !outOfDate`, `console.error` + `null` on a read/parse failure, and returns `tabPreview`. `TabPreview.svelte` draws one scrollable SVG (thin e on top), `+page.svelte` renders it above step 1. Spec: `docs/plans/2026-09-24-control-center/control-center-slice-4-tab-preview.md`.

Verified on Node v26.3.1 only. **Accepted `npm audit` finding (2026-09-29):** 3 low, all one advisory (GHSA-pxg6-pf52-xh8x, `cookie` < 0.7.0, pulled in by `@sveltejs/kit`). Control Center sets and reads no cookies and binds to 127.0.0.1, so it is unreachable; never run `npm audit fix --force` (it proposes downgrading Kit to 0.0.30). Resolves with a Kit release that bumps `cookie`. Plan: `docs/plans/2026-09-24-control-center/`.
Spec: `docs/plans/2026-09-24-control-center/control-center-slice-1-shell.md`.
