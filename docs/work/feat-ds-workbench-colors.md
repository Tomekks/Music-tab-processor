# Task: design system workbench, Foundations page with the preview and the color token list (slice 1, task 1e)

Status: done
Branch: feat/ds-workbench-colors
Next: 1e is merged locally into master (`7f03ef1`), NOT pushed (one push after the slice-1 tasks). Next task is 1e2 (below) in a NEW session in the main folder: `/start`, say "1e2"; it needs `scripts/new-worktree.sh`, a brief (Level 2: touches `app/` and the workbench), `/review` (runs the blind second reviewer), then a low and high builder pair (`scripts/delegate.sh`, `scripts/effort-compare.sh`). Set `Written against` to the latest commit before delegating (delegate.sh now refuses a stale one). Open owner decisions: (1) `docs/rules/models.md` lines 9 and 27 still say the cheap model alone does Level 1 reviews, but `/review` now has Claude answer and a blind DeepSeek second opinion (trial, scorecard "Second opinion"); (2) owner checklist items 2 and 3 below were not confirmed. Leftovers, ask before deleting each: worktrees `../guitar_tab_processor-feat-ds-workbench-colors` (this one), `../guitar_tab_processor-ds-colors-low`, `../guitar_tab_processor-ds-colors-high`; branches `feat/ds-workbench-colors`, `-low`, `-high` (keep high as the comparison); stash `stash@{0}` (1b evidence); old branches `feat/ds-workbench-shell`, `-preview`, `-scaffold`, `-save`; untracked `.claude/skills/`, `app/packages/design-system/brands/byebye/` and `heyhey/` (never decided). Usage at session end: 5h=62% weekly=42% ctx=29%; `measure.sh report`: 15 marks, 3,691s between first and last.
Written against: a69d684

## What changed for you
The workbench (`http://localhost:5174`) has a page `/foundations`, linked from the "Foundations" sidebar row: a Preview iframe of the web app's `/workbench-preview` (the five real Components) above a read-only Colors list (16 rows: swatch, name, CSS variable, hex, description or "(no description yet)"). The web app must run on port 3000 for the preview. Nothing can be edited or saved yet (1f).

## Done
- Brief (Level 1) with `/review`: a Claude pass and a blind DeepSeek pass found the same real gap (descriptions are out of scope in the plan, line 108); Claude added reuse of `buildFieldDescriptors`, a `process.cwd()` brand path, and dropped the unused `raw` field. Config change `checkJs: false` in `tools/Design_System/tsconfig.json` approved and committed (`098cb81`).
- Effort test, same brief, two worktrees: low (`ae792a1`) 88,276 tok, $0.01, 179s; high (`092ba36`) 69,315 tok, $0.01, 205s. Both: verify PASS, scope OK, 5 tests, about the same code (rows in `docs/work/scorecard.md`). Both stopped at `finish.sh` because Claude left `Written against` stale; Claude fixed it and ran `finish.sh`. The high run also hit the known `tool_choice` API crash at the very end.
- Owner picked low, merged into master with `--no-ff` (`7f03ef1`); `npm run verify` on the merged tree: PASS (typecheck, lint, unit 60/60, design-system 142/142; build and e2e not run); workbench `npm run verify`: 14/14.
- Side work committed on the same branch: per-run builder tokens from the session export (`measure.sh session`), `scripts/effort-compare.sh`, `scripts/review-second.sh` (blind second reviewer, with tests), one `/review` for both levels (Level 1 = questions 1, 4, 6; Level 2 = all eight), `delegate.sh` scope pre-flight (stops on a stale `Written against`, with test), `/wrap` renames the session.

## Decisions (owner, in chat, 2026-10-04)
- Pick the low run; the description text stays, shown at 12px regular in a narrower column (in 1e2).
- Feedback after viewing the high run, to build as follow-up task 1e2 (separate task: 1e's files plus these exceed the "about 8 files" review limit): (1) the iframe is full canvas width between sidebar and inspector and the preview content fits its width; (2) workbench left sidebar 280px becomes 180px; (3) the preview shows the design system's light look and ignores the web app's saved theme; (4) no light-then-dark flash on load; (5) the iframe is exactly as tall as its content, no scroll inside it.
- Claude's plan for 1e2 (not yet objected to): the preview measures its own height and sends it to the workbench by `postMessage` (accepted only from the preview origin and the iframe's own window); the preview scales its table down when the frame is narrower than it; the preview keeps re-setting the light theme (cause: `app/hooks/useThemeMode.ts` seeds `dark`, then switches to localStorage or the system value, so the iframe followed the web app's saved theme). Files: `app/lib/workbenchPreview.ts` (+ test), `app/app/workbench-preview/Preview.tsx`, `tools/Design_System/src/lib/previewHeight.ts` (+ test), `tools/Design_System/src/routes/foundations/+page.svelte`, `+layout.svelte`.

## Owner checklist
- [x] Web app (3000) and workbench (5174) up, `/foundations` shows the Preview with the Components and the Colors list; owner viewed screenshots (high run). Script check on the high run: 16 rows, iframe src `http://localhost:3000/workbench-preview`, 7 rows "(no description yet)".
- [ ] Stop the web app, reload the workbench page: the list still shows, the Preview is empty. Not confirmed.
- [ ] Click a Component, then Foundations again, both load without errors. Not confirmed (the dev log only showed harmless "Failed to load source map" warnings for the vendored color library).
- [x] Nothing written: `git status --short` on master shows no change under `app/packages/design-system/brands/`; `lsof -i :3000 -i :5174` prints nothing.

## Noticed, not changed
- `app/hooks/useThemeMode.ts` seeds `dark` on first render, so a light-mode user sees one flash (accepted in that file's own comment); 1e2 only works around it inside the preview page.
- The vendored `material-color-utilities` files reference `.js.map` files that do not exist, so the workbench dev server prints source-map warnings.
- Typing a new command into the single terminal tab ends the one running before it; start long-running servers in the background or in a second tab.
