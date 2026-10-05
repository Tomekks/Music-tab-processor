# Task: Workbench save bar and browser specs (1g-ui)

Status: active
Branch: feat/ds-workbench-save-bar
Next: run `bash scripts/finish.sh`, then Claude runs the specs and the owner checklist.
Written against: ca2d462 (round 2; code from 939d8d8 still in place)

## What changes for you
The top bar gets a working **Save** button and a **Discard** link beside "N unsaved changes". Save writes your staged color edits to `tokens.json` through the endpoint from 1g, then the page reloads the file; the status slot says "Saved 5" counting down 4, 3, 2, 1 with a **Revert** button (owner change 2026-10-05, replaces the "Saved N tokens HH:MM" label); Revert writes the previous hex values back and says "Reverted" for 5 seconds, and a token that was linked to a primitive stays a plain hex (decided 2026-10-05: no exact-file restore). Discard clears the staged edits and says "Discarded N changes" with an **Undo** for 5 seconds. If the file changed on disk since the page loaded, Save stops, names `tokens.json`, writes nothing and offers **Review changes** and **Reload** (Reload re-reads the file and keeps your edits on top). If the file is read-only or the write fails, the message says nothing was written, stays until you press **Dismiss** or a retry works, your edits stay staged, and **Retry save** replaces Save. After this task the browser specs also cover Save, Discard, Undo and both failure states, against a throwaway copy of the brand folder, never the real `tokens.json`.

Decision 2026-10-05: on an edited row whose token is linked to a primitive (value like `{primitive.color.x}` in the file), show "Will unlink from main" next to "Edited"/Reset. Saving it replaces the link with its own hex and never changes the primitive (kept deliberately). Decided: `listColorTokens` gains `isAlias: boolean` (straight from `descriptor.isAlias`, `field-descriptors.mjs:112`; the label is fixed text, the target path is never shown); the page shows the label when the row is staged and `isAlias` is true. Reconnect-to-main is parked for slice 2.

## Scope
**Setup done by Claude before the build (the builder cannot edit config):** `app/playwright.workbench.config.ts` creates a copy of `brands/default` in the OS temp folder when the config loads, sets `process.env.WORKBENCH_BRAND_DIR` to it, only when that variable is not already set because Playwright workers load the config again and inherit the parent's env (so the workbench server, started by the same config, and the specs both see it), and nothing else changes.

**Modify only:**
- `tools/Design_System/src/lib/server/colorTokens.ts` 
- `tools/Design_System/src/lib/server/colorTokens.test.ts`
- `tools/Design_System/src/lib/saveState.ts`
- `tools/Design_System/src/lib/saveState.test.ts`
- `tools/Design_System/src/routes/+layout.svelte`
- `tools/Design_System/src/routes/foundations/+page.svelte`
- `app/e2e/workbench/save.spec.ts`
- `app/e2e/workbench/helpers.ts`

**Do NOT touch:**
- `contracts/`, config, secrets, `package.json`, `docs/*`, anything not listed above
- `app/` other than the two e2e files, the package layer, the endpoint and store from 1g (call them, do not change them)

**Delete (approved with this brief):** None.

## Size
Files touched: 8 (same files in round 2). Expected diff: ~450 lines. New tests: ~8 unit, ~7 browser.

## Risk
Triggers: none added by this task (it calls the 1g endpoint; specs write only to the temp copy). Review level: 1.

