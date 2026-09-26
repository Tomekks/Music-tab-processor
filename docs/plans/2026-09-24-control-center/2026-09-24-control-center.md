# Control Center

**Status:** DRAFT — grilling session 1 complete, more to come. This captures locked decisions and rough scope; nothing below is speced yet, so treat task sizes/boundaries as provisional, not execution-ready.

**Context:** No dedicated `CONTEXT.md` for this domain yet — see "Open questions" below for the placement decision (new context vs. folding into the existing design-system-scoped root `CONTEXT.md`).

## Goal

A single-user, local admin web app that gives centralized, honest, beautiful control over this whole project — replacing "ask AI to run a terminal command" with real buttons — covering the audio processing pipeline, the web app's release workflow (dev/stage/PR/deploy), test coverage documentation, active plans, and a backlog. Built for a product designer, not an engineer: practical, transparent about what each action actually does, and structurally safe against irreversible mistakes.

## Decisions (grill session 1, locked)

**Scope & audience**
- Single-user, local-only tool. Not shared, not deployed anywhere itself.
- Every button gets a hover tooltip explaining what it does in plain language.

**Audio processing page**
- V1 shows the *current* 5-stage pipeline (`pipeline/s01`–`s05`) honestly — run/status/logs — reading pipeline structure from a small manifest rather than hardcoding tool names, so future changes to the manifest update the UI without a rewrite.
- No tool-swap UI in this plan. "Stage contracts" (defining the input/output shape each stage must satisfy so a tool is actually swappable) is real pipeline-architecture work, saved to the new backlog as a separate future effort — not scoped here.

**Web app / release workflow page**
- Buttons: launch dev server, launch stage server, kill dev, kill stage, commit (with a message text box), push, open PR, deploy to Vercel.
- Every button runs one fixed, predefined command with safely-passed arguments (e.g. commit message passed as a real argument, never interpolated into a shell string) — no free-form shell input anywhere in the tool.
- Commit/push only ever target the current working branch — never `master` directly.
- Merging into `master` has **no button** at all, on purpose — merges always happen manually in GitHub's own UI. This is the single biggest safety rail: nothing in this tool can change `master`.
- Push / PR / deploy require an explicit confirmation step before firing (dev/stage start/stop stay instant — low risk, easily reversed).
- Deploy stays enabled at all times, but shows an inline warning next to it if the current build hasn't been freshly verified via a stage run.

**Tech stack**
- SvelteKit + TypeScript. Single project — no separate backend language; SvelteKit's own server-side routes (`+server.ts`/form actions) run the shell commands locally.
- Reuses `app/packages/design-system`'s token/CSS layer directly — confirmed framework-agnostic (JSON tokens → Node build script → plain `.css`, no React dependency). The 4 existing React components (`Button`, `ColorField`, `SegmentedControl`, `Slider`) get thin Svelte equivalents as a small follow-up task; low-risk, mechanical port (they're thin wrappers around CSS variables).
- Control Center gets its own Brand entry in the design system, as a **child of `default`** — inherits today's look automatically; actual tweaking deferred until real pages exist to preview against.

