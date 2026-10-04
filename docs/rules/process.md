# Process

How work flows from idea to shipped. One process for the whole repo (app, pipeline, tools).

## Front half (owner + Claude)
Idea → `/grill-with-docs` (thorough questions; fact-finding starts narrow, expands only if needed) →
wireframe if it's UI → plan. During grilling Claude does focused research on the latest practice for
the topic (primary sources, raw pages, not summaries) and brings outside suggestions with pros and cons.
Plans hold intent and task order; each task's detail lives in its own task file, written once. Big work
(a new subsystem, or about 5+ tasks): split into slices, each with a one-sentence user story, split only
at a real seam.

## Back half (per task)
1. **Size it.** Can you describe the diff in one sentence, with no risk trigger? Then Level 0: just
   do it, run verify, commit. Risk triggers: deletes data or files, touches `contracts/`, shell or
   network, schema, deploy, secrets. A bug: reproduce it and state the root cause with evidence
   before any fix brief.
2. **Brief.** A cheap model drafts a task file: `TEMPLATE-quick.md` (`new-worktree.sh --quick`) for 1-3 files of
   plain logic, `TEMPLATE.md` for any risk trigger, UI or audio, or 4+ files. Optional cold read:
   `delegate.sh <task> --critique` (at most 5 questions or "clear"; one round). First block is
   **"What changes for you"**; the owner approves that block. The brief also states files touched (N),
   risk triggers, expected size, acceptance checks (`Run:` command / `Expected:` output), and the
   owner's checklist. `scripts/check-brief.sh` checks form, not content. Read live files first; record
   `Written against: <commit>`. Keep narration short, but never skip: a crash or null path in new logic,
   an existing assertion the change will break, a fixture that can't exercise the code, an unanswered
   scope question.
3. **Review.** One command, `/review`, by the task's Risk level. Level 0 none. Level 1 (default): Claude
   answers questions 1, 4, 6 of `docs/rules/review.md` (serves the story? simplest version? can a check
   pass while it's broken?) under `## Review`, max 5 bullets, no gate. Level 2 (risk trigger): all eight
   (`delegate.sh` refuses without them); over ~8 files: "too vague". Reviewers are read-only, cite
   `file:line`, flag only correctness or requirement gaps, say "sound" in one line when it is, never
   invent findings, don't restate or redesign. Verified claims get one line; list only what couldn't be
   confirmed. Verify a review's claims against the code before acting on them; a critique can be false.
4. **Build** with `scripts/run-builder.sh <task file>` in its own worktree for any Bounded-or-larger
   feature; trivial fixes stay on the current branch (`docs/rules/executor.md`).
5. **Check** with `npm run verify` and read the footer (`docs/rules/verify.md`).
6. **Report.** Every report: commit, `git diff --stat`, verify footer, "decisions the spec didn't
   settle" (or NONE). Extras by kind: feature = one line per acceptance check + owner checklist; bug fix =
   root cause with evidence + the test that failed first; UI = layout checks + checklist; risky =
   `file:line` of each guard + risk→test map. Then one scorecard line.
7. **Owner tests** the checklist (written up front). A check that writes to disk includes its revert.
8. **Ship.** A task's own local checkpoint commit: commit and report. Push, PR, deploy: ask. After an
   `app/` change: preview with `npm run stage`, then ask exactly: push to git / push & deploy / skip.
   Deploy from the repo root. CI requires the `verify` check on PRs.

## State
The active task file in `docs/work/` is the only state. A decision made in chat becomes one line
there at once. A new session reads `AGENTS.md` and the task file only; the orientation reads
(GUIDE, ARCHITECTURE, DECISIONS) happen only after a long gap or on request. `/next` says which step.
Hand-written handoff notes keep decisions and file paths and drop tool output. Prefer a fresh session
for an unrelated next task; stay in one for closely related work. Claude designs and reviews and does
not prototype or re-run what the builder already ran: its check is a spot-check, not a re-run.
Output stays terse (`git diff --stat`, `pytest -q`, `tail`): scripts compute, agents read results.

## Loops
One review round per brief; a second review names only what changed since the first. One fix loop, then
escalate. Two failed attempts: stop and report. Split a task only at a real seam, not by size.

## Changing the process
- A critique reports only a concrete failing case or contradiction, never redesigns. A suggestion says what it
  adds and removes; a net addition needs an observed failure. Scripts: only after a failure or a step done twice.
- After a passing gate, no process changes until 3 more real tasks run; only an actual failure reopens it.
  A proposal states: problem seen (evidence), change, how the owner will know, what it adds.

## Docs hygiene
Indexes stay indexes; new reasoning goes in the topic file. Finished task files are deleted (git is the
record); the backlog keeps its Archive. Owner-only to-dos live in the task file or backlog. Before
swapping a tool or library, do fresh research and check `docs/audio-tools/` first. Size caps
(`AGENTS.md` ≤ 80 lines, each rules file ≤ 70) are enforced by `scripts/check-rules.sh`; that replaces
the old drift log. If the process misses something the old one caught, log it in `docs/work/missed.md`.
