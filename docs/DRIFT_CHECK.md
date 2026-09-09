# Drift check

A short, bounded procedure for catching drift — code, docs, or scope quietly diverging from what was actually decided — before it compounds. Not a rubber stamp: skip it when there's nothing to check, do it properly when there is. As of this revision, it also verifies the thing this project actually depends on most: that `START_HERE.md` still works as a cold entry point for a model that has never seen this project before.

## Two cheaper layers already doing most of the work

Before reaching for this document, know that most drift should already be caught for free, continuously, by two things:

- **CI (lint + tests on every commit)** catches code-level regressions automatically. *(Not built yet as of this writing — worth prioritizing, since it's what makes the rest of this cheap.)*
- **The "walk test"**, required at the end of every task per `AGENTS.md`: could someone with zero memory of this conversation open the folder just touched and understand it from its files alone? This catches per-task drift immediately, at the smallest scope, by whoever just did the work.

This document is for the layer above both — periodic, wider checks that catch what a single task's walk test can't: drift that accumulates gradually across many small tasks, or that the agent who did the work wouldn't notice about its own output.

## When to run it

Not on a calendar — calendar-based cadence either fires when nothing happened (wasted effort) or misses a burst of real change (useless). Run it at natural pause points instead:

- End of a phase (e.g. end of Phase 0, before real pipeline code starts)
- Before starting a new pipeline stage
- Before the first push to a public GitHub remote
- Before anything gets hosted or made reachable from outside this machine
- When resuming after a long gap — exactly when memory of "why" has faded most

## Who should run it

Preferably not the same session that did the work being checked. A fresh read — no attachment to the work just produced, no accumulated rationalizations for shortcuts taken along the way — is far more likely to catch what the implementer normalized. In practice, the natural split here: Claude Code / OpenCode build; a fresh session (a new Claude Code conversation, or the planning conversation in Claude/Cowork) audits.

## The checklist

Keep it this short. Bounded scope — diff against what changed since the last check, not a full re-read of the codebase.

1. Check `git log` since the last check: does anything touch `AGENTS.md`'s hard rules (network exposure, system configuration, deletion) without having been flagged as such at the time?
2. Do `pipeline/*/STATUS.md` files still match what's actually implemented in those folders?
3. Have any `contracts/*.schema.json` files changed without a corresponding explanation added to `docs/DECISIONS.md` (or its linked `docs/decisions/*.md` files)?
4. Is anything now implemented that `docs/DECISIONS.md`/`docs/decisions/backlog-and-scope.md` explicitly lists as backlog, without a deliberate, recorded decision to un-backlog it?
5. **Cold-discovery check.** Starting from nothing but "here's a repo, figure it out" — no file paths, no hints — can the checking agent find `START_HERE.md` and follow it unaided? If not, the discovery chain itself is broken, and that's worth fixing before anything else here — it's the specific failure mode this whole project is trying to stay independent of any one AI model's built-in conventions against.
6. **Comprehension check.** Have the checking agent read `AGENTS.md`, `docs/GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/AUDIOPROCESSINGTOOLS.md` fresh — a real comprehension check means also opening whichever `docs/decisions/*.md`/`docs/audio-tools/*.md` topic files are relevant to recent work, not stopping at the two indexes — then explain back, in its own words, what the project currently does, why, and what state it's actually in. Compare that explanation against what's actually true. A mismatch **is** the drift signal; that's the point of asking for it.
7. Spot-check one or two recent commits: did each do only what its message claims, or did something extra slip in?

## Recording the result

Append a short entry to `docs/DRIFT_LOG.md` — date, what was checked, what (if anything) was found, what was done about it. A few lines, not a report. The value isn't any single entry; it's noticing a pattern over time. "Drift keeps happening around the same thing" is itself a useful signal that something structural needs fixing, not just the immediate instance.