**Unit tests page**
- Pulls the plain-language description shown per test straight from each test file's existing docstring/description block (can't drift from the code), paired with live pass/fail status (run the suite, don't just document it statically).

**Plans & backlog vocabulary** (also see "Domain vocabulary" below)
- Backlog rendered from Markdown inside the control center, replacing `docs/backlog-board` (flagged by the project owner as bloated/wasteful). The existing per-plan status pages (`docs/__PLANS/*-status.html` + `*-status.data.js`) are **not** touched by this plan — they stay as-is, linked/embedded rather than rebuilt.
- "Promote to Plan" button scaffolds a new Plan `.md` file from a backlog item's text.
- Clicking a Task shows its Spec content (`docs/specs/<task-slug>.md`) — matches the existing 1:1 Task↔Spec convention already used across this repo.

## Location

- The Control Center's own app code (and, once it exists, its own docs/CONTEXT.md) will live in `/Control_Centre` at the repo root — a top-level folder, not nested under `app/`, mirroring `app/packages/design-system`'s own stated future as an eventually-standalone, independently-consumed repo. Kept top-level now specifically so it can be extracted into its own repo later without restructuring. (The empty `Control_Centre/` directory already exists at the repo root.)
- This plan document itself follows the repo's existing plan convention and lives in `docs/superpowers/plans/`. Note: it was **not** placed literally at `docs/__PLANS/` — in this repo that folder currently holds only the companion *status pages* (`*-status.html` + `*-status.data.js`) for Architectural-tier plans, not the plan docs themselves (those live in `docs/superpowers/plans/`, e.g. `2026-09-23-design-system-brand-management.md`). Once this plan is out of draft and broken into real tasks, a companion status page can be added to `docs/__PLANS/` following that same convention — flag if the intent was actually to change where plan docs themselves live.

## Explicitly out of scope for this plan

- **Pipeline stage-contract / tool-swap architecture** — saved to the new backlog as separate future pipeline work, not this plan.
- **Finalizing the Control Center's visual brand values** — the brand entry is reserved (child of `default`) but not yet designed against real pages.
- **Merging PRs / touching `master`** — deliberately has no button anywhere in this tool.
- **Rebuilding the existing per-plan status pages or `docs/BACKLOG.md`/spec-template workflow** — only `docs/backlog-board` is being replaced.

## Rough scope (pages — not yet task-broken-down)

1. **Audio processing page** — pipeline stage status/run/logs, manifest-driven.
2. **Web app / release workflow page** — dev/stage/kill/commit/push/PR/deploy buttons, tooltips, confirmation + safety rails as above.
3. **Unit tests page** — per-test plain-language description (from docstrings) + live pass/fail.
4. **Plans page** — list of open Plans, drill into a Plan's Tasks, click a Task to view its Spec.
5. **Backlog page** — Markdown-driven idea list, replacing `docs/backlog-board`; "Promote to Plan" action.
6. **Cross-cutting**: Control Center brand setup (child of `default`), design-system component porting (4 components → Svelte), tooltip/help system, command-safety layer (fixed predefined commands only).

Each of these still needs its own task breakdown + specs before execution — this plan is scope-and-decisions only so far.

## Domain vocabulary settled this session

- **Backlog**: a pool of raw, unscheduled ideas, not yet committed to execution.
- **Plan**: a project currently being executed; several can be open at once. Matches the existing `docs/superpowers/plans/*.md` convention.
- **Task**: one unit of work inside a Plan, 1:1 with a **Spec** (`docs/specs/<task-slug>.md`).
- **Task status** (5 states, in order): `spec missing → ready (spec confirmed) → in progress → done`, with `not finished` as a side-branch off "in progress" (work started, then stopped before completion).
- **Stage contract** (not yet built, backlog item): the defined input/output shape a pipeline stage requires, which any tool plugged into that stage must satisfy to be safely swappable.

These aren't written into `CONTEXT.md` yet — see the first open question below.

## Open questions — carried to next grilling session

1. **CONTEXT.md placement**: the existing root `CONTEXT.md` is scoped to the design-system's Brand vocabulary. Backlog/Plan/Task/Spec/Stage-contract is a different domain. Split into a `CONTEXT-MAP.md` with separate context files, or fold into the existing root file?
2. **Page structure/navigation**: how the 5 pages relate — one shell app with nav, or fully route-based separation — and whether "modular feature" (each page replaceable independently) needs anything beyond SvelteKit's naturally-separable routes.
3. **PR button specifics**: what fields it needs (title, base branch, draft vs. ready, description source).
4. **Task breakdown**: turning the "Rough scope" section above into real, sized Tasks with Specs, per this repo's normal planning workflow.

## Note

This plan was produced via a `grilling` + `domain-modeling` session (2026-09-24), not yet a `writing-plans` pass — the next session should either continue grilling on the open questions above, or move to task breakdown once those are resolved.
