# Task: design system workbench, save path in the package layer (slice 1, task 1d)

Status: done
Branch: feat/ds-workbench-save
Next: none for 1d. Merged locally into master (`da50eb9`), NOT pushed (owner: one push after the slice-1 tasks are done). Next task is 1e, in a NEW session: `/start`, say "1e, effort test first". Before the first parallel builder run (see plan Status line and `docs/work/scorecard.md` "Effort test"): write `scripts/effort-compare.sh` and fix per-run tokens (parallel runs corrupt `delegate.sh`'s machine-wide snapshot delta). Local-only leftovers, ask first: stash `stash@{0}` (1b evidence); merged branches `feat/ds-workbench-shell`, `-preview`, `-scaffold`, `-save`. Worktrees for 1b-1d are removed. Untracked, never decided: `.claude/skills/`, `app/packages/design-system/brands/byebye/` and `heyhey/`. Usage at session end: 5h=43% weekly=39% ctx=16%.
Written against: f7ad06d

## What changed for you
Nothing visible: `app/packages/design-system/src/save-tokens.mjs` reads `brands/default/tokens.json` and saves a batch of color edits all or nothing. It refuses invalid values, read-only files, child brands, a non-active brand (unless `regenerate` is injected) and a file changed since it was read; it restores the old file if the CSS rebuild fails, then marks "needs deploy". No screen uses it until 1e/1f. The old editor and route are untouched.

## Done
- Brief written (Level 2), `/review` answered all eight questions and fixed three gaps in the brief: unreadable `tokens.json` must return `invalid` (not throw); `buildActiveBrand` rebuilds only the ACTIVE brand, so saving another brand is refused unless `regenerate` is injected; acceptance now requires design-system 142/142 (133 + 9), not just file existence.
- Builder run (muse-spark-1.3, default effort): `verify-task` PASS, scope OK, 2 new files (134 + 219 lines), 9 new tests, 87,929 tok, $0.02, 227s, first try.
- Claude check: code matches the brief's seven steps; own mutations: hash check off → 1 test fails, read-only check off → 1 test fails. Untested branch (restore after a bad read-back) passes 9/9 when removed; accepted.
- Owner accepted 2026-10-04; merged with `--no-ff` (`da50eb9`); `npm run verify` on master: PASS, design-system 142/142 (one earlier run printed a stack trace that did not repeat; cause unknown).

## Decisions (owner, in chat)
- One push after the slice-1 tasks are done, not per task.
- All worktrees (1b, 1c, 1d) removed 2026-10-04; branches and the stash stay until asked.
- Effort test: every builder task runs twice in parallel (`#low`, `#high` variants in `opencode.json`, `99249d8`), outcomes in the scorecard; flag rising cost. Offload mechanical comparison to a script; a cheap reviewer is advisory only.

## Noticed, not changed
- `markNeedsDeploy` failing after a successful write would throw (no code defined); rare.
- A change in the milliseconds between the hash check and the rename is not detected (single user, accepted).
- Builder's report said the owner checklist cited `4ff965e` while `Written against` was `f7ad06d`; harmless, checklist fixed.
- The effort probe was inconclusive (repeat runs produced no output; `timeout` does not exist on macOS, use a perl alarm).
