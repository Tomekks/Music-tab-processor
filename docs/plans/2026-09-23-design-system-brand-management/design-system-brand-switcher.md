# Task spec: Brand switcher (list + select)

**Tier: S** — dev-only editor surface, no real user data, fully revertible via `git checkout`.
Read fresh against `app/design-system/page.tsx` (36 lines), `app/design-system/editor.tsx` (1071
lines), `app/api/design-system/tokens/route.ts` (216 lines), `packages/design-system/src/build-tokens.mjs`
(201 lines) — all current as of this revision.

## 0. User story

You open `/design-system` and see every brand listed above the section sidebar, the one you're
currently viewing marked as selected. You click a different brand's name and the whole editor
reloads showing that brand's own values — the same page, a different brand's state, nothing
carried over by accident.

## 1. Context (read, don't re-derive)

- **`resolveBrandDir()` (`build-tokens.mjs:65`) takes no argument — it always reads
  `active-brand.json` and resolves that brand.** This is the one function both `page.tsx` and
  `route.ts` call to decide which brand's files to touch. There is exactly one call site in each
  file: `page.tsx:13`, `route.ts:68`.
- **`resolveBrandTree(brandDir)` already works for *any* brand directory passed to it**, root or
  child — it doesn't assume `brandDir` is "the active one," only that it's a real directory. This
  means once a specific brand's directory can be selected (not just the active one), every
  downstream call (`resolveBrandTree`, `buildFieldDescriptors`, the `isChildBrand`/`parentName`
  props) already generalizes for free — confirmed by reading `page.tsx:16-30`, which has no
  hardcoded assumption about *which* brand it's resolving.
- **The home page's own `?song=` searchParam is the established pattern to follow**
  (`app/page.tsx:13-15,32`): `searchParams: Promise<Record<string, string | string[] |
  undefined>>`, destructured via `await searchParams`. A "soft UI preference, not a resource
  identifier" — same shape this task needs for `?brand=`.
- **This task deliberately does not touch `active-brand.json`.** Per the plan
  (`docs/plans/2026-09-23-design-system-brand-management/2026-09-23-design-system-brand-management.md`, Task 1), which brand you
  are *editing* and which brand a *deployed app* loads are different questions — the second one is
  Task 6, explicitly deferred. `active-brand.json` still means exactly what it means today: the
  brand `npm run tokens:build`/`buildActiveBrand()` bakes into the live app's CSS. Selecting a
  different brand in the switcher only changes what this Server Component reads and renders — it
  does not run a build, does not call `buildActiveBrand()`, does not write any file.
- **Editor already uses the remount-via-`key` pattern for exactly this kind of "the underlying
  data changed, discard local state" case** — `ComponentPreview` is keyed on `sectionKey`
  (`editor.tsx`, `<ComponentPreview key={sectionKey} .../>`). `Editor` itself holds brand-specific
  local state (`pendingEdits`, `selectedView`, seed inputs, `resetArmed`, etc.) that must not
  survive a brand switch pointed at different files — reuse the same pattern rather than inventing
  state-reset logic.

## 2. Scope

### `build-tokens.mjs`

Add `resolveBrandDirForSlug(slug)`, alongside `resolveBrandDir()`:

```js
export function resolveBrandDirForSlug(slug) {
  const brandDir = join(PACKAGE_ROOT, "brands", slug);
  if (!existsSync(brandDir)) {
    throw new Error(`Unknown brand "${slug}" (looked for ${brandDir})`);
  }
  return brandDir;
}
```

Add `listBrands()`, returning every brand slug (directory name) under `brands/`, sorted
alphabetically:

```js
export function listBrands() {
  return readdirSync(join(PACKAGE_ROOT, "brands"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}
```

Import `readdirSync` alongside the existing `readFileSync, existsSync, writeFileSync` import.
`resolveBrandDir()` itself is untouched — both old call sites (`page.tsx`, `route.ts`) keep working
exactly as today whenever no explicit brand is selected (§4).

