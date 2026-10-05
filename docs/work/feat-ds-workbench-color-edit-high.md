# Task: Color editing with live preview (1f, no saving)

Status: active
Branch: feat/ds-workbench-color-edit-high
Next: builder run (high effort) of the shared brief; compare with the other run
Written against: c18a08c

## What changes for you

On the workbench `/foundations` page each color row gets a square swatch next to a hex field; clicking the swatch opens the color picker. Typing any CSS color (name, `rgb()`, short hex) normalises it to hex. Every edit shows live in the preview iframe, appears in the changes list under "N unsaved changes", gets a marker dot on its row, and Cmd+Z undoes it. Nothing is saved: there is no Save or Discard button yet (task 1g).

## Scope

**Setup (done by Claude in `6d6d3d7`, not the builder):** installed `colord` and `svelte-awesome-color-picker` in `tools/Design_System` (the builder cannot edit `package.json` or run `npm install`).

**Modify only:**
- `tools/Design_System/src/lib/colorEdit.ts`
- `tools/Design_System/src/lib/colorEdit.test.ts`
- `tools/Design_System/src/lib/stagedEdits.ts`
- `tools/Design_System/src/lib/stagedEdits.test.ts`
- `tools/Design_System/src/lib/staged.svelte.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `tools/Design_System/src/routes/+layout.svelte`

**Shared message (inline, not a contracts/ change):** the workbench SENDS `{ type: "tokens", vars: { <cssVar>: <hex> } }` by `postMessage` to the preview iframe with targetOrigin exactly `http://localhost:3000` (never `"*"`); the preview already applies overrides only from the workbench origin (`app/app/workbench-preview/Preview.tsx:89-106`, allow-list in `app/lib/workbenchPreview.ts:1`).

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `app/` (no preview change needed), save states and Save/Discard (task 1g), dark values and Mode toggle, descriptions, Used by, child brands

**Delete (approved with this brief):** None.

## Size

Files touched: 7. Expected diff: ~250 lines. New tests: ~9.

## Risk

Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none. Review level: 1.

## Review

- Q1 serves the story, with one extra: the plan row asks for Cmd+Z only (plan line 122), the brief also adds Shift+Cmd+Z redo. Owner decision 2026-10-04: keep redo. The rest traces to the 1f row.
- Q4 simplest version: keep the pure `colorEdit.ts` and `stagedEdits.ts` (they carry the testable rules) (redo kept by owner decision); the shared `staged.svelte.ts` store and the `+layout.svelte` edit are needed because the top bar lives in the layout (`+layout.svelte:12-15`) and the page cannot reach it otherwise.
- Q6 checks can pass while broken: the only gate is `verify-task.sh`, which runs `svelte-check` plus `node --test` for the workbench (`scripts/verify-task.sh:37-39`), so the iframe message, the resend on `load`, and the keyboard handling have no automated test. Fix applied: a pure `previewVars(tokens, staged)` in `stagedEdits.ts` with its own test (staged hex wins, untouched tokens keep the file value), so at least the message content is covered; the rest stays on the owner checklist.
- Q6 also: the owner checklist item "preview updates at once" is the only proof the target origin and `load` resend work; kept, now also asks to reload the page with an edit staged.
- Open for the owner: nothing blocking; the two notes under Questions are for 1g and the picker look, not for this build.

## Steps

- [ ] Red then green: write `tools/Design_System/src/lib/colorEdit.test.ts` first (valid CSS colors normalise to lowercase `#rrggbb`; invalid input returns null and keeps the old value; empty/whitespace returns null), watch it fail on `npm test`, then add `colorEdit.ts` (pure function using `colord`, no Svelte) until green
- [ ] Red then green: write `tools/Design_System/src/lib/stagedEdits.test.ts` first (stage records path with was/now; staging the same value as the file value clears the entry; undo restores the previous staged value; redo re-applies it; undo or redo with empty history is a no-op; `previewVars(tokens, staged)` returns the staged hex for edited tokens and the file value for the rest), watch it fail, then add `stagedEdits.ts` (pure state functions, no Svelte) until green
- [ ] In `tools/Design_System/src/routes/foundations/+page.svelte` (today rows render at lines 52-72): each row keeps its swatch and gets a hex input beside it; clicking the swatch opens `svelte-awesome-color-picker`; committing the field (Enter/blur) or picking normalises via `colorEdit.ts`, invalid input keeps the staged value and shows a short message; staged edits live in a small shared store `tools/Design_System/src/lib/staged.svelte.ts` (Svelte runes wrapper around the pure `stagedEdits.ts` functions, keyed by token path, original plus current hex) so the count survives moving to another page; edited rows get a marker dot
- [ ] In the same page: on every staged change post `{ type: "tokens", vars }` (cssVar per token from `tools/Design_System/src/lib/server/colorTokens.ts:13-22`, staged hex where edited else file value) to the iframe's `contentWindow` with targetOrigin exactly `http://localhost:3000`, and also once on the iframe's `load` event (a message sent before the preview has loaded, or after it reloads, is lost, so staged values must be re-sent); in `+layout.svelte` the top bar shows "N unsaved changes" next to the existing disabled Save button (leave that button as is, 1g wires it); clicking the text opens the before/after list (path, was/now, swatch beside each hex); Cmd+Z undoes and Shift+Cmd+Z redoes staged edits (ignored while a text field has focus, so the browser's own text undo still works there); no Discard control and no save states (1g)
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks

(The builder can only run `bash scripts/verify-task.sh` and read-only git. Everything visual is in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- For logic: the normalisation rule (any CSS color becomes lowercase hex, invalid keeps the old value) names the `colorEdit` tests that fail if the rule is broken
- For logic: the staged-edit rule (stage/undo/redo, same-as-file clears the entry, empty undo is a no-op) names the `stagedEdits` tests that fail if the rule is broken

## Owner checklist

- [ ] Both apps up, `/foundations` open → each color row shows a square swatch plus a hex field
- [ ] Click a swatch → picker opens; pick a color → row value, preview iframe, and changes list all update at once
- [ ] Type a color name (e.g. `red`) in a hex field and commit → it becomes its hex value; type nonsense → old value kept with a short message
- [ ] Top bar shows "N unsaved changes" → click it → before/after list with was/now and swatches
- [ ] Cmd+Z undoes the last staged edit (preview follows); Shift+Cmd+Z redoes it
- [ ] Stage an edit, then reload the page → the staged color is gone (nothing is saved) and the preview shows file values; stage an edit, switch to a Component page and back → the count is still there
- [ ] Edited rows show a marker dot; the Save button stays disabled and there is no Discard (that is 1g)

## Questions

- Semantic tokens in `brands/default/tokens.json` are references like `{primitive.color.paper}`, not hex. 1f only overrides the preview's CSS variable with a hex; whether Save (1g) writes the hex over the reference or edits the primitive is a 1g decision, flagged here so it is not forgotten.
- Picker look: native fallback allowed if `svelte-awesome-color-picker` fights the design (plan Open item).

## Report

<Filled by the builder when done, see docs/rules/executor.md: commit, git diff --stat, verify footer, one line
per acceptance check (command → observed → ✓/✗), Decisions the spec didn't settle (or NONE), wrong spec facts,
anything noticed but not touched. Mark anything not run as `Not run`.>
