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
  exactly like a Bounded task. **Split a large task at a genuine seam** (e.g. testable logic vs.
  untestable UI, or a hard ordering dependency) — not by size alone. Splitting has real value
  (parallelizable, independently revertible, serializable across shared files) but each split
  fragment pays the full template weight and introduces its own seam-bug risk (an
  interface/ownership mismatch between fragments that didn't exist before the split, observed in
  practice). Split when there's a real boundary, not as a default reflex.

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

**Decide the tier first, as its own explicit line, before opening a single file to research.**
"Tier: S/Full, because ___." Write it, then hold to it. If research later turns up a real risk,
that risk becomes embedded risky-logic detail *inside* the tier already chosen — it does not
silently upgrade the whole spec to Full. A genuine escalation is a visible, named decision
("escalating S → Full because X"), not something that happens by drift mid-write. This exists
because it kept not happening otherwise: the tiering rule below is easy to satisfy into Full by
its letter ("cross-file") even for a small, fully-revertible change, once a real risk surfaces
during research and gravity pulls toward "well, better be thorough."

**What actually triggers Full, for this project specifically — not the generic rule.** This is a
single-owner hobby project: no external users, no production data at stake for design-system/
token/CSS/UI work. "Hard to revert" essentially never fires here — everything in that space is a
`git checkout` on the task's own allowlisted files, plus a rebuild, away from fully undone. So:
**Full tier is for a task that touches real user data (the song library, practice history, auth)
or a deploy. Everything else defaults to S, regardless of file count**, unless the diff genuinely
can't be undone by reverting the allowlisted files as a unit. A single-file helper + its own test
doesn't need all 9 sections below — Scope / File allowlist / Acceptance criteria is enough,
roughly 60 lines; multiple files touched for one small, fully-revertible UI/logic change (e.g.
extracting a pure helper + wiring it into one client component) still defaults to S — trim the
narrative sections, but embed any genuinely risky logic found during research exactly as Full
tier would (§ below governs what never gets cut, regardless of tier). Don't apply one template
weight to every task regardless of size (observed cost: a 268-line spec for ~30 lines of real
change, and separately a 3-file, three-real-risk UI task that got the full 9-section treatment
plus a full review round for what was, in the end, a ~40-line diff).

