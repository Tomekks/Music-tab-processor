# Task spec: Brand create/duplicate/delete (Tasks 2, 3, 4)

**Tier: S** — dev-only editor surface (`/design-system` 404s in production), no real user data,
fully revertible via `git checkout` on this spec's own allowlisted files.

Read fresh against `app/app/design-system/editor.tsx` (1108 lines),
`app/app/api/design-system/tokens/route.ts` (232 lines),
`app/packages/design-system/src/build-tokens.mjs` (220 lines),
`app/packages/design-system/src/token-writes.mjs` (519 lines),
`app/packages/design-system/src/css-var-naming.mjs` (~60 lines) — all current as of this revision.

**Depends on `docs/specs/design-system-brand-write-scoping.md` landing first** — this task's own e2e
tests edit fields on newly-created/duplicated brands and assert the write lands on the right one;
without that fix already in place, those assertions are unreliable. Does **not** depend on, and does
**not** touch, the undeployed-changes indicator (a separate, later spec) — a brand created or
duplicated by this task simply has no deploy-status flag at all until that spec lands; nothing here
references it.

## 0. User story

You're on `/design-system`. You click "New brand," type a name, and land on a fresh brand that
inherits everything from Main until you touch a field. You click "Duplicate this brand" on any brand
you're viewing (Main included), name the copy, and land on a brand frozen at exactly today's values
— editing Main later never leaks into it, and its dark-mode colors still work correctly. You click
"Delete this brand," type its name to confirm, and it's gone from the switcher — except you can
never do this to Main, and if you deleted the wrong one, it's sitting in a recoverable trash
location, not actually erased.

## 1. Context (read, don't re-derive)

- **Brand storage**: `brands/<slug>/tokens.json` (+ `tokens.default.json` for Main only). A child
  brand also has `brands/<slug>/brand.json` = `{ "parent": "<slug>" }`; Main (`brands/default/`) has
  no `brand.json` at all — that absence is what `resolveBrandTree` (`build-tokens.mjs:100`) uses to
  detect "this is root." Inheritance is capped at exactly one level (`build-tokens.mjs:114-122`
  throws if a parent itself declares a parent) — confirmed still true, unchanged by this task.
- **ADR 0001 already settled the two structural questions this batch would otherwise have to
  re-litigate**: every brand — New *or* Duplicate — sits one level under Main
  (`brand.json = { "parent": "default" }`), never chained to another child; a live-tracking-chain
  design ("duplicate resets against its source, not Main") was explicitly considered and rejected
  because it reopens "what happens to descendants on delete" for a capability nobody needs. This
  batch does not need to guard against that case — under a flat hierarchy, deleting a non-Main brand
  can never orphan anything.