## Review
Level 1 (questions 1, 4, 6), 2026-10-05.
- Q1 serves the story: Save, Discard, Undo and the seven states trace to plan row 1g and `wireframes/save-states-v1`. The disabled Save at `routes/+layout.svelte:52` is the only thing being replaced; 1g's `sync`/`discard`/`loadedVersion` exist at `staged.svelte.ts` (merged, `9edd6f8`). "Will unlink from main" traces to the 2026-10-05 owner decision, not the wireframe.
- Q4 simplest: `foundations/+page.svelte` already has an `$effect` on `data.tokens` (`+page.svelte:46-54`, only resets list height), so the new `sync` effect is a separate small `$effect`, not an edit of it. Cuttable without losing the story: nothing except the "Review changes" button could reuse the existing changes popover (`+layout.svelte:57`); keep it, it is already built.
- Q6 FIXED in the brief: the planned `playwright.workbench.config.ts` setup ("copy at config load, set `process.env`") would run again in each Playwright worker (workers load the config file), giving specs a different temp copy than the server edits, so Save specs would read the wrong file. Brief now says: only create the copy when `WORKBENCH_BRAND_DIR` is not already set (workers inherit the parent's env).
- Q6 also: unit tests (`saveState.test.ts`) cannot catch a broken top bar; only the five browser specs do, and the brief already requires breaking each behavior once to watch its spec fail (`docs/rules/e2e.md`). Not covered at all: the "Will unlink" label; it gets a `colorTokens.test.ts` test for `isAlias` but no browser spec (add one line to the Save spec: after staging `accent`, the label shows).
- Not checked: `invalidateAll()` re-running `load` on a SvelteKit page (brief says this already; the Save spec "count back to nothing" will prove it end to end).

## Steps
- [x] Red then green, `saveState.test.ts` first: `buildSaveBody(staged, loadedVersion)` returns `{ edits: [{ path, value: now }], loadedVersion }`; `describeSaveFailure(code, error)` (`code` and `error` are the `code` and `error` strings of the endpoint's JSON reply, `save/+server.ts:13`; both may be undefined) returns `{ kind, message }`: `changed-on-disk` gives kind `"changed"` with a message naming `tokens.json` and saying nothing was written; `not-writable`, `write-failed` and `invalid` give kind `"failed"` with "Nothing was written." plus the server's text; an unknown or missing code gives the generic "Nothing was written." failure; `savedLabel(count, date)` returns `Saved 1 token 14:05` / `Saved 3 tokens 14:05` (24-hour, zero-padded); `discardedLabel(count)` returns `Discarded 1 change` / `Discarded 3 changes`. Then add `saveState.ts` (pure, no Svelte, no fetch).
- [x] Red then green, `colorTokens.test.ts` first: `accent` (alias in the real file) has `isAlias` true; a literal-hex token has `isAlias` false. Then add `isAlias` to `ColorToken`/`listColorTokens`.
- [x] `foundations/+page.svelte`: show "Will unlink from main" beside "Edited"/Reset for staged rows with `isAlias`; and an `$effect` calling `stagedStore.sync(data.tokens, data.version)` whenever `data` changes (nothing else in that page changes).
- [x] `routes/+layout.svelte`, replacing the disabled Save button, the seven states of `wireframes/save-states-v1`: (1) 0 changes: the existing "0 unsaved changes" count button stays (existing specs `colors.spec.ts:28,90,232` assert it), with no Discard or Save beside it; (2) unsaved: the existing "N unsaved changes" button, **Discard**, **Save**; (3) saving: Save and Discard both disabled (wireframe `save-states-v1` line 200, so the bar does not jump) and Save reads "Saving..."; (4) saved: `savedLabel` for 5 s, then clears; (5) discarded: `discardedLabel` plus **Undo** (`stagedStore.undo()`) for 5 s, cleared early when a new edit is staged; (6) failed: message stays until "Dismiss" or a Save works, **Retry save** replaces Save; (7) changed on disk: message naming `tokens.json`, **Review changes** (opens the existing changes list) and **Reload** (`await invalidateAll()`; `sync` keeps staged edits on top; afterwards the message is gone and the bar shows state 2, or state 1 if no edit is left). Save does `fetch("/api/save", { method: "POST", ... })` with `buildSaveBody` and `stagedStore.loadedVersion`; on `ok` it awaits `invalidateAll()` and then shows state 4 with the count the server returned; any failure (including `fetch` throwing or a non-JSON reply) shows state 6 or 7 from `describeSaveFailure`. Clear any pending timer before starting a new one. Accessible names are exactly "Save", "Discard", "Undo", "Retry save", "Reload", "Review changes", "Dismiss".
- [x] `app/e2e/workbench/save.spec.ts` plus a `resetBrandCopy()` helper in `helpers.ts` (copies the real `brands/default/tokens.json` over the file in `process.env.WORKBENCH_BRAND_DIR` before each test; throws if the variable is unset so a spec can never write the real file): stage `accent` and Save → "Saved 1 token", count back to nothing, the copy's `tokens.json` holds the new hex; Discard → "Discarded 1 change", field back to the file value, Undo brings the edit back; change the copy by hand while an edit is staged, Save → message naming `tokens.json`, copy unchanged by Save, Reload keeps the staged edit and the message disappears; make the copy read-only, Save → "Nothing was written", edit stays staged, `chmod` back, Retry save works; a stage while "Discarded" shows clears the Undo; staging `accent` shows "Will unlink from main" beside Reset.
- [x] ROUND 2 (owner changes 2026-10-05; supersedes the "(4) saved" wording above). Red then green, `saveState.test.ts` first: replace `savedLabel` with `savedLabel(secondsLeft)` returning `Saved 5` ... `Saved 1`, and add `revertBody(before, loadedVersion)` returning `{ edits: [{ path, value: was }], loadedVersion }` for the `before` list `[{ path, was }]`. Then update `saveState.ts`.
- [x] ROUND 2, `routes/+layout.svelte`: before Save runs, remember `before = [{ path, was }]` for every staged entry. After a successful Save and `invalidateAll()`, state 4 shows `savedLabel(n)` counting down once a second from 5 to 1 (one `setInterval`, cleared with the other timers), then clears, with a **Revert** button (accessible name exactly "Revert"). Revert POSTs `revertBody(before, stagedStore.loadedVersion)` to `/api/save`, then `invalidateAll()` and shows "Reverted" for 5 seconds with no button; a failed Revert shows the `describeSaveFailure` message with only **Dismiss** (no Retry save, Discard, Review changes or Reload: nothing is staged after a Save, so those would do nothing). Staging a new edit while "Saved" shows clears it, like Discarded. Remove the old "Saved N tokens HH:MM" text and `savedLabel(count, date)` usages.
- [x] ROUND 2, `foundations/+page.svelte`: "Will unlink from main" gets the same size as the Reset button next to it (reuse Reset's class or copy its font-size, height and padding; no new colors).
- [x] ROUND 2, `save.spec.ts`: update the Save spec (text is now `Saved` followed by a number, not "Saved 1 token"); add: after Save, "Revert" writes the old RESOLVED hex (`#ae97f7`) into the copy's `semantic.color.accent` as a plain value (not the `{primitive.color.accent}` link, per the decision) and shows "Reverted"; the countdown goes away after 5 seconds (use `page.clock` to move time, not a real 5 s wait).
- [ ] Run `bash scripts/verify-task.sh` until PASS

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Claude runs the specs.)
- Run: `bash scripts/verify-task.sh` / Expected: `verify-task: PASS`
- Rule: failure kinds and labels → `saveState.test.ts` fails if a message stops saying nothing was written or stops naming `tokens.json`, or if `changed-on-disk` stops returning kind `"changed"` (assert `kind` in every case).
- Claude after the build: `lsof -i :3000 -i :5174` clear, then `cd app && npm run test:e2e:workbench` / Expected: all specs pass; Claude breaks each new behavior once (round 1's five, plus Revert and the countdown) to see its spec fail (`docs/rules/e2e.md`); `git status` shows the real `brands/default/tokens.json` untouched.

## Owner checklist
Looks and feel only (specs check behavior); this uses the real file, so the last step reverts it.
- [ ] On `/foundations` change `accent`, press Save → status reads "Saved" with a countdown 5 to 1 and a Revert button, then clears; `git diff --stat` shows only `app/packages/design-system/brands/default/tokens.json`; the web app on localhost shows the new accent.
- [ ] Press Save then Revert within 5 s → "Reverted"; `git diff` shows `semantic.color.accent` as a plain `#...` value (the link is not restored, expected).
- [ ] Press Discard on another edit → "Discarded 1 change" and Undo; the layout of the top bar does not jump between states.
- [ ] Revert: `git checkout app/packages/design-system/brands/default/tokens.json`; `git status` is clean for that file.

## Questions
(none open; round 2 deepseek#max critic asked 5, all real and folded in (glm-5.3-flash#high re-read the amended brief: "clear"): stale Next line, failed Revert shows Dismiss only, spec asserts the resolved hex, checklist updated, break-each wording.)

## Report

### Builder ROUND 2 (2026-10-05)
- `bash scripts/verify-task.sh` → verify-task: PASS ✓ (typecheck ✓ lint ✓ unit 65/65 design-system 142/142; e2e not run by verify script)
- Rule (failure kinds and labels) → `saveState.test.ts` asserts `kind` in every case plus `tokens.json` naming and "Nothing was written." text; covered by verify unit run ✓
- Break-each (round 2): `savedLabel` text broken → `savedLabel counts down from Saved 5 to Saved 1` failed ✓ (restored); `revertBody` value mapped to path → both `revertBody` tests failed ✓ (restored)
- Claude e2e + break-each-behavior + real `tokens.json` untouched → Not run (for Claude: `cd app && npm run test:e2e:workbench`)
- Decisions the spec didn't settle: Saved countdown uses one `setInterval` only (no parallel timeout; final tick clears when seconds drop below 1, `clearTimer` clears it with the other timers); failed Revert uses a new `revert-failed` status showing only Dismiss; `reverted` clears only via its own 5 s timeout (spec required early-clear only for Saved/Discarded); "Will unlink" copies only Reset's 12 px font-size into `.unlink` (no color, no underline/pointer) instead of reusing the button class; countdown spec installs `page.clock` after page open but before Save; the read-only Retry spec's `Saved 1 token` assert was updated to the new `Saved [1-5]` text as a forced follow-on in the same file.
- Spec fact wrong: NONE found (resolved `#ae97f7` taken from the brief; the Revert spec will prove it end to end).
- Noticed but not touched: NONE new (round 1 files `colorTokens.ts`/`helpers.ts` left as committed).

### Builder re-run (2026-10-05, code kept from 939d8d8, no source rewrite)
- `bash scripts/verify-task.sh` → verify-task: PASS ✓
- Rule (failure kinds and labels) → `saveState.test.ts` asserts `kind` in every case plus `tokens.json` naming and "Nothing was written." text; covered by verify unit run ✓
- Claude e2e + break-each-behavior + real `tokens.json` untouched → Not run (builder cannot run e2e; for Claude)
- Decisions the spec didn't settle: NONE (no code changed in this re-run)
- Spec fact wrong: NONE found in this re-run
- Noticed but not touched: `git log` shows code commit 939d8d8 sits below docs commits 1844ff7..09219ca; drift check `git diff --stat 08d85d4..HEAD` shows only this task file, so Modify-only files are untouched since the build.

### Checkpoint (written by scripts/finish.sh)
```
 app/e2e/workbench/helpers.ts                       |  16 +++
 app/e2e/workbench/save.spec.ts                     | 103 ++++++++++++++++++
 docs/work/feat-ds-workbench-save-bar.md            |   3 +
 tools/Design_System/src/lib/saveState.test.ts      |  69 +++++++++++++
 tools/Design_System/src/lib/saveState.ts           |  55 ++++++++++
 .../src/lib/server/colorTokens.test.ts             |   6 ++
 tools/Design_System/src/lib/server/colorTokens.ts  |   2 +
 tools/Design_System/src/routes/+layout.svelte      | 115 ++++++++++++++++++++-
 .../src/routes/foundations/+page.svelte            |   7 ++
 9 files changed, 375 insertions(+), 1 deletion(-)
---
VERIFY: PASS
  ran:     typecheck ✓  lint ✓  unit 65/65 (4 files)  design-system 142/142 (11 files)  build not run (use --full)  (207 tests, 5s)
  not run: e2e (12 specs; npm run test:e2e)
pre-commit: OK
```

### Checkpoint (written by scripts/finish.sh)
```
 docs/work/feat-ds-workbench-save-bar.md | 25 ++++++++++++++++++-------
 1 file changed, 18 insertions(+), 7 deletions(-)
```

### Checkpoint (written by scripts/finish.sh)
```
 app/e2e/workbench/save.spec.ts                     | 27 +++++++-
 docs/work/feat-ds-workbench-save-bar.md            | 22 +++++--
 tools/Design_System/src/lib/saveState.test.ts      | 41 ++++++++++--
 tools/Design_System/src/lib/saveState.ts           | 19 ++++--
 tools/Design_System/src/routes/+layout.svelte      | 75 ++++++++++++++++++++--
 .../src/routes/foundations/+page.svelte            |  5 +-
 6 files changed, 160 insertions(+), 29 deletions(-)
---
VERIFY: PASS
  ran:     typecheck ✓  lint ✓  unit 65/65 (4 files)  design-system 142/142 (11 files)  build not run (use --full)  (207 tests, 7s)
  not run: e2e (12 specs; npm run test:e2e)
pre-commit: OK
```
