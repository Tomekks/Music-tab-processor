# Task: design system workbench, preview page in the web app (slice 1, task 1c)

Status: done
Branch: feat/ds-workbench-preview
Next: none for 1c. Merged locally into master (`17d6731`), NOT pushed. Next task is 1d (save path, Level 2: `/review` first) per the plan's Status line: new session in the main folder, `/start`, `scripts/new-worktree.sh feat/ds-workbench-save`. Local leftovers, ask before deleting each: worktrees `../guitar_tab_processor-feat-ds-workbench-preview` (this task) and `../guitar_tab_processor-feat-ds-workbench-scaffold` (1b), stash `stash@{0}` (1b builder run 1, kept as evidence), merged branches `feat/ds-workbench-shell`, `-preview`, `-scaffold`. Usage at session end: 5h=35% weekly=38% ctx=29%; `measure.sh report`: builder 106,319 tok / $0.01 / 246s (run crashed), Claude 94 msgs, 6,055s between first and last mark.
Written against: 09d2885

## What changes for you
The web app has a dev-only page `/workbench-preview`: the five real Components (Button, IconButton, ColorField, SegmentedControl, Slider), Variants in rows, States (Default, Hover, Pressed, Disabled) in columns, Hover and Pressed forced on. It takes color changes by `postMessage` only from `localhost:5174` / `127.0.0.1:5174` (nothing sends any yet: tasks 1e and 1f). It is a 404 in production.

## Scope (all new files)
`app/lib/workbenchPreview.ts` (+ `.test.ts`), `app/app/workbench-preview/page.tsx`, `app/app/workbench-preview/Preview.tsx`. Not touched: `app/packages/design-system/`, the old editor, `tools/`, `contracts/`.

## Done
- Brief (Level 1), builder run: wrote all four files, `verify-task.sh` PASS, then crashed on an API error ("only auto is supported for tool_choice") before reporting or committing. Claude read the code, broke each rule once (5 of 5 caught), wrote this report, committed (`27fc938`).
- Commit hook failed inside the worktree (git sets GIT_DIR for hooks; `build-tokens.test.mjs:31` ran `git checkout HEAD -- <abs path>`). Owner chose to fix the test, not use `--no-verify`: `09d2885`, `Written against` moved to it so `finish.sh` scope check passes.
- Owner-found defect 1 (`f8ebf09`): ColorField/SegmentedControl/Slider shared one `useState` per Component, so one cell moved four. The brief said no-op handlers; the builder deviated and my read-through missed it. Now fixed constants + `noop`.
- Owner-found defect 2 (`c06b1d5`): forced Hover/Pressed did nothing for primary Button/IconButton. Root cause: my brief said return `null` for any selector with a comma, but the Tailwind class has escaped commas (`color-mix(in_srgb\,var(...)`). Failing test first; now only an unescaped comma means a selector list. Browser: primary Hover bg = real hover (srgb 0.634 0.551 0.897), Pressed differs (0.610 0.531 0.861).
- Production check (Claude): `npm run stage` with the CI placeholder DB values (the worktree has no `.env.local`) -> `/workbench-preview` 404, `/design-system` 404, page text absent. Server stopped, ports 3000 and 3001 free.
- Owner accepted after looking at the page. Checks on merged master: `npm run verify` PASS (typecheck, lint, unit 60/60, design-system 133/133); build and e2e not run.

## Decisions (owner, in chat)
- Fix the failing test rather than `--no-verify` for this commit (the guard now denies `--no-verify`).
- Hover/Pressed on ColorField, SegmentedControl, Slider look like Default (they have no such styles); Secondary Button and ghost Pressed also equal Default. All by design.
- Primary hover is subtle on purpose: `--state-hover-opacity` is 8%. To make it stronger, change that token in the workbench (slice 2), not the preview.

## Noticed, not changed
- In dev, React StrictMode runs the effect twice, so forced rules are inserted twice (harmless, dev only).
- No regression test for the shared-state defect (UI only); the browser check covers it.
- A builder crash leaves work unreported: check `git status` in the worktree before re-running `delegate.sh`.

## Process changes made in the same session (already committed on master)
Hooks `scripts/stop-verify.sh` (now also `tools/Design_System`, `tools/Control_Centre`) and `scripts/guard-bash.sh` (PreToolUse: asks on push/PR/vercel/`reset --hard`/`rm -rf`, denies `--no-verify`), both with tests, in `2ea06f6` and described in `docs/rules/verify.md`. The guard's "ask" did not visibly prompt in auto mode; only the deny was seen enforcing.
