# Task: Foundations colors polish 2 (1f3)

Status: active
Branch: feat/ds-workbench-color-polish
Next: Owner clarifies scope gaps below, then builder resumes
Written against: d8fb6b7

## Questions
- Q1 (blocks picker undo): `pick()` must call `stageEdit` with `replace`, but the store that owns history (`tools/Design_System/src/lib/staged.svelte.ts`, `stage()` → `stageEdit()`) is NOT in `Modify only`, so the flag has no path through. Should `staged.svelte.ts` be added to scope to forward an optional `replace` arg (default `false`)?
- Q2 (blocks picker alpha): keeping 8-digit hex "through `normalizeColor`" requires changing `tools/Design_System/src/lib/colorEdit.ts` (`normalizeColor` currently does `parsed.alpha(1).toHex()`, forcing opaque), which is NOT in `Modify only`. Should `colorEdit.ts` be added to scope? If not, is a `+page.svelte`-only alpha-append hack acceptable instead?
- Drift check note: `git status --porcelain` is outside this session's allowed shell (only `bash scripts/verify-task.sh` / `finish.sh` permitted), so the porcelain check was not run; the three quoted excerpts (`stagedEdits.ts:38` was-line, `+page.svelte:197` isAlpha, `Preview.tsx:112` h1) were verified by read and still match. `bash scripts/verify-task.sh` passes on the untouched tree (PASS, 205 app+design-system tests).

## What changes for you
Each color row reads left to right: the 32px swatch, the hex field, the CSS variable name without the leading dashes (for example `color-accent`, easier to match against the web app), then an info icon. The dot after the name becomes a small "Edited" label. The long `semantic.color.…` path is gone from the row, and two tabs, "Color" and "Focus", split the list. Hovering the info icon shows one tooltip (today two appear), and every row has the icon: rows without a description show a dimmed icon saying "No description yet". The picker's opacity field is back (it shows 0 to 1). Pressing Cmd+Z after using the picker returns to the color you had before opening it, in one step, and the "unsaved changes" list always shows the color from the file as "was". The preview loses its "Workbench preview" heading, and its first column (Variant, Button primary and so on) is left-aligned and no longer bold. Editing `accent` also reaches anything that depends on a dependent color.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/server/colorTokens.ts`
- `tools/Design_System/src/lib/server/colorTokens.test.ts`
- `tools/Design_System/src/lib/stagedEdits.ts`
- `tools/Design_System/src/lib/stagedEdits.test.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `app/app/workbench-preview/Preview.tsx`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- the generated CSS, Save and Discard, other token types

## Size
Files touched: 6. Expected diff: ~200 lines. New tests: ~6.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Review
- Q1 serves the story: each step maps to one of your points (5, 6 order and tabs, 8 black object, 9 double tooltip, opacity, undo, preview cleanup); the `was` fix comes from your screenshot where the list showed `#a4a2ab → #a5a3ac` (one drag increment instead of the file color).
- Q4 simplest: undo grouping is one boolean `replace` argument, not a new history model; the `--` is stripped only at display time.
- Q6 only `verify-task.sh` gates; the picker alpha fix has no automated test (the library is a Svelte component), so it rides on the owner checklist plus the builder's stated root cause. The three logic rules each have a named failing test.
- Checked against code: `stageEdit` sets `was = current ? current.now : fileValue` (`stagedEdits.ts:38`), which is the bug; `isAlpha={false}` is at `+page.svelte:197`; the `<h1>` is at `Preview.tsx:112`.

## Steps
- [ ] Red then green in `colorTokens.test.ts`: (a) each token also has `section` (the descriptor's section, for example `semantic.color`); (b) `dependents` is transitive: if A is referenced by B and B by C (all color descriptors, matched on `rawValue` equal to the braced path), A's dependents include both B's and C's variables, no duplicates, no cycles; implement in `colorTokens.ts`
- [ ] Red then green in `stagedEdits.test.ts`: (a) `was` is always the file value, never an earlier staged value (stage twice on one path, `was` stays the file value); (b) `stageEdit(state, path, fileValue, hex, replace)`: with `replace = true` and an existing entry for that path it overwrites the entry WITHOUT adding a history step (`past` unchanged), so one undo returns to the value before the first change; with `replace = false` behavior is unchanged except for (a); implement in `stagedEdits.ts`
- [ ] In `foundations/+page.svelte`, picker undo: `pick()` calls `stageEdit` with `replace = false` for the first change of a picker session and `replace = true` for the following ones; a session starts when the picker opens for a row and ends when it closes or the hex field commits for that row
- [ ] Same file, row layout, left to right: swatch button (32px square), hex input, the CSS variable name with the leading `--` removed (display only; code keeps the full name), the info icon; a muted "Edited" label replaces the `●` dot (shown only for edited rows, placed after the variable name, before the info icon); no `semantic.…` path anywhere in the row; error text stays on its own line below the row
- [ ] Same file, tabs: a tab bar above the list built from the distinct token `section` values in file order, labelled by stripping `semantic.` and capitalizing ("semantic.color" is "Color", "semantic.focus" is "Focus"); the first tab is selected; the list shows only the selected tab's rows; plain buttons with `role="tab"` and `aria-selected`
- [ ] Same file, info icon: remove the native `title` attribute from the icon button (it causes a second tooltip), keep only the CSS tooltip, shown on hover and keyboard focus; every row renders the icon; with no description the icon is dimmed and the tooltip reads "No description yet"
- [ ] Same file, picker: remove `isAlpha={false}` so the opacity field shows again (0 to 1 is accepted). Reproduce first: in the browser pane or by reading the package source in `tools/Design_System/node_modules/svelte-awesome-color-picker`, find why dragging in the color area resets the alpha of the new color (hypothesis: `pick()` passes `color.hex`, which drops alpha, or `hex={display}` rebinding). State the root cause in the Report. Fix it so changing alpha keeps the 8-digit hex (`#rrggbbaa`, through `normalizeColor`) and dragging in the color area keeps the current alpha; if the package cannot do this, say so in the Report and hide the field again
- [ ] In `app/app/workbench-preview/Preview.tsx`: remove the `<h1>` "Workbench preview"; the row headers (`th scope="row"`) and the "Variant" header cell are left-aligned with `font-normal`
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule "was is the file value": the `stagedEdits` test (a) fails if `was` follows earlier staged values.
- Rule "picker session is one undo step": the `stagedEdits` replace test fails if `replace` adds a history step.
- Rule "dependents are transitive": the `colorTokens` test (b) fails if only one level is followed.

## Owner checklist
- [ ] Row order is swatch, hex, variable name (no dashes), info icon; the "Edited" label shows for edited rows only
- [ ] Tabs "Color" and "Focus" switch the list; no word "semantic" in the UI
- [ ] Info icon: one tooltip only; rows without a description show a dimmed icon with "No description yet"
- [ ] Picker: drag across the color area several times, close it, press Cmd+Z once → back to the color from before you opened it; the unsaved-changes list shows the file color as "was"
- [ ] Picker opacity field shows; drag the color area after lowering opacity → opacity stays; lowering opacity changes the preview
- [ ] Preview has no "Workbench preview" heading; the first column is left-aligned and not bold

## Questions (continued)
See top of file — open questions blocking build.

## Report
<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line
per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts,
anything noticed but not touched. Mark anything not run as `Not run`.>

### Checkpoint (written by scripts/finish.sh)
```
 docs/work/feat-ds-workbench-color-polish2.md | 14 +++++++++++---
 1 file changed, 11 insertions(+), 3 deletions(-)
```
