# Web App Workflow — Design

**Status:** approved in chat 2026-09-19, pending write-up as `docs/WEB_APP_WORKFLOW.md`.

## Problem

`AGENTS.md` mandates the full Superpowers ceremony (brainstorming → writing-plans → TDD →
subagent-driven-development) for all non-trivial work in this repo. That fits the ML pipeline
(`pipeline/`), but is too heavy for `app/` (Next.js/Turso) work executed by a less-capable model
(musespark via OpenCode) with no tool access of its own — it burns tokens on agentic-TDD ceremony
that doesn't pay for itself at hobby scale, and doesn't give the execution model the kind of narrow,
mechanically-checkable spec it actually needs to stay in scope.

Three source documents fed this design:
- `AGENTS.md` — the current, too-heavy default process, and its non-negotiable safety rules.
- `_architecture_playground/pipeline-plan.md` — a lighter spec/handoff process, written for the
  ML pipeline and an implementation model with no tool access. Reused here for its spec discipline.
- `_architecture_playground/HARDENING_PLAN.md` — enterprise-derived ideas for making a gate
  mechanically enforceable rather than relying on a model's self-report. Reused here for its
  file-allowlist / `git diff --stat` / stop-condition mechanisms.

## Scope

New file: `docs/WEB_APP_WORKFLOW.md`, governing all `app/` and Turso-schema work.
`AGENTS.md` gets a short routing line: working in `app/` → read `docs/WEB_APP_WORKFLOW.md`
instead of the Superpowers-driven process below it. The pipeline process in `AGENTS.md` is
untouched — this design doesn't change how `pipeline/` work happens.

Not in scope: HARDENING_PLAN's Phase 1 (`verify.sh`, `npm run verify`) and Phase 3 (Playwright
visual regression) infrastructure. Phase 1 is small bounded work done directly, before this
workflow's first real task. Phase 3 is deferred — specced and executed later, by the cheap
model, once someone decides to build it; the workflow references it as a gate that activates
automatically once it exists, without needing a rewrite.

## Superpowers' role in the new doc

Kept: `brainstorming` and `writing-plans`, for the **architectural** tier only (see Proportionality
below) — exactly the process used to design this document.

Dropped as mandatory for `app/` tasks: `test-driven-development`, `subagent-driven-development`,
and the "implementation follows TDD" rule. Replaced by the spec-and-verify loop below.

Kept as optional, not mandatory gates: `systematic-debugging`, `requesting-code-review`/
`receiving-code-review` — usable when a task's nature calls for them, not required by default.

All of `AGENTS.md`'s "Safety & trust principles" carry over unchanged and un-scoped-down:
per-file edit approval, ask-before-every-commit-or-push, no credentials in chat, no opening the
machine to the internet, the three-way push/deploy question. None of that is loosened by this
workflow — only the *planning and implementation* ceremony is.

## Proportionality tiers

Every `app/` task is classified into one of three tiers before any spec work starts. This
mirrors `AGENTS.md`'s existing single-task escape hatch and pipeline-plan.md's "a label tweak
doesn't need full review" principle, made explicit and three-way instead of binary:

1. **Trivial** — copy edit, one-line fix, a color/spacing tweak, a well-understood one-file change
   with no ambiguity. No spec file, no brainstorming. Claude writes a 2-3 sentence instruction,
   relayed directly to the execution model. Done-criteria: `npm run verify` passes + checkpoint
   commit (see below).
2. **Bounded** — a well-scoped change to an existing flow: a new endpoint, a schema column, a
   fix like the Spotify metadata issue. Full spec template (below), but skip sections that don't
   apply — e.g. no bad-case table for a change with no real edge cases.
3. **Architectural** — a new subsystem, a restructuring, anything that changes how components fit
   together. Full brainstorming → writing-plans process, then one spec per task from the plan,
   each going through the same execution loop as a Bounded task.

When in doubt, take the heavier tier — same ratchet rule as the brainstorming skill itself.

## The execution loop (Bounded and Architectural tasks)

