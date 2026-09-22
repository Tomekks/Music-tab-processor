# Task spec: Batch-write logic + route action (Task 8a)

**Tier: S** — pure logic + one route action, dev-only tool, no real user data, fully revertible
via `git checkout`. Written fresh against `app/packages/design-system/src/token-writes.mjs` (327
lines) and `app/app/api/design-system/tokens/route.ts` (161 lines) — if either has changed since,
stop and re-read before implementing.

## 0. Context (read, don't re-derive)

This is the first of two specs for Task 8 (exception-vs-brand-wide staged edits). This spec is
**logic and API only — no editor UI change**. 8b (a separate, later spec) builds the pending-edit
state and Save/Discard UI on top of what this spec produces; nothing here touches `editor.tsx`.

- `FieldDescriptor.rawValue` is the leaf's literal `$value` string (e.g. `"{semantic.color.accent}"`
  or `"#ffffff"`); `FieldDescriptor.isAlias` is `rawValue.startsWith("{")`
  (`field-descriptors.mjs:88`). Neither is available server-side — the route only has the raw
  `tokens.json` tree — so alias detection here re-derives the same check directly from the leaf's
  `$value` read off the tree, not from a `FieldDescriptor`.
- "Brand-wide" means writing the new value to the **aliased semantic path** instead of the
  originating component path — e.g. an edit on `component.button.primaryBackground` (alias
  `"{semantic.color.accent}"`) with `scope: "brand"` writes `semantic.color.accent`, not
  `component.button.primaryBackground`. Every other component leaf that also aliases
  `semantic.color.accent` picks up the change for free through normal alias resolution — no new
  "who shares this token" tracking needed.
- "Exception" means the ordinary `applyWrite(tree, path, value)` — unchanged behavior, just one
  edit among several applied together instead of one auto-committed edit.
- **All-or-nothing.** If any edit in a batch fails validation, none are written. A partially-applied
  explicit Save would be worse than today's auto-commit model.

## 1. Scope

### `token-writes.mjs`

Add one function, following the existing `apply*` functions' shape exactly (pure, takes a tree,
returns a new tree or an `ApplyErr`, never mutates its input — same contract as `applyWrite`/
`applyResetAll` right above it in the file):

```js
/**
 * Apply a batch of edits atomically: validate every edit first: if any fails,
 * return the FIRST failure and write nothing. A "brand"-scoped edit resolves
 * to its alias target (read from the tree at that path) before writing; a
 * "exception"-scoped edit writes `path` as-is. A "brand" edit whose leaf is
 * not an alias fails the whole batch (fail-closed — there's nothing to
 * cascade to).
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {{ path: string, value: string, scope: "exception" | "brand" }[]} edits
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyBatchWrite(tokensTree, edits) {
```

