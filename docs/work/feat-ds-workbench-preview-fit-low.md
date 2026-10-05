
# Task: Foundations preview fits the canvas (five owner fixes)

Status: done
Branch: feat/ds-workbench-preview-fit-low
Next: 1e2 is merged locally into master (`7611df1`), NOT pushed (one push after the slice-1 tasks). Owner checklist items NOT yet confirmed in a browser (owner looked at both runs and said they seemed the same). Next task: 1f in a NEW session. Leftovers, ask before deleting: worktrees `../guitar_tab_processor-feat-ds-workbench-preview-fit`, `-low`, `-high`; branches `feat/ds-workbench-preview-fit`, `-low`, `-high`; parked idea: Foundations "Layout" section with adjustable layout values. Usage at session end: 5h=5% weekly=44% ctx=162k; `measure.sh report` (task feat-ds-workbench-preview-fit): 5 marks, 3341s between first and last. NOT confirmed: browser checklist.
Written against: d61073d

## What changes for you
The workbench `/foundations` Preview iframe spans the full canvas width between the sidebar and the inspector and is exactly as tall as its content, no inner scrolling. It always shows the light look, scaled down to fit when the frame is narrower, no light-then-dark flash on load. The left sidebar is 180px, and the Colors description text stays at 12px regular in a narrower column.

## Scope
Modify only: `app/lib/workbenchPreview.ts`, `app/lib/workbenchPreview.test.ts`, `app/app/workbench-preview/Preview.tsx`, `tools/Design_System/src/lib/previewHeight.ts` (new), `tools/Design_System/src/lib/previewHeight.test.ts` (new), `tools/Design_System/src/routes/foundations/+page.svelte`, `tools/Design_System/src/routes/+layout.svelte`.
Do NOT touch: `contracts/`, config, secrets, `app/hooks/useThemeMode.ts`, anything not listed above.
Shared message: the preview (port 3000) SENDS `{ type: "preview-height", height: <positive finite px> }` by `postMessage` to its parent; the workbench (port 5174) receives it via `previewHeight.ts`, accepting only the preview origin and the iframe's own window.
Delete (approved): None.

## Size
Files touched: 7. Expected diff: ~120 lines. New tests: ~8.

## Risk
Triggers: touches `app/` (dev-only `/workbench-preview` route; production returns 404). Review level: 2.

## Review
(Level 2, Claude's answers; second opinion by a blind cheap model, compared in the scorecard.)
1. Serves the story: all five fixes plus the 12px description trace to the owner's feedback; nothing extra. Owner decided 16px canvas padding.
2. Touches the dev-only preview page and the workbench shell grid; breaks nothing else.
3. Reuse: `readTokenMessage`'s origin-allow-list style is the pattern for the workbench-side check.
4. Simplest: kept the tested scale helper, since a tested rule beats an untested style; nothing else to cut.
5. Unspecified, now added: the scaled height, the 420px first-message fallback, and an unanswered preview staying 420px.
6. A check can pass while broken: yes; the light lock, no-flash, real height and 180px sidebar have no automated test and sit in the owner checklist.
7. Irreversible/exposure: nothing deleted, no `contracts/`; `postMessage` sends only a number to exactly `http://localhost:5174`.
8. Unchecked claim found and fixed: the theme is set by the root `ThemeProvider`, so a one-time light set loses; fixed with a `MutationObserver` in `useLayoutEffect`. `check-brief.sh` passes.

## Decisions (owner, in chat, 2026-10-04)
- Canvas padding becomes 16px (iframe stays 100% of the content box); parked: a Foundations "Layout" section with adjustable design-system layout values.
- Brief drafted by Muse; the `#high` redraft was usable; Claude's `/review` caught the real defect (root `ThemeProvider` overrides a one-time light set; fixed with a `MutationObserver`); the blind pass caught nothing extra.
- Low and high builder runs produced the same design; picked low (59k vs 111k tokens, more accurate scaled height). Both ended on the `tool_choice` API crash; Claude ran `finish.sh`.
- Lesson: backticked text inside the brief's "Modify only" block is read as file paths by `verify-task.sh`/`finish.sh`.

## Steps
- [x] Done: extended `app/lib/workbenchPreview.test.ts` with fit-scale tests, then added the scale helper to `app/lib/workbenchPreview.ts` (red then green in `app/`).
- [x] Done: added `tools/Design_System/src/lib/previewHeight.test.ts`, then `previewHeight.ts` (red then green in the workbench).
- [x] Done: in `Preview.tsx`, pinned the light look with a `MutationObserver` in `useLayoutEffect`, scaled the table to the frame width, measured the scaled height and posted `preview-height` to `window.parent` with targetOrigin `http://localhost:5174`.
- [x] Done: in `foundations/+page.svelte`, iframe full canvas width with `scrolling="no"`, height from accepted messages (420px until the first), description text at 12px regular in a narrower column.
- [x] Done: in `+layout.svelte`, sidebar 280px to 180px and `.canvas` padding 32px to 16px.
- [x] Done: `bash scripts/verify-task.sh` reached PASS.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Everything visual is in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Run: `npm test` in `app/` / Expected: all tests pass, including the new fit-scale tests
- Run: `npm test` in `tools/Design_System/` / Expected: all tests pass, including the new `previewHeight.test.ts`
- For logic: the scale rule (narrower frame scales, wider frame stays 1, zero/negative width stays 1) names the fit-scale tests that fail if the rule is broken
- For logic: the height-accept rule (preview origin plus the iframe's own window plus a positive finite number, reject everything else) names the `previewHeight` tests that fail if the rule is broken

## Owner checklist
- [ ] Web app (3000) and workbench (5174) up, `/foundations` open → Preview iframe spans the full canvas width between sidebar and inspector, is exactly as tall as the Components table, and shows no inner scrollbars
- [ ] Narrow the window so the frame is narrower than the table → table scales down to fit, still no horizontal scrollbar inside the iframe
- [ ] With the web app's saved theme set to dark (or a dark system), reload → preview still shows the light look with no light-then-dark flash
- [ ] The Preview height follows the content: before the first message it is 420px, after it exactly the content height; the table scales and the sidebar is as below (these three have no automated test)
- [ ] Left sidebar is 180px and the canvas has 16px padding around the iframe; Colors descriptions read at 12px regular in a narrower column, 16 rows, 7 still showing "(no description yet)"

## Questions
(none open) Decided by the owner 2026-10-04: canvas padding becomes 16px. Parked for later, not in this task: make design-system layout values adjustable in a Foundations "Layout" section.

## Report
<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts, anything noticed but not touched. Mark anything not run as `Not run`.>

### Checkpoint (written by scripts/finish.sh)
```
 app/app/workbench-preview/Preview.tsx              | 58 ++++++++++++++++++++--
 app/lib/workbenchPreview.test.ts                   | 15 +++++-
 app/lib/workbenchPreview.ts                        |  7 +++
 docs/work/feat-ds-workbench-preview-fit-low.md     |  7 ++-
 tools/Design_System/src/lib/previewHeight.test.ts  | 47 ++++++++++++++++++
 tools/Design_System/src/lib/previewHeight.ts       | 17 +++++++
 tools/Design_System/src/routes/+layout.svelte      |  4 +-
 .../src/routes/foundations/+page.svelte            | 28 ++++++++++-
 8 files changed, 172 insertions(+), 11 deletions(-)
---
VERIFY: PASS
  ran:     typecheck ✓  lint ✓  unit 63/63 (4 files)  design-system 142/142 (11 files)  build not run (use --full)  (205 tests, 6s)
  not run: e2e (10 specs; npm run test:e2e)
pre-commit: OK
```
