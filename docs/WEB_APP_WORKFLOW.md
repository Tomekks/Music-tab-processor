# Web App Workflow

Governs all work in `app/` and any Turso schema change. Design rationale and the discussion
behind these choices: `docs/superpowers/specs/2026-09-19-web-app-workflow-design.md`.

This replaces the Superpowers-driven process in `AGENTS.md` for `app/` work specifically — the
pipeline (`pipeline/`, ML stages) keeps using that process unchanged. Every safety rule in
`AGENTS.md`'s "Safety & trust principles" (per-file edit approval, ask before every commit or
push, no credentials in chat, the three-way push/deploy question, etc.) still applies here in
full — nothing below loosens those.

## 1. Classify the task first

- **Trivial** — copy edit, one-line fix, a color/spacing tweak, a well-understood one-file
  change with no real ambiguity.
- **Bounded** — a well-scoped change to an existing flow: a new endpoint, a schema column, a
  fix to existing logic.
- **Architectural** — a new subsystem, or a restructuring that changes how components fit
  together.

When in doubt, pick the heavier tier.

## 2. What each tier does

**Trivial:**
- No spec file, no brainstorming.
- Write a 2-3 sentence instruction, relay it directly to the execution model (musespark via
  OpenCode).
- Done when: `npm run verify` passes, then make a checkpoint commit (§4).

**Bounded:**
- Write one spec file to `docs/specs/` using the template in §3.
- Run the execution loop in §5.

**Architectural:**
- `superpowers:brainstorming` → `superpowers:writing-plans` first.
- Each task in the resulting plan becomes its own spec file, then runs the execution loop in §5
  exactly like a Bounded task.

`systematic-debugging` and `requesting-code-review`/`receiving-code-review` remain available as
optional tools for any tier, not mandatory gates.

## 3. Spec template (Bounded and Architectural tasks)

