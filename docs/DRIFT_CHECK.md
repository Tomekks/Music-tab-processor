# Drift check

A short, bounded procedure for catching drift — code, docs, or scope quietly diverging from what was actually decided — before it compounds. Not a rubber stamp: skip it when there's nothing to check, do it properly when there is.

**Restructured 2026-09-10:** tiered by cost, and split by domain (app vs. pipeline), matching the `contracts/` boundary those two sides already respect. The previous version ran everything, every time, including one genuinely expensive step regardless of whether it was needed. That step still exists — it's just no longer the default.

## Three layers already doing most of the work

Before reaching for this document:

- **CI** (`.github/workflows/ci.yml`, live since 2026-09-10) catches `app/` code-level regressions automatically, on every push, for free. This is why the checklist below no longer re-tests whether app code works — CI already does that, and re-checking it here would be paying for the same answer twice.
- **The "walk test"**, required at the end of every task per `AGENTS.md`: could someone with zero memory of this conversation open the folder just touched and understand it from its files alone? Catches per-task drift immediately, at the smallest scope.
- **Branch protection** (once adopted) makes CI's result binding, not just informational.

This document is for the layer above all three — periodic, wider checks that catch what a single task's walk test can't: drift that accumulates gradually across many small tasks, or that the agent who did the work wouldn't notice about its own output.

## When to run it

Not on a calendar. Run it at natural pause points: end of a phase, before starting a new pipeline stage, before the first push to a public remote, before anything gets hosted, or when resuming after a long gap.

## Who should run it

Preferably not the same session that did the work being checked — a fresh read has no accumulated rationalizations for shortcuts taken along the way.

## Tier 1 — Universal, always run (cheap, mechanical)

1. **Cold-discovery check.** Starting from nothing but "here's a repo, figure it out," can the checking agent find `START_HERE.md` and follow it unaided?
2. **Spot-check** one or two recent commits: did each do only what its message claims?
3. `git log` since the last check touching `AGENTS.md`'s hard rules (network exposure, system config, deletion) — was each flagged as such at the time?

## Tier 2 — App track (skip entirely if no `app/` work happened since the last check)

4. Do `app/status/*.md` files match what the git log actually shows was built? **Not** re-testing correctness — CI already covers that.
5. Anything in `docs/BACKLOG.md`'s app items now implemented without a recorded decision to un-backlog it?

## Tier 3 — Pipeline track (currently dormant — `pipeline/` is frozen pending a rewrite, so this tier has nothing to check until that starts)

6. Do `pipeline/*/STATUS.md` files match what's actually implemented?
7. Have any `contracts/*.schema.json` files changed without a corresponding explanation in `docs/DECISIONS.md`/`docs/decisions/*.md`?

## Tier 4 — Rare, opt-in only (expensive — never the default)

8. **Comprehension check.** Have the checking agent read the core docs fresh, then explain back, in its own words, what the project does, why, and what state it's in — compared against what's actually true. This is the single most expensive item in this whole document. Run it only when resuming after a genuinely long gap, or when explicitly requested — not as part of a routine check.

## Recording the result

Append a short entry to `docs/DRIFT_LOG.md` — date, what was checked, what (if anything) was found. A few lines, not a report. The value is noticing a pattern over time, not any single entry.
