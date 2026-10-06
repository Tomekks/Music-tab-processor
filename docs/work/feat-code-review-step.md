# Task: Blind code review step (review-upgrade task B)

Status: done
Branch: docs/review-upgrade-plan
Next: done and merged (PR 68). The code-review trial now runs on the next 5 tasks that get a scorecard row; decide at 5 rows.
Written against: 2d00bb4

## What changes for you
After a build passes `verify`, Claude runs `bash scripts/review-code.sh <task file>`. A cheap model that has not seen the builder's log reads the branch diff and the brief's checks and lists only real bugs or gaps (each with `file:line`). Claude reads the same diff first and writes its own bullets, then opens the cheap model's list. Both go in the task file under `## Code review` in the shared report shape (Found, Lessons, Folded in, Not folded in and why). A new "Code review" table in the scorecard counts what each caught. It runs for the first 5 tasks that get a scorecard row; then you decide: Level 1 and 2, Level 2 only, or drop it.

## Scope
**Modify only:**
- `scripts/review-code.sh` (new)
- `scripts/test-review-code.sh` (new)
- `docs/work/scorecard.md`
- `docs/rules/process.md`
- `docs/rules/models.md`
- `docs/rules/review.md`

**Do NOT touch:**
- `contracts/`, config, secrets, `scripts/review-second.sh`, `scripts/run-builder.sh`, `opencode.json`, anything not listed above

## Size
Files touched: 6. Expected diff: ~160 lines (script ~60, test ~60, docs ~40). New tests: ~9, all with a fake `opencode` (no model call).

## Risk
Triggers: shell (a new script that starts a model) and network (it sends the diff to the opencode-go model; same path and secrets rules as `review-second.sh`). Nothing is deleted. Review level: 2.

## Review
Level 2, 2026-10-06. Answers first; report block after the comparison. Second opinion: deepseek-v4.1-flash#high, blind.
1. Serves the story: every Modify-only file traces to a plan decision (script, scorecard table, models row, review.md paragraph, process.md step); nothing extra. Evidence: plan Decisions "Code reviewer" and "Scorecard" bullets.
2. Touches: `process.md` is at 897/900 words (`wc -w`), so step 5b forces cuts; `models.md:28-30` still says "Claude always spot-checks the final diff", which the new Claude-reads-first rule replaces (that line needs editing, it is in scope); `process.md` step 3 `/review` text is unchanged.
3. Reuse: `scripts/review-second.sh` (model gate, `env -i`, `oc-run.sh`, blind check, exit codes) and `scripts/test-review-second.sh` (fake `opencode`) are the pattern; copying is allowed, but name which lines are copied so a later fix to one is not missed in the other.
4. Simplest: cut `--show` (use `cat` on the log) and the 3,000-line cap (a plain refusal on empty diff is enough; add the cap after a real run shows a need). Keep the planted-flaw run: the plan requires it.
5. Unspecified: (a) `git diff master...HEAD` on this branch already shows 13 files from tasks A, C, D (`git diff master...HEAD --stat`), so the diff is not "this task only"; the script needs a base argument or the task's `Written against:` commit; (b) uncommitted work is not in the diff; (c) generated or lock files inflate the line count; (d) a task with no `## Acceptance checks` heading.
6. Checks that could pass while broken: the `grep deepseek|muse` check filters lines holding `opencode-go`, so a model id added on such a line passes; the fake-`opencode` tests prove wiring, not that the reviewer finds bugs: only the planted-flaw run does, and its outcome is not an acceptance check (any result passes).
7. Exposure: the diff and the repo go to an external model; `app/.env.local` exists on disk (`ls -a app`), untracked, and the reviewer runs with repo read access, so it can read it (same as `review-second.sh`); the backup Muse trains on prompts (`models.md:14`). Undo: `git branch -D chore/planted-flaw` needs the owner's yes; the rest is reversible by `git revert`.
8. Unchecked claim: the brief says the builder is blocked from these files; confirmed by `check-brief.sh` (6 BLOCKED lines on `scripts/*`, `docs/*`), so Claude builds. Not checked: that `opencode --agent plan` truly cannot write; `review-second.sh` relies on the same assumption.