Write the spec from reading the current code — not from building, running, or testing a
prototype of the change. An implementation the execution model hasn't produced yet doesn't need
Claude to have already built it once; that's the same work paid for twice. **The one exception is
a narrow, single-question spike**, and only when the question is genuinely unanswerable by
reading — an environment/runtime compatibility question ("does this package import under plain
Node ESM"), not a logic question ("is this merge function correct"). Scope a spike to answering
that one question, then stop; it does not turn into building the feature.

One markdown file per task in `docs/specs/`:

1. **Scope** — exact files, explicit `.env`/credential exclusion.
2. **Non-goals** — explicitly what not to touch.
3. **Interface** — signatures/types/contract. For a change that matches an existing sibling
   pattern already in the file (a new dispatch case shaped like existing ones, a new test
   following an established fixture format), point at the pattern and give the delta — don't
   embed a full verbatim code block. Reserve embedded code for logic with real correctness risk
   (an off-by-one, a subtle edge case, a genuinely new algorithm) where the wrong wording could
   produce a working-looking but wrong result.
4. **Bad-case behavior** — plain table of edge cases and required behavior. Include only if the
   task actually has edge cases worth naming.
5. **Forbidden patterns** — no bare `except`, no hardcoded fixture-specific values, no
   silently-swallowed errors, no touching credentials/`.env`.
6. **File allowlist** — the exact files this spec may touch.
7. **Acceptance criteria** — the runnable `npm run verify` command, plus any manual judgment
   question for the human that Claude couldn't resolve alone.
8. **Definition of done** — `npm run verify` passes + `git diff --stat` matches the file
   allowlist + manual check where relevant + **a self-check**: before reporting back, confirm
   every concrete claim the report makes (file list, test counts, any specific numbers) against
   what's actually on disk + checkpoint commit made.
9. **Stop-conditions** — explicit "if X happens, stop and ask, don't guess" list.

## 4. Checkpoint commits

Commit locally (not pushed) after every spec's `npm run verify` passes, before handing over the
next spec. This is still an ask-first commit per `AGENTS.md` — it just happens routinely, once
per completed sub-step, instead of only at the very end of a multi-spec task. Purpose: if the
execution model goes rogue mid-task, there's a recent working checkpoint to roll back to, not
just the state before the whole task started.

Push and deploy timing is unchanged from `AGENTS.md`: asked once, at the very end, as the
three-way push / push & deploy / skip question.

## 5. Execution loop (Bounded and Architectural tasks)

1. Claude writes one spec file to `docs/specs/`. **If the execution model drafts the spec itself
   instead** (e.g. turning a loose diagnosis into a spec directly, to save a round trip) — that
   draft is a proposal, not a final spec: relay it back to Claude for review before any
   implementation starts. Claude checks specifically for judgment calls or assumptions the model
   made silently, that weren't actually agreed on (e.g. picking a caching staleness policy that
   sounds reasonable but wasn't the one discussed) — the risk isn't the model being careless, it's
   that filling an unstated gap with a plausible-sounding default is invisible unless someone
   who wasn't the one filling it checks. Once Claude approves or amends it, proceed as normal.
2. You relay the (Claude-authored or Claude-approved) spec to the execution model by hand — no
   direct tool access from Claude's session to that tool, deliberately, so you stay the courier
   both directions.
3. **Before implementing, the execution model asks clarifying questions if anything in the spec
   is ambiguous** — a missing case, an unclear interface detail, a judgment call the spec didn't
   settle. It does not guess and proceed. You relay its questions back to Claude, Claude answers
   or amends the spec, you relay that back, and only then does it implement. Specs are still
   written to make this the exception, not the routine (per §3's template) — but when a genuine
   ambiguity exists, asking is the required path, not a fallback.
4. It implements, runs `npm run verify` itself, then **self-checks its own report against the
   actual diff and test output before sending it** (§3's Definition-of-done addition) — does the
   file list, the test count, and every concrete claim actually match what's on disk. Reports
   pass/fail, the diff, and that self-check.
5. You relay the result back to Claude.
6. **Claude's check is narrow, not a re-run.** Confirm the claimed file list against
   `git diff --stat`, spot-check one or two of the report's specific claims, confirm the verify
   command's own pass/fail line. Full independent re-verification — re-running the whole suite,
   rebuilding something to compare against — is reserved for a claim that looks internally
   inconsistent (contradicts itself, or contradicts a file Claude already has open), not the
   default. The execution model already did the hard verification work in step 4; Claude's job
   here is to catch a report that doesn't hold up, not to redo it.
7. **First failure, or a spot-check that doesn't hold up, stops the loop.** No second
   unsupervised attempt. Claude reads the failure and writes a fix-spec (diagnosis + narrowed
   instructions); back to step 2.
8. On pass: checkpoint commit (§4), then the next spec if the task has one, or step 9 if this
   was the last spec.
9. Manual staging check per `AGENTS.md`: `npm run stage`, look at it.
10. The existing three-way question from `AGENTS.md`: push to git? push & deploy? skip for now?

## 6. Not yet in place

- `npm run verify` itself (typecheck, lint, unit tests as one command) needs to exist before the
  first real Bounded task runs through this loop. Small, direct work — not routed through this
  workflow.
- Visual regression testing (screenshot comparisons via Playwright) is deferred. Once built, it
  slots into §3's Definition-of-done section as an added check — no rewrite of this document
  needed.

## 7. Token discipline

Three rules that keep per-task token cost down. They apply to both sides of the relay
(Claude-orchestrated and execution-model sessions) unless noted.

- **Output hygiene.** Prefer terse flags first (`pytest -q`, `git status --short`,
  `git diff --stat`, `tail` on build logs). Report "pass/fail + diff-stat," never paste raw
  logs into chat. Scripts compute; agents read results.
- **Session preference (soft rule).** Prefer a fresh session when the next task is unrelated
  to what's already loaded — stale context is re-billed every turn. Long-running *related*
  work may stay in one session; continuity (schemas, write models, backlog context carried
  across passes) is real value, not waste.
- **Handoff directive.** Any handoff note authored by hand keeps decisions and file paths,
  drops tool outputs. (No new mechanism — harness auto-compact already exists; this only
  governs what a human writes down.)
- **Division of labor.** Claude designs and reviews; the execution model builds. Claude doesn't
  implement, run, or test a prototype while writing a spec (§3) — that's the same work paid for
  twice once the execution model builds it for real. Claude's post-execution review is a
  spot-check, not an independent re-run (§5 step 6), because the execution model already
  self-checked before reporting (§5 step 4). Net effect: token cost shifts toward the execution
  model actually doing the work, and away from Claude re-deriving it.
