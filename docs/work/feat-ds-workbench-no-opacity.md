# Task: Workbench solid colors only (1g0)

Status: active
Branch: feat/ds-workbench-no-opacity
Next: owner approves "What changes for you", then builder, then merge to master before 1g starts
Written against: 90770b4

## What changes for you
The color picker on `/foundations` loses its opacity field. Typing a color that has transparency (for example `rgba(255, 0, 0, 0.5)` or `#ff000080`) is refused like any invalid color: the old value stays and the row says "Not a solid color — kept the old value." Colors typed without transparency (names, short hex, `rgb()`) work as before. Reason: the token file only allows `#rgb` or `#rrggbb`, so a transparent color could be staged but never saved (task 1g adds Save). This removes the opacity feature added in 1f3; supporting opacity properly is a parked idea.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/colorEdit.ts`
- `tools/Design_System/src/lib/colorEdit.test.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `app/e2e/workbench/colors.spec.ts`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `app/` other than the one spec file, the package layer, save states (task 1g)

**Delete (approved with this brief):** None.

## Size
Files touched: 4. Expected diff: ~60 lines changed. New tests: 2 (one unit, one browser).

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Review
- Q1 serves the story: it prevents a state 1g's Save cannot handle; the token file accepts only `#rgb`/`#rrggbb` (`app/packages/design-system/src/token-writes.mjs:130`) and `brands/default/tokens.json` has zero 8-digit hex values (`grep -c '"#[0-9a-fA-F]\{8\}"'` returned 0). Nothing in the brief is outside that story.
- Q4 simplest: `ColorPicker` already has `isAlpha` (default true, `node_modules/svelte-awesome-color-picker/dist/components/ColorPicker.svelte:79`, hides the field at `:393`), and `normalizeColor` already builds on `colord` (`colorEdit.ts`), so the change is one prop plus one alpha check. Cut: nothing further; a second, transparency-specific error text was already dropped.
- Q6 checks that could pass while broken: deleting the alpha spec means nothing would fail if the field came back, so the brief adds a spec for "no alpha spinbutton" and "typed rgba refused". The alpha spinbutton is also the "picker open" marker or locator in other specs (`colors.spec.ts:57,61,83,139,142,144,146`), so those must move to `[data-picker-popover]` or they fail for the wrong reason; the brief lists this.
- Q6 also: the only error text assertion is `colors.spec.ts:26` and the string appears once in source (`+page.svelte:96`; `grep "Invalid color" src e2e` shows only those two), so the message change cannot leave a stale copy.
- Q6 also (from the second reviewer, confirmed): `[data-picker-popover]` is our own wrapper (`+page.svelte:244-245`), so "popover visible, no alpha field" would pass even if the picker rendered nothing; the new spec therefore also asserts the popover holds a picker input or button.
- Not verified: that the browser specs pass after the change (Claude runs `npm run test:e2e:workbench` after the build; `verify-task.sh` does not run them).

## Steps
- [ ] Red then green, `colorEdit.test.ts` first: replace the test at line 26 ("transparency is kept as 8-digit hex") with: `normalizeColor("rgba(255, 0, 0, 0.5)")` and `normalizeColor("#ff000080")` return `null`; `normalizeColor("rgba(255, 0, 0, 1)")`, `"#ff0000"` and `"red"` return `"#ff0000"`. Watch it fail, then in `colorEdit.ts` return `null` when the parsed color's alpha is below 1.
- [ ] In `routes/foundations/+page.svelte`: pass `isAlpha={false}` to `ColorPicker` (line ~246) and change the error text at line ~96 to "Not a solid color — kept the old value." (empty or unparseable input uses the same text; it is still an invalid color from the user's side).
- [ ] In `app/e2e/workbench/colors.spec.ts`: update the expected text at line ~26 to the new message; delete the test "alpha 0.5 survives picking a new spot with an 8-digit hex"; in the tests at lines ~52 and ~125 use `page.locator("[data-picker-popover]")` as the "picker is open" marker instead of the alpha spinbutton (the click-by-position logic stays, with the popover as the box); add one test: open the picker on `color-accent` → the popover is visible, it contains at least one `input` or `button` of the picker itself (so an empty wrapper cannot pass), and `getByRole("spinbutton", { name: "alpha channel" })` has count 0; then typing `rgba(255, 0, 0, 0.5)` into the hex field keeps the old value and shows "Not a solid color — kept the old value."
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Browser specs are run by Claude afterwards.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: transparent colors are refused, solid ones normalise → `colorEdit.test.ts` fails if either breaks.
- Rule: the picker has no opacity field and a typed transparent color is refused → the new spec in `colors.spec.ts`.
- Claude runs after the build: `lsof -i :3000 -i :5174` is clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass (one fewer than before, one added).

## Owner checklist
- [ ] Open `/foundations`, click a swatch → the picker shows no opacity field.
- [ ] Type `rgba(255,0,0,0.5)` in a hex field and press Enter → old value stays, row says "Not a solid color — kept the old value."
- [ ] Type `red` → still stages `#ff0000`.

## Questions
(none open; Muse default-effort critic read 2026-10-04: "clear")

## Report
