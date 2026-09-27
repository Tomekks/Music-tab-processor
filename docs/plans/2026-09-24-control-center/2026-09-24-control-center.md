# Control Center

**Status:** Grilling sessions 1–3 complete. Decisions and v1 scope below are locked — ready for a
`superpowers:writing-plans` pass to produce real, sized Tasks with specs (each in this same
folder, per the Architectural tier in `docs/web-app-workflow/tiering.md`) and a companion status
page in `docs/__PLANS/`. No code exists yet. Session 3 (2026-09-26) closed out BLOCKING gaps an
execution-model critique found before spec-writing could start (scaffold ownership, manifest
schema, run guard, test scope, command whitelist) — see updated sections below. The health-check
gap was designed but then deliberately deferred (see "Deliberately shelved") rather than resolved
in v1.

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
`/grill-with-docs` session, and added a status-light scheme to item 3.
