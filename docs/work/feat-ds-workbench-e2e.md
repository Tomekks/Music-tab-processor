# Task: Workbench browser specs (Playwright) for color editing

Status: done
Branch: feat/ds-workbench-e2e
Next: done, merged in a40854f; revisit specs per docs/rules/e2e.md
Written against: bda5a25

## What changes for you
A short browser test suite for the workbench Foundations page. One command (`cd app && npm run test:e2e:workbench`) starts the web app and the workbench, drives the page like a person, and reports which behaviors still work: typing a color, the preview following, returning to the page, one-step picker undo, opacity surviving a color pick, tooltips, tabs, and the picker floating without moving rows. It never writes `tokens.json`. After this, the checks I walked by hand in the browser run on demand, and the repo's task flow reminds us when UI changes without matching specs. It does not judge looks.

## Scope
**Modify only:**
- `app/e2e/workbench/colors.spec.ts`
- `app/e2e/workbench/helpers.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `tools/Design_System/src/routes/+layout.svelte`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, `playwright.*.config.ts`, anything not listed above
- In the two `.svelte` files add `data-testid` attributes ONLY (no logic, markup or style changes), and only where no accessible label or role exists

## Size
Files touched: 4. Expected diff: ~260 lines. New tests: 10.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Review
- Q1 serves the story: the 10 tests are exactly the behaviors checked by hand this session (points 1-9 of the polish feedback plus the lost-colors bug); nothing extra. Config, npm script, rules page and the reminder script are done by Claude already (`d88d596`) because the builder cannot edit config, `scripts/` or `docs/`.
- Q4 simplest: one spec file and one helper file; no page objects, no fixtures, no screenshots; the two `.svelte` files get test ids only if needed.
- Q6 a spec can pass while the feature is broken (an empty or over-loose assertion); the guard is the third acceptance check: Claude breaks each feature in turn and the matching test must fail. Specs cannot be run by the builder, so selector mistakes surface only when Claude runs them; expect one fix round.
- Checked against code: labels `Pick a color for {varName}` and `Hex value for {varName}` exist at `+page.svelte:192,201`; tabs have `role="tab"` (`:170`); the tooltip is `aria-hidden` (`:241`), so it needs a `data-testid`.

## Steps
- [x] `helpers.ts`: `openFoundations(page)` (goto `/foundations`, wait for the Preview iframe and the first hex field); `hexField(page, varName)` and `swatch(page, varName)` using the labels `Hex value for <varName>` and `Pick a color for <varName>` (varName is shown without dashes, for example `color-accent`); `previewFrame(page)` (`page.frameLocator('iframe[title="Preview"]')`); `previewBg(page, role, name)` returning the computed `backgroundColor` of a preview element; `stageColor(page, varName, text)` (triple-click the field, type, press Enter)
- [x] `colors.spec.ts`, 10 tests, one behavior each, each starting from a fresh `openFoundations`; no test writes any file, and none depends on another test's state:
  1. typing `red` into `color-accent` shows `#ff0000`, the top bar says `1 unsaved change`, and an `Edited` label appears on that row
  2. typing `nonsense` keeps the old value and shows `Invalid color — kept the old value.`
  3. staging `color-accent` red turns the preview's primary Button AND primary IconButton backgrounds (Default column) to `rgb(255, 0, 0)` (proves the component variables follow)
  4. stage a color, click `Button` in the sidebar, click `Foundations`, and the preview shows the staged color again (regression: colors were lost when the preview loaded late)
  5. open the picker for `color-accent`, click two different spots in the color area, close it by clicking outside, press `ControlOrMeta+z` once: the field returns to the file value and the top bar says `0 unsaved changes`
  6. in the picker set the `alpha channel` input to `0.5`, then click a new spot in the color area: the hex field ends with 8 digits and the alpha input still says `0.5`
  7. hovering an info icon shows exactly one tooltip and the icon has no `title` attribute; a row without a description shows `No description yet`; every row has an icon
  8. the `Color` and `Focus` tabs switch the list (`Focus` shows only `focus-ring-color`); the word `semantic` appears nowhere in the list
  9. opening the picker does not move the row below it (compare its bounding box top before and after); clicking outside and pressing Escape each close it
  10. after two staged edits to the same token, the unsaved-changes panel shows the FILE value as the "was" color, not the first edit
