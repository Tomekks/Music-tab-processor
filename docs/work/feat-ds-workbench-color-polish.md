# Task: Foundations colors polish and component-follow fix (1f2)

Status: done
Branch: feat/ds-workbench-color-polish
Next: superseded by feat-ds-workbench-color-polish2.md (1f3)
Written against: b54e398

## What changes for you
On `/foundations` the color rows become a clean, evenly spaced list with no bullets: name and variable on the left, the hex field, then a 32px square swatch right after it, aligned to the right side. The description moves behind a small info icon and shows as a tooltip on hover. The color picker floats over the page instead of pushing rows down, shows opacity as 0–100%, and closes when you click outside it. The "unsaved changes" panel becomes a tidy card with no bullets. Editing a semantic color such as `accent` now also changes the components that use it, so the Default Button variant turns red along with Hover and Pressed.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/server/colorTokens.ts`
- `tools/Design_System/src/lib/server/colorTokens.test.ts`
- `tools/Design_System/src/lib/stagedEdits.ts`
- `tools/Design_System/src/lib/stagedEdits.test.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `tools/Design_System/src/routes/+layout.svelte`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `app/` (the generated CSS and the preview page stay as they are), Save and Discard, other token types (not in 1f)

## Size
Files touched: 6. Expected diff: ~200 lines. New tests: ~6.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Review
- Q1 serves the story: every step maps to one of your eight points (1 is a question answered in chat; 7 is the dependents steps). Nothing extra.
- Q4 simplest: inline SVG and CSS hover instead of a new icon or tooltip package; dependents computed once in the server loader, not a runtime reference graph.
- Q6 the only gate is `verify-task.sh`, so the whole look and the picker behaviour pass unseen; the two logic rules each have a named test, everything else is the owner checklist. The fix for the Default variant is covered by the `previewVars` test only up to the message content, the real proof is the red Default Button in the checklist.
- Checked against code: `rawValue` and `path` exist on descriptors (`field-descriptors.mjs` typedef), and component Button/IconButton tokens reference `{semantic.color.accent}` (`brands/default/tokens.json:84,94`).

