# Task spec: Inherited vs. overridden UI on a child brand (Task 5c)

**Tier: S** — dev-only editor surface, no real user data, fully revertible via `git checkout`.
Written fresh against the current branch (post-8b, commit `4884412`): `field-descriptors.mjs`
(101 lines), `app/app/design-system/page.tsx` (18 lines), `editor.tsx` (867 lines) — if any has
changed since, stop and re-read before implementing.

**Scope decision, made explicitly before writing this spec (not silently assumed):** editing a
still-*inherited* field on a child brand — turning it into a brand-new override — is **out of
scope**. `applyWrite`/`applyBatchWrite` look up a path in the child's own sparse `tokens.json`
only; a field that's inherited (not yet present there) would 400 as "not a known token path."
Making that work means extending the core write path (leaf creation, type validation against the
merged tree) — real new logic for a brand with no current real second user. This task instead
makes inherited fields **read-only**: the editor clearly shows inherited vs. overridden, and lets
you edit/revert-to-parent whatever's *already* overridden (covers `demo-child`'s one real
override today). Converting an inherited field into a new override stays a manual JSON edit for
now, revisited if it's ever actually needed — this doesn't foreclose it, §2's design doesn't
assume inherited fields can never become editable, it just doesn't build that path yet.

## 0. User story

You're editing a child brand (say, a future second surface that overrides just its accent color).
Opening `/design-system` today shows every token as if it were this brand's own — no way to tell
"this is genuinely this brand's choice" from "this is just whatever the main brand happens to be
right now." With this task, every field is labeled either **Inherited** (read-only, shown in grey,
matching whatever the parent brand currently has) or **Overridden** (editable, with a "Revert to
parent" action that deletes the override — not copies a value — so it starts following the
parent's future changes again, exactly like turning inheritance back on).

## 1. Context (read, don't re-derive)

- **Server-side support already exists, fully, from Tasks 5a/5b — this task is editor-UI only.**
  `resolveBrandTree(brandDir)` (`build-tokens.mjs:81`) deep-merges a child's sparse `tokens.json`
  onto its parent's, returning `{ tree, parentBrandDir }`. `route.ts`'s `"reset-to-parent"` case
  (confirmed present, dispatches to `applyResetToParent`) already rejects a brand with no parent
  and otherwise deletes (not copies) the leaf from the child's own file. None of this needs
  touching.
- **`demo-child` (`brands/demo-child/`) is the only child brand that exists**, fixture from 5a:
  `brand.json` → `{ "parent": "default" }`, `tokens.json` → one leaf,
  `semantic.color.accent: "#4a90d9"`. **It has no `tokens.default.json` of its own.**
  `page.tsx` currently reads `tokens.default.json` from `brandDir` unconditionally — pointing
  `active-brand.json` at `demo-child` today would crash with `ENOENT` before this task lands. §2.2
  fixes this by never reading that file for a child brand at all (see below for why the concept
  doesn't apply there).
- **`isModified` doesn't mean anything useful for a child brand.** It's "differs from
  `tokens.default.json`" — a root-brand-only concept (no child-level defaults file exists, or
  needs to). For a child brand, the equivalent question is "is this leaf present in *this brand's
  own* `tokens.json`, or inherited" — a different comparison, against a different tree. §2.1 adds
  this as a new, separate field (`isInheritedFromParent`) rather than overloading `isModified` to
  mean two different things depending on brand type.
- **No in-UI brand switcher exists.** Testing this task means hand-editing
  `app/packages/design-system/active-brand.json` to `{ "brand": "demo-child" }`, same as 5a/5b's
  own specs did — not a gap this task needs to fill.

## 2. Scope

### 2.1 `field-descriptors.mjs`

Add `ownTree` as an optional third parameter to `buildFieldDescriptors`. When present, it's the
child brand's own *sparse* (unmerged) tree — used only to answer "is this leaf actually in this
brand's own file." `tokensTree` stays the merged/resolved tree (needed either way, for correct
`value`/`rawValue`/`isAlias` on an inherited leaf — those must reflect whatever's actually
in effect, parent or child, which the merge already resolves correctly with no extra logic here).