### `page.tsx`

Add `resolveBrandDirForSlug`, `listBrands` to the existing `build-tokens.mjs` import line at the
top of this file, alongside `resolveBrandDir`, `resolveBrandTree`.

```tsx
export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { brand: rawBrand } = await searchParams;
  const brands = listBrands();
  let brandDir;
  let selectedBrand;
  if (typeof rawBrand === "string") {
    if (!brands.includes(rawBrand)) notFound();
    brandDir = resolveBrandDirForSlug(rawBrand);
    selectedBrand = rawBrand;
  } else {
    brandDir = resolveBrandDir();
    selectedBrand = basename(brandDir);
  }
  const { tree, parentBrandDir } = resolveBrandTree(brandDir);
  // ...unchanged descriptor-building block...
  return (
    <Editor
      key={selectedBrand}
      descriptors={descriptors}
      isChildBrand={parentBrandDir !== null}
      parentName={parentBrandDir ? basename(parentBrandDir) : null}
      brands={brands}
      selectedBrand={selectedBrand}
    />
  );
}
```

`key={selectedBrand}` forces a full remount on brand change — every piece of `Editor`'s local
state (`pendingEdits`, `selectedView`, seed inputs, `resetArmed`, `armedKey`, `inFlight`, etc.)
resets cleanly, the same guarantee `ComponentPreview`'s existing key already relies on. No manual
state-reset code needed anywhere in `Editor`.

`export const dynamic = "force-dynamic"` stays unchanged — it's already present for an unrelated
reason (this page reads live files at request time), not because reading `searchParams` strictly
requires it (reading `searchParams` already opts a route out of static rendering on its own). No
action needed here; noted only so nobody reads more into this line than it means.

### `editor.tsx`

Add `brands: string[]` and `selectedBrand: string` to `Editor`'s props. Render a brand list above
the existing section sidebar (same `<nav aria-label="Design system sections">` region the sections
list already lives in, or a sibling `<nav aria-label="Brands">` immediately above it — either is
acceptable; pick whichever keeps the JSX diff smaller once you're looking at the real render
tree). Each brand renders as a `<Link>` (from `next/link`, already used elsewhere in this app) to
`/design-system?brand=<slug>` (omit the param entirely for whichever brand `resolveBrandDir()`
would resolve today, so the default/no-param URL keeps working unchanged — see §4's bad case for
what "whichever brand" means precisely). The currently-selected brand (`slug === selectedBrand`)
renders as plain text or a disabled-look element, not a clickable link — same visual treatment
`sidebarItems`' active item already gets, reuse that pattern rather than inventing a new one.

**Guard: block switching while pending edits exist, or a write is still in flight.** If
`pendingEdits.size > 0` OR `inFlight.size > 0`, brand links render disabled (or the click handler
no-ops) with a visible reason ("Save or discard your pending changes before switching brands" /
"Wait for the current change to finish saving"). Two different risks, one guard: a remount via
`key` while `pendingEdits.size > 0` would silently discard staged edits (this project doesn't
silently drop user edits anywhere else in this editor — see `onCancelPending`/`Discard changes`
throughout `editor.tsx`, discarding is always an explicit action); a remount while
`inFlight.size > 0` unmounts a component with an immediate ("All variables") write still in
flight — the write itself already reached disk by the time the fetch resolves, so no data is lost,
but the in-flight request's `then`/`finally` callbacks (`setError`, `router.refresh()`, `untrack`)
would fire against an unmounted component. Blocking the switch avoids relying on whether that's
merely a harmless console warning or something worse in a future React version.

Labels: humanize each slug the same way field labels already are — reuse `humanize()` from
`field-descriptors.mjs` (already imported for other purposes in this file's import graph via
`SECTIONS`; add `humanize` to that same import). `"demo-child"` → `"Demo child"`.