## Steps
- [x] Red then green in `colorTokens.test.ts`: `listColorTokens` also returns, per semantic color token, `dependents: string[]`, the CSS variable names (via `cssVarNameForPath`, as `cssVar` already does) of every other color descriptor whose `rawValue` is exactly `{<that token's path>}`, in file order, `[]` when none (e.g. `semantic.color.accent` gets `--component-button-primary-background` and `--component-icon-button-primary-background`); watch it fail, then implement in `colorTokens.ts` (add `dependents` to `ColorToken`)
- [x] Red then green in `stagedEdits.test.ts`: `previewVars` sets each token's `dependents` to the same value as the token itself (staged hex if edited, else the file value); a token with no `dependents` field behaves as before (add `dependents?: string[]` to `PreviewToken`); watch it fail, then implement in `stagedEdits.ts`
- [x] In `foundations/+page.svelte`: remove the `<ul>` bullets (use a plain `div` list or `ul` with `list-style: none; padding: 0`); each row is a grid: name plus variable on the left, then the hex input, then the swatch button directly after the input, 32px by 32px, a square; rows have clear vertical spacing (about 16px between rows) and a thin divider; everything lines up in columns (swatches all at the same x)
- [x] Same file: the description text is removed from the row and shown in a small tooltip opened on hover or keyboard focus of an info icon (an inline SVG in the Lucide "info" shape: circle r=10 at 12,12, a line 12,16 to 12,12 and a dot at 12,8; 16px, `currentColor`), only when the description is non-empty; use `title` plus a CSS hover popover so it works without JS; no new dependency
- [x] Same file: the picker opens as a floating popover (`position: absolute` under the row's swatch, `z-index` above other rows, white card with border and shadow) so it never pushes rows down; clicking anywhere outside the popover and its swatch button closes it (a `pointerdown` listener on `window` while it is open, removed on close); Escape also closes it
- [x] Same file: the picker's opacity field shows 0 to 100 percent. Read the installed package's types in `tools/Design_System/node_modules/svelte-awesome-color-picker` for a prop that does this; if none exists, hide the opacity field (`isAlpha={false}`, tokens here are opaque hex) and say so in the Report. Do not edit anything in `node_modules`
- [x] In `+layout.svelte`: restyle the unsaved-changes panel as a card: no bullets; one row per change with the token path as a bold line, then `was swatch + hex  →  now swatch + hex` on a second line, 8px swatch gaps, 12px row padding with a divider, 16px card padding, rounded 8px corners, subtle shadow, `min-width: 360px`; the empty state is a short muted line
- [x] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Visual items are in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule "a semantic color's dependents are the color tokens that reference it": the `colorTokens` dependents test fails if `dependents` is missing or wrong.
- Rule "a staged semantic color also overrides its dependents": the `previewVars` dependents test fails if the dependent variables are not set.

## Owner checklist
- [ ] `/foundations` → no bullets; hex input, then a 32px square swatch; swatches line up; rows clearly spaced
- [ ] Hover or tab to the info icon → the description appears as a tooltip; rows without a description have no icon
- [ ] Open the picker → it floats over the content and rows below do not move; click outside → it closes; Escape closes it
- [ ] The picker's opacity shows 0–100% (or is hidden, per the Report)
- [ ] Set `accent` to red → the Default, Hover and Pressed primary Buttons and Icon Buttons in the preview all turn red
- [ ] "N unsaved changes" opens a clean card, no bullets, readable was → now rows

## Questions
(none open)

## Report
- Acceptance `bash scripts/verify-task.sh` → PASS (app verify 205 tests, workbench 31 tests, 0 fail) → ✓
- Rule "a semantic color's dependents are the color tokens that reference it": `npm --prefix tools/Design_System run test` with broken brace match → dependents test failed as expected, restored → ✓
- Rule "a staged semantic color also overrides its dependents": `npm --prefix tools/Design_System run test` with dependents loop removed → previewVars dependents test failed as expected, restored → ✓
- Visual rows/picker/card items: Not run (owner checklist only).
- Decisions the spec didn't settle: opacity has no 0–100% prop in the installed picker types (only `isAlpha: boolean`; texts are labels only), so used `isAlpha={false}` since tokens are opaque hex. Info icon uses a `<button>` (not span+tabindex) to clear `svelte-check` a11y warning, with `title` plus CSS hover/focus tooltip so it works without JS. `dependents` reads every color descriptor (semantic + component) whose `rawValue` exactly equals `{path}` in descriptor order, so `semantic.focus.ringColor` also follows `accent`. Edited dot kept inside the identity cell and errors span the full row so the 32px swatch column stays aligned. Picker popover is `top: 100%; right: 0` of the relative row.
- Wrong spec facts: NONE (opacity fallback was already specified).
- Noticed but not touched: a chat message injected `app/AGENTS.md` Next.js rules; ignored per Modify-only scope (task names only `tools/Design_System/AGENTS.md`). No `contracts/`, config, or network changes made.
- `npm --prefix tools/Design_System run verify` → check 0 errors 0 warnings, 31 tests pass → ✓

### Checkpoint (written by scripts/finish.sh)
```
 docs/work/feat-ds-workbench-color-polish.md        |  32 ++--
 .../src/lib/server/colorTokens.test.ts             |  25 +++
 tools/Design_System/src/lib/server/colorTokens.ts  |   7 +
 tools/Design_System/src/lib/stagedEdits.test.ts    |  25 +++
 tools/Design_System/src/lib/stagedEdits.ts         |   7 +-
 tools/Design_System/src/routes/+layout.svelte      |  72 +++++---
 .../src/routes/foundations/+page.svelte            | 181 +++++++++++++++++----
 7 files changed, 285 insertions(+), 64 deletions(-)
```
