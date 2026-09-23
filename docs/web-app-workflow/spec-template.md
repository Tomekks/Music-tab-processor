# Spec template (`docs/WEB_APP_WORKFLOW.md` §3)

Part of the `app/` workflow — see `docs/WEB_APP_WORKFLOW.md` for the index. Covers Bounded and
Architectural tasks (see `docs/web-app-workflow/tiering.md` for what triggers each tier).

**Before drafting Scope/Interface below, read the actual current files the task touches — don't
rely on `app/status/*.md` or a prior spec's description of them.** Those go stale (confirmed
2026-09-20: a spec was written for "add the Fretboard playhead" when it had already shipped
under different filenames, because the task was drafted from a stale status doc instead of the
live code).

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
the execution model's report (`docs/web-app-workflow/execution-loop.md` §5 step 4) — must carry
the actual command and observed output next to it. An unverified "verified" costs tokens on both
sides (writing it, reading it, calibrating trust to it) and is worse than silence when it turns
out false — it was seen in this project's own history: a spec claimed "fully verified
end-to-end," and the file it described crashed with `ENOENT` on first real run.

One markdown file per task in `docs/specs/`:

0. **User story** — one short paragraph, plain language, from the person actually using the
   result: what they do, what they see, what changes. Required on every spec (and on every task
   entry in an Architectural-tier plan, per `docs/web-app-workflow/tiering.md` §2) — not just the
   UI ones. A one-line scope statement tells you what files change; a user story is the check that
   the *feature* still makes sense before writing the *mechanism* for it.
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
   `npm run stage`, `docs/web-app-workflow/execution-loop.md` §5 step 9), not folded into this
   section as if the execution model's own `npm run verify` self-check covers it; three specs in
   this project did this and all three ended up "flagged for human staging" anyway — write that
   outcome directly instead of routing through a criterion nothing can satisfy. Conversely,
   **don't write a manual step for something automation already proves** — a manual node
   one-liner re-confirming a golden test's exact claim is duplicate work dressed up as rigor, not
   extra safety; cut it instead of trimming prose elsewhere. **Any manual check that exercises a
   route/action which writes real state to disk (`tokens.json`, `active-brand.json`, anything the
   running `/design-system` editor can mutate) must include revert-and-rebuild as part of the
   check itself, not left implicit** — the write is real, not sandboxed, and the generated CSS it
   produces is gitignored, so a stale rebuild won't show up in `git diff` even after the source
   file is reverted (seen directly: a manual seed-generation check left `tokens.json` mutated,
   uncommitted, breaking 6 unrelated tests until `git checkout` + `npm run tokens:build` cleared
   it). Task 5b's spec got this right first; every later spec whose manual check touches a writing
   route repeats it, not just once. **Any task that changes interactive UI behavior (not just
   visual style) gets a Playwright spec in `app/e2e/`, not a human-checkbox-only check.** This
   project relied on manual staging checks for Task 7's UI and still shipped real bugs (flaky
   slider drag, missing sidebar highlight) that a scripted interaction — click, drag, assert the
   resulting DOM/network call — would have caught before they reached a human at all. The human
   checkbox stays for genuinely subjective judgment (does this color read as "accent," does this
   spacing look right) — it does not stay for "does clicking X do Y," which Playwright checks
   strictly better than a human re-clicking through a list. See
   `docs/web-app-workflow/execution-loop.md` §6 for `app/e2e/`'s current `webServer` setup before
   writing one against `/design-system` specifically.
8. **Definition of done** — `npm run verify` passes + `git diff --stat` matches the file
   allowlist + the human-checkbox manual check where relevant (per §7 above, not conflated with
   the self-check below) + **a self-check**: before reporting back, confirm every concrete claim
   the report makes (file list, test counts, any specific numbers) against what's actually on
   disk, each claim next to the command/output that confirmed it + checkpoint commit made.
9. **Stop-conditions** — explicit "if X happens, stop and ask, don't guess" list.
