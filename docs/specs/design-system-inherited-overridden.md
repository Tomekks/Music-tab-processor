# Task spec: Inherited vs. overridden UI on a child brand (Task 5c)

**Tier: S** — dev-only editor surface, no real user data, fully revertible via `git checkout`.
Written fresh against the current branch, commit `4b02533`: `field-descriptors.mjs` (101 lines),
`page.tsx` (18 lines), `editor.tsx` (867 lines), `token-writes.mjs` (398 lines), `route.ts`
(175 lines) — if any has changed since, stop and re-read before implementing.

**Scope, decided explicitly (superseding this spec's own earlier draft):** editing a still-
*inherited* field on a child brand **creates a real override**, not read-only. This needs one
extension to the core write path — `applyWrite`/`applyBatchWrite` validate against the **merged**
tree (parent + child) but write into the **child's own sparse** tree, creating the leaf there if
it doesn't already exist. Designed so the root brand's call shape and behavior are **byte-for-
byte unchanged** (own tree omitted → today's code path, verbatim) — the new logic is additive,
gated behind an explicit new parameter, not a rewrite of the existing function bodies.

## 0. User story

You're editing a child brand — say, a future second surface that only wants a different accent
color today, but might want more later. Every field is labeled either **Inherited from
{parent}** or **Overridden**. An inherited field isn't locked — you edit it exactly like any
other field, stage it, hit Save, and it becomes a real override in this brand's own file (grey
"Inherited" label replaced by "Overridden," with a "Revert to parent" action that deletes the
override — not copies a value — so it starts following the parent's future changes again).

## 1. Context (read, don't re-derive)

- **Server-side brand resolution already exists, from 5a/5b.** `resolveBrandTree(brandDir)`
  (`build-tokens.mjs:81`) deep-merges a child's sparse `tokens.json` onto its parent's, returning
  `{ tree, parentBrandDir }`. `route.ts`'s `"reset-to-parent"` case (`route.ts:115`) already
  rejects a parentless brand and deletes (not copies) the child's own leaf — untouched by this
  spec.
- **`demo-child` (`brands/demo-child/`)** is the only child brand: `brand.json` →
  `{ "parent": "default" }`, `tokens.json` → one leaf, `semantic.color.accent`. No
  `tokens.default.json` of its own — confirmed real: `page.tsx` reads it unconditionally today,
  so pointing `active-brand.json` at `demo-child` currently crashes with `ENOENT`. §3 fixes this.
- **Why the write-path extension is genuinely small, not a redesign:** `applyWrite`
  (`token-writes.mjs:167`) already separates "find and validate the leaf" from "clone and mutate."
  The extension only changes *which tree gets cloned and mutated* when a second tree is supplied —
  validation stays against the tree that has the real, resolved value (the merge), consistent with
  how `resolveValue`/alias resolution already works everywhere else in this codebase.
- **`isModified` still doesn't mean anything for a child brand** (§1 of this spec's earlier draft,
  unchanged reasoning): no child-level defaults file exists or needs to. §4.1 keeps
  `isInheritedFromParent` as a separate field rather than overloading `isModified`.
- **No in-UI brand switcher exists.** Testing this means hand-editing `active-brand.json`, same as
  5a/5b's own specs.

## 2. Write path: validate-against-merged, write-into-own

**New shared helper in `token-writes.mjs`** (place near `getLeaf`, since it has the same shape —
pure tree navigation, no I/O):

```js
/**
 * Ensure `path` exists as a leaf in `ownTree` (a SPARSE, already-cloned tree),
 * creating intermediate objects and the leaf itself if missing — using
 * `typeHint` ($type from the resolved/merged leaf) for the created leaf's
 * $type, since a brand-new leaf has no $type of its own yet. Returns the
 * (possibly newly-created) leaf object, mutated in place by the caller.
 * @param {object} ownTree mutable — already a clone, this function mutates it
 * @param {string} path
 * @param {string} typeHint
 * @returns {TokenLeaf}
 */
function ensureOwnLeaf(ownTree, path, typeHint) {
  const segments = path.split(".");
  let node = ownTree;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (node[seg] === null || typeof node[seg] !== "object") {
      node[seg] = {};
    }
    node = node[seg];
  }
  const last = segments.at(-1);
  if (node[last] === null || typeof node[last] !== "object" || !("$value" in node[last])) {
    node[last] = { $value: "", $type: typeHint };
  }
  return node[last];
}
```

**`applyWrite` gains an optional 4th parameter, `ownTree = null`:**

```js
export function applyWrite(mergedTree, path, value, ownTree = null) {
  const leaf = getLeaf(mergedTree, path);
  if (!leaf) {
    return { ok: false, status: 400, error: `"${path}" is not a known token path` };
  }
  const valid = validateWriteValue(leaf, value);
  if (!valid.ok) {
    return { ok: false, status: 400, error: valid.error };
  }
  if (ownTree === null) {
    // Root brand: byte-for-byte today's behavior, own === merged.
    const tokens = structuredClone(mergedTree);
    getLeaf(tokens, path).$value = value;
    return { ok: true, tokens };
  }
  const own = structuredClone(ownTree);
  ensureOwnLeaf(own, path, leaf.$type).$value = value;
  return { ok: true, tokens: own };
}
```

Every existing 3-arg call (root brand) is **unaffected** — `ownTree` defaults to `null`, and that
branch is the exact code that's there today, unmoved.

**`applyBatchWrite` gets the same treatment** — validate every edit against `mergedTree` (as
today), but collect writes into `ownTree` when supplied:

```js
export function applyBatchWrite(mergedTree, edits, ownTree = null) {
  // ...existing per-edit loop (lines 197-2xx today), entirely unchanged: it
  // already resolves `targetPath`/`targetLeaf` by reading `mergedTree` (renamed
  // from `tokensTree`, same object), which is exactly correct for a child
  // brand too — the alias target's CURRENT value must come from the merge,
  // whether that target happens to be overridden in the child or not...
  if (ownTree === null) {
    const tokens = structuredClone(mergedTree);
    for (const { targetPath, value } of collected) {
      getLeaf(tokens, targetPath).$value = value;
    }
    return { ok: true, tokens };
  }
  const own = structuredClone(ownTree);
  for (const { targetPath, value } of collected) {
    const targetLeaf = getLeaf(mergedTree, targetPath); // for $type — already validated to exist
    ensureOwnLeaf(own, targetPath, targetLeaf.$type).$value = value;
  }
  return { ok: true, tokens: own };
}
```

**This resolves, not just defers, the brand-scope-on-a-not-yet-overridden-target case** the
earlier draft of this spec left as a known limitation (a "brand"-scoped edit whose alias target
isn't itself already in the child's own tree) — `ensureOwnLeaf` creates that target path too, same
as a direct edit would. Drop that limitation from this version's non-goals; it's no longer one.

**`route.ts`'s `"write"` and `"batch-write"` cases** both resolve the brand tree once and pass the
own tree only when a parent exists — same pattern `"reset-to-parent"` already uses:

```ts
const { tree: mergedTree, parentBrandDir } = resolveBrandTree(brandDir);
const ownTree = parentBrandDir ? readJson("tokens.json") : null;
const result = applyWrite(mergedTree, path, value, ownTree);
// ...
atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
buildActiveBrand();
```

(same shape for `"batch-write"`, passing `edits` instead of `path`/`value`). For the root brand,
`mergedTree` and `readJson("tokens.json")` are the same content — `ownTree` stays `null`, so
`applyWrite`/`applyBatchWrite` take the unchanged branch. **Confirm this by reading the actual
diff against `route.ts:70-93` before implementing** — the two cases currently call
`readJson("tokens.json")` directly; both need to switch to `resolveBrandTree` first.

**`"reset"`/`"reset-all"`/`"set-as-default"` on a child brand — explicit 400, not a crash.**
These three actions all read `tokens.default.json`, which a child brand doesn't have — today that
would 500 with an uncaught `ENOENT` the moment any of them is reachable on a child brand (found
during review, not hypothetical). Add one guard at the top of each of these three cases:

```ts
if (parentBrandDir) {
  return badRequest(`"${action}" is not valid for a child brand — no defaults file exists`);
}
```

(`parentBrandDir` from the same `resolveBrandTree` call each case already needs, or a fresh one if
it doesn't yet — `"reset-to-parent"`'s existing case is the pattern to copy). This is real
hardening even though §5's UI never exposes these actions' buttons on a child brand — a direct API
call must still fail cleanly, not crash.

## 3. `page.tsx`

Branch on whether the active brand has a parent:

```tsx
import { resolveBrandDir, resolveBrandTree } from "../../packages/design-system/src/build-tokens.mjs";
import { buildFieldDescriptors } from "../../packages/design-system/src/field-descriptors.mjs";
import { basename } from "node:path";
// ...
const brandDir = resolveBrandDir();
const { tree, parentBrandDir } = resolveBrandTree(brandDir);
const descriptors = parentBrandDir
  ? buildFieldDescriptors(tree, {}, JSON.parse(readFileSync(join(brandDir, "tokens.json"), "utf8")))
  : buildFieldDescriptors(tree, JSON.parse(readFileSync(join(brandDir, "tokens.default.json"), "utf8")));
return (
  <Editor
    descriptors={descriptors}
    isChildBrand={parentBrandDir !== null}
    parentName={parentBrandDir ? basename(parentBrandDir) : null}
  />
);
```

`tokens.default.json` is only read on the `parentBrandDir === null` branch — this is what fixes
the `ENOENT` from §1. `parentName` (F4) threads the real parent brand's directory name down
instead of the editor hardcoding `"default"`.

## 4. `field-descriptors.mjs`

Unchanged from this spec's earlier draft — the descriptor logic doesn't depend on whether writes
can create new overrides, only on distinguishing inherited from overridden for display:

```js
export function buildFieldDescriptors(tokensTree, defaultsTree, ownTree = null) {
```

Per leaf (currently `rawValue`/`isModified`/`isAlias` at lines 86–88):

```js
isModified: ownTree ? false : (defRaw === null ? true : rawValue !== defRaw),
isInheritedFromParent: ownTree !== null && getLeaf(ownTree, path) === null,
```

Add `@property {boolean} isInheritedFromParent` to the typedef (alongside `isModified` at line 23).

## 5. `editor.tsx`

`Editor` gets two new props: `isChildBrand: boolean`, `parentName: string | null`. Thread both
down to every `FieldRow` call site (`renderSection`, ~line 701–708; the per-component detail view,
~850–856).

**Every field stays editable, inherited or not** — this is the core change from the earlier draft.
`ColorRow`/`SliderRow` render exactly as they do today regardless of `isChildBrand`/
`isInheritedFromParent`; only the caption and the button row differ.

**Caption**, rendered whenever `isChildBrand`:

```tsx
{isChildBrand && (
  <p className={cn(CAPTION, "mt-1")}>
    {d.isInheritedFromParent ? `Inherited from ${parentName}` : "Overridden"}
  </p>
)}
```

**Button row — `pending` takes priority over everything else** (F3: a staged, unsaved edit is
always "discard this staged change," never "revert to parent," even on an inherited field being
edited for the first time):

```tsx
const showButtons = pending || d.isModified || (isChildBrand && !d.isInheritedFromParent);
// ...
{showButtons && (
  <button
    type="button"
    disabled={disabled}
    onClick={() => {
      if (pending) return onDiscardPending!(d.path);
      if (isChildBrand && !d.isInheritedFromParent) return onResetToParent!(d.path);
      return onRevert(d.path);
    }}
    aria-label={
      pending
        ? `Discard staged change to ${d.label}`
        : isChildBrand && !d.isInheritedFromParent
          ? `Revert ${d.label} to parent`
          : `Revert ${d.label} to default`
    }
    className={MUTED_ACTION}
  >
    Revert
  </button>
  {d.isModified && !isChildBrand && (
    <button /* Set as default — unchanged, root brand only */ />
  )}
)}
```

`d.isModified && !isChildBrand` for "Set as default" — `isModified` is already forced `false` for
a child brand (§4), so this guard is belt-and-braces, not load-bearing on its own; keep it
explicit anyway so the rule reads directly off the JSX rather than depending on a fact three files
away.

**F1 — hide seed generation and "Reset all changes" on a child brand.** Both live in the "All
variables" branch (the seed `<section>` and the `resetArmed`/`runResetAll` `<Button>` block).
Wrap both in `{!isChildBrand && (...)}` — without this, a child brand's "All variables" view
offers two actions that 400 the moment they're used (per §2's new guards) with no indication why.

