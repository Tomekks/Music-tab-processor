# Task spec: Undeployed-changes indicator per brand

**Tier: S** — dev-only editor surface (`/design-system` 404s in production), no real user data,
fully revertible via `git checkout` on this spec's own allowlisted files.

Read fresh against `app/app/design-system/editor.tsx` (1108 lines), `app/app/design-system/page.tsx`
(59 lines), `app/app/api/design-system/tokens/route.ts` (232 lines),
`app/packages/design-system/src/build-tokens.mjs` (220 lines) — all current as of this revision.

**Depends on both `docs/specs/design-system-brand-write-scoping.md` and
`docs/specs/design-system-brand-crud.md` landing first.** This spec's own tests exercise editing a
non-default brand (needs write-scoping's fix to land on the right file) and creating a brand via the
UI (needs the CRUD spec's `create-brand` action and its New-brand controls). It also edits the
`create-brand`/`duplicate-brand` `case` blocks the CRUD spec ships — a normal "later task builds on
earlier task's shipped code" dependency, not a shared-file conflict.

## 0. User story

You edit a brand you're not currently looking at, or just close the tab having forgotten you touched
something. A small badge next to that brand's name in the switcher — and a banner when you open it —
tells you it has changes nobody's confirmed as deployed yet. You click the banner's "×", confirm
whether it's actually been deployed, and the flag clears (or doesn't, if you say no). This is
entirely self-reported bookkeeping: the app has no real visibility into your deploy pipeline, so it
never guesses — it just remembers what you told it, per brand, across restarts.

## 1. Context (read, don't re-derive)

- **This app has no visibility into an actual deploy pipeline.** "Undeployed changes" is
  self-reported: a flag per brand, set on any action that changes what `generateCSS` would output for
  that brand, cleared only when the user explicitly says so (or resets the whole brand back to its
  shipped defaults — see §2's flag table). Locked in during brainstorming — not something this spec
  should quietly upgrade to something smarter (e.g. diffing against git) without a separate decision.
- **Why a per-brand sentinel file, not one shared JSON blob.** A single JSON file every brand's flag
  write serializes through means two saves to *different* brands can race on the same
  read-modify-write, and — because nearly every save flips an entry in it — a tracked shared file
  would produce a diff on almost every checkpoint commit going forward, for content that's pure local
  bookkeeping, not real design data. Storing the flag as the mere *existence* of
  `brands/<slug>/.needs-deploy` (an empty file) removes both problems: two brands' flags live in
  unrelated files (no shared-file race possible), and deleting/trashing a brand's directory carries
  its own flag away for free — no separate bookkeeping update needed on that path. Gitignored, since
  "persist across sessions" only requires surviving a restart, not living in git history.
- **`route.ts:72-81`'s existing per-request `brandDir` resolution already gives every action —
  including the two this spec extends — the correct target brand's directory in scope**, since the
  write-scoping spec landed. This spec never needs a slug-to-directory lookup of its own; every call
  site below already has `brandDir` (or, for `create-brand`/`duplicate-brand`, can resolve the new
  brand's directory once by slug) available.
- **`create-brand`/`duplicate-brand` (shipped by the CRUD spec) don't currently touch deploy status at
  all** — a brand created before this spec lands simply has no `.needs-deploy` file until its next
  qualifying edit. This spec adds one line to each of those two `case` blocks so a *freshly created*
  brand is flagged immediately (its very existence hasn't been deployed yet), rather than only after
  someone edits it.
- **No modal/dialog primitive exists anywhere in this repo** — the "was this deployed?" confirmation
  is an inline expand-in-place row (same idiom as `editor.tsx`'s existing reset-all arm/confirm dance,
  `editor.tsx:827-848`, and this batch's own Delete confirm row), not a new UI primitive.

## 2. Scope

### `build-tokens.mjs`

Add `existsSync, unlinkSync` to the existing `node:fs` import if not already present (`existsSync`
already is; add `unlinkSync`).

Add the sentinel-file deploy-status helpers:

```js
// "Undeployed changes" bookkeeping: the mere existence of a per-brand
// sentinel file is the flag -- no shared file, so two brands' flags can
// never race on the same read-modify-write.
export function markNeedsDeploy(brandDir) {
  writeFileSync(join(brandDir, ".needs-deploy"), "");
}

export function clearNeedsDeploy(brandDir) {
  const flagPath = join(brandDir, ".needs-deploy");
  if (existsSync(flagPath)) unlinkSync(flagPath);
}

export function readDeployStatus() {
  return Object.fromEntries(
    listBrands().map((slug) => [slug, existsSync(join(PACKAGE_ROOT, "brands", slug, ".needs-deploy"))]),
  );
}
```

### `.gitignore` (`app/.gitignore`)

Add, near the existing "generated design tokens" entry:

```
# design-system per-brand "needs deploy" bookkeeping -- transient, never committed
/packages/design-system/brands/*/.needs-deploy
```

### `route.ts`

Add `markNeedsDeploy, clearNeedsDeploy, readDeployStatus` to the `build-tokens.mjs` import.

**Thread the flag through every existing write action's success path.** Each of `write`,
`batch-write`, `reset`, `reset-to-parent`, `generate-from-seed` calls `markNeedsDeploy(brandDir)`
right after its existing `buildActiveBrand()` call — `brandDir` is already in scope in every one of
these cases. `reset-all` instead calls `clearNeedsDeploy(brandDir)` — reverting every field to
`tokens.default.json` returns the brand to its known-shipped baseline, the one case that *clears*
rather than sets the flag (locked in during brainstorming: a single-field reset doesn't get this
treatment, since other fields may still differ from that baseline). `set-as-default` and
`set-description` are unchanged — neither touches `tokens.json`'s `$value` in a way that affects
generated CSS.

**Extend the two brand-creation cases the CRUD spec shipped**, one line each, right after their
existing `commitBrandCreation(...)` call:

```ts
markNeedsDeploy(resolveBrandDirForSlug(validated.slug));
```

(both `create-brand` and `duplicate-brand` already have `resolveBrandDirForSlug` in scope via the
existing `build-tokens.mjs` import.)

Add one new `case` block, after the three the CRUD spec added:

```ts
case "mark-deployed": {
  clearNeedsDeploy(brandDir);
  return Response.json({ ok: true });
}
```

Append `"mark-deployed"` to `VALID_ACTIONS` in `token-writes.mjs`.

Update `"list-brands"` to also return the deploy-status map (no current caller needs it —
`editor.tsx` gets this data server-side via `page.tsx`, §below — added for API
completeness/consistency, matching this route's existing "every case returns everything relevant"
style):

```ts
case "list-brands": {
  return Response.json({ ok: true, brands: listBrands(), needsDeploy: readDeployStatus() });
}
```

### `page.tsx`

Add `readDeployStatus` to the `build-tokens.mjs` import. Compute `const needsDeploy =
readDeployStatus();` alongside the existing `listBrands()` call, pass `needsDeploy={needsDeploy}` to
`<Editor>`.

### `editor.tsx`

Add `needsDeploy: Record<string, boolean>` to `Editor`'s props.

**Brand list badges.** In the `brands.map(...)` block (`:920-951`), render a small dot next to any
slug where `needsDeploy[slug]` is true — both for the selected brand's static `<span>` and for every
link/disabled-span branch. One shared inline element, e.g. `needsDeploy[slug] && <span
aria-hidden title="Has changes that may not be deployed yet" className="inline-block h-1.5 w-1.5
rounded-full bg-[var(--color-accent)]" />`, placed right after `{humanize(slug)}` in all three
branches (`aria-hidden` here, not a second `aria-label`, since the dot is inside an already-labeled
link/span and shouldn't produce a redundant announcement — the `title` still covers a sighted
hover/tooltip).

**Undeployed-changes banner.** New local state `const [confirmingDeploy, setConfirmingDeploy] =
useState(false);`. Rendered once, right below the brands `<nav>` and above the two-column layout
(`:952`'s `<div className="mt-6 flex gap-8">`), so it's visible regardless of which sidebar section
is selected — visible whenever `needsDeploy[selectedBrand]` is true:

- Default state: text ("This brand has changes that may not be deployed yet.") plus a dismiss ("×")
  button that sets `confirmingDeploy = true`.
- Confirming state (`confirmingDeploy === true`): "Have these changes been deployed?" with "Yes" and
  "No" buttons. "Yes" calls `postAction({ action: "mark-deployed", brand: selectedBrand })`; on
  success, `router.refresh()` (re-reads deploy status via `page.tsx`) and
  `setConfirmingDeploy(false)`; on failure, surface `result.error` via the existing `error` state,
  leave `confirmingDeploy` as-is. "No" just calls `setConfirmingDeploy(false)` — no request, the
  banner returns to its default state, flag untouched.

## 3. Non-goals

- Any real deploy-pipeline integration (e.g. diffing against git) — the flag is entirely
  self-reported, per §1. Revisiting that is a separate decision, not something to fold in here.
- A shared `Dialog`/`Modal` component — the confirm step is inline, per §1.
- Any retention/cleanup for a `.needs-deploy` file left behind by a brand deleted outside the normal
  UI flow (e.g. a manually `rm`'d directory) — harmless, orphaned state that never displays, not
  worth guarding against for a single-owner dev tool.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `mark-deployed` called for a brand with no flag currently set | No-op (`clearNeedsDeploy`'s own `existsSync` guard) — never errors. |
| `write`/`batch-write`/`reset`/`reset-to-parent`/`generate-from-seed` succeeds | `.needs-deploy` created for that brand (if not already present). |
| `reset-all` succeeds | `.needs-deploy` removed for that brand, even if other fields still differ from git history (accepted per the locked-in "only reset-all clears" rule, §1). |
| `set-as-default`/`set-description` succeeds | Flag untouched — neither affects generated CSS. |
| `create-brand`/`duplicate-brand` succeeds | New brand's `.needs-deploy` created immediately — it hasn't been deployed simply by existing. |
| Deleting/trashing a brand | Its `.needs-deploy` (if any) moves with the directory into `.trash-*` — no separate cleanup call needed. |

## 5. Forbidden patterns

No bare `except`/unchecked `catch`. No touching `.env`/credentials. No new npm dependency (no modal
library — inline expand reuses existing patterns, per §1).

## 6. File allowlist

- `app/packages/design-system/src/build-tokens.mjs`
- `app/packages/design-system/src/build-tokens.test.mjs`
- `app/packages/design-system/src/token-writes.mjs` (only `VALID_ACTIONS`)
- `app/packages/design-system/src/token-writes.test.mjs` (only the `VALID_ACTIONS` count/contents test)
- `app/.gitignore`
- `app/app/api/design-system/tokens/route.ts`
- `app/app/design-system/page.tsx`
- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/deploy-status.spec.ts` (new)

No `.env`/credentials, no new npm dependency.

## 7. Acceptance criteria

- `npm run verify` passes, including new `build-tokens.test.mjs` cases for `markNeedsDeploy`/
  `clearNeedsDeploy`/`readDeployStatus`, using the same real-temp-brand + `finally`-cleanup discipline
  as the CRUD spec's own fs-mutating tests (never leave a stray `.needs-deploy` or temp brand
  directory behind, even on assertion failure).
- **Required: `app/e2e/design-system/deploy-status.spec.ts`**, run via `npm run
  test:e2e:design-system`. Same fail-fast/cleanup discipline as the rest of this suite — assert
  `brands/` (no stray `.needs-deploy`/temp entries) is back to its pre-run state after every test,
  including on failure. Cover: creating a brand and confirming its badge shows immediately; editing a
  field on an existing brand and confirming the banner appears for that brand and only that brand;
  dismissing the banner and answering "No" leaves it showing; answering "Yes" clears it and
  `router.refresh()` reflects that on reload; running "Reset all to defaults" clears the flag even
  without an explicit "Yes."
- `git diff --stat` matches the allowlist.
- **Human checkbox:** open `/design-system`, confirm the badge and banner read clearly against both
  the light and dark theme, and don't visually crowd the brand nav or the New/Duplicate/Delete
  controls from the CRUD spec.
- Self-check before reporting, per `docs/web-app-workflow/spec-template.md`'s Definition-of-done
  format.
- Checkpoint commit (not pushed).

## 8. Stop-conditions

- If either `docs/specs/design-system-brand-write-scoping.md` or `docs/specs/design-system-brand-crud.md`
  has not landed yet, stop — this spec depends on both (see the dependency note above).
- If the CRUD spec's `create-brand`/`duplicate-brand` case bodies don't look as this spec describes
  (e.g. `commitBrandCreation` call site moved, or the shape changed), stop and confirm the actual
  current code before inserting the one-line `markNeedsDeploy` addition — don't guess at where it
  goes.
- If any of the files this spec touches has changed shape since this spec's read (§0's line counts)
  beyond what this spec itself describes, stop and confirm the actual current structure first.

---
**Landed:** commit `3e798af`; deployed pending push. `editor.tsx` no longer existed (Task 4.5 split
it first, as this spec's own dependency note anticipated) — badge and banner folded into
`brand-switcher.tsx` instead of `index.tsx`, since it already owns brand-identity state and the
router/postAction calls; a deliberate adaptation, not a literal port. `npm run verify` 127/127 PASS.
Full design-system e2e suite 38/38 PASS (1 pre-existing unrelated skip), including new
`deploy-status.spec.ts` (4/4). One real bug found running the full suite (not caught by this spec's
own tests in isolation): `.needs-deploy` is gitignored, so five older specs' git-checkout cleanup
couldn't touch it, leaking a stray sentinel into every later spec file's run — fixed by adding
explicit unlink cleanup to `brand-switcher`/`dark-values`/`inherited`/`staged-save.spec.ts` (outside
this spec's original allowlist, but a direct, inseparable consequence of this task's own change).
Human checkbox: badge + banner screenshotted, clearly legible.
