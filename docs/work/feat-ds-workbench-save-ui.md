# Task: Workbench Save and Discard (1g)

Status: active
Branch: feat/ds-workbench-save-ui
Next: owner approves "What changes for you", then critics, then builder
Written against: 90770b4

## What changes for you
The top bar gets a working **Save** button and a **Discard** link next to "N unsaved changes". Save writes your staged color edits to `brands/default/tokens.json` all or nothing, then the web app on localhost shows them. The status slot then says "Saved N tokens HH:MM" for 5 seconds and clears; the count goes back to nothing. Discard clears the staged edits and says "Discarded N changes" with an **Undo** for 5 seconds. If the file changed on disk since the page loaded, Save stops, names `tokens.json`, writes nothing and offers **Review changes** and **Reload** (Reload re-reads the file and keeps your edits on top). If the file is read-only or the write fails, the message says nothing was written, stays until you dismiss it or a retry works, and your edits stay staged with a **Retry save**.

Two consequences to know: (1) Saving `accent` replaces its link to `primitive.color.accent` with a plain hex in `semantic.color.accent` (the save path from 1d does this; other things linked straight to the primitive do not change). (2) A color with opacity below 1 cannot be saved yet (tokens only allow `#rgb`/`#rrggbb`); Save fails with the package's message and the edit stays staged.

## Scope
**Modify only:**
- `tools/Design_System/src/lib/stagedEdits.ts`
- `tools/Design_System/src/lib/stagedEdits.test.ts`
- `tools/Design_System/src/lib/saveState.ts`
- `tools/Design_System/src/lib/saveState.test.ts`
- `tools/Design_System/src/lib/staged.svelte.ts`
- `tools/Design_System/src/routes/api/save/+server.ts`
- `tools/Design_System/src/routes/foundations/+page.server.ts`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `tools/Design_System/src/routes/+layout.svelte`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `app/` (including `app/packages/design-system/src/save-tokens.mjs`: call it, do not change it), the old `/design-system` editor route, `tools/Design_System/src/hooks.server.ts` and `src/lib/server/origin.ts` (the existing host and origin guard already covers POST)
- browser specs (`app/e2e/`): a follow-up task 1h adds them

**Delete (approved with this brief):** None.

## Size
Files touched: 9 (4 of them tests/new). Expected diff: ~350 lines. New tests: ~14.

## Risk
Triggers: writes files (via the existing `saveTokenEdits`, which also rewrites the gitignored `app/app/design-tokens.generated.css` and `brands/default/.needs-deploy`); a new POST endpoint on the workbench (127.0.0.1:5174 only). Review level: 2.