- **`VALID_ACTIONS`** (`token-writes.mjs:7`) is a flat array `route.ts`'s `switch` gates on;
  appended-to only, never reordered (matches this file's own established convention).
- **Freezing every alias on Duplicate would silently break dark mode for one real, already-shipped
  case — caught during review, not part of the original plan text.** `generateCSS`
  (`build-tokens.mjs`) has a private helper, `themeVaryingColorRef(leaf, themeVaryingKeys)`, whose
  entire job is deciding when a `component.*` leaf must stay a live `{semantic.color.X}` alias
  (emitted as `var(--color-x)`) instead of a resolved literal — specifically so `[data-theme="dark"]`
  overrides keep flowing through it. The real fixture data already has this case
  (`build-tokens.test.mjs`'s `EXPECTED` constant: `--component-color-field-text: var(--color-surface-text)`,
  where `surfaceText` is theme-varying). A naive "resolve every alias to its literal" duplicate would
  bake in today's *light-mode* value for that leaf, permanently, on every duplicated brand only —
  Main itself would be unaffected. **Fix: reuse the exact same detector, don't re-derive the rule.**
  Move `themeVaryingColorRef` into `css-var-naming.mjs` (already this codebase's designated home for
  pure, no-fs, cross-module naming/detection helpers — its own header comment says as much) and
  import it from both `generateCSS` and the new `applyDuplicateBrand`. A leaf this function flags
  copies its alias string unchanged (now pointing at the *duplicate's own* already-frozen copy of
  that semantic color — no ongoing link back to the source brand, so this doesn't reopen ADR 0001's
  "no live tracking" decision); every other leaf resolves to its literal exactly as originally
  specified.
- **Why brand creation and deletion are staged/atomic, not direct.** `route.ts` already has an
  established atomic-write idiom for *files* — write to a uniquely-named temp path, then
  `renameSync` over the real one, so a crash mid-write can never leave a half-written file
  (`atomicWriteString`, `route.ts:29-33`). The same idea applies one level up, to *directories*:
  build a new brand's `brand.json`/`tokens.json` inside a private, not-yet-public
  `brands/.tmp-<slug>-...` directory, then publish it with one `renameSync` — same-filesystem
  directory rename is atomic, so `listBrands()` can never observe a half-formed brand. Deletion gets
  the same treatment in reverse: `renameSync` the brand out to `brands/.trash-<slug>-<timestamp>`
  instead of actually removing it. This makes a confirmed delete recoverable (rename it back
  manually) for near-zero extra code, on top of the type-to-confirm step already guarding against
  misclicks. **`listBrands()` must exclude dot-prefixed directory names** so a leftover `.tmp-*` from
  an interrupted creation, or any `.trash-*`, never appears as a real, selectable brand.
- **No modal/dialog primitive exists anywhere in this repo** (`packages/design-system/src/components/`
  has only `Slider`, `ColorField`, `SegmentedControl`, `Button`; no `Dialog`/`Modal`). Delete's
  type-to-confirm step is an inline expand-in-place row (same idiom this file already uses for
  reset-all's arm/confirm dance at `editor.tsx:827-848`), not a new UI primitive.
- **Duplicate is scoped to "the brand you're currently viewing," not a per-row action in the brand
  list.** The plan's "click Duplicate on any brand — Main included" is satisfied because the brand
  switcher (Task 1) already lets any brand become "the one you're viewing" first; this avoids adding
  per-item actions to the plain switch-links every other list entry still is.
- **Every other `apply*` function in `token-writes.mjs` returns `{ok: false, error}` on a bad input;
  none throws to its caller.** `applyDuplicateBrand` must follow the same contract — a broken/circular
  alias (`resolveValue` throwing) is caught and returned as an `ApplyErr`, not left to propagate into
  `route.ts`'s outer catch-all as an undifferentiated 500.
- **Duplicating Main itself (`source === "default"`) needs no special-case code.**
  `resolveBrandTree(resolveBrandDirForSlug("default"))` already returns `{tree: <Main's own tokens.json
  content>, parentBrandDir: null}` — Main has no `brand.json`, so this is exactly the same "root brand,
  no merge needed" path every other Main-reading call in this codebase already takes. `applyDuplicateBrand`
  then walks that tree exactly as it would a child brand's merged tree — nothing in it assumes a parent
  exists. Confirm this if you're unsure, but there is nothing to branch on here.

## 2. Scope

### `css-var-naming.mjs`

Move `themeVaryingColorRef` here from `build-tokens.mjs` (verbatim, including its comment), and
export it:

```js
// A component.* leaf whose $value is a direct single reference to a
// theme-varying semantic color (a key present in the dark override block)
// must stay a live alias (emitted as var(--color-x), or in this module's
// other caller, copied as-is) instead of a resolved literal -- the alias
// re-resolves live, so [data-theme] overrides flow through automatically.
// Anything else (non-color leaves, theme-invariant colors like
// accent/onAccent) resolves to a literal exactly as before. Shared by
// generateCSS (build-tokens.mjs) and applyDuplicateBrand (token-writes.mjs)
// so the two never define this rule differently.
export function themeVaryingColorRef(leaf, themeVaryingKeys) {
  if (typeof leaf.$value !== "string") return null;
  const m = /^\{\s*semantic\.color\.([A-Za-z0-9_]+)\s*\}$/.exec(leaf.$value);
  if (!m) return null;
  return themeVaryingKeys.has(m[1]) ? m[1] : null;
}
```

### `build-tokens.mjs`

Remove the local `themeVaryingColorRef` definition; add it to the existing `css-var-naming.mjs`
import instead. `generateCSS`'s own call site is unchanged.

Add `mkdirSync, renameSync` to the existing `node:fs` import.

Fix `listBrands()` to exclude dot-prefixed entries (needed before staged/trashed directories can
ever exist under `brands/`):

```js
export function listBrands() {
  return readdirSync(join(PACKAGE_ROOT, "brands"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}
```

Add atomic brand-directory lifecycle helpers:

```js
// Atomic brand creation: stage every file in a hidden, not-yet-public
// directory, then publish with a single renameSync -- the same
// same-filesystem atomic-rename trick route.ts's atomicWriteString already
// uses for individual files, one level up. A crash mid-staging leaves an
// orphaned .tmp-* directory that listBrands() already filters out and
// nothing else ever reads -- never a half-formed real brand.
export function beginBrandCreation(slug) {
  const tmpDir = join(PACKAGE_ROOT, "brands", `.tmp-${slug}-${process.pid}-${Date.now()}`);
  mkdirSync(tmpDir);
  return tmpDir;
}

export function commitBrandCreation(tmpDir, slug) {
  renameSync(tmpDir, join(PACKAGE_ROOT, "brands", slug));
}

// Soft delete: rename out of brands/ instead of removing, so a confirmed
// delete is still recoverable (manually, by renaming back) rather than
// permanent.
export function trashBrandDir(slug) {
  const brandDir = resolveBrandDirForSlug(slug);
  const trashDir = join(PACKAGE_ROOT, "brands", `.trash-${slug}-${Date.now()}`);
  renameSync(brandDir, trashDir);
  return trashDir;
}
```

Add the delete-time active-brand guard (Task 4's "falls back to Main" requirement, applied to
*`active-brand.json`* specifically — the editor's own selected-brand fallback is a separate,
client-side concern handled in `editor.tsx` below):

```js
// If the brand being deleted is the one active-brand.json currently names,
// reset it to "default" so a future buildActiveBrand()/resolveBrandDir() call
// never throws "Unknown brand" for a directory that no longer exists.
export function resetActiveBrandIfDeleted(deletedSlug) {
  const activePath = join(PACKAGE_ROOT, "active-brand.json");
  const parsed = JSON.parse(readFileSync(activePath, "utf8"));
  if (parsed.brand !== deletedSlug) return false;
  writeFileSync(activePath, JSON.stringify({ brand: "default" }, null, 2) + "\n");
  return true;
}
```

### `token-writes.mjs`

Append three actions to `VALID_ACTIONS` (a fourth, `"mark-deployed"`, belongs to the later
deploy-status spec — not added here):

```js
export const VALID_ACTIONS = ["write", "reset", "reset-all", "set-as-default", "reset-to-parent", "generate-from-seed", "batch-write", "set-description", "list-brands", "create-brand", "duplicate-brand", "delete-brand"];
```

Add imports: `import { resolveValue } from "./resolve.mjs";` and `import { themeVaryingColorRef }
from "./css-var-naming.mjs";`, alongside the existing `generate-ramp.mjs` import.

Add `validateBrandName` — pure, derives and validates a slug from free-text input in one pass:

```js
/**
 * @param {unknown} name free-text brand display name
 * @param {string[]} existingSlugs current brand directory names (from listBrands())
 * @returns {{ok: true, slug: string} | {ok: false, error: string}}
 */
export function validateBrandName(name, existingSlugs) {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { ok: false, error: '"name" must be a non-empty string' };
  }
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    return { ok: false, error: `"${name}" has no letters or numbers to build a brand slug from` };
  }
  if (existingSlugs.includes(slug)) {
    return { ok: false, error: `A brand named "${slug}" already exists` };
  }
  return { ok: true, slug };
}
```

Add `applyDuplicateBrand` — freezes every leaf of a fully-merged tree to `{$value, $type}` (plus
`$description` when present), **except** a leaf `themeVaryingColorRef` flags, which keeps its alias
string unchanged (§1). Returns the same `{ok, ...} | ApplyErr` shape every sibling function in this
file already uses — a broken/circular alias (`resolveValue` throwing) is caught, not propagated:

```js
/**
 * @param {object} mergedTree resolveBrandTree(...).tree of the SOURCE brand — already
 *   fully resolved against its own parent if it has one; never mutated
 * @returns {{ok: true, tokens: object} | ApplyErr} tokens: a fully-populated (non-sparse)
 *   tree, every leaf's $value frozen to its resolved literal EXCEPT a leaf aliasing a
 *   theme-varying semantic color, which keeps its alias string (§1)
 */
export function applyDuplicateBrand(mergedTree) {
  const themeVaryingKeys = new Set(Object.keys(mergedTree.dark?.semantic?.color ?? {}));
  const tokens = {};
  try {
    for (const { path, leaf } of collectLeafPaths(mergedTree)) {
      const segments = path.split(".");
      let node = tokens;
      for (let i = 0; i < segments.length - 1; i++) {
        node = node[segments[i]] ??= {};
      }
      const themeKey = themeVaryingColorRef(leaf, themeVaryingKeys);
      const frozen = themeKey
        ? { $value: leaf.$value, $type: leaf.$type }
        : { $value: resolveValue(mergedTree, leaf.$value), $type: leaf.$type };
      if (leaf.$description) frozen.$description = leaf.$description;
      node[segments.at(-1)] = frozen;
    }
  } catch (err) {
    return { ok: false, status: 400, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, tokens };
}
```

### `route.ts`

Add `beginBrandCreation, commitBrandCreation, trashBrandDir, resetActiveBrandIfDeleted` to the
`build-tokens.mjs` import; `validateBrandName, applyDuplicateBrand` to the `token-writes.mjs` import.
Add `name?: unknown, source?: unknown` to the destructured body and its type, alongside `brand`. No
new `node:path`/`node:fs` imports needed — `join` and `writeFileSync` are already imported.

Three new `case` blocks, added after `"list-brands"`. **`create-brand` and `duplicate-brand`
deliberately never read the generic `brandDir` resolved at the top of the handler** — that variable
exists for actions that operate on "whichever brand this request is scoped to," and these two don't
scope to an existing brand at all (they resolve their own target(s) by slug, from `name`/`source`
directly). Don't wire it into either case; it stays simply unused for both, same as it already is for
`"list-brands"`.

```ts
case "create-brand": {
  if (typeof name !== "string") {
    return badRequest('"create-brand" requires "name" to be a string');
  }
  const validated = validateBrandName(name, listBrands());
  if (!validated.ok) return badRequest(validated.error);
  const tmpDir = beginBrandCreation(validated.slug);
  writeFileSync(join(tmpDir, "brand.json"), JSON.stringify({ parent: "default" }, null, 2) + "\n");
  writeFileSync(join(tmpDir, "tokens.json"), stringifyTokens({}));
  commitBrandCreation(tmpDir, validated.slug);
  return Response.json({ ok: true, slug: validated.slug });
}
case "duplicate-brand": {
  if (typeof name !== "string") {
    return badRequest('"duplicate-brand" requires "name" to be a string');
  }
  if (typeof source !== "string" || !listBrands().includes(source)) {
    return badRequest(`"duplicate-brand" requires "source" to name an existing brand`);
  }
  const validated = validateBrandName(name, listBrands());
  if (!validated.ok) return badRequest(validated.error);
  const { tree: sourceTree } = resolveBrandTree(resolveBrandDirForSlug(source));
  const frozen = applyDuplicateBrand(sourceTree);
  if (!frozen.ok) {
    return Response.json({ ok: false, error: frozen.error }, { status: frozen.status });
  }
  const tmpDir = beginBrandCreation(validated.slug);
  writeFileSync(join(tmpDir, "brand.json"), JSON.stringify({ parent: "default" }, null, 2) + "\n");
  writeFileSync(join(tmpDir, "tokens.json"), stringifyTokens(frozen.tokens));
  commitBrandCreation(tmpDir, validated.slug);
  return Response.json({ ok: true, slug: validated.slug });
}
case "delete-brand": {
  // Deliberately does NOT fall back to the generic brandDir resolved above --
  // that fallback resolves to the ACTIVE brand when "brand" is omitted, which
  // would make an omitted field silently delete whatever's currently active.
  if (typeof brand !== "string") {
    return badRequest('"delete-brand" requires "brand" to be a string');
  }
  if (brand === "default") {
    return badRequest("The default brand can't be deleted");
  }
  if (!listBrands().includes(brand)) {
    return badRequest(`Unknown brand "${brand}"`);
  }
  trashBrandDir(brand);
  if (resetActiveBrandIfDeleted(brand)) buildActiveBrand();
  return Response.json({ ok: true });
}
```

Note `writeFileSync` (not `atomicWriteString`) inside `tmpDir` in the two creation cases: a crash
mid-write there just leaves an orphaned `.tmp-*` directory (never visible as a real brand, per §1) —
the file is already staged in a private location nothing else can observe, so the per-file
temp-then-rename trick `atomicWriteString` uses for in-place updates to an already-public file would
be redundant here.

### `editor.tsx`

**New brand / Duplicate / Delete controls.** New local state: `const [brandAction, setBrandAction] =
useState<"new" | "duplicate" | "delete" | null>(null);` and `const [brandActionInput,
setBrandActionInput] = useState("");`. Rendered as a small action row directly below the brands
`<nav>` (or merged into the same row — either is fine, whichever keeps the diff smaller once you're
looking at the real render tree): a "New brand" button, a "Duplicate this brand" button, and (hidden
entirely when `selectedBrand === "default"`) a "Delete this brand" button. Same
`pendingEdits.size > 0 || inFlight.size > 0` guard the brand-switch links already use (`:929-934`)
blocks all three — creating/duplicating/deleting shouldn't race an unsaved edit or in-flight write
any more than switching brands should.

Clicking "New brand" or "Duplicate this brand" sets `brandAction` accordingly, auto-focuses (a
`ref` + `useEffect`, or the `autoFocus` prop) and reveals an inline text input (reuse the existing
plain `<input type="text">` styling at `editor.tsx:302-314`) bound to `brandActionInput`, plus
"Create"/"Cancel". The "New brand" input gets `placeholder="Untitled brand"` (a placeholder only —
`brandActionInput` itself starts `""`, so submitting without typing anything still hits
`validateBrandName`'s empty-name rejection rather than silently creating a brand literally named
"Untitled brand"). Submit calls:

```ts
const result = await postAction(
  brandAction === "new"
    ? { action: "create-brand", name: brandActionInput }
    : { action: "duplicate-brand", name: brandActionInput, source: selectedBrand },
);
if (result.ok) {
  router.push(`/design-system?brand=${(result as { slug: string }).slug}`);
} else {
  setError(result.error);
}
```

(`ApiResult`'s type gains an optional `slug?: string` on the `ok: true` branch for this.)

Clicking "Delete this brand" sets `brandAction = "delete"` and reveals: instructional text that
names the **exact slug** required, distinct from the humanized label shown everywhere else (e.g.
`` Type "${selectedBrand}" to confirm — the brand's short name, not "${humanize(selectedBrand)}" ``),
the same styled text input bound to `brandActionInput`, a "Confirm delete" button **disabled until
`brandActionInput === selectedBrand`** (exact raw-slug match), and "Cancel". Confirm calls:

```ts
const result = await postAction({ action: "delete-brand", brand: selectedBrand });
if (result.ok) {
  router.push("/design-system?brand=default");
} else {
  setError(result.error);
}
```

Any successful create/duplicate/delete/cancel resets `brandAction` to `null` and
`brandActionInput` to `""`.

## 3. Non-goals

- "New Variant" (duplicate with an ongoing live link back to its source) — deferred; ADR 0001
  already rejected this shape for the reason given in §1.
- The undeployed-changes indicator (a separate, later spec) — a brand this task creates/duplicates
  gets no deploy-status flag at all until that spec lands; nothing here references it.
- A shared `Dialog`/`Modal` component — Delete's confirm step is inline, per §1.
- Per-brand-row Duplicate/Delete buttons in the switcher list itself — both act on "the brand
  currently selected," per §1.
- Any retention/expiry policy for `.trash-*` brand directories — they accumulate until manually
  removed; a cleanup mechanism is real but unneeded machinery for a single-owner dev tool (YAGNI).
- Anything from Task 5 (the broader "editor assumes Main" copy audit) beyond the two sentences this
  task's own new UI introduces.
- Multi-level brand chains, cross-repo distribution, versioning — all out of scope per the plan/ADR,
  unchanged by this task.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `create-brand`/`duplicate-brand` `name` empty, whitespace-only, or has no alphanumeric chars | `badRequest` — `validateBrandName` rejects before any directory is created. |
| `create-brand`/`duplicate-brand` `name` derives a slug that already exists (case-insensitive collision, e.g. "Default") | `badRequest` — `validateBrandName`'s `existingSlugs.includes(slug)` check. |
| `duplicate-brand` `source` missing or not a real brand | `badRequest`, no directory created. |
| `duplicate-brand` source tree contains a genuinely broken alias (circular, or pointing at a non-existent path) | `applyDuplicateBrand` returns `{ok: false, ...}`; `route.ts` returns that error, no directory created. |
| `delete-brand` `brand` omitted | `badRequest` — never falls back to the active brand (§1, §2's route.ts note). |
| `delete-brand` `brand === "default"` | `badRequest`, directory untouched. |
| `delete-brand` `brand` doesn't exist | `badRequest` (matches every other unknown-brand case in this route). |
| Deleting the brand `active-brand.json` currently names | `active-brand.json` resets to `"default"`, `buildActiveBrand()` reruns — the next `resolveBrandDir()` call never throws. |
| Deleting the brand currently open in the editor | Client navigates to `/design-system?brand=default` unconditionally after success (§2's `router.push`), regardless of what `active-brand.json` ends up naming. |
| A crash between `beginBrandCreation` and `commitBrandCreation` | Leaves an orphaned `brands/.tmp-*` directory. `listBrands()` never surfaces it (dot-prefix filter). No automatic cleanup — safe to delete by hand. |
| Duplicating a brand whose merged tree has a `component.*` leaf aliasing a theme-varying semantic color | That leaf's alias string is copied unchanged, not resolved to a literal — dark-mode theming for it keeps working on the duplicate (§1). |
| Clicking New/Duplicate/Delete while `pendingEdits.size > 0` or `inFlight.size > 0` | Blocked, same guard as brand-switch links. |
| Confirm-delete button, input doesn't exactly match `selectedBrand` (the raw slug) | Stays disabled — no request sent. |

## 5. Forbidden patterns

No bare `except`/unchecked `catch` swallowing an error silently (the one `try/catch` this spec adds,
in `applyDuplicateBrand`, returns a typed `ApplyErr` — it doesn't swallow). No touching
`.env`/credentials. No new npm dependency (no modal library — inline expand reuses existing
patterns, per §1).

## 6. File allowlist

- `app/packages/design-system/src/css-var-naming.mjs`
- `app/packages/design-system/src/css-var-naming.test.mjs` (if it doesn't exist yet, create it — see §7)
- `app/packages/design-system/src/token-writes.mjs`
- `app/packages/design-system/src/token-writes.test.mjs`
- `app/packages/design-system/src/build-tokens.mjs`
- `app/packages/design-system/src/build-tokens.test.mjs`
- `app/app/api/design-system/tokens/route.ts`
- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/brand-crud.spec.ts` (new)

No `.env`/credentials, no new npm dependency. Does **not** include `page.tsx` or `.gitignore` —
neither needs to change for this task (page.tsx gains a prop only when the deploy-status spec lands).

## 7. Acceptance criteria

- `npm run verify` passes, including:
  - Whatever existing test currently exercises `themeVaryingColorRef` via `build-tokens.mjs`/
    `generateCSS`'s output keeps passing unmodified after the move to `css-var-naming.mjs` — the
    move must not change `generateCSS`'s output at all (same function, same import graph, different
    file). If `css-var-naming.mjs` has no test file yet, add one covering `themeVaryingColorRef`
    directly (a leaf aliasing a key in `themeVaryingKeys` returns that key; a literal-valued leaf, a
    non-color leaf, and an alias to a non-theme-varying key all return `null`).
  - New `token-writes.test.mjs` cases: `validateBrandName` — derives `"movie-site-dark"` from
    `"Movie Site Dark"`; rejects empty/whitespace-only names; rejects a name with no alphanumeric
    characters (e.g. `"!!!"`); rejects a name whose derived slug collides with an existing one
    (case-insensitive, e.g. `"Default"` vs `"default"`). `applyDuplicateBrand` — given a tree with a
    plain literal leaf, a non-theme-varying alias leaf (e.g. `component.button.radius:
    {semantic.radius.base}`), and a theme-varying alias leaf (e.g. `component.colorField.text:
    {semantic.color.surfaceText}`, with a `dark.semantic.color.surfaceText` present in the same
    tree): the plain leaf's value passes through, the non-theme-varying alias resolves to its
    literal, and the theme-varying alias's `$value` is copied unchanged (still the alias string) —
    this is the one assertion this task exists to add. A leaf with a `$description` keeps it in the
    frozen output. A tree with a genuinely circular alias returns `{ok: false, ...}`, not a thrown
    error.
  - New `build-tokens.test.mjs` cases for `beginBrandCreation`/`commitBrandCreation`/`trashBrandDir`/
    `resetActiveBrandIfDeleted` **must create a real, uniquely-named temp brand under the real
    `brands/`** (e.g. `__test-tmp-<random>__`, never a name a real feature brand could plausibly use)
    **and remove every trace of it — including any `.tmp-*`/`.trash-*` artifact — in a `finally`
    block**, so a failing assertion can never leave a stray directory or a permanently-mutated
    `active-brand.json` behind. Also cover: after `beginBrandCreation` + writing files +
    `commitBrandCreation`, `listBrands()` includes the new slug and excludes any leftover
    `.tmp-*`/`.trash-*` name; `trashBrandDir` moves the directory out from under `listBrands()`
    without deleting it from disk.
- **Required: `app/e2e/design-system/brand-crud.spec.ts`**, run via `npm run test:e2e:design-system`.
  Same fail-fast/cleanup discipline as `staged-save.spec.ts`/`dark-values.spec.ts` — assert
  `brands/` (including no stray `.tmp-*`/`.trash-*` entries) and `active-brand.json` are back to
  their pre-run state after every test, including on failure. Cover: creating a brand via the UI and
  landing on it; **duplicating `default` specifically** (its real fixture data has both kinds of alias
  reachable, per §1) and confirming, via a follow-up API read of the new brand's `tokens.json` (not
  just the UI), that `component.button.radius` (a non-theme-varying alias) froze to its resolved
  literal while `component.colorField.text` (the theme-varying alias to `semantic.color.surfaceText`)
  is still the literal string `"{semantic.color.surfaceText}"`, unresolved; attempting to delete
  "default" is not possible (no delete control rendered, or the API call is never reachable from the
  UI); deleting a freshly-created brand while it's the active one, confirming `active-brand.json`
  falls back and the editor navigates to `default`.
- `git diff --stat` matches the allowlist.
- **Human checkbox:** open `/design-system`, run through New → Duplicate → Delete once by hand,
  confirm the inline forms/confirm-delete row don't visually break the brand nav's layout, and a
  duplicated brand's dark-mode rendering actually looks correct for whichever component uses the
  `surfaceText`-aliasing field (not just "doesn't crash").
- Self-check before reporting, per `docs/web-app-workflow/spec-template.md`'s Definition-of-done
  format — in particular, confirm `brands/` and `active-brand.json` are genuinely unchanged from git
  HEAD after the full test run (not assumed from the spec's own cleanup claims).
- Checkpoint commit (not pushed).

## 8. Stop-conditions

- If `docs/specs/design-system-brand-write-scoping.md` has not landed yet, stop — this spec's own
  e2e tests depend on it (§ above).
- If any of the files this spec touches has changed shape since this spec's read (§0's line counts)
  beyond what this spec itself describes, stop and confirm the actual current structure before
  wiring in new cases/props/imports — don't guess at where things moved.
- If `themeVaryingColorRef` has already changed signature or moved since this spec's read, stop and
  re-derive `applyDuplicateBrand`'s use of it from the actual current function — don't assume this
  spec's embedded copy is still accurate.
- If a real third or fourth brand directory exists under `brands/` at implementation time (beyond
  `default`/`demo-child`), that's fine for this task (nothing here hardcodes a brand count) — but
  confirm none of them is already named with this spec's own temp-test prefix, or with a
  `.tmp-`/`.trash-` prefix, before using one.

---
**Landed:** commit `9de4f55`; deployed pending push. 16 new unit tests (4 `css-var-naming.test.mjs`
— new file; 4 `validateBrandName`; 4 `applyDuplicateBrand`; 4 brand-lifecycle in
`build-tokens.test.mjs`), `npm run verify` 125/125 PASS. New `brand-crud.spec.ts` 4/4 PASS; full
design-system e2e suite re-run after landing, 34/34 PASS (1 pre-existing unrelated skip) — no
regressions in `brand-switcher`/`dark-values`/`descriptions`/`inherited`/`staged-save`.

**Human checkbox — done, with one honest caveat.** New UI (brand nav row, inline New/Duplicate/Delete
forms, confirm-delete text) renders cleanly, doesn't break the brand nav layout, autofocus and
disabled-state behavior confirmed via screenshot. The spec's own "duplicated brand's dark-mode
rendering actually looks correct" clause turned out to not be directly checkable through the editor's
own UI: `FieldRow` displays an alias field's *resolved* value only (no per-field theme toggle in this
tool, for any brand, not just duplicates — pre-existing, unrelated to this task), so toggling
`data-theme` client-side changes the editor's own chrome but not what a field's input shows. The
actual correctness claim (the theme-varying alias stays unresolved in the written `tokens.json`, so
`generateCSS`'s already-proven `var()`-alias mechanism keeps working on the real generated CSS) is
verified by the unit tests and the e2e file-content check instead — the stronger evidence for this
specific claim regardless.
