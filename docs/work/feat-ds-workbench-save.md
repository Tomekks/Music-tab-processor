# Task: design system workbench, save path in the package layer (slice 1, task 1d)

Status: active
Branch: feat/ds-workbench-save
Next: run `/review` (Level 2: eight answers under `## Review`), owner approves "What changes for you", then `scripts/delegate.sh`.
Written against: f7ad06d

## What changes for you
Nothing visible yet: no screen uses it until tasks 1e and 1f. A new file in the design system package (`save-tokens.mjs`) can read `brands/default/tokens.json` and save a batch of color edits to it safely: all or nothing, refusing if someone changed the file since it was read (git, another session), refusing if the file is read-only, and rebuilding the web app's CSS afterwards. The old editor and its API route are not touched and keep working.

## Scope
**Modify only:**
- `app/packages/design-system/src/save-tokens.mjs`
- `app/packages/design-system/src/save-tokens.test.mjs`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above
- the old editor (`app/app/design-system/`, `app/app/api/design-system/`), `token-writes.mjs`, `build-tokens.mjs` (import from them, do not edit them), `tools/`

## Size
Files touched: 2 (both new). Expected diff: ~150 lines code, ~200 lines tests. New tests: 8.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): writes files (`tokens.json`, the generated CSS, the `.needs-deploy` flag). No deletes of user data (it removes only its own temp file), no network, no schema change, no deploy, no secrets. Review level: 2.

## Design (what the builder implements; reuse, do not rewrite)
Reuse as-is: `applyBatchWrite` and `stringifyTokens` (`token-writes.mjs`; round trip of today's `tokens.json` is byte-identical, checked 2026-10-04), `resolveBrandTree`, `buildActiveBrand`, `markNeedsDeploy` (`build-tokens.mjs`). Same temp-file-then-rename idea as `atomicWriteString` in the old route (`app/app/api/design-system/tokens/route.ts:38`), which is not importable (inside a Next route), so the few lines are repeated here.

Two exported functions, plain Node (`node:fs`, `node:crypto`), no new dependency:

1. `readTokens(brandDir)` returns `{ tree, version }`: `tree` is the parsed `tokens.json`, `version` is the SHA-256 hex of the file's exact bytes. Missing or invalid JSON throws a clear message naming the file.
2. `saveTokenEdits({ brandDir, loadedVersion, edits, regenerate = buildActiveBrand })` where `edits` is `[{ path, value }]`. Returns `{ ok: true, saved, version }` (`saved` = number of distinct paths; `version` = the new file's hash for the next save) or `{ ok: false, code, error }` with `code` one of `invalid` / `not-writable` / `changed-on-disk` / `write-failed`. Never throws for these cases. Steps, in this order, each stopping the save at its first failure:
   1. Reject a child brand (`resolveBrandTree(brandDir).parentBrandDir` is set): out of scope for slice 1, code `invalid`.
   2. Validate with `applyBatchWrite(tree, edits.map(e => ({...e, scope: "exception"})))`: unknown path, non-hex color, empty list. Code `invalid`; nothing touched.
   3. File not writable (`accessSync(file, W_OK)` fails): code `not-writable`. A rename over a read-only file would succeed if the folder is writable, so this check is explicit.
   4. Hash the file again now; differs from `loadedVersion`: code `changed-on-disk`, the error names `tokens.json`. Nothing is overwritten.
   5. Write the new text to a temp file beside it, rename over `tokens.json`, read it back and compare with what was meant to be written. Any failure here: remove the temp file, restore the original bytes if the rename already happened, code `write-failed`.
   6. Call `regenerate()`. If it throws, restore the original `tokens.json` bytes and return `write-failed` with the reason (so a failed save never leaves new tokens beside old CSS).
   7. `markNeedsDeploy(brandDir)`, same as the old route.

Known gap, accepted: a change landing in the milliseconds between step 4 and the rename is not detected (single user, one machine).

## Review
(pending `/review`: eight answers, one line each, with evidence)

## Steps
- [ ] Failing tests first (`save-tokens.test.mjs`), each in a temp copy of `brands/default` (never the real file), `regenerate` injected so tests never write the real CSS
- [ ] `save-tokens.mjs`: `readTokens`
- [ ] `save-tokens.mjs`: `saveTokenEdits` per the Design list
- [ ] `bash scripts/verify-task.sh` passes; commit via `scripts/finish.sh`

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Put anything else in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: last line `verify-task: PASS`, design-system tests all pass including the 8 new ones.
- Each rule names the test that fails if the rule is broken (the test names below must exist in `save-tokens.test.mjs`):
  - `readTokens returns the tree and a hash that changes when the file changes`
  - `saveTokenEdits saves, rebuilds, and returns a new version that allows a second save`
  - `saveTokenEdits changes only the edited values (every other byte of the file is unchanged)`
  - `saveTokenEdits refuses an invalid value and an unknown path and writes nothing` (file bytes equal before and after)
  - `saveTokenEdits refuses a read-only file with not-writable and writes nothing` (`chmod 0o444`, restored in a `finally`)
  - `saveTokenEdits refuses when the file changed since it was read, names tokens.json, and does not overwrite` (file edited between `readTokens` and save; bytes still the other edit's)
  - `saveTokenEdits puts the old file back when regenerating fails` (injected `regenerate` throws; file equals original, no temp file left)
  - `saveTokenEdits refuses a child brand`

## Owner checklist
- [ ] Open `app/packages/design-system/src/save-tokens.test.mjs`: the eight test names above are there → yes
- [ ] In the worktree, `git diff 4ff965e --stat` shows only the two new files → yes (nothing in `brands/` changed: tests used a temp copy)

## Questions
(none open)

## Report
<Filled by the builder when done, see docs/rules/executor.md.>