Implementation shape (match this exactly — it's the load-bearing logic, not a style suggestion):

1. If `edits` is not a non-empty array, return
   `{ ok: false, status: 400, error: '"edits" must be a non-empty array' }`.
2. For each edit, in order:
   - Each element must be an object — a null/non-object element must fail here as
     `{ ok: false, status: 400, error: 'edit at index N: ...' }`, never reach property
     access and surface as a 500 via the route's catch. Extra per-edit fields beyond
     `path`/`value`/`scope` are ignored, matching the route's existing convention for
     unrecognized top-level body fields.
   - `path`/`value` must be strings, `scope` must be `"exception"` or `"brand"` — else
     `{ ok: false, status: 400, error: 'edit at index N: ...' }` (name the index so a batch of
     several edits doesn't produce an ambiguous error).
   - Look up the leaf at `path` via `getLeaf(tokensTree, path)` (existing helper, already
     imported in this file). Missing → `` `"${path}" is not a known token path` ``, same wording
     `applyWrite` uses today.
   - Determine the **write target path**: `scope === "exception"` → `path` itself. `scope ===
     "brand"` → the leaf's own `$value` must start with `"{"` (alias); if not, fail this edit:
     `` `"${path}" is not an alias — nothing to cascade to for a brand-wide edit` ``. If it is,
     the write target is `leaf.$value.slice(1, -1)` (strip the `{`/`}`), and that target path
     must itself resolve via `getLeaf` too (a broken/self-referential alias fails the same as a
     missing path, same error wording, using the target path).
   - Validate `value` against the **write target leaf's own `$type`** using the existing
     `validateWriteValue(targetLeaf, value)` — the target is what determines valid format/range,
     not the originating leaf (they can differ in a themed pair, though not for this task's actual
     usage; validate the leaf actually being written, not the one that was edited).
   - Collect `{ targetPath, value }` if this edit passes; on the first failure, **stop and return
     that error immediately** — `{ ok: false, status: 400, error: "edit at index N: <reason>" }`
     — write nothing.
3. If every edit passed: clone the tree once (`structuredClone(tokensTree)`, same as every other
   `apply*` function), then apply every collected `{ targetPath, value }` to the clone via
   `getLeaf(tokens, targetPath).$value = value`. Return `{ ok: true, tokens }`.
4. **Two edits in the same batch resolving to the same target path — last one wins**, applied in
   array order. Don't special-case or reject this; it's the same behavior a sequence of individual
   `applyWrite` calls would already have. Handoff note for 8b (not handled here): same-target
   collisions across *different* originating leaves (two brand-scoped edits via different
   component leaves aliasing one semantic token with different values) also resolve last-wins,
   silently dropping the first — 8a cannot resolve intent, so 8b's UI must warn on this case.

### `route.ts`

Add a `"batch-write"` action, same pattern as the existing `"write"` case:

```ts
case "batch-write": {
  if (!Array.isArray(edits)) {
    return badRequest('"batch-write" requires "edits" to be an array');
  }
  const result = applyBatchWrite(readJson("tokens.json"), edits);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
  buildActiveBrand();
  return Response.json({ ok: true });
}
```

- Add `"batch-write"` to `VALID_ACTIONS` in `token-writes.mjs` (append, don't reorder the
  existing entries — nothing depends on order, but an unrelated diff there is noise).
- Add `edits` to the destructured request body in `route.ts` (`const { action, path, value,
  neutralSeed, accentSeed, edits } = body as { ...; edits?: unknown }`) and import
  `applyBatchWrite` alongside the other `token-writes.mjs` imports.
- No `resolveBrandTree`/child-brand handling in this action — that's Task 5c's concern, landing
  later on top of this; this spec's route case is a flat, single-brand write like `"write"` and
  `"reset"` already are.

## 2. Non-goals

- No editor UI change (`editor.tsx` untouched — that's 8b).
- No child-brand alias resolution (parent vs. child target ambiguity is a Task 5c decision,
  deliberately not addressed by this spec's `getLeaf`-on-the-request-brand's-own-tree logic).
  Corollarily, on a sparse child tree a brand-scoped edit's target lookup fails closed with a
  400 naming the target path — accepted until 5c, not a bug to work around here.
- No new validation beyond what `validateWriteValue` already enforces per `$type`.

## 3. File allowlist

- `app/packages/design-system/src/token-writes.mjs` (add `applyBatchWrite`, extend
  `VALID_ACTIONS`).
- `app/packages/design-system/src/token-writes.test.mjs` (new test cases).
- `app/app/api/design-system/tokens/route.ts` (add the `batch-write` case + `edits` in the body
  destructure + import).

No `.env`/credentials, no new npm dependency, no `tokens.json`/`tokens.default.json` content
changes (test fixtures only, not the real files).

## 4. Tests (`token-writes.test.mjs`)

Add alongside the existing `applyWrite`/`applyResetAll` test blocks, using the same fixture-tree
pattern already in the file (`tokensTree()` helper) — extend it if a case needs a leaf shape it
doesn't already have (e.g. a non-alias component leaf), don't build a second fixture function.

1. **All-valid batch applies every edit.** Two `"exception"` edits on different paths in one
   batch — both land in the returned tree, in one call.
2. **One invalid edit in a batch of three applies none of them.** Middle edit references an
   unknown path; assert an `ApplyErr` is returned (no `tokens` property) and — this is the real
   point of the test — that the input tree is deep-unchanged against its pre-call state
   (`assert.deepEqual(before, after)` on a snapshot taken before the call, same non-mutation
   pattern as the existing `applyReset` test): validation runs fully before anything is
   cloned or written, so atomicity is structural, not just error-shaped.
3. **`"brand"`-scoped edit resolves to the alias target, not the originating path.** Using the
   fixture's `component.button.primaryBackground` (aliases `semantic.color.accent`): a
   `{ path: "component.button.primaryBackground", value: "#123456", scope: "brand" }` edit
   results in `semantic.color.accent`'s `$value` becoming `"#123456"`, and
   `component.button.primaryBackground`'s own `$value` staying the unchanged alias string
   `"{semantic.color.accent}"`.
4. **`"brand"` on a non-alias leaf fails the whole batch.** Fixture's `semantic.color.surface`
   (`"#ffffff"`, not an alias) with `scope: "brand"` — batch fails, error names that path.
5. **Empty `edits` array is rejected**, not treated as a no-op success.
6. **Two edits in the same batch targeting the same resolved path — last one wins** (per §1 point
   4) — one direct test asserting this, so the behavior is documented, not just implied.
7. **Non-object `edits` elements are rejected with 400**, not 500 — `null`, a string, and a
   number element each produce `{ ok: false, status: 400 }` naming the index.
8. **Existing `VALID_ACTIONS` count test updated to seven.** The test at
   `token-writes.test.mjs:64` ("exactly the six known actions") breaks the moment
   `"batch-write"` is appended — update its name and expected list in this task, not later.

## 5. Acceptance criteria

- `npm run verify` passes (typecheck + lint + `node --test`, including the new cases above).
- `git diff --stat` shows only the three allowlisted files.
- No manual/browser check required — this spec has no UI surface; 8b's spec will carry the
  end-to-end manual check that exercises this route action through the real editor.
- Self-check before reporting: every claim (file list, test count, pass/fail) checked against
  what's actually on disk and what `npm run verify` printed — per the evidence-paired report
  format in `docs/WEB_APP_WORKFLOW.md` §5 step 4.
- Checkpoint commit made (not pushed).

## 6. Stop-conditions

- If `token-writes.mjs`'s actual current shape (function order, `getLeaf`/`validateWriteValue`
  signatures, `VALID_ACTIONS` contents) has changed from what's described in §1, stop and confirm
  rather than reconciling silently.
- If validating the batch requires touching `field-descriptors.mjs` or any file outside the
  allowlist, stop and ask — this spec was scoped assuming alias detection is re-derivable from
  the raw tree alone (`$value.startsWith("{")`), not from `FieldDescriptor`.