**Trimming means cutting narration, never cutting verification of genuine correctness risk.**
Cut: audit essays justifying a conclusion at paragraph length (a one-line scope statement is
enough — "only `Button.tsx` needs this, the other three don't, different pattern"),
pre-verification of things the execution model checks for free while implementing (does this
file/function/string still match, does this import resolve), full code embedded for logic with
no real risk. Never cut: a null-deref or crash path in embedded logic, a test assertion the new
code will break (e.g. an action-count check), a test fixture that can't actually exercise the
function being added, an entirely unaddressed scope question (e.g. "what happens on a child
brand"). Cutting the second kind is under-specifying a spec, not making it lean — a spec this
lean produced 4 real gaps in one round (a stale test assertion, an unusable fixture, a null-deref,
an unaddressed scope question) that only surfaced because the execution model hit them at
implementation time. Before handing off, run this checklist against your own spec: does every
order/count stated in prose match the file it's about; does every file the spec implies gets
created/modified actually get named in the allowlist; does every "verified"/"confirmed" claim
carry the command + output that verified it (next rule).

**No empirical claim without evidence.** Any "verified"/"confirmed" statement — in a spec, or in
the execution model's report (§5 step 4) — must carry the actual command and observed output next
to it. An unverified "verified" costs tokens on both sides (writing it, reading it, calibrating
trust to it) and is worse than silence when it turns out false — it was seen in this project's own
history: a spec claimed "fully verified end-to-end," and the file it described crashed with
`ENOENT` on first real run.

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
   question for the human that Claude couldn't resolve alone. **A check nobody running this loop
   can actually perform — a visual/eyeball judgment on colors, layout, animation — is not an
   execution-model acceptance criterion.** Write it as an explicit human checkbox instead (for
   `npm run stage`, §5 step 9), not folded into this section as if the execution model's own
   `npm run verify` self-check covers it; three specs in this project did this and all three
   ended up "flagged for human staging" anyway — write that outcome directly instead of routing
   through a criterion nothing can satisfy. Conversely, **don't write a manual step for something
   automation already proves** — a manual node one-liner re-confirming a golden test's exact claim
   is duplicate work dressed up as rigor, not extra safety; cut it instead of trimming prose
   elsewhere. **Any manual check that exercises a route/action which writes real state to disk
   (`tokens.json`, `active-brand.json`, anything the running `/design-system` editor can mutate)
   must include revert-and-rebuild as part of the check itself, not left implicit** — the write is
   real, not sandboxed, and the generated CSS it produces is gitignored, so a stale rebuild won't
   show up in `git diff` even after the source file is reverted (seen directly: a manual seed-
   generation check left `tokens.json` mutated, uncommitted, breaking 6 unrelated tests until
   `git checkout` + `npm run tokens:build` cleared it). Task 5b's spec got this right first;
   every later spec whose manual check touches a writing route repeats it, not just once.
8. **Definition of done** — `npm run verify` passes + `git diff --stat` matches the file
   allowlist + the human-checkbox manual check where relevant (per §7, not conflated with the
   self-check below) + **a self-check**: before reporting back, confirm every concrete claim the
   report makes (file list, test counts, any specific numbers) against what's actually on disk,
   each claim next to the command/output that confirmed it + checkpoint commit made.
9. **Stop-conditions** — explicit "if X happens, stop and ask, don't guess" list.

## 4. Checkpoint commits

Commit locally (not pushed) after every spec's `npm run verify` passes, before handing over the
next spec. Purpose: if the execution model goes rogue mid-task, there's a recent working
checkpoint to roll back to, not just the state before the whole task started. **Commit-and-report,
not ask-first**, for a task's own local checkpoint — this is what a single-task local commit is
for; ask-first is reserved for push/PR/multi-task actions (per `AGENTS.md`'s actual scope) and for
anything irreversible or spanning more than the one task just completed.

Push and deploy timing follows `AGENTS.md`'s three-way question (push / push & deploy / skip),
asked once at the end of the multi-task plan rather than per checkpoint — same exception as the
commit rule above, same reason: asking per task on an 11-task plan is pure overhead for a hobby
project with no other stakeholders.

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
   ambiguity exists, asking is the required path, not a fallback. **A full pre-implementation
   critique pass (the execution model reviewing the whole spec before touching code, distinct from
   a genuine clarifying question) is a Full-tier step by default — skip it for S-tier specs.** The
   round-trip it costs is exactly what tiering was meant to save; paying it on small tasks anyway
   defeats the point. An S-tier spec still gets a genuine clarifying question if something's
   actually blocking — it just doesn't get an unprompted full critique pass first.
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
9. Manual staging check per `AGENTS.md`: `npm run stage`, look at it — this is also where §3's
   human-checkbox manual checks (the ones no execution-model criterion could cover) get done.
10. The existing three-way question from `AGENTS.md`: push to git? push & deploy? skip for now?

**One review round per spec, then execution is the review.** Step 1's check (and any review a
second reviewer does before implementation starts) is the one pass a spec gets before it's
handed off. If a spec is reviewed again after that — by request, or by a different reviewer —
that pass must name what's actually new since the last one and skim for it, not re-audit from
scratch. In practice, findings from re-reading the same spec decay fast (first pass: structural,
significant issues; later passes: wording, a stale cross-reference) while findings from *running
things* during step 4 (a baseline test run, invoking a route directly, `git diff`) kept surfacing
real bugs no amount of re-reading caught. Budget tokens for the red-green-verify cycle in step 4,
not for additional reading passes before it.

## 5a. Keeping context small across a multi-spec plan

Round trips, not spec length, dominate token burn — every turn reloads full context on both
sides, so a long spec read once is cheaper than three short clarification rounds. These rules
target that: what actually travels each turn, and what accumulates in the repo over a long plan.

- **Relay packets, not whole documents.** Hand the execution model the spec file plus the plan's
  Tracks & sequencing section — not the full plan (design rationale, self-review, every other
  task's detail). It doesn't need 800 lines of context to implement one helper.
- **Single-source: the plan never repeats what a spec owns.** Every duplication found in this
  plan so far (a stale order list, a stale test count, a stale component reference) was plan-text
  paraphrasing spec-text going stale. Plan holds intent + track order + links to specs; specs hold
  the detail. A live plan document that only grows eventually goes unread — see [[keep-plan-docs-light]].
- **Archive a landed spec.** Once its checkpoint commit lands, stamp one line on it (commit hash,
  test delta) and move it to `docs/specs/_done/`. The next session then loads however many specs
  are actually active, not the full accumulated history — `docs/specs/` grows over a long plan if
  this isn't kept up.
- **Collapse a landed plan task to one line** once its spec is archived — `Task N: done (<commit>,
  +X tests)` — since the real detail already lives in the archived spec, not in the plan. Don't
  let the plan re-grow the detail it just shed.
- **Document a pattern once it's proven, instead of re-discovering it per spec.** Captured-output
  goldens (assert against real tool output, not hand-derived values) and direct handler invocation
  (import a route module and call it in plain Node instead of a dev server — no port conflicts, no
  disturbing a concurrent session) both proved out this session. Point future specs at this
  paragraph instead of re-deriving either technique from scratch.

## 6. Not yet in place

- Visual regression testing (screenshot comparisons via Playwright) is deferred. Once built, it
  slots into §3's Definition-of-done section as an added check — no rewrite of this document
  needed.

## 7. Token discipline

Four rules that keep per-task token cost down. They apply to both sides of the relay
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
