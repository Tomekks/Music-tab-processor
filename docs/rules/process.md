# Process

How work flows from idea to shipped. One process for the whole repo (app, pipeline, tools).

## Front half (owner + Claude)
Idea → `/grill-with-docs` (thorough questions; fact-finding starts narrow, expands only if needed) →
wireframe if it's UI → plan. Claude researches the latest practice while grilling (primary sources) and brings outside suggestions with pros and cons. Plans hold intent and task
order; each task's detail lives in its task file, written once. Big work (a new subsystem, or about
5+ tasks): split into slices at real seams, each with a one-sentence user story.
**Spike (every plan).** Before slicing, a throwaway spike in `research/<plan>-spike/`, short
session, tests the riskiest assumptions (can the tool do X, does the data have the shape we think).
Output: `NOTES.md` listing each assumption as held / broke / unknown
with evidence; slices are cut from what held; a broken or unknown one becomes an early task or a named
risk. A plan with nothing to test says so in one line, naming the facts checked.
**Plan critique.** Once the task table is written, before any brief, one blind cold read of the slice by
`opencode-go/deepseek-v4.1-flash#max` (backup `glm-5.3-flash#high`): slice text in the prompt, no repo
access, no file edits, 6 findings max (order and hidden dependencies, tasks too big for one run, missing cases,
checks that could pass while broken, data damage). Claude checks
each finding against the code, folds in the valid ones, notes in the plan which were taken or dropped.
The owner approves the revised slice.

## Back half (per task)
1. **Size it.** Can you describe the diff in one sentence, with no risk trigger? Then Level 0: just
   do it, run verify, commit. Risk triggers: deletes data or files, touches `contracts/`, shell or
   network, schema, deploy, secrets.
2. **Brief.** First `git branch --no-merged master` and `git worktree list`: an open branch touching the
   same files is merged first or named in the brief. Claude drafts a task file: `TEMPLATE-quick.md`
   (`new-worktree.sh --quick`) for 1-3 files of plain logic, `TEMPLATE.md` for any risk trigger, UI, audio
   or 4+ files. Then a blind cold read: `BUILDER_MODEL=opencode-go/deepseek-v4.1-flash#max delegate.sh
   <task> --critique` (backup `opencode-go/glm-5.3-flash#high`; 5 questions max; Muse is not a critic).
   Claude fixes only gaps where the
   builder would have to guess; takes a CUT only if nothing breaks without it. First block is **"What
   changes for you"**; the owner approves it. The brief also states files touched (N), risk triggers,
   expected size, acceptance checks (`Run:` / `Expected:`), and the owner's checklist.
   `scripts/check-brief.sh` checks form only. Read live files first; record `Written against:
   <commit>`. Never skip: a crash or null path in new logic, an existing assertion the change will break,
   a fixture that can't exercise the code, an unanswered scope question.
3. **Review.** `/review` by Risk level (`docs/rules/review.md`). Level 0 none. Level 1 (default):
   questions 1, 4, 6 under `## Review`, max 5 bullets, no gate. Level 2 (risk trigger): all eight
   (`delegate.sh` refuses without them). Verify a review's claims against the code before acting;
   a critique can be false.
4. **Build** with `scripts/run-builder.sh <task file>` in its own worktree for any Bounded-or-larger
   feature; trivial fixes stay on the current branch (`docs/rules/executor.md`).
5. **Check** with `npm run verify` and read the footer (`docs/rules/verify.md`); UI in an e2e area also
   runs `scripts/run-e2e.sh` (`docs/rules/e2e.md`).
6. **Report** as in `docs/rules/executor.md` step 2, plus: UI = layout checks; risky = `file:line` of each
   guard + risk→test map. Then one scorecard line.
7. **Owner tests** the checklist (written up front): launch block first (`AGENTS.md` Session rule), then human checks only; a check a spec covers is marked "automated". A check
   that writes to disk includes its revert.
8. **Ship.** Checkpoint commit, then report. Push, PR, deploy: ask. After an
   `app/` change: preview with `npm run stage`, then the three-way ask in `AGENTS.md`.
   CI requires the `verify` check on PRs.

## State
The active task file in `docs/work/` is the only state; a decision made in chat becomes one line there
at once. A new session reads `AGENTS.md` and the task file only (GUIDE, ARCHITECTURE, DECISIONS only
after a long gap or on request). `/next` says which step. Handoff notes keep decisions and file paths,
not tool output.

## Loops
One review round per brief; a second names only what changed. One fix loop, then escalate. Two failed
attempts: stop and report. A builder run that stops early
(crash, step limit) is never finished by Claude: no hand-fixing its code, no writing its Report. Claude
reads the log, says what is left, and re-runs the builder (raise `steps` in `.opencode/agents/builder.md`
first if the log shows the limit).

## Changing the process
- Before any `process.md` change, Claude checks the request against the current file for a clash or
  bloat and reports it before editing.
- A critique reports only a concrete failing case or contradiction. A proposal states: problem seen
  (evidence), change, how the owner will know, what it adds; a net addition needs an observed failure.
  Scripts: only after a failure or a step done twice.

## Docs hygiene
Indexes stay indexes; new reasoning goes in the topic file. Finished task files are deleted (git is the
record). Size caps (`AGENTS.md` ≤ 80 lines, each rules file ≤ 900 words, a header
comment on line 2 of every script) are enforced by `scripts/check-rules.sh`. If the process misses
something the old one caught, log it in `docs/work/missed.md`.
