# Task: Foundations preview fits the canvas (five owner fixes)

Status: active
Branch: feat/ds-workbench-preview-fit-low
Next: /review (Level 2), then delegate to builders
Written against: d61073d

## What changes for you
The workbench `/foundations` Preview iframe spans the full canvas width between the sidebar and the inspector and is exactly as tall as its content, with no scrolling inside it. The preview always shows the light look, scaled down to fit when the frame is narrower, with no light-then-dark flash on load. The left sidebar is narrower (180px), and the Colors description text stays, shown at 12px regular in a narrower column.

## Scope
**Modify only:**
- `app/lib/workbenchPreview.ts`
- `app/lib/workbenchPreview.test.ts`
- `app/app/workbench-preview/Preview.tsx`
- `tools/Design_System/src/lib/previewHeight.ts` (new)
- `tools/Design_System/src/lib/previewHeight.test.ts` (new)
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `tools/Design_System/src/routes/+layout.svelte`

**Do NOT touch:**
- `contracts/`, config, secrets, `app/hooks/useThemeMode.ts` (the theme-chase cause lives there; this task only works around it inside the preview page), anything not listed above

**Shared message (inline, not a contracts/ change):** the preview (app, port 3000) SENDS `{ type: "preview-height", height: <positive finite px> }` by `postMessage` to its parent window; the workbench (port 5174) receives it via `previewHeight.ts`, which accepts a message only from the preview origin and the iframe's own window.

**Delete (approved with this brief):** None.

## Size
Files touched: 7. Expected diff: ~120 lines. New tests: ~8.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): touches `app/` (dev-only `/workbench-preview` route; production returns 404). Review level: 2.

## Review
(Level 2, Claude's answers; second opinion by a blind cheap model, compared in the scorecard.)
1. Serves the story: all five fixes plus the 12px description trace to the owner's feedback (`docs/work/feat-ds-workbench-colors.md:19`); nothing extra. One gap: "full canvas width" is unclear, the iframe is already `width: 100%` of the canvas content box (`+page.svelte:24`) and the canvas has 32px padding (`+layout.svelte:80-84`); owner decided 16px padding (Questions).
2. Touches: the dev-only preview page and the workbench shell grid (`+layout.svelte:72`); breaks nothing else, `Preview.tsx` is used only by `app/app/workbench-preview/page.tsx` (404 in production, `page.tsx:5`).
3. Reuse: `readTokenMessage`'s origin-allow-list style (`app/lib/workbenchPreview.ts:1,8`) is the pattern for the workbench-side check; nothing to reuse for the scale helper.
4. Simplest: cut the scale helper and use CSS `zoom` or `max-width` only if a pure helper is not wanted; kept, since a tested rule beats an untested style. Nothing else to cut.
5. Unspecified, now added to the steps: height after scaling (the scaled height, not the raw one); the first-message fallback (420px); a preview that never answers (stays 420px). Viewport below the table width is covered by the scale rule.
6. A check can pass while broken: yes. The light lock, the no-flash, the real height and the 180px sidebar have no automated test (`node --test` only covers the two pure helpers: `app/package.json:21`, `tools/Design_System/package.json:12`), so `verify-task: PASS` proves none of them; they are in the Owner checklist.
7. Irreversible/exposure: nothing deleted, no `contracts/`; the new `postMessage` sends only a number and targets exactly `http://localhost:5174` (never `"*"`); the receiver accepts only the preview origin and the iframe's own window.
8. Unchecked claim found and fixed: the draft said `Preview.tsx` can pin the light look, but the theme is set by the root layout's `ThemeProvider` (`app/app/layout.tsx:36`, `useThemeMode.ts:24-27`), whose effect runs after the child's, so a one-time set loses. Fix: a `MutationObserver` started in `useLayoutEffect` (see Steps). Builder deny list (`.opencode/agents/builder.md`) does not block `app/` or `tools/Design_System/` paths; `check-brief.sh` passes.

## Steps
- [ ] Red then green in `app/`: extend `app/lib/workbenchPreview.test.ts` with fit-scale tests (narrower frame scales to frame/content; wider-or-equal frame stays 1; zero or negative frame width stays 1), watch them fail on `npm test`, then add the scale helper to `app/lib/workbenchPreview.ts` until green
- [ ] Red then green in the workbench: add `tools/Design_System/src/lib/previewHeight.test.ts` (accepts a numeric height only from the preview origin `http://localhost:3000` and the iframe's own window; rejects any other origin, any other source window, and any non-numeric or non-positive height), watch it fail on `npm test`, then add `tools/Design_System/src/lib/previewHeight.ts` until green
- [ ] In `app/app/workbench-preview/Preview.tsx`: pin the light look: in `useLayoutEffect` set `document.documentElement.dataset.theme = "light"` and start a `MutationObserver` on that attribute that sets it back to `light` whenever anything else changes it (the root layout's `ThemeProvider` sets the saved/system theme in an effect that runs after this component's: `app/hooks/useThemeMode.ts:24-27`; the observer reverts it before paint, which also removes the flash); never read or write the saved theme, scale the table down to the frame width with the helper, measure the content height after scaling, i.e. raw height times the scale (ResizeObserver) and post `{ type: "preview-height", height }` to `window.parent` with targetOrigin exactly `http://localhost:5174` on change (never `"*"`)
- [ ] In `tools/Design_System/src/routes/foundations/+page.svelte`: iframe full canvas width with `scrolling="no"`, height driven only by accepted `postMessage` heights (420px, the current height, until the first message), description text kept in a narrower column at 12px regular
- [ ] In `tools/Design_System/src/routes/+layout.svelte`: left sidebar 280px becomes 180px (`grid-template-columns`, line 72) and the `.canvas` padding 32px becomes 16px (owner decision 2026-10-04; the iframe stays 100% of the canvas content box); nothing else in the shell changes
- [ ] Run `bash scripts/verify-task.sh` until PASS

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
<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line
per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts,
anything noticed but not touched. Mark anything not run as `Not run`.>

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