1. Claude writes one spec file to `docs/specs/`.
2. You manually relay it to musespark/OpenCode (no direct tool access from this session to that
   tool — deliberate, keeps you in the loop both directions, per pipeline-plan.md's reasoning).
3. **Before implementing, the execution model asks clarifying questions if the spec is
   ambiguous** — a missing case, an unclear interface detail, a judgment call the spec didn't
   settle — rather than guessing and proceeding. Questions and answers relay through you, same
   as everything else; only settled specs get implemented. Specs are still written to minimize
   this (per the template below), but when genuine ambiguity exists, asking is required, not a
   fallback.
4. It implements, runs `npm run verify` itself, reports pass/fail + diff.
5. You relay the result back to Claude.
6. **First failure → stop.** No second unsupervised attempt — a deterministic TS/Python failure
   isn't a flaky-ML-output situation where a retry has better odds; it means the spec or the
   implementation needs a human/Claude look, not another blind try. Claude reads the failure and
   writes a fix-spec (diagnosis + narrowed instructions); back to step 2.
7. On pass: **checkpoint commit** — see below — then continue to the next spec (if any), or to
   step 8 if this was the task's last spec.
8. You do the existing `AGENTS.md` staging check (`npm run stage`, look at it) — unchanged, not
   duplicated by a new mechanism.
9. You're asked the existing three-way question (push / push & deploy / skip) — unchanged from
   `AGENTS.md`.

For Trivial tasks: steps 1 and 6-7 collapse — no spec file, no fix-spec ceremony on failure
(just fix directly and re-verify), but the checkpoint-commit step still applies once `verify`
passes.

## Checkpoint commits

Gap identified in review: without this, the only commit point was at the very end of a
multi-spec task, so a rogue model mid-task left no rollback point except "before the whole task
started." Fix: **commit locally (not pushed) after every spec's `verify` passes**, before the
next spec is handed over. This is still gated by `AGENTS.md`'s "ask before every commit" rule —
it just means that question is asked routinely, once per completed sub-step, rather than once at
the end. Push/deploy timing is unchanged: still asked once, at the very end, per `AGENTS.md`.

## Spec template (Bounded and Architectural tasks, one file per task in `docs/specs/`)

Merged from pipeline-plan.md's template + HARDENING_PLAN's anti-scope-creep mechanisms, with
ML-specific and self-report-only sections dropped:

1. **Scope** — exact files, explicit `.env`/credential exclusion.
2. **Non-goals** — explicitly what not to touch.
3. **Interface** — signatures/types/contract.
4. **Bad-case behavior** — plain table of edge cases and required behavior; included only where
   the task actually has edge cases worth naming, not by default.
5. **Forbidden patterns** — no bare `except`, no hardcoded fixture-specific values, no
   silently-swallowed errors, no touching credentials/`.env`.
6. **File allowlist** — the exact list of files this spec may touch. The instruction half of the
   anti-scope-creep check.
7. **Acceptance criteria** — runnable `npm run verify` command, plus any manual judgment question
   for you that Claude couldn't resolve alone.
8. **Definition of done** — `npm run verify` passes + `git diff --stat` matches the file
   allowlist (the *verification* half of the anti-scope-creep check — catches it even if the
   model ignores the allowlist instruction) + your manual check where relevant + checkpoint
   commit made.
9. **Stop-conditions** — explicit "if X happens, stop and ask, don't guess" list.

Dropped entirely from pipeline-plan.md's template: the attempt log and mechanical
attempt-count tracking (that machinery existed to catch self-report drift across *multiple*
unsupervised retries — moot now that the policy is stop-on-first-failure), and the ML-specific
bad-case taxonomy structure (kept only as a plain per-task table, not a project-wide taxonomy
document).

## Open follow-ups (not blocking this design)

- HARDENING_PLAN Phase 1 (`verify.sh`, `npm run verify`, Node pinning) needs to actually exist
  before the first real Bounded task runs through this loop — small, direct work, done before
  drafting `docs/WEB_APP_WORKFLOW.md`'s first real usage.
- HARDENING_PLAN Phase 3 (Playwright visual regression) is deferred — to be specced later,
  executed by the cheap model, folded into the Definition-of-done section once it exists.
- The Spotify "Shame" metadata-correctness fix (separate from the slow-switching fix already
  planned in `docs/plans/2026-09-18-spotify-lookup-at-publish-time/2026-09-18-spotify-lookup-at-publish-time.md`) is a
  candidate first Bounded task once this workflow is written up.
