# Task spec: Multi-brand inheritance — reset-to-parent (5b)

Corresponds to Task 5b of `docs/superpowers/plans/2026-09-20-design-system-iteration-2.md` (Track
A, runs immediately after 5a — per that plan's "Tracks & sequencing" and "Shared-file
serialization across tracks" notes, this task's `route.ts`/`token-writes.mjs` edits must land
before Task 8a touches the same two files). Written against
`app/packages/design-system/src/token-writes.mjs`,
`app/packages/design-system/src/token-writes.test.mjs`, and
`app/app/api/design-system/tokens/route.ts` directly — if any of these, or 5a's
`resolveBrandTree`/`deepMerge`, have changed since this spec was written, stop and re-read before
implementing, per `WEB_APP_WORKFLOW.md` §3.

**Hard dependency on Task 5a**: this task calls `resolveBrandTree` (added in 5a) from `route.ts`
and imports `deepMerge` (added in 5a) in its own test file to prove the delete-not-copy contract.
Do not start this task before 5a's `build-tokens.mjs`/`deep-merge.mjs` changes have landed.

## 1. Scope

Add `applyResetToParent(tokensTree, path)` to `token-writes.mjs`: given a **child brand's own**
(sparse, overrides-only) `tokens.json` tree, deletes the named leaf so the brand goes back to
inheriting that value from its parent — and prunes any ancestor object left empty by the deletion,
so the child's `tokens.json` never accumulates empty scaffolding. Wire a new `reset-to-parent`
action into `route.ts`'s existing dispatch.

Files this task may touch:
- `app/packages/design-system/src/token-writes.mjs`
- `app/packages/design-system/src/token-writes.test.mjs`
- `app/app/api/design-system/tokens/route.ts`

No other file changes. **Not** `build-tokens.mjs`, `editor.tsx`, or `field-descriptors.mjs` — the
first is 5a's (already done), the latter two are 5c's. `.env`/credentials are not involved and out
of scope regardless.

## 2. Non-goals

- **No editor UI.** No button, no wiring into `FieldRow`/`ComponentDetailView` — Task 5c, after
  Task 8, consumes this action. This task only makes the action exist and work correctly at the
  API layer.
- **Not a replacement for `applyReset`.** `applyReset` (existing, copies `tokens.default.json`'s
  value) is unchanged and keeps working exactly as today for the brands that have a
  `tokens.default.json`. `applyResetToParent` is a new, separate function for the child-brand case
  where there is no `tokens.default.json` to copy from (5a's non-goals) and where "reset" means
  something structurally different (delete, not copy — §0 of 5a's spec explains why that
  distinction matters).
- **No handling for a brand with no parent calling this action.** `route.ts`'s new case checks
  `resolveBrandTree(brandDir).parentBrandDir` and rejects with a 400 if null (§3.3) — this is the
  one piece of "what if this doesn't apply" handling in scope; don't add anything beyond it (e.g.
  no UI-side prevention — that's 5c's job once there's a UI to prevent anything in).
- **No change to how `applyReset`/`applyResetAll`/`applyWrite`/`applySetAsDefault` behave**, even
  though they're in the same file. Add `applyResetToParent` alongside them; don't touch their
  bodies.

## 3. Interface / exact changes

### 3.1 `applyResetToParent` in `token-writes.mjs`

Add `"reset-to-parent"` to `VALID_ACTIONS`, and the function itself (verified: deletes without
mutating input, prunes correctly, leaves sibling overrides alone, 400s cleanly when the path isn't
actually overridden):

```js
export const VALID_ACTIONS = ["write", "reset", "reset-all", "set-as-default", "reset-to-parent"];
```

```js
/**
 * Delete a leaf from a CHILD brand's own tokens.json tree -- not copy a
 * value, delete -- so it goes back to inheriting the parent brand's value
 * (including any future changes to it), rather than freezing a snapshot the
 * way applyReset's tokens.default.json copy does. Also prunes any ancestor
 * object left empty by the deletion, so the child's tokens.json only ever
 * contains leaves it genuinely still overrides -- no empty scaffolding.
 * @param {object} tokensTree the CHILD brand's own live tokens.json tree (not mutated) --
 *   NOT the merged/resolved tree; a sparse tree containing only overrides
 * @param {string} path
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyResetToParent(tokensTree, path) {
  const leaf = getLeaf(tokensTree, path);
  if (!leaf) {
    return {
      ok: false,
      status: 400,
      error: `"${path}" is not present in this brand's own tokens.json -- nothing to reset (it's already inherited, or not a valid path)`,
    };
  }
  const tokens = structuredClone(tokensTree);
  const segments = path.split(".");
  const chain = [tokens];
  for (let i = 0; i < segments.length - 1; i++) {
    chain.push(chain[i][segments[i]]);
  }
  delete chain[chain.length - 1][segments[segments.length - 1]];
  for (let i = chain.length - 1; i > 0; i--) {
    if (Object.keys(chain[i]).length === 0) {
      delete chain[i - 1][segments[i - 1]];
    } else {
      break;
    }
  }
  return { ok: true, tokens };
}
```