## Review
- Q1 serves the story: Save, Discard, the seven save states and Undo all trace to plan row 1g and `wireframes/save-states-v1` (plan line 40). Added by this brief, not in the row: Reload keeps staged edits on top (plan lines 40 and 142). Cut from the wireframe: flagging tokens whose file value also changed on Reload (the staged edit just wins; parked for slice 2).
- Q2 touches: `foundations/+page.server.ts` gains one field (`version`); `+layout.svelte` replaces the disabled Save button (line 43) and nothing else; staged-edit history semantics unchanged (`stagedEdits.ts` only gains functions). Saving rewrites `semantic.color.accent` from alias to literal (checked: `"$value": "{primitive.color.accent}"` in `brands/default/tokens.json`; `saveTokenEdits` uses scope `exception`, `save-tokens.mjs:76`).
- Q3 reuse: all disk logic is `saveTokenEdits`/`readTokens` (`save-tokens.mjs:26,47`), no new write code. Discard reuses undo history: it is one step on `past`, so Undo is `undoEdit`. The save-state names come from the wireframe, no new design.
- Q4 simplest: no form action or progressive enhancement, one `fetch` POST; no toast library; status timers live in the layout. Cuttable if the builder runs long: the "Review changes" button (it only opens the existing changes list).
- Q5 unspecified cases: (a) empty: Save and Discard are hidden at 0 changes. (b) Network failure or non-JSON reply: failed state, "Could not reach the workbench server. Nothing was written." (c) Edit staged while the "Discarded" Undo is showing: the Undo status clears (otherwise Undo would undo the new edit). (d) Save pressed twice: the button is disabled while saving. (e) Dark mode and viewport: out of slice.
- Q6 checks that could pass while broken: `verify-task.sh` runs `svelte-check` and `node --test` only (`scripts/verify-task.sh:37-39`), so the layout timers, the POST wiring and the preview-after-save are not tested by it. Mitigations: the pure functions carry the rules and are tested (below); 1h adds browser specs for Discard and Undo; Save-writes-the-file stays owner checklist because specs must not write `tokens.json` (`docs/rules/e2e.md:23`: "when Save lands, use a copy"; deciding that copy is 1h's job).
- Q7 undo and exposure: Save overwrites `tokens.json` (git-tracked, so `git checkout` reverts) and regenerates two gitignored files (`app/.gitignore:45,48`). New exposure: one POST route behind the existing guard (`origin.ts`: host must be an allowed `:5174` host, and Origin must match for POST). The endpoint takes `{ edits, loadedVersion }` only; the brand folder is fixed on the server, never read from the request. No shell, no secrets, no outbound requests.
- Q8 claims not fully verified: `saveTokenEdits` is called without `regenerate`, so it requires the brand dir to equal the active brand (`active-brand.json` = `default`, checked) and calls `buildActiveBrand` (writes `app/app/design-tokens.generated.css`, exists and gitignored, checked). Builder permissions (`.opencode/agents/builder.md:18-36`): every "Modify only" path is allowed (no `*.config.*`, `AGENTS.md`, `package.json`, `docs/*`); `check-brief.sh` enforces it. Not checked: that `invalidateAll()` re-runs the foundations load without a full reload (SvelteKit behavior; the owner checklist covers it).

## Steps
- [ ] Red then green, `stagedEdits.test.ts` first: `discardAll(state)` empties `staged` and pushes the old map onto `past` (so `undoEdit` restores it; with nothing staged it returns the same state); `rebaseOnFile(state, tokens)` where tokens are `{path, value}`: an entry whose staged hex equals the new file value (case-insensitive) is dropped, a surviving entry gets `was` set to the new file value, an entry whose path is gone is dropped, and when anything changed `past` and `future` are cleared; when nothing differs it returns the very same state object. Then add both to `stagedEdits.ts`.
- [ ] Red then green, `saveState.test.ts` first: `buildSaveBody(staged, loadedVersion)` returns `{ edits: [{ path, value: now }], loadedVersion }`; `describeSaveFailure(code, error)` returns `{ kind, message }` where `changed-on-disk` gives kind `"changed"` with a message naming `tokens.json` and saying nothing was written, `not-writable`, `write-failed` and `invalid` give kind `"failed"` with "Nothing was written." plus the server's text, and an unknown or missing code gives the generic "Nothing was written." failure; `savedLabel(count, date)` returns `Saved 1 token 14:05` / `Saved 3 tokens 14:05` (24-hour, zero-padded); `discardedLabel(count)` returns `Discarded 1 change` / `Discarded 3 changes`. Then add `saveState.ts` (pure, no Svelte, no fetch).
- [ ] `routes/foundations/+page.server.ts`: return `version` from `readTokens` beside `tokens` and `previewUrl`. `staged.svelte.ts`: add `loadedVersion` (get) and `sync(tokens, version)` that stores the version and applies `rebaseOnFile`, plus `discard()` calling `discardAll`. `foundations/+page.svelte`: an `$effect` that calls `stagedStore.sync(data.tokens, data.version)` whenever `data` changes (nothing else in that page changes).
- [ ] `routes/api/save/+server.ts`: `POST` only. Parse the JSON body in try/catch (bad JSON gives 400 `{ ok:false, code:"invalid", error }`); require `edits` to be a non-empty array and `loadedVersion` a string, else 400 the same way; call `saveTokenEdits({ brandDir, loadedVersion, edits })` with `brandDir` resolved from `process.cwd()` exactly as `foundations/+page.server.ts` does (`../../app/packages/design-system/brands/default`); return the result as JSON with status 200 for ok, 409 for `changed-on-disk`, 400 for `invalid`, 500 otherwise. Never take a path or brand from the request. Never throw (wrap in try/catch, 500 with `code:"write-failed"`).
- [ ] `routes/+layout.svelte`, replacing the disabled Save button: a status slot and buttons for the wireframe states: (1) 0 changes: nothing; (2) unsaved: the existing "N unsaved changes" button, **Discard**, **Save**; (3) saving: Save disabled and reads "Saving..."; (4) saved: `savedLabel` for 5 s, then clears; (5) discarded: `discardedLabel` plus **Undo** (calls `stagedStore.undo()`) for 5 s, cleared early when a new edit is staged; (6) failed: message stays until dismissed ("Dismiss") or a Save works, **Retry save** replaces Save; (7) changed on disk: message naming `tokens.json`, **Review changes** (opens the existing changes list) and **Reload** (`await invalidateAll()`; `sync` keeps staged edits on top). Save does `fetch("/api/save", { method: "POST", ... })` with `buildSaveBody`; on `ok` it awaits `invalidateAll()` (the page reloads the file and `sync` drops the now-equal staged entries) and then shows state 4 with the count the server returned; on any failure (including `fetch` throwing or a non-JSON reply) it shows state 6 or 7 from `describeSaveFailure`. Clear any pending timer before starting a new one. Keep accessible names stable: buttons are named exactly "Save", "Discard", "Undo", "Retry save", "Reload", "Review changes", "Dismiss".
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Everything visual or that writes `tokens.json` is in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: `discardAll` then `undoEdit` restores the staged map → test in `stagedEdits.test.ts` fails if Discard is not one history step.
- Rule: `rebaseOnFile` drops saved entries and keeps pending ones on top of the new file → tests in `stagedEdits.test.ts` fail if a saved edit stays counted or a pending one is lost.
- Rule: failure messages say nothing was written, and name `tokens.json` when it changed on disk → tests in `saveState.test.ts`.
- Not covered by an automated check (said plainly): the endpoint, the layout timers, the real file write. Browser specs for Discard and Undo come in 1h.

## Owner checklist
Start both servers (Claude gives the launch and stop commands with a free-port check). This edits a real file; the last step reverts it.
- [ ] On `/foundations` change `accent` with the picker → preview changes, top bar says "1 unsaved change" with Discard and Save.
- [ ] Press Save → "Saving..." then "Saved 1 token HH:MM", gone after about 5 s; `git diff --stat` shows only `app/packages/design-system/brands/default/tokens.json`; the web app on localhost shows the new accent.
- [ ] Stage another edit, change `tokens.json` by hand (any harmless edit), press Save → it stops, names `tokens.json`, says nothing was written; press Reload → your edit is still staged.
- [ ] `chmod a-w app/packages/design-system/brands/default/tokens.json`, press Save → "Nothing was written", edit stays staged, Retry save is offered; `chmod u+w` it back and Retry save works.
- [ ] Stage two edits, press Discard → "Discarded 2 changes" with Undo; Undo brings both back.
- [ ] Revert: `git checkout app/packages/design-system/brands/default/tokens.json`; `git status` is clean for that file.

## Questions
(none open)

## Report