**`Editor`-level:** `runResetToParent`, identical shape to `runReset`:

```tsx
async function runResetToParent(path: string) {
  track(path);
  setError(null);
  setFeedback(null);
  try {
    const result = await postAction({ action: "reset-to-parent", path });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  } finally {
    untrack(path);
  }
}
```

Pass `onResetToParent={runResetToParent}`, `isChildBrand`, `parentName` at both `FieldRow` call
sites.

## 6. Non-goals

- No in-UI brand switcher (§1) — still a manual `active-brand.json` edit.
- No `tokens.default.json` file for `demo-child` or any future child brand (§2's guards, §3).
- Multi-level brand inheritance — already capped loudly in `resolveBrandTree`, unrelated to this
  task.
- Task 9 (per-token descriptions) interplay — not yet landed, not addressed here; sequence
  whichever lands second to re-check `FieldRow`'s prop list against the other's actual diff.

## 7. File allowlist

- `app/packages/design-system/src/token-writes.mjs`
- `app/packages/design-system/src/token-writes.test.mjs`
- `app/packages/design-system/src/field-descriptors.mjs`
- `app/packages/design-system/src/field-descriptors.test.mjs`
- `app/app/api/design-system/tokens/route.ts`
- `app/app/design-system/page.tsx`
- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/inherited.spec.ts` (new)

No `.env`/credentials, no new npm dependency.

## 8. Acceptance criteria

- `npm run verify` passes, including:
  - `token-writes.test.mjs`: `applyWrite`/`applyBatchWrite` with a 3rd/4th `ownTree` arg — writing
    a path present only in a parent fixture (not in `ownTree`) creates it there with the merged
    leaf's `$type`, parent fixture itself untouched; writing an already-present own-tree path
    behaves exactly as the 3-arg (no `ownTree`) call today; a "brand"-scope batch edit whose
    target isn't yet in `ownTree` creates it (the case §2 says is now resolved, not deferred —
    test it directly). Existing 3-arg-call tests must keep passing unmodified — the regression
    guard that the extension didn't change the root-brand call shape.
  - `field-descriptors.test.mjs`: as this spec's earlier draft specified (`ownTree` present vs.
    absent, `isInheritedFromParent`/`isModified` combinations).
  - `route.ts`-level guard cases aren't unit-testable directly (no route harness in this project) —
    covered by the Playwright spec below instead.
- **Required: `app/e2e/design-system/inherited.spec.ts`, via `npm run test:e2e:design-system`.**
  No in-UI brand switcher, so the spec manages its own fixture lifecycle:
  - **Setup (F2):** assert `active-brand.json` and `demo-child/tokens.json` have no uncommitted
    diff first (fail-fast, same discipline as Tasks 8b/9's specs). Point `active-brand.json` at
    `demo-child`. Write one additional literal override into `demo-child/tokens.json` directly
    (e.g. `component.button.radius: "8px"`) so there's a real *component*-level override to
    exercise Task 8's staged-save panel against — `semantic.color.accent` alone never reaches that
    UI (it's a semantic field, "All variables"-only). **Rebuild CSS (F5):**
    `npm run tokens:build` after this switch, so no stale generated CSS from the previous active
    brand lingers (it's gitignored — a stale rebuild won't show in `git diff`).
  - **Cases:** an inherited field (e.g. a different `semantic.color.*` leaf) shows "Inherited from
    default" and is still editable; editing and staging it, then Save, creates a real override
    (confirm via reading `demo-child/tokens.json` after) and the caption flips to "Overridden";
    the pre-seeded `component.button.radius` override shows "Revert to parent," not "Revert"; a
    pending (unsaved) edit on *either* an inherited or overridden field shows "Discard staged
    change to..." per F3, not "Revert to parent," until saved; clicking "Revert to parent" on a
    real (saved) override deletes it from `demo-child/tokens.json` and the caption flips back to
    "Inherited."
  - **Teardown, guaranteed even on failure:** restore `active-brand.json` and
    `demo-child/tokens.json` via `git checkout`, **rebuild CSS again (F5)** back to the default
    brand's output, run `npm run tokens:build`.
- `git diff --stat` matches the allowlist exactly (`demo-child/tokens.json` itself shows no diff
  post-run).
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- Checkpoint commit (not pushed).

## 9. Stop-conditions

- If `token-writes.mjs`/`route.ts`'s current shape (line numbers, the exact `applyWrite`/
  `applyBatchWrite` bodies quoted in §2) has drifted, stop and confirm — the "byte-for-byte
  unchanged root brand" claim depends on knowing exactly what's being preserved.
- If `ensureOwnLeaf`'s path-creation can't cleanly distinguish "missing" from "present but wrong
  shape" (e.g. a non-object sitting where an intermediate segment is expected) in a way that
  doesn't silently overwrite unrelated data, stop and ask — don't guess at a merge/overwrite
  policy for malformed input.
- If restoring `active-brand.json`/`demo-child/tokens.json` (and the CSS rebuild) after a failed
  Playwright run can't be guaranteed, stop and ask for a more robust cleanup mechanism rather than
  shipping a spec that can leave the fixture brand — or the currently-served CSS — corrupted.
