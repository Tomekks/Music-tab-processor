# Checkpoint commits and the execution loop (`docs/WEB_APP_WORKFLOW.md` §4–6)

Part of the `app/` workflow — see `docs/WEB_APP_WORKFLOW.md` for the index. Covers Bounded and
Architectural tasks whose spec already exists (`docs/web-app-workflow/spec-template.md`).

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

1. Claude writes one spec file (into the plan's own folder for an Architectural task, or
   `docs/plans/specs/` for a standalone Bounded task). **If the execution model drafts the spec itself
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
   written to make this the exception, not the routine (per the spec template) — but when a
   genuine ambiguity exists, asking is the required path, not a fallback. **A full
   pre-implementation critique pass (the execution model reviewing the whole spec before touching
   code, distinct from a genuine clarifying question) is a Full-tier step by default — skip it for
   S-tier specs.** The round-trip it costs is exactly what tiering was meant to save; paying it on
   small tasks anyway defeats the point. An S-tier spec still gets a genuine clarifying question if
   something's actually blocking — it just doesn't get an unprompted full critique pass first.
4. It implements, runs `npm run verify` itself, then **self-checks its own report against the
   actual diff and test output before sending it** (spec template's Definition-of-done addition) —
   does the file list, the test count, and every concrete claim actually match what's on disk.
   Reports pass/fail, the diff, and that self-check.

   **Report format — every claim paired with its own evidence, so Claude's check in step 6 stays
   a read, not a re-run.** This is the spec template's "no empirical claim without evidence" rule
   applied specifically to this report:
   - The full, unedited `git diff --stat` output — not a paraphrase.
   - The tail of `npm run verify`'s actual output (the pass/fail lines), not just "it passed."
   - Exact `file:line` for each change claimed, so it can be checked without re-reading the whole
     file.
   - Any test-count claim (e.g. "85/85 passing") quoted from the runner's own output line, not
     restated from memory.
   - An explicit "did not touch" list matching the file allowlist, not just what changed.
   - Confirmation the checkpoint is clean: no files changed on disk after the checks above ran —
     the exact failure mode behind a real, repeated incident in this project (things built and
     tested locally, never actually committed, "same root cause, four separate times" —
     `docs/DRIFT_LOG_archive.md`'s 2026-09-11 entry).
   - **Every claim tagged with how it was established** — `Observed` (directly inspected in the
     running app, browser, file, or command output), `Automated` (a passing test or probe), or
     `Inferred` (concluded from code structure, not directly exercised). Flattening these into one
     confident tone is itself a way to overclaim — a belief and a checked fact read identically
     unless the report says which one it is.
   - Any judgment call made instead of asking a clarifying question (step 3), named explicitly —
     not left implicit in the diff for Claude to notice on its own.
   - **A deviation from an explicit spec requirement, classified `BLOCKING` / `NON-BLOCKING` /
     `NONE`** — not folded into prose. `BLOCKING` means the loop stops (step 7) unless the spec is
     amended or Claude explicitly accepts it first.
   - **If any of the spec's own stated facts (a line number, a file's current shape, a count)
     turned out wrong once checked against the live codebase, say so as its own line** — distinct
     from a deviation. A wrong instruction and a wrong *fact the spec asserted* need different
     followup: a deviation needs a decision about the code; a stale spec fact needs the spec file
     itself corrected for the next reader, or it silently misleads again.
   - Confirmation the spec's stated file state was actually re-checked against the live codebase
     before implementing, not trusted from the spec's own description — required whenever a spec
     carries a stop-condition to that effect (per the spec template), and good practice otherwise.
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
8. On pass: checkpoint commit (§4 above), then the next spec if the task has one, or step 9 if
   this was the last spec.
9. Manual staging check per `AGENTS.md`: `npm run stage`, look at it — this is also where the spec
   template's human-checkbox manual checks (the ones no execution-model criterion could cover) get
   done.
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
- **Stamp a landed spec.** Once its checkpoint commit lands, stamp one line on it (commit hash,
  test delta) in place — specs already live inside their plan's own folder
  (`docs/plans/<plan-slug>/`), so there's no separate archive move anymore. The stamp is what tells
  the next session a spec is done without re-reading it in full.
- **Collapse a landed plan task to one line** once its spec is archived — `Task N: done (<commit>,
  +X tests)` — since the real detail already lives in the archived spec, not in the plan. Don't
  let the plan re-grow the detail it just shed.
- **Document a pattern once it's proven, instead of re-discovering it per spec.** Captured-output
  goldens (assert against real tool output, not hand-derived values) and direct handler invocation
  (import a route module and call it in plain Node instead of a dev server — no port conflicts, no
  disturbing a concurrent session) both proved out this session. Point future specs at this
  paragraph instead of re-deriving either technique from scratch.

## 6. Not yet in place

- Visual regression testing (screenshot comparisons via Playwright) stays deferred — the spec
  template's Playwright requirement is for interaction behavior, not pixel-level style.
- **Fixed:** `app/playwright.config.ts` now runs two `webServer`s — the original production build
  on `:3000` (project `app`, matches `e2e/*.spec.ts` at the top level) and a `next dev` instance on
  `:3002` (project `design-system`, matches `e2e/design-system/*.spec.ts`) for routes that 404
  under `NODE_ENV=production`. Verified working: `npx playwright test --project=design-system`
  against a throwaway smoke spec reached `/design-system` and passed.
  **Known caveat, not fixed further (disproportionate effort for a single-owner project):** Next.js
  refuses a second `next dev` in the same project directory even on a different port — if a manual
  `npm run dev` is already running when the `design-system` project starts, its `webServer` fails
  to boot. Stop any manual dev server before running `npm run test:e2e -- --project=design-system`.