- [x] Use only accessible labels, roles and visible text; add a `data-testid` in `+page.svelte` or `+layout.svelte` only when nothing else can find the element (expected: the tooltip, the changes panel). Never select by CSS class
- [x] Each test has a one-line comment naming the behavior it protects; no sleeps (use Playwright's auto-waiting and `expect(...).toBeVisible()` / `toHaveValue`)
- [ ] Run `bash scripts/verify-task.sh` until PASS (it cannot run the specs; Claude runs them)

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS` (and an `e2e-revisit: specs changed with the UI` line, not a NOTE)
- Claude runs `cd app && npm run test:e2e:workbench` / Expected: 10 passed
- Claude breaks each feature on purpose (one at a time, reverted after) / Expected: the matching test fails, the others stay green

## Owner checklist
- [ ] `cd app && npm run test:e2e:workbench` (ports 3000 and 5174 free first: `lsof -i :3000 -i :5174`) → 10 passed, and `git status` is clean afterwards
- [ ] Stop-command: none needed, Playwright stops the servers itself

## Questions
(none open)

## Report
- Acceptance 1 `bash scripts/verify-task.sh` → PASS (app VERIFY: PASS 205 tests; workbench 36 tests; e2e-revisit: workbench specs changed with the UI) → ✓
- Acceptance 2 (Claude) `cd app && npm run test:e2e:workbench` → first run 6 passed / 4 failed (selector mistakes: two `alpha channel` matches, `Button` matched `Icon Button`, a scroll-dependent position check, and the 127.0.0.1 base URL); after fixes: 10 passed in 8.6s ✓
- Acceptance 3 (Claude) broke 11 things one at a time and reverted each: dependents, forced-opaque alpha, `was` following staged, no undo grouping, no resend on ready, title attribute back, invalid message, Edited label, the word semantic in the UI, picker `position: static` → the matching test failed every time ✓ (not mutated: Focus tab switching, outside-click and Escape closing)
- Decisions the spec didn't settle: previewBg IconButton uses first `Play` button (primary Default comes first in Preview.tsx row order, no row scoping); picker color-area clicks use popover bounding-box offsets from the accessible `alpha channel` label (third-party picker area has no accessible name and third-party code cannot take a testid); tooltip testid is one shared `tooltip` per row (row coverage asserted by count vs hex fields); changes panel testid is `changes-panel`; test 8 asserts `semantic` count 0 page-wide (preview iframe content excluded).
- Wrong spec facts: NONE (labels at +page.svelte:192,201, tab role at :170, tooltip aria-hidden at :241 all matched live code).
- Noticed but not touched: `+layout.svelte` undo listens for metaKey+z only, so `ControlOrMeta+z` relies on Meta (fine on this Mac; may not fire under Control on Linux CI) — left as specced for Claude's run to confirm.

### Checkpoint (written by scripts/finish.sh)
```
 app/e2e/workbench/colors.spec.ts                   | 161 +++++++++++++++++++++
 app/e2e/workbench/helpers.ts                       |  42 ++++++
 docs/work/feat-ds-workbench-e2e.md                 |  22 ++-
 tools/Design_System/src/routes/+layout.svelte      |   2 +-
 .../src/routes/foundations/+page.svelte            |   2 +-
 5 files changed, 219 insertions(+), 10 deletions(-)
---
VERIFY: PASS
  ran:     typecheck ✓  lint ✓  unit 63/63 (4 files)  design-system 142/142 (11 files)  build not run (use --full)  (205 tests, 7s)
  not run: e2e (11 specs; npm run test:e2e)
pre-commit: OK
```

- Found by the specs, fixed in this branch: the preview posted height and ready messages only to `http://localhost:5174`, so a workbench opened at `127.0.0.1:5174` lost them; it now answers the origin it was opened from (`workbenchOrigin`, unit-tested; spec 11 fails without the fix, passes with it).
