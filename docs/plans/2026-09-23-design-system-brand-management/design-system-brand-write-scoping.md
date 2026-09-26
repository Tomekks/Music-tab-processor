# Task spec: Editor writes target the selected brand, not the active one

**Tier: S** — dev-only editor surface (`/design-system` 404s in production), no real user data,
fully revertible via `git checkout` on this spec's own allowlisted files.

Read fresh against `app/app/design-system/editor.tsx` (1108 lines) — current as of this revision.
Split out of a larger draft covering Tasks 2/3/4 (brand create/duplicate/delete) plus this fix and a
separate deploy-status indicator — this piece landing first is what makes end-to-end testing of the
other two possible at all (see below). This is the smallest of the three: **an `editor.tsx`-only
change, no route/API/build-pipeline touch needed.**

## 0. User story

You switch the brand picker to a brand other than whatever the live app is currently serving, edit a
field, and it saves to *that* brand's `tokens.json` — not silently to whatever `active-brand.json`
names. Today it does the latter.

## 1. Context (read, don't re-derive)

- **`route.ts` already supports this, since Task 1.** `route.ts:72-81` resolves a per-request
  `brandDir` from an optional `brand` field in the POST body, added when the brand switcher shipped
  — every `switch` case downstream already reads from that shared `brandDir`, uniformly. Confirmed
  by re-reading the route: **no `route.ts` change is needed for this task at all.** The gap is
  entirely on the client: `editor.tsx`'s `postAction` call sites never send `brand`.
- **`Editor` already receives `selectedBrand` as a prop** (`editor.tsx:590,596`, wired up when the
  brand switcher shipped) — the fix is threading that existing value into each call, not inventing
  new state or plumbing.
- **Confirmed exactly 8 call sites, by grep, none currently sending `brand`:** `runWrite`
  (`editor.tsx:651`), `runReset` (`:668`), `runPromote` (`:684`), `runSaveAll`'s `batch-write`
  (`:781`), `runResetToParent` (`:799`), `runSetDescription` (`:815`), `runResetAll` (`:837`),
  `runGenerate` (`:856`).
- **Why this needs to land before Tasks 2/3/4 and the deploy-status indicator.** Both later pieces
  add end-to-end tests that edit a field on a non-default brand and assert the write landed on that
  brand's own `tokens.json` — without this fix, that assertion would fail (or worse, silently pass
  against the *active* brand's file by coincidence in a test environment where they happen to be the
  same). This task's own e2e addition (§7) is the first thing that actually proves the bug existed
  and is fixed.

## 2. Scope

### `editor.tsx`

Add `brand: selectedBrand` to the body object at each of the 8 `postAction(...)` call sites listed
in §1. Pure addition to an existing object literal at each site — no signature changes, no new
state, no new props. Example (`runWrite`, `:651`):

```ts
// before
const result = await postAction({ action: "write", path, value });
// after
const result = await postAction({ action: "write", path, value, brand: selectedBrand });
```

Every other call site gets the same treatment: add `brand: selectedBrand` as one more property in
its existing body object, nothing else changes.

## 3. Non-goals

- Any change to `route.ts`, `build-tokens.mjs`, or `token-writes.mjs` — none needed (§1).
- Brand create/duplicate/delete (Tasks 2/3/4) — separate spec, depends on this one landing first.
- The undeployed-changes indicator — separate spec, also depends on this one.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `selectedBrand` names a brand that's since been deleted mid-session (stale prop) | Unchanged from today's existing behavior for an unknown `brand` — `route.ts`'s existing generic resolution already returns `badRequest` for this; this task doesn't change that path. |

## 5. Forbidden patterns

No bare `except`/unchecked `catch`. No touching `.env`/credentials. No new npm dependency.

## 6. File allowlist

- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/brand-switcher.spec.ts` (extend with one new case, §7)

No `.env`/credentials, no new npm dependency.

## 7. Acceptance criteria

- `npm run verify` passes (no unit-level test exists for `editor.tsx` today — client component,
  covered only by Playwright — so this task adds no new `node --test` cases).
- **Required: extend `app/e2e/design-system/brand-switcher.spec.ts`** (its existing home — this is a
  direct consequence of that task's own brand switcher, not a new feature area) with one new case:
  select `demo-child`, edit a field, save, then read `brands/demo-child/tokens.json` directly (not
  through the UI) and confirm the new value landed there — and separately confirm
  `brands/default/tokens.json` is unchanged by that save. Same fail-fast/cleanup discipline as the
  rest of this suite: assert both files are restored to their pre-test state afterward, including on
  failure.
- `git diff --stat` matches the allowlist.
- No human checkbox needed — this is a pure data-correctness fix with no visual surface; Playwright
  covers it strictly better than eyeballing it.
- Self-check before reporting, per `docs/web-app-workflow/spec-template.md`'s Definition-of-done
  format.
- Checkpoint commit (not pushed).

## 8. Stop-conditions

- If `editor.tsx` has changed shape since this spec's read (line count, or any of the 8 call sites'
  line numbers) beyond what this spec describes, stop and re-locate each call site by its function
  name rather than trusting the cited line number.
- If `route.ts` does **not** already support a `brand` field on every action when you check it fresh
  (i.e. this spec's "no server-side change needed" claim turns out wrong), stop — that's a bigger
  task than this spec scopes, and Tasks 2/3/4's spec assumes this claim holds.

---
**Landed:** commit `fb6da24`; deployed pending push. 1 new e2e case (`brand-switcher.spec.ts` #7),
no unit test needed (client-only change). `npm run verify` 109/109 PASS, full design-system e2e
suite 30/30 PASS (1 pre-existing unrelated skip) — re-run in full after this landed, not just the
one extended file, since the change touches shared `postAction` call sites every other
design-system e2e spec also exercises.
