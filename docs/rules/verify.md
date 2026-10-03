# Verify

What "done" means, and what each check does and does not cover.

## `npm run verify` (in `app/`)
Typecheck → lint → unit tests (`lib/`) → design-system package tests. Prints a footer: what ran with
counts, and what did not (`build`, e2e). `verify:full` adds the production build (CI uses it).
Read the footer, not just PASS. Never accept an exit code alone: check the test count. A suite that
silently runs zero tests still exits 0.

## Gates (same check for every tool)
- **Pre-commit** (`.githooks/pre-commit`): secret scan, then `verify` when `app/` files are staged.
  Needs `git config core.hooksPath .githooks` in every clone and worktree.
- **Stop hook** (Claude Code only): blocks "done" while `app/` changes fail verify.
- **CI:** `verify:full` on PRs and master; branch protection requires it.
- A real credential in a blocked commit means stop and rotate, never `--no-verify`.

## Not covered (known gaps)
- **Browser tests** (`npm run test:e2e`, Playwright) are not in `verify`, and the top-level specs
  (home, theme-toggle, critique-fixes) are not in CI either. Planned: `verify:e2e`.
- **Pipeline** (`pytest pipeline/`) is checked only when `pipeline/` files change (staged), via the
  planned `scripts/verify-pipeline.sh`. No routine runs: untouched stages are rebuilt later anyway.
- **Layout, spacing and overflow** bugs: planned Playwright layout checks (measurements plus a pixel
  comparison against a baseline the owner approved; no model reads images).
- `npm run coverage` is a report on what unit tests touch, not a threshold.

## Testing budget
Test the behavior the brief states, not the implementation. Logic and bug fixes: one failing test first
(show it red), then code. One test per stated behavior and per named edge case; none for getters,
styling or framework behavior. Prefer a tiny real fixture to mocks. Tests use their own fixtures and
never depend on real user data (e.g. the live brands directory). UI: one invariant per page. Pipeline
audio/ML stages: a golden-file comparison stands in for a unit test. Never edit or delete an existing
test to make it pass without saying so. UI behavior gets a Playwright test, not a manual check.

## Limits
- A task adds at most about 10 tests; more needs a reason in the report.
- `verify` should finish in about 60 s (the footer prints the time). Slower: fix the slow part, don't
  skip the check. Don't run the build twice for one change (`npm run stage` already proves it).
- Browser tests run only when the task changes UI, and a spec run stays under about 5 minutes.
- A flaky test is fixed or quarantined with a note, never rerun until green.
- `verify` skips the build because `npm run stage` proves it; CI runs `verify:full`.

## Before browser tests
Check port 3000 is free (`lsof -i :3000`); a stale dev server is silently reused. Stop a manual dev
server before the `design-system` e2e project. After a long session, check the working directory
before writing a hand-built absolute path.

## Evidence
No "verified" or "confirmed" without the command and its output next to it. Say plainly what was not
run. A manual check that mutates generated files (e.g. `tokens.json`) ends with its revert and rebuild.