**Report block**
- Found: the diff base was wrong for this branch (master...HEAD already holds tasks A, C, D); `models.md:29` contradicts the new rule; acceptance check "empty diff against master" cannot be run here; the model-id grep check filtered away the lines it should catch; `app/.env.local` is readable by the reviewer.
- Lessons: both views agreed on the models.md clash and the 897-word limit; the cheap model found the unrunnable check, I found the base-commit and .env.local issues. Checking its claim against `git rev-list`/`git diff --stat` showed it right; its "fold the test into test-review-second.sh" was a style opinion, not a defect.
- Folded in: diff base is the `Written against:` commit; `.env*` is off limits in the prompt; `models.md` line 29 edit added; two weak acceptance checks replaced by a grep on added lines and a diff-stat from the brief commit; empty-diff case moved into the test.
- Not folded in (and why): cut `--show` and downgrade the 3,000-line cap (cheap, protects token cost, matches `review-second.sh`); merge the test into `test-review-second.sh` (repo keeps one test per script); refuse an Acceptance section with no `Run:` lines (minor, the check-brief gate already covers this form).

## Steps
- [x] `scripts/review-code.sh <task-file> [--show]`, copied in shape from `scripts/review-second.sh`: same header block, same `opencode-go/` only and no `-free` check, same `env -i` run through `scripts/oc-run.sh`, same blind check, same exit codes (0 saved, 1 not blind or no answer, 2 refused, 3 model did not answer). Default model `opencode-go/deepseek-v4.1-flash#high`, override `REVIEW_MODEL` (backup Muse, named in the header like `review-second.sh`).
- [x] Inputs: write `docs/work/runs/<name>.code-diff.patch` from `git diff <base>...HEAD`, where `<base>` is the task's `Written against:` commit (so earlier tasks on the same branch are not in it; master only if that line is missing) and `docs/work/runs/<name>.code-brief.md` holding only the task's `## Acceptance checks` section. Refuse (exit 2) if the diff is empty, or if the diff is over 3,000 lines (say so; the owner decides to split or skip).
- [x] Prompt: read-only (`--agent plan`), read those two files and the repo files the diff touches; never open any `.env*` file; do not open anything under `docs/work/` except those two files and no `*.log`; flag only correctness or requirement gaps, each with `file:line` and a one-line failing case; no redesign, no style notes; "sound" in one line if nothing found; at most 8 findings. Answer saved to `docs/work/runs/<name>.code-review.log`; the script prints only the saved path, blindness and token/time, not the findings (`--show` prints them).
- [x] Blind = the log shows no read of the real task file or of a builder log (`docs/work/runs/<name>.log`); otherwise print NOT BLIND, exit 1.
- [x] `scripts/test-review-code.sh`: fake `opencode` like `test-review-second.sh`.
- [x] `docs/rules/models.md` line 29: replace "Claude always spot-checks the final diff" with "Claude reads the final diff itself before opening a code reviewer's findings".
- [x] `docs/work/scorecard.md`: add table "Code review (trial from 2026-10-06)" with columns Date, Task, Findings, Real, False, Fix rounds it caused, Owner-test bugs it missed, Tokens / time; one line above it with the keep/drop rule: keep if it caught 2+ real bugs that `verify` and Claude missed; drop if false findings outnumber real ones; decide after 5 rows.
- [x] `docs/rules/models.md`: one row "Blind code reviewer": same model and backup as the second reviewer, read-only, fresh session. No model id appears anywhere else in `process.md` or `review.md`.
- [x] `docs/rules/review.md`: add a "Code review" paragraph (under 80 words): input is the diff plus the acceptance checks, no builder log; Claude reads the diff itself and writes its bullets first, then opens the findings (this replaces the final-diff spot-check); report goes under `## Code review` in the shared report block.
- [x] `docs/rules/process.md`: insert as step 5b after Check: "**Code review** (first 5 scorecard rows, then the owner decides): after `verify` passes, `bash scripts/review-code.sh <task file>`; see `docs/rules/review.md`." Cut the same number of words elsewhere in `process.md` so it stays at or under 900 (`bash scripts/check-rules.sh`). Each cut shown to the owner as in task C.
- [x] Planted-flaw test: on a throwaway branch `chore/planted-flaw`, copy a small existing function, introduce one off-by-one, write a minimal task file whose acceptance check would pass anyway, run the script for real, and record in the scorecard whether it was caught. Revert: give the owner `git checkout docs/review-upgrade-plan && git branch -D chore/planted-flaw` (a delete needs the owner's yes).

## Acceptance checks
(Claude builds this one directly; no builder run, so these are run by Claude. `check-brief.sh` BLOCKED lines are expected for that reason.)
- Run: `bash scripts/test-review-code.sh` / Expected: `test-review-code: PASS`
- Run: `bash scripts/check-rules.sh; echo $?` / Expected: `check-rules: OK` and `0` (header on line 2 of both new scripts, `process.md` at most 900 words)
- Run: `git diff -U0 2d00bb4..HEAD -- docs/rules/process.md docs/rules/review.md | grep '^+' | grep -iE 'deepseek|muse'` / Expected: no output (no model id added to either file)
- Run: `git diff --stat 2d00bb4..HEAD` / Expected: only the six Modify-only files plus this task file
- For logic: each rule below names its test (in `test-review-code.sh`):
  - non-empty diff and level any: exit 0, answer saved, findings not printed without `--show`
  - the saved prompt names the diff file and the brief file, not the task file
  - brief copy contains Acceptance checks and nothing else (no Review or Report text)
  - empty diff against the `Written against:` commit: exit 2, model not called
  - the diff base is the `Written against:` commit, not master (the fake `git` or a temp repo shows the range used)
  - the prompt forbids opening `.env*` files
  - diff over 3,000 lines: exit 2, model not called
  - free-tier or non-`opencode-go/` model: exit 2
  - reviewer that reads the real task file or the builder log: exit 1, "NOT BLIND"
  - silent model: exit 3
  - no task file or no `## Acceptance checks`: exit 2

## Owner checklist
- [ ] Read the planted-flaw result in the scorecard → the table says caught or missed, with the line it flagged or the reason it did not
- [x] Run the two delete commands Claude gives you for `chore/planted-flaw` → the branch is gone and you are back on `docs/review-upgrade-plan`

## Questions
(none open)

## Report
- Found: none in the build. Planted-flaw run: caught (`stepWindow.ts:12`, 5-cell window instead of 4, 17s, blind). Planted-flaw task's acceptance checks passed anyway, as designed.
- Lessons: the fake-`opencode` test proves wiring only; the planted run is the evidence the reviewer finds bugs (1 of 1, a single sample). The script resolves `oc-run.sh` and `measure.sh` next to itself so the test can run in a temp git repo.
- Folded in: all Steps. `start.sh` fragment message committed together with this (owner's request, outside the Modify-only list). `process.md` cuts to make room for step 5b (897 -> 886 words; "Owner-only to-dos" was cut then restored, the owner put it back in task C). Token count fixed: `measure.sh` filters by model variant and the script passed `default` for a `#high` model: the "Verify a review's claims... a critique can be false" sentence in step 3 (already in `review.md`), "CI requires the `verify` check on PRs" in step 8 (already in AGENTS.md), "Indexes stay indexes; new reasoning goes in the topic file" in Docs hygiene.
- Also done at the owner's request: the same variant fix in `scripts/review-second.sh` (outside this task's files); the one scorecard row with `tok na` (code-review-step brief) backfilled from its session export: 48,208 tok, $0.014. Other rows state a time or tokens without `na`, left alone.
- Not folded in (and why): none.