**Fix the one sentence this task makes visibly wrong, even though the rest of "hardcoded to the
default brand" is Task 5's job.** Line 945: `"Live brand values for the default brand."` — the
moment a real switcher exists, this is false for every brand except the one currently named
`"default"`. Change it to name the selected brand: `` `Live brand values for ${humanize(selectedBrand)}.` ``.
This is not Task 5's broader audit (hunting for less-obvious hardcoded assumptions elsewhere in
this file) — it's the one sentence sitting directly next to the feature this task adds, wrong the
instant this task ships if left alone, and a one-line fix. Leave every other instance of
brand-related copy in this file for Task 5 to find and fix.

### `route.ts`

Add `resolveBrandDirForSlug`, `listBrands` to the existing `build-tokens.mjs` import. Add
`brand?: unknown` to the destructured body and its type, alongside `description`. Replace the
single `const brandDir = resolveBrandDir();` (line 68) with:

```ts
let brandDir;
if (typeof brand === "string") {
  try {
    brandDir = resolveBrandDirForSlug(brand);
  } catch {
    return badRequest(`Unknown brand "${brand}"`);
  }
} else {
  brandDir = resolveBrandDir();
}
```

Every existing action case reads `brandDir` from this one shared local — no other line in any
`case` block changes. This is the same generalization `page.tsx` gets for free (§1): every action
already operates on "whichever `brandDir` this request resolved to," not hardcoded to the active
brand.

