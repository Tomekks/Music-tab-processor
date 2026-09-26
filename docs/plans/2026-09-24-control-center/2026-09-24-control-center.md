# Control Center

**Status:** Grilling sessions 1–2 complete. Decisions and v1 scope below are locked — ready for a
`superpowers:writing-plans` pass to produce real, sized Tasks with specs (each in this same
folder, per the Architectural tier in `docs/web-app-workflow/tiering.md`) and a companion status
page in `docs/__PLANS/`. No code exists yet.

**Context:** Domain vocabulary lives in `CONTEXT-MAP.md` (root) → `Control_Centre/CONTEXT.md`
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
- SvelteKit + TypeScript. Single project — SvelteKit's own server-side routes (`+server.ts`/form
  actions) run shell commands locally. Dev port: SvelteKit's own default (5173) — no collision
  with `app/`'s 3000.
- Reuses `app/packages/design-system`'s token/CSS layer. The actual generated stylesheet lives at
  `app/app/design-tokens.generated.css` (inside the Next.js app, not the design-system package) —
  the existing generation script gets modified to also write a second copy into `/Control_Centre`
  at the same time it writes the first, so both projects always match with nothing manually
  synced.
- The 4 existing React design-system components (`Button`, `ColorField`, `SegmentedControl`,
  `Slider`) get thin Svelte equivalents — small, mechanical (they're thin wrappers around CSS
  variables, not React logic worth porting).
- Control Center gets its own Brand entry in the design system, as a child of `default` — inherits
  today's look automatically; actual tweaking deferred until real pages exist to preview against.

**Location**
- Control Center's own app code lives in `/Control_Centre` at the repo root (already exists,
  empty) — top-level, not nested under `app/`, so it can be extracted into its own repo later
  without restructuring. Its `CONTEXT.md` is already written there.
- Design System's own future home is `tools/` (alongside `tools/backlog-board`) — not moved yet,
  stays at `app/packages/design-system` until that move is actually done.

## v1 scope — four small, independently-buildable pieces

Order matters (easiest/lowest-stakes first, to learn SvelteKit before the real complexity):

1. **Shell/nav** — header + sidebar + module registry pattern. Bundled with the Design System nav
   link (one registry line + one `<a target="_blank">` to `app/app/design-system`, greyed out
   until the `app/` dev server responds to a real health check — not just "is a port listening,"
   since this repo has hit stale-server false positives on port checks before). Not worth its own
   task/spec — small enough to fold into this one.
2. **Pipeline controls** (native) — a "Start full pipeline" button (runs all 5 stages in
   sequence) plus a manual per-stage button, one run at a time (no parallel runs, a
   run-in-progress guard against double-clicks). Driven by a small hand-maintained
   `pipeline/manifest.json` (stage id, display label, exact run command, status-file path) — built
   because each stage's own `STATUS.md` documents its run command only as prose, which isn't safe
   to execute directly; kept in sync by hand, same discipline as `STATUS.md` itself. Real cancel/
   timeout handling is out of v1 — revisit if the run-in-progress guard turns out not to be enough
   in practice. Whether "run, then show the final log" is enough vs. needing live progress
   (polling vs. streaming) is a decision for that task's own spec, not settled here.
3. **Unit tests** (native) — live list of tests (name, ≤140-char description pulled from each
   test's own description string, file path) + a Run button + this session's pass/fail and
   duration. In-memory only — no persisted run-history/times-run counter in v1 (see "Deliberately
   shelved" below). Genuinely the most plumbing-heavy of the three despite looking simplest: needs
   to statically list tests separately from running them, then correlate results back.
4. **Design tokens sync** — modify the existing generation script to write its output to both
   `app/app/` and `/Control_Centre`.

**Control Center's own quality bar**: a handful of smoke tests (does each module route render,
does the command-safety layer reject anything not in its whitelist) — not full parity with
`app/`'s test culture, revisit if it grows.

## Deliberately shelved (not forgotten, just not v1)

- **Persisted test-run history** (times-run counter, duration trends, flaky-streak indicators):
  building this now means inventing a storage layer for data nothing currently tracks, for a
  hobby project, before the rest of Control Center even exists. Shelve until the four v1 pieces
  are done and it's still clearly missing in practice.
- **Tests-associated-with-active-plans view**: no existing convention links a test to the Plan/Task
  that added it (checked — no real pattern exists today). Skip for now; "how to see plans" needs
  its own brainstorm anyway (see below).

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
Manifest (`Control_Centre/CONTEXT.md`).

## Note

Produced via two `grilling` + `domain-modeling` sessions (2026-09-24, 2026-09-26). Next step:
`superpowers:writing-plans` to turn the v1 scope above into real, sized Tasks with specs — keep
each spec lean (this is four small, well-understood pieces; Architectural-tier ceremony shouldn't
outweigh their actual size).