Place it after `applySetAsDefault`, matching the file's existing top-to-bottom action ordering.

### 3.2 `token-writes.test.mjs`: new tests

Add to the imports:

```js
import {
  VALID_ACTIONS,
  getLeaf,
  collectLeafPaths,
  validateWriteValue,
  stringifyTokens,
  applyWrite,
  applyReset,
  applyResetAll,
  applySetAsDefault,
  applyResetToParent,
} from "./token-writes.mjs";
import { deepMerge } from "./deep-merge.mjs";
```

Update the existing action-count test (four → five):

```js
test("VALID_ACTIONS lists exactly the five known actions", () => {
  assert.deepEqual(
    [...VALID_ACTIONS].sort(),
    ["reset", "reset-all", "reset-to-parent", "set-as-default", "write"],
  );
});
```

Add, after the existing tests (before or after the tempfile round-trip test — either is fine, just
keep it out of the middle of an unrelated existing test):

```js
// A child brand's OWN tokens.json -- sparse, only the leaves it overrides.
const childTree = () => ({
  semantic: {
    color: {
      accent: { $value: "#4a90d9", $type: "color" },
    },
  },
});

test("applyResetToParent deletes the leaf, not copies a value", () => {
  const before = childTree();
  const snapshot = structuredClone(before);
  const result = applyResetToParent(before, "semantic.color.accent");
  assert.equal(result.ok, true);
  assert.equal(getLeaf(result.tokens, "semantic.color.accent"), null);
  assert.deepEqual(before, snapshot, "input not mutated");
});

test("applyResetToParent prunes now-empty ancestor objects", () => {
  const result = applyResetToParent(childTree(), "semantic.color.accent");
  assert.equal(result.ok, true);
  assert.deepEqual(result.tokens, {}, "no empty semantic/color scaffolding left behind");
});

test("applyResetToParent leaves sibling overrides untouched when pruning", () => {
  const tree = childTree();
  tree.semantic.color.border = { $value: "#000000", $type: "color" };
  const result = applyResetToParent(tree, "semantic.color.accent");
  assert.equal(result.ok, true);
  assert.deepEqual(result.tokens, {
    semantic: { color: { border: { $value: "#000000", $type: "color" } } },
  });
});

test("applyResetToParent 400s when the path isn't overridden in this brand (already inherited)", () => {
  const result = applyResetToParent(childTree(), "semantic.color.border");
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /semantic\.color\.border/);
});

test("applyResetToParent's result, re-merged with the parent, falls back to the parent's current value -- proving delete (not copy) actually keeps inheriting", () => {
  const parentTree = tokensTree(); // has its own semantic.color.accent
  const child = childTree(); // overrides semantic.color.accent to #4a90d9
  const beforeMerge = deepMerge(parentTree, child);
  assert.equal(beforeMerge.semantic.color.accent.$value, "#4a90d9", "override wins pre-reset");

  const result = applyResetToParent(child, "semantic.color.accent");
  const afterMerge = deepMerge(parentTree, result.tokens);
  assert.equal(
    afterMerge.semantic.color.accent.$value,
    parentTree.semantic.color.accent.$value,
    "post-reset, the merged tree reads the PARENT's live value, not a frozen copy",
  );
});
```

