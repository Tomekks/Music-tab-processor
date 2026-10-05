# Task: Workbench browser specs (Playwright) for color editing

Status: active
Branch: feat/ds-workbench-e2e
Next: Claude reviews this brief, then one builder run; Claude then runs the specs and breaks each feature to prove they fail
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
- [ ] `helpers.ts`: `openFoundations(page)` (goto `/foundations`, wait for the Preview iframe and the first hex field); `hexField(page, varName)` and `swatch(page, varName)` using the labels `Hex value for <varName>` and `Pick a color for <varName>` (varName is shown without dashes, for example `color-accent`); `previewFrame(page)` (`page.frameLocator('iframe[title="Preview"]')`); `previewBg(page, role, name)` returning the computed `backgroundColor` of a preview element; `stageColor(page, varName, text)` (triple-click the field, type, press Enter)
- [ ] `colors.spec.ts`, 10 tests, one behavior each, each starting from a fresh `openFoundations`; no test writes any file, and none depends on another test's state:
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
- [ ] Use only accessible labels, roles and visible text; add a `data-testid` in `+page.svelte` or `+layout.svelte` only when nothing else can find the element (expected: the tooltip, the changes panel). Never select by CSS class
- [ ] Each test has a one-line comment naming the behavior it protects; no sleeps (use Playwright's auto-waiting and `expect(...).toBeVisible()` / `toHaveValue`)
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
<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line
per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts,
anything noticed but not touched. Mark anything not run as `Not run`.>