Add `"list-brands"` as a new case (and to `VALID_ACTIONS` in `token-writes.mjs`, appended, not
reordered — same convention Task 8a's spec used):

```ts
case "list-brands": {
  return Response.json({ ok: true, brands: listBrands() });
}
```

This case ignores whatever `brand` was resolved above (it isn't brand-specific) — no `brandDir`
read, matches `"generate-from-seed"`'s existing pattern of some actions not needing every parsed
field.

**Why a POST action for a pure read, not a `GET` handler.** `list-brands` has no side effect, and
a `GET` would be the more natural HTTP shape for it — but this route has no `GET` export today, and
adding one (its own handler, its own response-shape decision, its own error-path duplication of
`badRequest`) is more new surface than reusing the `switch` that's already here. Given this
project's own "everything else defaults to S, don't apply one template weight regardless of size"
rule, reusing the existing action-dispatch pattern for one more read-only case is the smaller,
more consistent diff — worth stating so a reviewer doesn't wonder why a list operation is a POST.

## 3. Non-goals

- Creating, duplicating, or deleting a brand — Tasks 2/3/4.
- Any change to `active-brand.json`, `buildActiveBrand()`, or what the deployed app renders —
  Task 6, deferred.
- Visually distinguishing Main from a child brand in the switcher itself (which brand is
  deletable is Task 4's concern, not this one's).
- Any change to how `isChildBrand`/`parentName` are computed — already correct for any brand,
  unchanged by this task (§1).

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `?brand=` omitted | Byte-for-byte today's behavior: `resolveBrandDir()` resolves the active brand, exactly as before this task existed. Every existing e2e spec (`staged-save.spec.ts`, `dark-values.spec.ts`, `descriptions.spec.ts`) navigates with no `brand` param and must keep passing unmodified. |
| `?brand=<slug>` where `<slug>` isn't a real brand directory | `page.tsx` calls `notFound()` — a 404, not a crash or a silent fallback to the active brand. |
| POST body's `brand` field isn't a known brand directory | `badRequest` (400), matching every other malformed-input case in this route — never a 500. |
| POST body's `brand` field is present but not a string (e.g. a number, an array) | `badRequest` — same type-check discipline every other field in this route already gets. |
| Clicking a brand link while `pendingEdits.size > 0` or `inFlight.size > 0` | Blocked, with a visible reason — never a silent discard, never an unmount mid-request (§2's guard). |
| `?brand=` matches the brand `resolveBrandDir()` would already resolve (selecting "yourself") | No-op — the link for the currently-selected brand isn't clickable at all (§2), so this case can't be triggered via the UI; if reached directly via URL, it's just a normal, valid render of that brand, same as the no-param case. |

## 5. Forbidden patterns

No bare `except`/unchecked `catch` swallowing an error silently. No touching `.env`/credentials.
No new npm dependency (`next/link` and `readdirSync` are both already available).

## 6. File allowlist

- `app/packages/design-system/src/build-tokens.mjs`
- `app/packages/design-system/src/build-tokens.test.mjs`
- `app/packages/design-system/src/token-writes.mjs` (only `VALID_ACTIONS`)
- `app/packages/design-system/src/token-writes.test.mjs` (only the `VALID_ACTIONS` count test)
- `app/app/design-system/page.tsx`
- `app/app/design-system/editor.tsx`
- `app/app/api/design-system/tokens/route.ts`
- `app/e2e/design-system/brand-switcher.spec.ts` (new)

No `.env`/credentials, no new npm dependency.

## 7. Acceptance criteria

- `npm run verify` passes, including new `build-tokens.test.mjs` cases: `listBrands()` returns
  `["default", "demo-child"]` (today's real two brand directories, sorted) against the real
  `brands/` directory — not a fixture, since this function's whole job is reading that real
  directory; `resolveBrandDirForSlug("default")` returns the same path `resolveBrandDir()` does
  when `active-brand.json` names `"default"`; `resolveBrandDirForSlug("nope")` throws with the
  exact "Unknown brand" message shape `resolveBrandDir()` already uses for its own unknown-brand
  case.
- **Required: `app/e2e/design-system/brand-switcher.spec.ts`, run via
  `npm run test:e2e:design-system`.** Same fail-fast/cleanup discipline as every prior spec that
  touches this suite (no real file mutation happens in this task, but assert `active-brand.json`
  and both brands' `tokens.json` are untouched after the run regardless — this task must never
  write to any of them). Cover: both brands appear in the switcher; clicking the non-selected one
  navigates to `/design-system?brand=<other>` and shows that brand's own values (assert on at
  least one field whose value differs between `default` and `demo-child`); the currently-selected
  brand's own entry is not a clickable link; staging a pending edit in the per-component panel,
  then confirming the *other* brand's link is disabled/blocked with a visible reason; discarding
  that pending edit re-enables it; editing a field on "All variables" and confirming the brand
  links are briefly disabled while that write is in flight, re-enabled once it resolves;
  navigating directly to `/design-system?brand=nope` returns a 404 page.
- `git diff --stat` matches the allowlist.
- **Human checkbox:** open `/design-system`, confirm the brand list renders above the section
  sidebar with sensible spacing, switching brands doesn't visually break the section sidebar or
  "All variables" layout, and the "Live brand values for ___" sentence names the actually-selected
  brand on both brands, not just "default."
- Self-check before reporting, per `docs/web-app-workflow/spec-template.md`'s Definition-of-done
  format.
- `active-brand.json` and every brand's `tokens.json` unchanged after the Playwright run and any
  manual check (this task performs no writes at all — confirm that's actually true, don't assume
  it from the task's description); checkpoint commit (not pushed).

## 8. Stop-conditions

- If `page.tsx`, `editor.tsx`, or `route.ts` has changed shape since this spec's read (§0's line
  counts), stop and confirm the actual current structure before wiring searchParams/props through
  — don't guess at where things moved.
- If a third brand directory exists under `brands/` at implementation time (not just `default`
  and `demo-child`), the acceptance criteria's exact-list assertion needs updating to match reality
  — stop and confirm the real current brand list rather than hardcoding today's two.

---
**Landed:** commit `95caf0b`; deployed pending push. 3 new build-tokens.test.mjs cases, 2 new field-descriptors.test.mjs cases (humanize hyphen fix), 6 new e2e cases (app/e2e/design-system/brand-switcher.spec.ts), `npm run verify:full` PASS, human visual checkbox passed via screenshot on both real brands.