```js
/**
 * @param {object} tokensTree live, MERGED tree (resolveBrandTree's `.tree` for
 *   a child brand, or a root brand's own tokens.json directly)
 * @param {object} defaultsTree tokens.default.json tree — ignored when `ownTree`
 *   is provided (a child brand has no defaults file; see isModified below)
 * @param {object | null} [ownTree] the child brand's own SPARSE tokens.json,
 *   or omitted/null for a root brand
 * @returns {FieldDescriptor[]}
 */
export function buildFieldDescriptors(tokensTree, defaultsTree, ownTree = null) {
```

Inside the loop building each descriptor (currently `rawValue`/`isModified`/`isAlias` at lines
86–88), change:

```js
isModified: ownTree ? false : (defRaw === null ? true : rawValue !== defRaw),
isInheritedFromParent: ownTree !== null && getLeaf(ownTree, path) === null,
```

`isModified` is forced `false` for any child-brand call — not computed against an empty
`defaultsTree` fallback (which would make every leaf look "modified" by accident, since
`getLeaf({}, path)` always misses). `isInheritedFromParent` is always `false` for a root brand
(`ownTree` is `null`) — add `@property {boolean} isInheritedFromParent` to the `FieldDescriptor`
typedef, alongside `isModified` at line 23.

### 2.2 `page.tsx`

Branch on whether the active brand has a parent, using `resolveBrandTree` instead of reading
`tokens.json` directly:

```tsx
import { resolveBrandDir, resolveBrandTree } from "../../packages/design-system/src/build-tokens.mjs";
import { buildFieldDescriptors } from "../../packages/design-system/src/field-descriptors.mjs";
// ...
const brandDir = resolveBrandDir();
const { tree, parentBrandDir } = resolveBrandTree(brandDir);
const descriptors = parentBrandDir
  ? buildFieldDescriptors(
      tree,
      {}, // ignored when ownTree is passed — see field-descriptors.mjs
      JSON.parse(readFileSync(join(brandDir, "tokens.json"), "utf8")), // the child's OWN sparse file
    )
  : buildFieldDescriptors(
      tree,
      JSON.parse(readFileSync(join(brandDir, "tokens.default.json"), "utf8")),
    );
return <Editor descriptors={descriptors} isChildBrand={parentBrandDir !== null} />;
```

This is the fix for the `ENOENT` risk in §1: `tokens.default.json` is only read on the
`parentBrandDir === null` (root brand) branch — never for a child brand.

### 2.3 `editor.tsx`

`Editor` gets a new prop: `isChildBrand: boolean` (default `false` isn't needed — `page.tsx`
always passes it explicitly per §2.2). Thread it down to every `FieldRow` call site (`renderSection`
and the per-component detail view, currently lines ~706–707 and ~853–854) as `isChildBrand`.

**`FieldRow` gets two new optional props: `isChildBrand?: boolean`, `onResetToParent?: (path: string) => void`.**
Behavior split, additive to the existing logic (lines 226–330 today) — root-brand rendering
(`isChildBrand` false or absent) is **byte-for-byte unchanged**:

- **`isChildBrand && d.isInheritedFromParent` (read-only):** render the same static
  label+value fallback the file already uses for non-editable types (`fontFamily`, the `<div>`
  branch at today's line ~273–277) instead of `ColorRow`/`SliderRow`, regardless of `$type` —
  don't wire `commit`/`onStage`/`onCommitValue` for this row at all. Add one caption line under it:
  `<p className={cn(CAPTION, "mt-1")}>Inherited from default</p>`. No Revert/Set-as-default row —
  there's nothing to revert (no override exists).
- **`isChildBrand && !d.isInheritedFromParent` (overridden, editable):** the value control renders
  exactly as it does today (staged or immediate, per view, unchanged). The button row changes:
  **no "Set as default"** (doesn't apply — no child-level defaults file, per §1); **"Revert"
  becomes "Revert to parent"** — label `Revert ${d.label} to parent`, `onClick` calls
  `onResetToParent!(d.path)` instead of `onRevert(d.path)`. Gate on `d.isModified || pending` as
  today does (still correct: `isModified` is `false` in child mode per §2.1, so this becomes
  effectively `pending` for a staged unsaved edit, or **always show it for an already-overridden
  field** — see the fix below, `isModified` being forced `false` means an *already-saved* override
  would otherwise show no Revert-to-parent button at all, which is wrong):
  ```tsx
  {(d.isModified || pending || (isChildBrand && !d.isInheritedFromParent)) && ( /* button row */ )}
  ```
  This is the one place `isModified` being forced `false` (§2.1) needs a companion condition here,
  not a silent gap — an overridden child field must always show "Revert to parent," saved or not.
- **Root brand:** unchanged in every respect.

**`Editor`-level:** add `runResetToParent`, following `runReset`'s exact shape (line 501):

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

Pass `onResetToParent={runResetToParent}` alongside `isChildBrand={isChildBrand}` at both
`FieldRow` call sites.

## 3. Non-goals

- Editing an inherited (not-yet-overridden) field into a new override — out of scope, per the
  decision at the top of this spec.
- A "brand"-scope (Task 8) staged edit whose alias target isn't itself already overridden in the
  child's own tree would still 400 server-side, same root cause as the point above — **known
  limitation, not fixed by this task.** Not exercised by `demo-child`'s actual data today (its one
  override, `semantic.color.accent`, is a `semantic.color` field, only reachable via "All
  variables," which never uses staged/scope edits at all) — don't go looking for a fix here.
- No in-UI brand switcher (§1) — still a manual `active-brand.json` edit.
- No `tokens.default.json` file for `demo-child` or any future child brand — confirmed
  unnecessary by this task's own design (§2.2), not an oversight to fill in.

## 4. File allowlist

- `app/packages/design-system/src/field-descriptors.mjs`
- `app/packages/design-system/src/field-descriptors.test.mjs`
- `app/app/design-system/page.tsx`
- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/inherited.spec.ts` (new)

No `.env`/credentials, no new npm dependency, no change to `token-writes.mjs`/`route.ts`/
`build-tokens.mjs` (all already correct per §1).

## 5. Acceptance criteria

- `npm run verify` passes, including new `field-descriptors.test.mjs` cases: `buildFieldDescriptors`
  with a 3rd `ownTree` arg — a leaf present in `ownTree` → `isInheritedFromParent: false`,
  `isModified: false`; a leaf absent from `ownTree` (but present in the merged `tokensTree`) →
  `isInheritedFromParent: true`; called with no 3rd arg (root-brand call shape, existing tests) →
  `isInheritedFromParent: false` for every leaf, `isModified` computed exactly as before (existing
  tests must keep passing unchanged — this is the regression guard that the 3-arg change didn't
  alter the 2-arg call shape's behavior).
- **Required: `app/e2e/design-system/inherited.spec.ts`, run via `npm run test:e2e:design-system`**
  (per `docs/WEB_APP_WORKFLOW.md` §3 — interaction behavior, not visual judgment). Since there's no
  in-UI brand switcher, the spec itself must point `active-brand.json` at `demo-child` for its
  duration and restore it afterward — same fail-fast-precondition + guaranteed-cleanup discipline
  as Task 8b's and Task 9's specs (assert `active-brand.json` and `demo-child/tokens.json` have no
  uncommitted diff before starting; restore both, even on failure, e.g. in a `finally`/`afterAll`).
  Cover: `semantic.color.accent` (the one real override) shows as editable with a
  "Revert to parent" button, not "Revert"/"Set as default"; a different `semantic.color.*` field
  (inherited) renders as static read-only text with an "Inherited from default" caption, no edit
  control; editing the override and clicking "Revert to parent" restores it and the button
  disappears; `demo-child/tokens.json` is confirmed byte-identical to its pre-test committed state
  at the end.
- `git diff --stat` matches the allowlist exactly (`demo-child/tokens.json` itself must show no
  diff post-run — it's exercised, not permanently changed, by the Playwright spec).
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- Checkpoint commit (not pushed).

## 6. Stop-conditions

- If `field-descriptors.mjs`/`page.tsx`/`editor.tsx`'s current shape has drifted from what §2
  describes (line numbers, existing prop names), stop and confirm rather than reconciling
  silently — this task's premise (byte-for-byte unchanged root-brand behavior) depends on knowing
  exactly what "unchanged" means against the real current file.
- If the button-row visibility fix in §2.3 (adding the `isChildBrand && !isInheritedFromParent`
  clause) produces a case where an overridden child field shows *both* "Revert" and
  "Revert to parent" simultaneously, or neither, stop — that's a sign the condition doesn't
  actually cover what this spec intends, not something to patch around inline.
- If restoring `active-brand.json`/`demo-child/tokens.json` after a failed Playwright run can't be
  guaranteed (e.g. a crash mid-test skips a `finally`), stop and ask for a more robust cleanup
  mechanism rather than shipping a spec that can leave the fixture brand corrupted.
