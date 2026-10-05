# Task: Workbench solid colors only, Reset button, steady tabs (1g0, expanded)

Status: active
Branch: feat/ds-workbench-no-opacity
Next: owner checklist (3 items), then merge to master (ask first), then 1g; builder run 87752 tok 182s, 11 e2e specs pass, new spec fails when isAlpha is restored
Written against: 6eef888 (the first 1g0 build is already committed; this expansion is a second build on top of it)

## What changes for you
The color picker on `/foundations` loses its opacity field. Typing a color that has transparency (for example `rgba(255, 0, 0, 0.5)` or `#ff000080`) is refused like any invalid color: the old value stays and the row says "Not a solid color — kept the old value." Colors typed without transparency (names, short hex, `rgb()`) work as before. Reason: the token file only allows `#rgb` or `#rrggbb`, so a transparent color could be staged but never saved (task 1g adds Save). This removes the opacity feature added in 1f3; supporting opacity properly is a parked idea.

Added 2026-10-04 after your manual check: (a) on an edited row the small "Edited" label becomes a **Reset** button; pressing it puts the field back to the saved file value, as one undo step (Cmd+Z brings the edit back), so you no longer depend on Cmd+Z alone. (b) Switching between the Color and Focus tabs no longer makes the page jump: the colors area keeps the height of the taller tab, so your scroll position stays put. Not in this task: the corner artifact you saw on the ColorField previews (not reproduced yet, see Questions).

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
Files touched: 4 (same four). Expected diff: first build ~50 lines, this expansion ~70 more. New tests: first build 2; the expansion adds 2 browser specs (Reset with Undo, tab switch keeps scroll) and changes one.

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
- [x] Red then green, `colorEdit.test.ts` first: replace the test at line 26 ("transparency is kept as 8-digit hex") with: `normalizeColor("rgba(255, 0, 0, 0.5)")` and `normalizeColor("#ff000080")` return `null`; `normalizeColor("rgba(255, 0, 0, 1)")`, `"#ff0000"` and `"red"` return `"#ff0000"`. Watch it fail, then in `colorEdit.ts` return `null` when the parsed color's alpha is below 1.
- [x] In `routes/foundations/+page.svelte`: pass `isAlpha={false}` to `ColorPicker` (line ~246) and change the error text at line ~96 to "Not a solid color — kept the old value." (empty or unparseable input uses the same text; it is still an invalid color from the user's side).
- [x] In `app/e2e/workbench/colors.spec.ts`: update the expected text at line ~26 to the new message; delete the test "alpha 0.5 survives picking a new spot with an 8-digit hex"; in the tests at lines ~52 and ~125 use `page.locator("[data-picker-popover]")` as the "picker is open" marker instead of the alpha spinbutton (the click-by-position logic stays, with the popover as the box); add one test: open the picker on `color-accent` → the popover is visible, it contains at least one `input` or `button` of the picker itself (so an empty wrapper cannot pass), and `getByRole("spinbutton", { name: "alpha channel" })` has count 0; then typing `rgba(255, 0, 0, 0.5)` into the hex field keeps the old value and shows "Not a solid color — kept the old value."
- [ ] Expansion A, Reset: in `routes/foundations/+page.svelte` replace the `<span class="edited">Edited</span>` (inside `{#if edited}`, ~line 219) with a `<button type="button">` named `Reset {varName}` (visible text "Reset") whose click calls `stagedStore.stage(token.path, token.value, token.value)` (staging the file value removes the entry as ONE history step, so `stagedStore.undo()` brings it back; no change to `stagedEdits.ts`), then sets `drafts[token.path]` back to the file value and calls `sendTokens()`. Keep the small-label look (reuse the `.edited` class styles for the button, no new design). In `colors.spec.ts` change the test at line 11 to expect the `Reset` button (not the text "Edited"), and add a test: stage `red`, click `Reset color-accent` → the field shows the file value, the count reads "0 unsaved changes", the button is gone; press Cmd+Z (`ControlOrMeta+z`) → the field is `#ff0000` again and the button is back.
- [ ] Expansion B, steady tabs: root cause (reproduced 2026-10-04 with a Playwright probe at 1280x800): the canvas scrolled to 400 jumps to 9 after clicking Focus because the Color list is 15 rows (`scrollHeight` 1663) and the Focus list is 1 row (`scrollHeight` 753), so the browser clamps the scroll. Fix in `+page.svelte` only: give the tab content (the `{#if hasTokens}` list) a `min-height` equal to the tallest height seen so far across tabs (track it with `bind:clientHeight` on the list and a `$state` max that only grows, reset when `data.tokens` changes); do not change which rows render. Add a spec: scroll `main.canvas` to 400, click the `Focus` tab → `main.canvas` `scrollTop` is still 400 (within 1px) and the tab bar's `getBoundingClientRect().top` is unchanged; click `Color` → same.
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Browser specs are run by Claude afterwards.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: transparent colors are refused, solid ones normalise → `colorEdit.test.ts` fails if either breaks.
- Rule: the picker has no opacity field and a typed transparent color is refused → the new spec in `colors.spec.ts`.
- Rule: Reset restores the file value as one undo step → the new Reset spec fails if Reset is a second history step or the button stays visible.
- Rule: switching tabs keeps scroll → the new spec fails if the list shrinks and the canvas jumps.
- Claude runs after the build: `lsof -i :3000 -i :5174` is clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass (one fewer than before, one added).

## Owner checklist
- [ ] Open `/foundations`, click a swatch → the picker shows no opacity field.
- [ ] Type `rgba(255,0,0,0.5)` in a hex field and press Enter → old value stays, row says "Not a solid color — kept the old value."
- [ ] Type `red` → still stages `#ff0000`, and the row shows a **Reset** button instead of "Edited"; press Reset → back to the saved color, press Cmd+Z → `red` returns.
- [ ] Scroll down the Color list, click the Focus tab → the page does not jump; click Color → same.

## Questions
(none open; Muse default-effort critic read 2026-10-04: "clear" on the first version)
- Not in this task, needs a reproduction first: the small corner artifact on the ColorField previews (owner screenshot 2026-10-04, disappears on browser zoom, not seen before). 1g0 did not touch the preview or CSS, so it is probably older; Claude will screenshot master vs this branch before any fix brief.

## Report
- `bash scripts/verify-task.sh` → PASS (typecheck ✓ lint ✓ unit 65/65 design-system 36/36, 207 tests total) ✓
- Rule transparent refused / solid normalise → broke `parsed.alpha() < 1` check → `colorEdit: transparent colors are refused, solid ones normalise` failed (35 pass/1 fail), restored → 36/36 pass ✓
- Rule picker has no opacity field + typed transparent refused → new spec `picker shows no opacity field and typed rgba is refused` added; breaking `isAlpha={false}` or the error text still leaves `verify-task.sh` PASS, so the matching check is the browser spec (Not run by builder) — /Foundations manual check needed by Claude/owner
- Claude after build: `lsof -i :3000 -i :5174` clear then `cd app && npm run test:e2e:workbench` → Not run (builder cannot run browser specs)
- Decisions the spec didn't settle: unit test named `transparent colors are refused, solid ones normalise`; browser test named `picker shows no opacity field and typed rgba is refused`; alpha read via `parsed.alpha() < 1`; popover non-empty asserted via `popover.locator("input, button")` count > 0; error text reused for empty/unparseable per brief
- Spec facts wrong: NONE
- Noticed but not touched: `verify-task.sh` does not fail if `isAlpha={false}` or the new error text is reverted (only the browser specs cover those); left as-is per scope

### Checkpoint (written by scripts/finish.sh)
```
 app/e2e/workbench/colors.spec.ts                   | 42 ++++++++++------------
 docs/work/feat-ds-workbench-no-opacity.md          | 20 ++++++++---
 tools/Design_System/src/lib/colorEdit.test.ts      |  6 ++--
 tools/Design_System/src/lib/colorEdit.ts           |  1 +
 .../src/routes/foundations/+page.svelte            |  3 +-
 5 files changed, 40 insertions(+), 32 deletions(-)
---
VERIFY: PASS
  ran:     typecheck ✓  lint ✓  unit 65/65 (4 files)  design-system 142/142 (11 files)  build not run (use --full)  (207 tests, 7s)
  not run: e2e (11 specs; npm run test:e2e)
pre-commit: OK
```