That last test is the one that actually proves the "delete, not copy" distinction matters (5a's
§0 / this task's §2): it merges against `parentTree` both before and after the reset and checks the
post-reset merge tracks whatever `parentTree` currently holds, not a value frozen at reset time.

### 3.3 `route.ts`: new `reset-to-parent` action

Add to the imports:

```ts
import {
  buildActiveBrand,
  resolveBrandDir,
  resolveBrandTree,
} from "../../../../packages/design-system/src/build-tokens.mjs";
import {
  VALID_ACTIONS,
  applyReset,
  applyResetAll,
  applyResetToParent,
  applySetAsDefault,
  applyWrite,
  stringifyTokens,
} from "../../../../packages/design-system/src/token-writes.mjs";
```

Update both `badRequest` messages that list the known actions (the initial validation and the
unreachable `default` case) to include `reset-to-parent`. Add the new `switch` case, placed
between `reset-all` and `set-as-default` (matching this file's existing top-to-bottom action
ordering):

```ts
case "reset-to-parent": {
  if (typeof path !== "string") {
    return badRequest('"reset-to-parent" requires "path" to be a string');
  }
  const { parentBrandDir } = resolveBrandTree(brandDir);
  if (!parentBrandDir) {
    return badRequest('"reset-to-parent" is not valid for a brand with no parent');
  }
  const result = applyResetToParent(readJson("tokens.json"), path);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
  buildActiveBrand();
  return Response.json({ ok: true });
}
```

Note this case reads `tokens.json` via `readJson`, exactly like `write`/`reset`/`reset-all` do —
**not** `resolveBrandTree`'s merged tree. `applyResetToParent` operates on the brand's own sparse
tree (§3.1's own doc comment says so explicitly) — passing it the merged tree would delete a leaf
that might not even be present in the child's own file, silently no-op-ing or corrupting the write.
`resolveBrandTree` is only consulted here for its `parentBrandDir` (the "does this brand even have
a parent" check), not for the tree it resolves.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `reset-to-parent` called on the currently-active brand when it has no parent (e.g. `default`) | 400, `"reset-to-parent" is not valid for a brand with no parent` — verified via `resolveBrandTree(brandDir).parentBrandDir === null`. No file write, no `buildActiveBrand()` call. |
| `reset-to-parent` called with a `path` that isn't currently overridden in the child's own `tokens.json` (already inherited, or was never a valid path) | 400, naming the path, from `applyResetToParent` itself (§3.1) — `route.ts` just relays it, same pattern as every other action's error path. |
| `reset-to-parent` deletes the *only* remaining override in a brand's `tokens.json` | The written file becomes `{}` (verified, §3.2's pruning test) — a valid, parseable JSON object; `resolveBrandTree` handles an empty override tree correctly (5a: `deepMerge(parentTokens, {})` returns `parentTokens` unchanged, since `Object.keys({})` is empty). |
| Two sibling overrides exist, one is reset | Only the reset one is deleted; the sibling and its containing objects survive untouched (verified, §3.2). |

## 5. Forbidden patterns

- No bare `except`/swallowed errors.
- No hardcoded colors/spacing.
- No touching `.env`/credentials.
- No new npm dependencies.
- **No writing the merged/resolved tree back to `tokens.json`.** `applyResetToParent` must operate
  on (and `route.ts` must persist) the child brand's own sparse tree only — see §3.3's note. Writing
  the merged tree would silently convert every inherited leaf into a literal override, permanently
  defeating inheritance for that brand.

## 6. File allowlist

- `app/packages/design-system/src/token-writes.mjs`
- `app/packages/design-system/src/token-writes.test.mjs`
- `app/app/api/design-system/tokens/route.ts`

## 7. Acceptance criteria

- `npm run verify` passes — typecheck, lint, and `node --test` including all existing
  `token-writes.test.mjs` tests (unchanged, still passing) plus this task's five new ones.
- `git diff --stat` shows only the files in §6.
- Manual check: with `demo-child` on disk (from 5a) and `active-brand.json` still pointing at
  `default` (per §2/5a's non-goals, this task doesn't need `demo-child` to be active — it can be
  exercised directly): temporarily point `active-brand.json` at `demo-child`
  (`{ "brand": "demo-child" }`), `POST /api/design-system/tokens` with
  `{ "action": "reset-to-parent", "path": "semantic.color.accent" }`, confirm a `200 { ok: true }`
  response and that `brands/demo-child/tokens.json` on disk becomes `{}`. **Revert
  `active-brand.json` back to `default` and `demo-child/tokens.json` back to its committed content
  afterward** — this manual check's whole point is exercising the route against a child brand, not
  leaving the repo pointed at a demo brand or with a mutated fixture. Then re-run
  `npm run tokens:build` (from `app/`) so the served generated CSS matches `default` again — the
  POST rebuilds it from `demo-child`, and that file is gitignored, so `git diff` won't catch the
  staleness; only a rebuild (or dev-server restart) clears it.

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` matches §6's file allowlist.
- Manual check above passed, its temporary `active-brand.json`/`demo-child/tokens.json`
  mutations reverted (confirm `git diff` shows nothing under `brands/demo-child/` or
  `active-brand.json` before committing), and the generated CSS rebuilt from `default`
  (`npm run tokens:build` re-run — required because the checked-in diff can't show the
  gitignored generated file's staleness).
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).

## 9. Stop-conditions

- If `token-writes.mjs`'s `VALID_ACTIONS`/`getLeaf`/action-function shapes have changed since this
  spec was written, **stop and ask** rather than adapting silently.
- If `route.ts`'s action-dispatch `switch` structure has changed (e.g. a different case ordering
  or a restructured dispatch), **stop and ask** before inserting the new case — this spec assumes
  the exact structure in §3.3.
- If 5a's `resolveBrandTree` doesn't exist yet, or its `parentBrandDir` return shape differs from
  `{ tree, parentBrandDir: string | null }`, **stop** — this task has a hard dependency on 5a (see
  the note at the top of this spec) and cannot proceed without it.
