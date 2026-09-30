# Control Center

**Status (2026-09-30):** Slices 1 (shell), 2 (ingest), 3a (Start and status for steps 2–4, plus polish), 3b (Stop, Tier Full), 3c (run picker, Out of date, Done (no record)) and 4 (tab preview strip, plus a layout polish) are built, human-tested and merged (PRs #47–#51). Slice 5 (play the tab: notes sound at their real timing on the audio clock, a moving highlight, no loop, no tempo control yet) is built and human-checked (sound confirmed by the owner, 2026-09-30). The follow-ups from the owner's testing are all built, human-checked and pushed on `feat/control-center-slice-6b-step-rows` (head `c826d8b`, no PR yet): 6a (`-6a-runs.md` and fix: old-run fix, always-visible picker, Delete to Trash, step 1 per run), 6b (`-6b-step-rows.md` plus `-6b-fix.md`, `-6b-fix-2.md`, `-6b-fix-3.md`: button order, icons, log behaviour, the page following a new ingest, Browse errors as a toast, clearing the picked file), 6c (`-6c-full-start.md`: Full start ingests the picked file then chains steps 2 to 4 on the server; 147 tests after 6d) and 6d (`-6d-step-controls.md`: one control bar above the steps with Full start and Full continue, reasons on disabled buttons, run details under an info icon). The owner's real-song passes are done. Next: the quality grilling session, then quality measures and a publish gate (publishing stays out of Control Center until the pipeline can report output quality). Later: tempo control, a design audit of the Audio processing UI, and the deferred loose ends below. **Start with "Session 5"
below** — it defines the MVP (base goal: "I ran a real song through the pipeline from buttons,
without touching the terminal") and supersedes the v1 scope and Locked decisions above it wherever
they conflict; the sections before it are the longer-term shape, kept for history and for what
comes after the MVP.

**Where it stands / next:** specs and outcomes live beside this file: `control-center-slice-1-shell.md`, `-slice-2-ingest.md`, `-slice-3a-steps.md`, `-slice-3a-polish.md`, `-slice-3b-stop.md`, `-slice-3c-runs.md`, `-slice-4-tab-preview.md`, `-slice-4-polish.md`, `-slice-5-playback.md`, `-slice-6a-runs.md` (+ `-6a-fix.md`), `-slice-6b-step-rows.md` (+ `-6b-fix.md`, `-6b-fix-2.md`, `-6b-fix-3.md`), `-slice-6c-full-start.md`, `-slice-6d-step-controls.md` (each with an execution-outcome or Landed stamp where it has run). Next: the quality work (see the Status block). Open loose ends: the `docs/__PLANS/` companion status page (never created), design-system gaps (no semantic status colours or font-size tokens; Control Center uses `status-colors.css` as a workaround), widened ingest metadata (deferred), stage durations from real runs (recorded 2026-09-30 from the local `data/records.jsonl`, which stays gitignored): Ingestion about 0 s (0–1), Separation about 14 s (12–23), Transcription about 7 s (6–11), Tab about 4 s (4–19); a whole Full start run automatically end to end (two clean runs, no gaps between steps) took 31 and 39 s wall time, tool/model versions in records (deferred). Working method that has worked: brainstorm the shared decisions, write one spec per slice, get it critiqued by a second model and verify each claim against the code, hand it to the execution model with a prompt, verify its report independently, then a human check.

**Context:** Domain vocabulary lives in `CONTEXT-MAP.md` (root) → `tools/Control_Centre/CONTEXT.md`
(Native module / Integrated tool / Module registry / Manifest) and `docs/CONTEXT.md` (Backlog /
Plan / Task / Spec — this repo's pre-existing planning methodology, which Control Center
visualizes but doesn't own).

## Goal

A single-user, local admin web app that gives centralized, honest, beautiful control over this
whole project — replacing "ask AI to run a terminal command" with real buttons. Built for a
product designer, not an engineer, learning SvelteKit for the first time: **built slow, one small
piece at a time, with each architectural choice explained and checked against SvelteKit's own
docs/best practices** — deliberately not repeating how the deployed web app got built (fast,
chaotic). Practical, transparent about what each action actually does, structurally safe against
irreversible mistakes.

## What Control Center actually is (session 2 reframe)

Not a monolith that reimplements everything — a hub over things that are, or will be, built
separately:

- **Native module**: a capability with no UI anywhere else — Control Center *is* its interface
  (Pipeline controls, Unit tests, eventually Monitoring/Oversight/Publishing controls). Built as a
  self-contained SvelteKit route folder (own page, own components, own server-side command
  runner). Modules never reach into each other's internals.
- **Integrated tool**: something that already has its own working UI elsewhere (Design System
  today; `tools/backlog-board` once redeisgned). Control Center links out to it (new tab), it
  doesn't rebuild it.
- **Module registry**: one small shared list of which modules exist and their nav label/route.
  Adding a module = one new folder + one registry line. Removing = delete both. This is the whole
  answer to "modular, so I can add/remove/replace tools without breaking everything."
- **Standing rule for every module**: prefer reading from a source that already exists (git,
  `gh`/Vercel CLI, existing `STATUS.md`/pipeline files) over inventing new tracked/persisted
  state. Only build storage when nothing already provides the data.

## Locked decisions

**Scope & audience**
- Single-user, local-only, localhost-only — never internet-reachable (restates the repo's existing
  hard rule, `docs/decisions/0008-safety-principles.md`, for this app specifically).
- Every button gets a hover tooltip explaining what it does in plain language.
- Responsive/mobile support: cut entirely. Desktop-only, single user, same call already made for
  the design-system editor.

**Layout**
- Full-width header at top. Below it: a fixed left sidebar (~20% width, top-level nav between
  modules) and a right content area (~80%) that has its own sub-navigation for that module's
  internal sections. Mirrors the deployed app's `AppHeader`/`StudioShell` visual grammar —
  rebuilt from scratch in Svelte (can't import the React components directly), sharing only the
  design-system's CSS tokens.

**Tech stack**
- SvelteKit + TypeScript, scaffolded via `npm create svelte@latest` with the TS option. Single
  project — SvelteKit's own server-side routes (`+server.ts`, used as a real JSON API for
  pipeline/test runs — not form actions, which only suit a single progressive-enhancement button)
  run shell commands locally.
- **Adapter:** `adapter-node` explicit (not the default/auto adapter) — the app runs as an actual
  server process you start yourself, with the localhost-only bind hard-coded in its config, not
  left as "nobody will type the URL."
- **Dev port:** 5173, pinned with `strictPort: true` in `vite.config.ts` — a collision fails loudly
  instead of silently moving to 5174 and confusing which instance is live.
- Reuses `app/packages/design-system`'s token/CSS layer. The actual generated stylesheet lives at
  `app/app/design-tokens.generated.css` (inside the Next.js app, not the design-system package) —
  the existing generation script gets modified to also write a second copy into
  `tools/Control_Centre` at the same time it writes the first, so both projects always match with
  nothing manually synced. This sync is wired up as part of the initial scaffold (see v1 item 1),
  not a separate later task — the shell is built design-first, iterating on layout/components
  directly against the design system's live variables, so there's never a stale/manually-copied
  stylesheet to style against and then redo.
- The 5 existing React design-system components (`Button`, `IconButton`, `ColorField`,
  `SegmentedControl`, `Slider`) get thin Svelte equivalents. Note: `Button.tsx` and `IconButton.tsx`
  carry real logic (focus-ring, disabled-state, `stateOverlayClassName()` overlay handling) worth
  reading before assuming the port is purely mechanical — still small, but budget for it.
- Control Center gets its own Brand entry in the design system, as a child of `default` — inherits
  today's look automatically; actual tweaking deferred until real pages exist to preview against.

**Location**
- Control Center's own app code lives in `tools/Control_Centre` (moved here from the repo root
  since session 2 — supersedes that earlier "top-level `/Control_Centre`" decision) — alongside
  `tools/backlog-board`, so it can still be extracted into its own repo later without
  restructuring. Its `CONTEXT.md` is already written there.
- Design System's own future home is also `tools/` — not moved yet, stays at
  `app/packages/design-system` until that move is actually done.

## v1 scope — three modules, five tracer-bullet slices total

> **Superseded in part by "Session 5" below** (MVP scope, execution model, safety). Read Session 5 first; this section is the longer-term shape.

Order matters (easiest/lowest-stakes first, to learn SvelteKit before the real complexity). Item 2
is itself split into three vertical slices (2a/2b/2c below) with explicit blocking edges, per
`to-tickets`-style slicing: each slice is a complete, independently demoable path through the
layers, not a layer-by-layer chunk. Every slice/item gets its own spec file (even item 1, which is
short) per the Architectural tier's one-task-one-spec rule. Each also needs a one-sentence user
story written during the `writing-plans` pass (e.g. "As the person running this project, I can
click one button to run the whole pipeline instead of typing five commands, so I stop making
copy-paste mistakes on the run-dir path") — not written yet, just required.

1. **Shell/nav + scaffold + token sync** — project bootstrap (TS scaffold, `adapter-node`, port
   5173 pinned, localhost-only bind — see Tech stack) plus header + sidebar + module registry
   pattern, built design-first against the design system's live CSS variables (token sync wired up
   from the start, not bolted on later — see Tech stack). Bundled with the Design System nav link:
   one registry line + one plain `<a target="_blank">` to `app/app/design-system`, always enabled
   — no live health check in v1 (see "Deliberately shelved" below). Cheap interim mitigation
   instead: a static message next to the link ("opens in a new tab — make sure `app/`'s dev server
   is running"), so the dead-tab case at least has a hint instead of silent confusion.
2. **Pipeline controls** (native) — split into three tracer-bullet slices per
   `to-tickets`-style vertical slicing (each a complete, demoable path through the layers, each
   declaring what blocks it), rather than one task carrying all of it at once:
   - **2a — Single-stage run** (blocked by: nothing, can start right after item 1). One manual
     per-stage button, driven by `pipeline/manifest.json`:
       ```json
       {
         "stages": [
           { "id": "s01_ingest", "label": "1. Ingest",
             "command": ".venv/bin/python pipeline/s01_ingest/ingest.py",
             "argsFrom": "audioPath", "statusFile": "pipeline/s01_ingest/STATUS.md" },
           { "id": "s02_separate", "label": "2. Separate",
             "command": ".venv/bin/python pipeline/s02_separate/separate.py",
             "argsFrom": "runDir", "statusFile": "pipeline/s02_separate/STATUS.md" }
         ]
       }
       ```
       `argsFrom` is an enum (`audioPath` | `runDir`) the server switches on to build the final
       argv — never a free-form template string glued together, so each stage entry stays modular
       and independent (no shell-injection surface from string interpolation). s01 is the only
       stage that creates a run-dir (from raw audio input); the server threads its output path into
       s02–s05 as `runDir`. Kept in sync by hand, same discipline as `STATUS.md` itself.
       Includes log surfacing from the start (a demoable slice needs visible output): stdout+stderr
       captured into an in-memory buffer per run, shown as a final log after the stage finishes
       (not live streaming). A non-zero exit is just part of that same final log — no separate error
       UI.
   - **2b — Run guard + Reset button** (blocked by: 2a). A single in-memory server-side flag,
     scoped to the whole pipeline (blocks a manual per-stage click during any other run too, not
     just double-clicks on the same button). Records a start timestamp so the UI can show "running
     since HH:MM" instead of a bare spinner. Server restart clears it for free. Plus a manual
     **Reset** button for the stuck-run case a restart-only recovery doesn't cover — clears the
     flag without restarting the server. Real cancel/timeout handling is still out of v1; Reset
     plus visible start-time is the v1-level mitigation for a hung stage, not a substitute for real
     cancellation. **The Reset button's UX (e.g. what a user sees if they Reset while the process is
     genuinely still alive in the background, not actually hung) needs its own `/grill-with-docs`
     session before this slice gets specced — not decided here.**
   - **2c — Full pipeline chaining** (blocked by: 2b, not just 2a — chaining only becomes safe to
     build once the guard exists, since adding a second way to start a run is exactly the moment
     the double-run risk becomes live). A "Start full pipeline" button runs all 5 stages in
     sequence, stopping at the first non-zero exit, reusing 2a's manifest/log plumbing and 2b's
     guard.
   - A page reload mid-run re-fetches the buffer + running/idle status from the server (all three
     slices), so nothing already captured is lost across any of them.
3. **Unit tests** (native) — live list of tests (name, file path, description) + a Run button +
   this session's pass/fail and duration, with a **status light per test**: green = passed,
   orange = running, red = failed, grey = not yet run this session. **Scope: JS/TS only**
   (`node:test`) — Python/pytest tests under `pipeline/*/test_*.py` are explicitly deferred
   (different reporter format entirely; would double the plumbing on the item the plan already
   flags as the most plumbing-heavy). Correlation key: file path + exact test name string, matched
   against the `node:test` reporter output. Descriptions: use the test's own string literal as-is
   (checked — both `app/`'s and the design-system's `node:test` conventions already write
   descriptive "function: scenario" strings, comfortably under 140 chars). In-memory only — no
   persisted run-history/times-run counter in v1 (see "Deliberately shelved" below).

**Command-safety whitelist** (backs slices 2a/2c): one shared module,
`tools/Control_Centre/src/lib/server/command-safety.ts`, exporting a single
`assertAllowed(command, args)` every server route calls before touching `child_process`. For
pipeline commands, the whitelist *is* `manifest.json` — an exact match against a stage entry, no
separate list to keep in sync. For everything else (test-runner invocations), a small fixed list of
named, hardcoded commands. No freeform command ever reaches `child_process`.

**Control Center's own quality bar**: a handful of smoke tests (does each module route render,
does `assertAllowed` reject anything not in its whitelist), written with the same bare `node:test`
convention as `app/packages/design-system` (no Playwright/browser-driving — not needed for "does
this render," and avoids a second test-runner dependency). These smoke tests are picked up by item
3's own test-listing UI for free, since they use the same runner it already parses. Not full parity
with `app/`'s test culture — revisit if it grows.

## Session 5 (2026-09-28): base goal + MVP — supersedes the v1 scope above wherever they conflict

**Base goal (the finish line):** *"I ran a real song through the pipeline from buttons, without
touching the terminal."* The v1 scope above is the longer-term shape; the **MVP** below is the
narrowest slice that reaches this goal, then we add/iterate. User stories are written spec-by-spec
(one per slice, when that slice is specced). A wireframe comes before any Svelte code.

**MVP user story:** launch Control Center → open the Audio processing page, where every pipeline
step is visible → in step 1 "Ingestion", click **Browse**, pick an audio file in Finder →
artist/song info is shown → each step has its own **Start** button → results are saved so
per-step and whole-process analytics can be gathered to improve output quality.

### Locked decisions

- **No publish (s05) until the pipeline can report on its own output quality.** s05 is not in the
  manifest, so it is structurally unreachable from Control Center (the whitelist *is* the manifest).
- **Independent repo.** Control Center will connect to other systems, so it owns its own data. All
  external paths (`PIPELINE_ROOT`, venv, `data/`) live in **one config file**, the only place that
  knows where the pipeline lives. `manifest.json` stays in the pipeline repo, read via
  `PIPELINE_ROOT`.
- **Browse** = server-side native picker: the server runs a fixed, whitelisted
  `osascript -e 'POSIX path of (choose file …)'` and receives the absolute path. Handle: dialog
  opening behind the browser, and Cancel (= "no file chosen", not an error). File paths are passed
  after `--` so a name like `-foo.wav` is never read as an option.
- **Ingest metadata is widened:** file facts (size, codec, bitrate, bit depth), BPM estimate with
  confidence (librosa is already installed; expect half/double-tempo errors), key, loudness/
  clipping, leading/trailing silence, embedded tags. Whether it lives in s01 or a new "analyse"
  stage is decided at spec time. Artist/title are display-only in the MVP.
- **Manifest** (`pipeline/manifest.json`): per stage — id, label, exact command, `argsFrom`
  (`audioPath` | `runDir`), `requires` and `produces` file lists. Drops `statusFile`.
- **Step status comes from files on disk** and is *completeness-based*: done = every `produces`
  file exists **and** the last recorded exit code was 0 (a crashed stage leaving partial output
  must not read as done). A step re-run marks downstream steps **out of date** (timestamp compare).
- **Run execution is detached from the server.** Each stage is started as a detached process that
  writes its own log file and pid file (under Control Center's `data/`); the server only reads
  those files. This survives server restarts and dev hot-reload (no orphaned stage the server has
  forgotten), makes page-reload and server-restart persistence free, and makes live log tailing
  trivial. The run guard is *derived* ("is that pid alive?"), not an in-memory flag.
- **Stop button replaces Reset.** With a real pid, Stop kills the actual process; the old Reset
  ambiguity ("what if it's still alive?") disappears, so the Reset-UX grilling session is retired.
  **Stop also cleans up** (decided 2026-09-28): it kills the whole process group (stages spawn
  children such as ffmpeg), then deletes only that stage's own `produces` files inside that run's
  folder — never the source, `metadata.json`, or other stages' outputs. The manifest is therefore
  the deletion whitelist too. A confirm dialog lists exactly what will be removed. Caveat shown in
  that dialog: if the stopped execution was a *re-run*, the earlier good outputs may already be
  overwritten and cannot be restored (proper fix = per-attempt folders, post-MVP). A stopped
  ingest removes its run folder only if nothing else has been produced in it. Ends with a
  "stopped" finished-record.
- **Data location:** `tools/Control_Centre/data/` (gitignored), path set in the config file — it
  travels with the app when extracted; history lives on this machine only, so back it up.
- **Saved records:** one central append-only JSONL file in `data/`, one **"started"** record and one
  **"finished"** record per stage execution (so a server death mid-run still leaves a trace).
  Every record carries `schemaVersion`, ISO timestamps **with timezone**, run ID (never a path —
  see safety), stage, exit code, duration, log location, the stage's own summary (note count, etc.),
  and tool/model versions plus the interpreter used. Move to SQLite only when cross-run queries
  hurt. Rows for a run whose folder is gone show "run folder missing", not failure.
- **Safety:** (1) every mutating route rejects requests whose `Origin`/`Host` isn't the app's own —
  "localhost only" doesn't stop other browser tabs from POSTing to it; (2) the client sends a
  **run ID**, the server maps it to a folder inside `pipeline_runs/` — never a client-supplied
  path; (3) `assertAllowed` whitelist stays; (4) s01's result is read from a small result file
  (or `--json`), not by parsing the prose line `Ingested: <path>`.
- **Page reload keeps state.** Current run = newest folder in `pipeline_runs/`, with a dropdown of
  existing runs. Logs stay simple (plain log file; tail it).
- **Trimmed scope (was over-engineered for the MVP):** no module registry until a second module
  exists (SvelteKit folder routing + a plain nav array is enough); port only the design-system
  components the page actually uses; token sync via symlink/single import path while still in the
  same repo (a copy step only when the repo is extracted); specs kept to about a page each.
- **Quality measures are post-MVP.** Collect raw facts now, decide what "good" means from real
  data; the `/grill-with-docs` session on quality happens after the MVP.

### MVP slices (proposed, each demoable, each gets its own lean spec)

1. **Shell + scaffold + token sync** — SvelteKit/TS, `adapter-node`, port 5173 pinned,
   localhost bind, config file, header + sidebar with one module (Audio processing) + Design System
   link, Origin check middleware. Empty Audio processing page.
2. **Ingest through the UI (the tracer bullet)** — manifest, `assertAllowed`, detached runner
   (log + pid files), Browse → s01 → widened metadata shown, "started"/"finished" records written.
   Proves the whole stack on one step.
3. **Steps 2–4 (Start / Stop / status)** — manifest-driven, completeness-based status, out-of-date
   marking, run dropdown, reload/restart persistence, minimal per-step last-run info.

### Spec approach

Specs use the one project template, `docs/web-app-workflow/spec-template.md` (tightened
2026-09-28 with wording adapted from `shadcn/improve`). Proposed tiers: slice 1 = S, slice 2 = S (detached-process and Origin
logic embedded), 3a = S, **3b (Stop cleanup, deletes real files) = Full**, 3c = S; slice 3 is split
into 3a/3b/3c so each spec's Done criteria are a short list of commands. Open: Playwright vs.
`node:test` + human checkbox for UI behavior (recommended: `node:test` for server logic, human
checkbox for UI in the MVP, add Playwright when click-through behavior justifies it).

### Post-MVP (not forgotten)

- **Re-point a moved pipeline folder** from inside Control Center (config edit UI).
- **Backup solution for `data/`** (the run-history store lives only on this machine).
- **Attempts/branches per step:** several outputs per step, each downstream result remembering which
  upstream attempt it used, so you can compare (e.g. two separation models) or re-run only a tail.
  Needs the stages to write per-attempt folders — pipeline-side work, tied to the backlogged stage
  contract. In the MVP, out-of-date marking plus the saved summaries stand in for it.
- **Quality measures + analytics view**, then the `/grill-with-docs` session on "quality".
- **Re-evaluate the existing 13 pytest tests** (s01: 4, s02: 2, s03: 4, s04: 3) as a possible
  source of quality signal; judge fitness for purpose from their bodies (not yet read).
- Publish controls, full-pipeline chaining, Monitoring, Oversight, Unit tests module, editing
  artist/title, live cross-run dashboards, data backup/cleanup (run copies + stems exceed 100MB),
  stage timeouts.

**Superseded from the v1 scope above:** slices 2a/2b/2c (replaced by MVP slices 2–3), the Reset
button and in-memory run guard, `statusFile` in the manifest, the module registry, the Unit tests
module for the MVP, and the "full pipeline" button.

## Session 6 (2026-09-28): Audio processing page wireframe — layout decisions

Wireframe: `wireframes/audio-processing.wireframe.html` (+ `.json`; `-v1` is the discarded card
layout). Every node carries a `_component` tag (proposed Svelte name) and buttons a `_variant`.
Supersedes Session 5 where they conflict.

- **Layout:** header; grey-filled sidebar (Audio processing = primary button, Design System ↗ =
  secondary button); page title + subtitle naming the current run + "Previous runs ⌄" picker (newest
  run by default; chosen run lives in the URL, `?run=<id>`); tab preview; four plain step rows
  (no cards) separated by rules. Steps are 1–4; s05 excluded.
- **Step row:** title, status (glyph + text, body size), `Log ▸/▾`, **Show in Finder** (all four
  steps), Start/Stop in the same slot. Controls sit in fixed-width slots so columns align. One
  `StepRow` component serves all steps; step-specific extras (Browse, log panel) are slots.
- **Status states:** Done, Running, Out of date, Not started, Failed (red light; log auto-opens),
  Stopped, and Waiting (another stage is running — shown in the status text, Start disabled).
- **Machine-wide one stage at a time**, derived from live pids across all runs.
- **Browse only selects; Start runs.** The server remembers the pick (the client sends no path).
  Browse validates the file is audio and shows name, size and an artist/title guess from the
  filename; full metadata (length, BPM, key) appears after Start. Start on step 1 always creates a
  new run.
- **Tab preview** (built last in the MVP): rebuilt fresh in Svelte with the web app's `SheetDiagram`
  / `tabNotation.ts` as reference, not imported (keeps Control Center extractable). Reads the run's
  `tab.json`, first 30 s only, one horizontal scroll row of small chunked SVGs. Shows notes only when
  step 4 is Done and not out of date; otherwise empty string lines. Read-only, thin-e on top.
- **Show in Finder:** manifest gains a `reveal` target per stage; the client sends run ID + stage,
  never a path; POST + Origin check; `execFile('open', …)`, no shell.
- **Logs:** latest execution per step only, ~200 lines: exact command, tool versions/settings,
  warnings, errors; progress-bar noise filtered. The "last run" header is built from the JSONL
  record, not written into the log. Status and log update by ~1 s polling, paused when the tab is
  hidden.
- **Stop safety:** no folder split and **no changes to s01–s04 or their tests.** Safety comes from
  the manifest deletion whitelist plus a test that Stop never removes `source.*` or `metadata.json`.
  The original audio file is only ever copied, never touched.
- **Components:** atoms/molecules/organisms under `src/lib/components/`, data down via props, no
  fetching in components, all look-and-feel from design-system CSS variables (so a redesign edits
  tokens and a few atoms).
- **Slice order:** shell → ingest → steps 2–4 → tab preview (last).

## Session 7 (2026-09-29): slice 3 shared decisions (steps 2–4)

Decided together so 3a, 3b and 3c share one model; only 3a is specced now (later specs benefit from what 3a's real code teaches, as slice 2's spec-before-code defects showed).

- **Split:** 3a Start + status for steps 2–4, on the newest run, no picker (**Tier Full**: overwrites files in existing run folders, refactors the runner). 3b Stop: kills the process group and deletes only that stage's own `produces` files, guarded by a test that `source.*` and `metadata.json` are never removed (**Full**). 3c previous-runs picker (`?run=<id>`), Out of date marking (a step is out of date when a `requires` file is newer than its oldest `produces` file), reload/restart persistence across runs (S).
- **Per-run status (rule A):** a step is Done when all its `produces` files exist **and** the last "finished" record for that run and stage is `done`. A failed or interrupted record beats present files. No record at all with all files present = Done (runs made from the command line before Control Center; a distinct "Done (no record)" label waits for 3c, when old runs become reachable). The slot files (`<stage>.json/.log/.exit`) stay one per stage and describe the latest execution and are unchanged in 3a; the run ID lives in the records ("started" and "finished"), and the slot-to-run link is the "started" record for the slot's `execId`. Step 1's row keeps slice 2's global-slot status so a failed ingest (no run created) stays visible.
- **Run IDs:** the client sends a run ID; the server validates it (pattern, no `..`, member of `listRuns`, i.e. a direct child folder with a valid `metadata.json`) and builds the path. Never a client path.
- **Gating:** a step starts only if no stage is live and the previous step is Done for that run (the `requires` files are implied by that; they are used by 3c's Out of date rule).
- **Log:** no progress-bar filtering (the stage scripts capture tool output; it only appears on failure); Running rows show elapsed time, computed in the template from the 1 s poll (no separate timer), and a hint that the log appears when the step ends.
- **3b decisions (2026-09-29, spec: `control-center-slice-3b-stop.md`):** Stop only on steps 2–4 (not ingest: it would mean deleting a whole run folder for a one-second step). Stop deletes only files the stopped execution wrote (produces files with mtime at or after its start) plus the stage's `temp` entries (`_demucs_raw`, `_basic_pitch_raw`, `_transcribe_input.wav`), so earlier good outputs survive a stopped re-run; the manifest (`produces` + `temp`) is the deletion whitelist, with `metadata.json` and `source.*` protected. Kill = SIGTERM to the process group, SIGKILL after 2 s, delete only after the whole group is confirmed empty (group liveness, not the wrapper pid). The stopped record is written after the kill; if `reconcile` records `interrupted` first, the later `stopped` record wins because status uses the last record per run and stage (no marker file). Confirm = native browser dialog listing the server-computed file list.
- **Carry-forward risks:** 3b must handle `_demucs_raw/` left by a failed or killed separation. 3c must ask for confirmation before re-running a step on a "Done (no record)" run (those are hand-verified references).

## Deliberately shelved (not forgotten, just not v1)

- **Persisted test-run history** (times-run counter, duration trends, flaky-streak indicators):
  building this now means inventing a storage layer for data nothing currently tracks, for a
  hobby project, before the rest of Control Center even exists. Shelve until the v1 pieces
  are done and it's still clearly missing in practice.
- **Tests-associated-with-active-plans view**: no existing convention links a test to the Plan/Task
  that added it (checked — no real pattern exists today). Skip for now; "how to see plans" needs
  its own brainstorm anyway (see below).
- **Design System live health check + auto-launch**: a real `/api/health` route in `app/`, polled
  from Control Center to grey out the link when the dev server is down, plus a "Start dev server"
  action to remove the dead end entirely — designed in session 3 but pulled back out of v1. Skipped
  for now; the plain always-on link is enough to start with. Revisit once the initial version is
  built and a stale/dead link is a real annoyance in practice, not a hypothetical one.

## Explicitly out of scope for this plan

- **Pipeline stage-contract / tool-swap architecture** — separate future pipeline work, backlogged.
- **Finalizing the Control Center's visual brand values** — brand entry reserved, not yet designed
  against real pages.
- **Merging PRs / touching `master`** — deliberately has no button anywhere in this tool.
- **Publishing controls** (commit/push/PR/deploy) — whole native module deferred; git/deploy
  workflow explicitly left for later, not part of v1.
- **Monitoring** — needs its own dedicated brainstorm on what data actually belongs in a birds-eye
  view (you don't yet know which data you want there). When that session happens: start from
  existing sources (Vercel/GitHub CLI output, existing pipeline `STATUS.md` files) before
  inventing new tracked metrics, and keep the metric set easy to add/remove/change — it will churn
  until the right shape is found.
- **Oversight** (plans/backlog view) — needs its own dedicated brainstorm on "how to see plans."
  Its data-source-first principle applies here too.
- **`tools/backlog-board` redesign** — no longer serves its purpose (flagged 2026-09-26), needs a
  proper brainstorm before further investment. Marked deprecated in its own `STATUS.md`. Left
  tracked and public on GitHub as-is until the redesign happens — no files deleted, no repo
  visibility change.

## Domain vocabulary

See `CONTEXT-MAP.md` (root) for the full context split. Settled terms: Backlog, Plan, Task, Spec,
Task status, Stage contract (`docs/CONTEXT.md`); Native module, Integrated tool, Module registry,
Manifest (`tools/Control_Centre/CONTEXT.md`).

## Note

Produced via three `grilling` (+ `domain-modeling` for sessions 1–2) sessions (2026-09-24,
2026-09-26 ×2). Session 3 closed BLOCKING gaps an execution-model critique surfaced against the
locked plan — every factual claim in that critique was independently verified against the live
repo before being acted on. Next step: `superpowers:writing-plans` to turn the v1 scope above into
real, sized Tasks with specs — keep each spec lean (these are small, now well-specified pieces;
Architectural-tier ceremony shouldn't outweigh their actual size). Session 4 (2026-09-26) applied
`to-tickets`-style vertical slicing to item 2 (three blocked-by slices instead of one lump), added
an interim Design System link mitigation, flagged the Reset-button UX for its own
`/grill-with-docs` session, and added a status-light scheme to item 3. Session 5 (2026-09-28)
set the base goal and MVP, added the execution model (detached processes, Stop instead of Reset —
which retires that grilling session), central run records, safety fixes, and slice/tier splits;
the "Next step" above is superseded by the Status block at the top.
