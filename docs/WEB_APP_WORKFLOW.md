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

One markdown file per task in `docs/specs/`:

1. **Scope** — exact files, explicit `.env`/credential exclusion.
2. **Non-goals** — explicitly what not to touch.
3. **Interface** — signatures/types/contract.
4. **Bad-case behavior** — plain table of edge cases and required behavior. Include only if the
   task actually has edge cases worth naming.
5. **Forbidden patterns** — no bare `except`, no hardcoded fixture-specific values, no
   silently-swallowed errors, no touching credentials/`.env`.
6. **File allowlist** — the exact files this spec may touch.
7. **Acceptance criteria** — the runnable `npm run verify` command, plus any manual judgment
   question for the human that Claude couldn't resolve alone.
8. **Definition of done** — `npm run verify` passes + `git diff --stat` matches the file
   allowlist + manual check where relevant + checkpoint commit made.
9. **Stop-conditions** — explicit "if X happens, stop and ask, don't guess" list.

## 4. Checkpoint commits

Commit locally (not pushed) after every spec's `npm run verify` passes, before handing over the
next spec. Purpose: if the execution model goes rogue mid-task, there's a recent working
checkpoint to roll back to, not just the state before the whole task started.

**Ask-first applies to the commit that closes out a task, not to intermediate steps within
verifying one.** Once a spec's acceptance criteria are independently confirmed (§5 step 4 —
re-running the checks yourself, not just trusting the execution model's report), commit and
report what was committed; don't pause to ask permission for that specific commit. This was
tightened 2026-09-19 after a session where "ask-first" was written but not actually being
followed in practice for these — the checkpoint commits are local-only and trivially reversible
(`git reset`/`git reflog`), so the friction of asking every time wasn't earning its keep. The
three-way push/deploy question below is unaffected — that one is still asked, every time.

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
4. It implements, runs `npm run verify` itself, reports pass/fail and the diff.
5. You relay the result back to Claude.
6. **First failure stops the loop.** No second unsupervised attempt. Claude reads the failure
   and writes a fix-spec (diagnosis + narrowed instructions); back to step 2.
7. On pass: checkpoint commit (§4), then the next spec if the task has one, or step 8 if this
   was the last spec.
8. Manual staging check per `AGENTS.md`: `npm run stage`, look at it.
9. The existing three-way question from `AGENTS.md`: push to git? push & deploy? skip for now?

## 6. Not yet in place

- `npm run verify` itself (typecheck, lint, unit tests as one command) needs to exist before the
  first real Bounded task runs through this loop. Small, direct work — not routed through this
  workflow.
- Visual regression testing (screenshot comparisons via Playwright) is deferred. Once built, it
  slots into §3's Definition-of-done section as an added check — no rewrite of this document
  needed.
