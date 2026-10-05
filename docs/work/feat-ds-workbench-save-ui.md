# Task: Workbench save endpoint and staged-edit logic (1g)

Status: active
Branch: feat/ds-workbench-save-ui
Next: builder (Muse #high). Critic 1 (Muse, default effort) said "clear" 2026-10-05; deepseek critic optional. Owner approved "What changes for you" 2026-10-05; master (with 1g0) merged in.
Written against: 416882f (master merged, includes 1g0)

Split decided 2026-10-04: 1g is the server side and the staged-edit logic (this file); 1g-ui (`feat-ds-workbench-save-bar.md`) is the top-bar Save/Discard/status UI plus its browser specs. 1g-ui is built after this one.

## What changes for you
Nothing you can see yet. The workbench server gets a `POST /api/save` that writes staged color edits to `brands/default/tokens.json` all or nothing (using the 1d save path), and the staged-edit store learns two things the top bar will use in 1g-ui: Discard as one undoable step, and "re-base on the file" after a reload or save (edits equal to the new file value drop out, the others keep going on top). It also gains one safe switch for testing: if the workbench is started with `WORKBENCH_BRAND_DIR=<absolute path>` it reads and saves that folder instead of the real `default` brand and skips rebuilding the web app's CSS. That lets browser specs save against a throwaway copy. Without the variable, behavior is as today.

To know: saving `accent` replaces its link to `primitive.color.accent` with a plain hex in `semantic.color.accent` (owner decision 2026-10-04, re-confirmed 2026-10-05 after a mix-up: deliberate, a child color edit must never change the primitive it linked to; do not "fix" this by editing the primitive; Reconnect-to-main is parked for slice 2, the "Will unlink from main" label is in 1g-ui). Opacity is removed first by 1g0 (`feat-ds-workbench-no-opacity.md`), so every staged color is one the token file accepts. **Order: merge 1g0 into master, merge master into this branch, then build 1g** (1g-ui, not this task, edits `foundations/+page.svelte` too).

## Scope
**Modify only:**
- `tools/Design_System/src/lib/server/brandDir.ts`
- `tools/Design_System/src/lib/server/brandDir.test.ts`
- `tools/Design_System/src/routes/api/save/+server.ts`
- `tools/Design_System/src/routes/foundations/+page.server.ts`
- `tools/Design_System/src/lib/stagedEdits.ts`
- `tools/Design_System/src/lib/stagedEdits.test.ts`
- `tools/Design_System/src/lib/staged.svelte.ts`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `app/` (including `app/packages/design-system/src/save-tokens.mjs`: call it, do not change it), the old `/design-system` editor route, `tools/Design_System/src/hooks.server.ts` and `src/lib/server/origin.ts` (the existing host and origin guard already covers POST)
- any `.svelte` file and `app/e2e/` (task 1g-ui)

**Delete (approved with this brief):** None.

## Size
Files touched: 7 (3 of them new or test). Expected diff: ~230 lines. New tests: ~12.

## Risk
Triggers: writes files (via the existing `saveTokenEdits`, which also rewrites the gitignored `app/app/design-tokens.generated.css` and `brands/default/.needs-deploy`); a new POST endpoint on the workbench (127.0.0.1:5174 only); one environment variable that changes which folder is written. Review level: 2.

## Review
- Q1 serves the story: Save, Discard-as-undo and re-base trace to plan row 1g and `wireframes/save-states-v1` (plan line 40). Not in the plan row: `WORKBENCH_BRAND_DIR`, added because `docs/rules/e2e.md:23` says specs must save against a copy and the server hard-codes the brand folder (`foundations/+page.server.ts:9`). Cut from the wireframe: flagging tokens whose file value also changed on Reload (the staged edit wins; parked for slice 2).
- Q2 touches: `foundations/+page.server.ts` gains `version` and takes its folder from `brandDir()` (same default path as today, `+page.server.ts:8`); `stagedEdits.ts` and `staged.svelte.ts` only gain functions, existing history behavior unchanged (existing tests stay green). Saving rewrites `semantic.color.accent` from alias to literal (`brands/default/tokens.json` has `"$value": "{primitive.color.accent}"`; `saveTokenEdits` uses scope `exception`, `save-tokens.mjs:76`).
- Q3 reuse: all disk logic is `saveTokenEdits`/`readTokens` (`save-tokens.mjs:26,47`), no new write code. Discard is one step on the existing `past` list, so Undo is `undoEdit`. `saveTokenEdits` already supports the copy case: it refuses a non-active brand unless `regenerate` is injected (`save-tokens.mjs:63-71`), which `brandDir.ts` provides.
- Q4 simplest: no form action, one `fetch`-style POST route; the env switch is two small functions. Cuttable: nothing without losing the "specs save against a copy" rule; if cut, 1g-ui's Save specs would have to write the real file.
- Q5 unspecified cases: (a) `WORKBENCH_BRAND_DIR` set but relative or without `tokens.json`: throws a message naming the variable and the path (tested). (b) Bad JSON, missing `edits`, non-string `loadedVersion`: 400 `invalid`. (c) `discardAll` with nothing staged: same state back. (d) `rebaseOnFile` when nothing differs: same object back, so no needless re-render. (e) Dark mode and viewport: not applicable, no UI.
- Q6 checks that could pass while broken: `verify-task.sh` runs `svelte-check` and `node --test` only (`scripts/verify-task.sh:37-39`) and the route handler is not unit-tested. Mitigation: Claude, after the build, starts the workbench with `WORKBENCH_BRAND_DIR` pointing at a copy in the scratchpad and curls the endpoint for success, stale version, read-only file and bad body (listed below); 1g-ui's browser specs then exercise it end to end.
- Q7 undo and exposure: with the variable unset, Save overwrites `tokens.json` (git-tracked, `git checkout` reverts) and regenerates two gitignored files (`app/.gitignore:45,48`). The variable is read only from the server's own environment, never from a request; with it set, nothing under `app/` is rewritten except inside that folder. New exposure: one POST route behind the existing guard (`origin.ts`: allowed `:5174` host and matching Origin for POST). The endpoint accepts `{ edits, loadedVersion }` only. No shell, no secrets, no outbound requests.
- Q8 claims not fully verified: `saveTokenEdits` without `regenerate` needs the brand dir to equal the active brand (`active-brand.json` is `default`, checked); `buildActiveBrand` writes `app/app/design-tokens.generated.css` (exists, gitignored, checked). Builder permissions (`.opencode/agents/builder.md:18-36`): no "Modify only" path matches a deny rule (no `*.config.*`, `AGENTS.md`, `package.json`, `docs/*`); `check-brief.sh` enforces it. Not checked: that `invalidateAll()` reloads the page data (used in 1g-ui, not here).

## Steps
- [ ] Red then green, `brandDir.test.ts` first: `brandDir()` returns `<cwd>/../../app/packages/design-system/brands/default` resolved when `WORKBENCH_BRAND_DIR` is unset; returns that variable's value when it is an absolute path to a folder containing `tokens.json`; throws an Error naming `WORKBENCH_BRAND_DIR` and the path when it is relative or has no `tokens.json`; `regenerateFor()` returns `undefined` when the variable is unset and a function that does nothing when it is set. Tests must set and restore `process.env` themselves. Then add `lib/server/brandDir.ts` (reads `process.env` at call time, not import time).
- [ ] Red then green, `stagedEdits.test.ts` first: `discardAll(state)` empties `staged` and pushes the old map onto `past` (so `undoEdit` restores it; with nothing staged it returns the same state); `rebaseOnFile(state, tokens)` where tokens are `{path, value}`: an entry whose staged hex equals the new file value (case-insensitive) is dropped, a surviving entry gets `was` set to the new file value, an entry whose path is gone is dropped, and when anything changed `past` and `future` are cleared; when nothing differs it returns the very same state object. Then add both to `stagedEdits.ts`.
- [ ] `staged.svelte.ts`: add `loadedVersion` (get) and `sync(tokens, version)` that stores the version and applies `rebaseOnFile`, plus `discard()` calling `discardAll`. Nothing else changes.
- [ ] `foundations/+page.server.ts`: use `brandDir()` instead of the inline path, and return `version` from `readTokens` beside `tokens` and `previewUrl`.
- [ ] `routes/api/save/+server.ts`: `POST` only. Parse the JSON body in try/catch (bad JSON gives 400 `{ ok:false, code:"invalid", error }`); require `edits` to be a non-empty array and `loadedVersion` a string, else 400 the same way; call `saveTokenEdits({ brandDir: brandDir(), loadedVersion, edits, regenerate: regenerateFor() })`; return the result as JSON with status 200 for ok, 409 for `changed-on-disk`, 400 for `invalid`, 500 otherwise. Never take a path or brand from the request. Never throw (wrap in try/catch, 500 with `code:"write-failed"` and the message).
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. The endpoint check is Claude's, after the build.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: `discardAll` then `undoEdit` restores the staged map → test in `stagedEdits.test.ts` fails if Discard is not one history step.
- Rule: `rebaseOnFile` drops saved entries and keeps pending ones on top of the new file → tests in `stagedEdits.test.ts`.
- Rule: a bad `WORKBENCH_BRAND_DIR` is refused with a message; unset means today's folder → tests in `brandDir.test.ts`.
- Claude after the build, against a copy of the brand folder in the scratchpad (`lsof -i :5174` clear first; server started with `WORKBENCH_BRAND_DIR=<copy>`; the copy is deleted afterwards): `curl -s -X POST http://127.0.0.1:5174/api/save -H 'Origin: http://127.0.0.1:5174' -H 'Content-Type: application/json' -d '{"edits":[{"path":"semantic.color.accent","value":"#112233"}],"loadedVersion":"<version from /foundations data>"}'` → `{"ok":true,"saved":1,...}`; the same call again with the old version → HTTP 409 `changed-on-disk`; with the copy's `tokens.json` made read-only → `not-writable` and the file unchanged; with a bad body → 400; `git status` shows the real `brands/default/tokens.json` untouched.
- Not covered by an automated check (said plainly): the route handler itself; 1g-ui's specs cover it end to end.

## Owner checklist
None for this task: nothing visible changes. The owner checks for Save and Discard are in 1g-ui.

## Questions
(none open; Muse critic 2026-10-05 answered "clear")

## Report
