# Task spec: `editor.tsx` modular split (Task 4.5, `docs/BACKLOG.md` #32)

**Tier: S** — dev-only editor surface (`/design-system` 404s in production), no real user data, no
behavior change at all, fully revertible via `git checkout` on this spec's own allowlisted files.

Read fresh against `app/app/design-system/editor.tsx` (1257 lines, current as of commit `9de4f55`) —
grown from 1108 lines pre-Tasks-2/3/4 to 1257 now (the New/Duplicate/Delete controls + their state
and handlers). `docs/BACKLOG.md` #32 flagged this after Task 10, before that growth; it's more true
now, not less.

**Depends on nothing landing first** — this is pure reorganization, no interaction with any other
pending spec. **Blocks** Task 4.6 (deploy-status) and Task 5 (copy audit) in the sense that both were
either written or scoped against today's monolithic file — Task 4.6's spec cites exact line ranges
(`editor.tsx:920-951` for the brands nav) that this task will make stale. Whoever picks up 4.6 next
must re-read it fresh against the post-split files, not trust its current file/line citations.

## 0. User story

No user-visible change. Whoever next opens this file — Task 5's audit, or the future editor UI/UX
plan — finds one concern per file (one field's editing UI, the brand switcher, the write/save
handlers) instead of a single 1257-line function doing all four.

## 1. Context (read, don't re-derive)

- **Every existing e2e spec that exercises this file is this task's only safety net.** No new tests
  get added — there's nothing new to test in a pure reorganization. The bar is `npm run verify` +
  the full design-system e2e suite passing **unmodified**, not a new assertion proving the split
  worked. If a test needs to change to keep passing, that's a sign behavior moved, not just code —
  stop and reconsider (§8).
- **`page.tsx`'s import needs zero changes.** `import { Editor } from "./editor"` already resolves to
  `"./editor/index.tsx"` once `editor.tsx` becomes a folder — confirmed Node/webpack module
  resolution behavior, not an assumption specific to this project.
- **Shared style constants need a fourth, small file — not a false dependency between the other
  three.** `FOCUS_RING`, `MUTED_ACTION`, `CAPTION` (currently `editor.tsx:37-47`) are used by
  `index.tsx` itself (the "← Back" link, sidebar buttons, seed-generation caption), by the
  field-editing cluster (`ColorRow`, `DarkValueColumn`, `DescriptionRow`, `FieldRow`), and by the
  brand-switcher cluster. Putting them in any one of those three files would make the other two
  import from a file that also has unrelated component code — `editor/styles.ts`, pure constants, no
  JSX, is the fourth file.
- **The extracted `useEditorActions` hook does not, by itself, reduce how much state/logic exists —
  it relocates it.** Be honest about this rather than oversell it: the same ~9 handler functions and
  their `error`/`feedback`/`inFlight`/`pendingEdits`/etc. state still exist, just inside a hook body
  instead of `Editor`'s body. The concrete, measurable win is `Editor`'s own cyclomatic complexity
  (currently flagged by ESLint at 20, max 9) — branches that move into the hook's functions no longer
  count against `Editor`'s own complexity score. Verify this in acceptance criteria (§7), don't just
  assume it.
- **`BrandSwitcher` becomes genuinely self-contained, not just relocated** — this was the one open
  design decision from planning, now settled: `brandAction`/`brandActionInput`/`brandActionBusy` state,
  the autofocus effect, `cancelBrandAction`/`submitBrandAction`, and the `useRouter()` call all move
  *into* `brand-switcher.tsx` itself. It takes `{ brands, selectedBrand, blocked, blockedReason,
  onError }` as props — `blocked`/`blockedReason` computed once in `index.tsx` from
  `pendingEdits.size`/`inFlight.size` (today this exact condition is computed **twice**,
  independently, in `renderBrandActionRow` at `editor.tsx:917-922` and inline in the brands-nav
  `.map()` at `:1077-1082` — unify to one computation, passed down, while extracting). `onError`
  surfaces a failed create/duplicate/delete into `index.tsx`'s existing error banner rather than
  `BrandSwitcher` growing its own separate error UI.
- **The field-editing cluster is more than just `FieldRow`.** `ComponentPreview` and
  `ComponentDetailView` (`editor.tsx:476-583`) are fully props-driven (no closure over `Editor`'s
  outer scope) and exist specifically to pair `FieldRow` with a live component preview — they belong
  in the same file as `FieldRow`, not left behind in `index.tsx`, or `index.tsx` still owns half of
  "how a component's fields render."

## 2. Scope

Convert `app/app/design-system/editor.tsx` into `app/app/design-system/editor/`:

### `editor/styles.ts` (new)

Move, verbatim: `UNIT`, `SEED_RE`, `FOCUS_RING`, `MUTED_ACTION`, `CAPTION` (`editor.tsx:15,19,37-47`).
All five exported — `UNIT`/`FOCUS_RING`/`MUTED_ACTION`/`CAPTION` are consumed by more than one of the
other three files; `SEED_RE` only by `index.tsx`, but keeping every shared-ish constant in one place
beats splitting by "who currently uses it."

### `editor/field-row.tsx` (new)

Move, verbatim except import paths: `rangeFor` (`:26-35`), `ApiResult`/`PendingEdit` type re-exports
(these two types are needed by this file's own props — see below), `ColorRow` (`:71-141`), `SliderRow`
(`:143-224`), `DarkValueColumn` (`:231-275`), `DescriptionRow` (`:280-331`), `FieldRow` (`:333-468`),
`ComponentSectionKey` (`:470-474`), `ComponentPreview` (`:476-510`), `ComponentDetailView`
(`:512-583`). Only `FieldRow`, `ComponentDetailView`, `ComponentPreview`, `ComponentSectionKey` need
to be exported — `ColorRow`/`SliderRow`/`DarkValueColumn`/`DescriptionRow`/`rangeFor` stay
module-private, used only by `FieldRow` in this same file.

Imports needed: `useEffect, useRef, useState` from `react`; `ColorField, SegmentedControl, Slider,
Button` from `@guitar-tabs/design-system`; `SECTIONS, humanize` and `type FieldDescriptor` from
`field-descriptors.mjs` (relative path one level deeper than today —
`../../../packages/design-system/src/field-descriptors.mjs`); `cssVarNameForPath` from
`css-var-naming.mjs` (same path adjustment); `cn` from `@/lib/cn`; `UNIT, FOCUS_RING, MUTED_ACTION,
CAPTION` from `./styles`; `PendingEdit` type from `./actions` (§ below).

### `editor/brand-switcher.tsx` (new)

New component `BrandSwitcher`, assembled from the brands `<nav>` (`editor.tsx:1068-1100`) and the
entire `renderBrandActionRow` cluster (`:875-1014` — `cancelBrandAction`, `submitBrandAction`,
`renderBrandActionRow` itself, plus the `brandAction`/`brandActionInput`/`brandActionBusy` state and
the autofocus `useEffect` from `:609-615`):

```tsx
export function BrandSwitcher({
  brands,
  selectedBrand,
  blocked,
  blockedReason,
  onError,
}: {
  brands: string[];
  selectedBrand: string;
  blocked: boolean;
  blockedReason: string | undefined;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  // brandAction/brandActionInput/brandActionBusy state, brandActionInputRef +
  // autofocus effect, cancelBrandAction, submitBrandAction -- moved verbatim,
  // except submitBrandAction's error path calls onError(result.error) instead
  // of a local setError, and postAction's `brand: selectedBrand` calls are
  // unchanged (delete-brand already sends it; create/duplicate never needed it).
  return (
    <>
      <nav aria-label="Brands" className="mt-4 flex flex-wrap items-center gap-3">
        {/* brands.map(...) verbatim, EXCEPT: the per-brand blockedReason computed
            inline today (editor.tsx:1077-1082) is replaced by the blocked/blockedReason
            props -- one computation, not two. */}
      </nav>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {/* renderBrandActionRow's body, inlined here (or kept as a local
            function in this file — either is fine, whichever keeps the diff
            smaller once you're looking at the real code) */}
      </div>
    </>
  );
}
```

Imports needed: `useEffect, useRef, useState` from `react`; `useRouter` from `next/navigation`; `Link`
from `next/link`; `humanize` from `field-descriptors.mjs`; `cn` from `@/lib/cn`;
`FOCUS_RING, MUTED_ACTION, CAPTION` from `./styles`; `postAction` from `./actions`.

`index.tsx` renders `<BrandSwitcher brands={brands} selectedBrand={selectedBrand} blocked={pendingEdits.size > 0 || inFlight.size > 0} blockedReason={pendingEdits.size > 0 ? "Save or discard your pending changes first" : inFlight.size > 0 ? "Wait for the current change to finish saving" : undefined} onError={setError} />`
in place of the two blocks it replaces (`:1068-1101`).

### `editor/actions.ts` (new)

`postAction`, `ApiResult`, `PendingEdit` (`:49-69`, moved verbatim — these are also needed by
`field-row.tsx` and `brand-switcher.tsx`, hence living in this shared file rather than `index.tsx`),
plus a new `useEditorActions` hook wrapping everything from `track`/`untrack` (`:640-651`) through
`runGenerate` (`:857-873`) — every handler EXCEPT `cancelBrandAction`/`submitBrandAction`/
`renderBrandActionRow` (which move to `brand-switcher.tsx` instead, per §1):

```ts
export function useEditorActions(descriptors: FieldDescriptor[], selectedBrand: string) {
  // error, feedback, inFlight, resetArmed, resetBusy, generateBusy, pendingEdits,
  // bulkScope, saveBusy, neutralSeed, accentSeed, seedsValid, modifiedPaths,
  // armedKey effect, track/untrack, runWrite, runReset, runPromote, stageEdit,
  // setPendingScope, discardPendingEdit, discardAllPending, sectionHeading,
  // pendingCollisions, runSaveAll, runResetToParent, runSetDescription,
  // runResetAll, runGenerate -- moved verbatim into this hook's body.
  return { /* every one of the above index.tsx's JSX still needs */ };
}
```

`sectionHeading` (`:742-744`) stays with this hook — it's only used by `pendingCollisions`, not by
`index.tsx`'s own section-rendering (which has its own `SECTIONS.find` via `renderSection`, a
different lookup, don't conflate the two).

### `editor/index.tsx` (moved from `editor.tsx`)

Everything else: `Editor`'s signature (unchanged), `fieldsFor`/`flat`/`grouped`/`sidebarItems`/
`selectedSection`/`renderSection` (`:1016-1060`), the full JSX return (`:1062-1256`) with its two
replaced blocks (the `<BrandSwitcher>` call, and `<FieldRow>`/`<ComponentDetailView>` call sites now
importing from `./field-row`), `selectedView` state (stays here — pure UI-navigation state, not a
server action, doesn't belong in `useEditorActions`). Destructures everything it needs from
`useEditorActions(descriptors, selectedBrand)` at the top of the function body.

## 3. Non-goals

- Any behavior change, however small. If you find yourself changing what a branch does (not just
  where it lives) to make the split cleaner, stop — that's scope creep for this task, file it as a
  backlog item instead.
- Reducing `FieldRow`'s own ~12-prop surface, or `useEditorActions`' large return object. Both are
  real, but this task is about file boundaries, not redesigning either interface — a future task,
  not this one.
- Task 4.6's re-read against the new structure — that's Task 4.6's own job when it's picked up next,
  not something to pre-emptively rewrite here.
- Task 5's copy audit — explicitly sequenced after this task, not part of it.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Any existing e2e test needs a change to keep passing | Stop (§8) — a pure reorganization shouldn't need this; if it does, something moved behavior, not just code. |
| `page.tsx`'s import breaks | Shouldn't happen (§1) — if it does, confirm the folder is literally named `editor/` with an `index.tsx` inside, not `Editor/` or a different casing (case-sensitive on Linux CI even if this Mac's filesystem hides the mistake). |
| A relative import path is off by one `../` level | Every file in `editor/` is one directory deeper than `editor.tsx` was — `field-descriptors.mjs`'s import goes from `../../packages/...` to `../../../packages/...` in the new files. Compile/typecheck will catch a wrong count; don't guess, run `npm run typecheck` before considering any one file done. |

## 5. Forbidden patterns

No bare `except`/unchecked `catch`. No touching `.env`/credentials. No new npm dependency — this is
pure file reorganization of existing code.

## 6. File allowlist

- `app/app/design-system/editor.tsx` (deleted)
- `app/app/design-system/editor/index.tsx` (new)
- `app/app/design-system/editor/field-row.tsx` (new)
- `app/app/design-system/editor/brand-switcher.tsx` (new)
- `app/app/design-system/editor/actions.ts` (new)
- `app/app/design-system/editor/styles.ts` (new)

Nothing else — `page.tsx` needs no change (§1), no test file needs a change (§1's whole premise).

## 7. Acceptance criteria

- `npm run typecheck` clean (catches any import-path/level mistake, per §4).
- `npm run verify` passes, unmodified test count (125/125, same as before this task).
- Full design-system e2e suite (`npx playwright test --config=playwright.design-system.config.ts`,
  no file filter) passes, unmodified test count and unmodified test files — every spec file's `git
  diff` against this task must be empty. If any test needed editing to pass, stop per §8.
- `npx eslint app/design-system/editor/*.tsx app/design-system/editor/*.ts` — confirm `Editor` (now
  in `index.tsx`) no longer trips the complexity-20 warning it had before this task (§1's one
  measurable, honest win). `FieldRow`'s own complexity-24 warning is expected to persist (moving
  files doesn't change `FieldRow`'s own internals) — not a regression, just not this task's job to
  fix either.
- `git diff --stat` matches the allowlist exactly (a deletion + five new files, nothing else).
- No human checkbox needed for correctness (Playwright already covers every interaction), but do
  open `/design-system` once and confirm it renders and behaves identically — a `git diff`-clean
  test suite proves behavior didn't change in ways it tests, not that it didn't change in a way
  nothing tests.
- Self-check before reporting, per `docs/web-app-workflow/spec-template.md`'s Definition-of-done
  format.
- Checkpoint commit (not pushed).

## 8. Stop-conditions

- If any existing test needs to change (not just its import path, if it has one — its actual
  assertions or interactions) to keep passing, stop. That means behavior moved, not just code, and
  this spec's whole premise (zero behavior change) needs re-examining before continuing.
- If `editor.tsx` has changed shape since this spec's read (1257 lines, commit `9de4f55`) — in
  particular if Task 4.6 or Task 5 landed first despite this spec's stated ordering — stop and
  re-derive the extraction boundaries from the actual current file, don't trust this spec's line
  citations.
- If `FieldRow`'s complexity warning changes (better or worse) as a side effect of the split, that's
  a sign something didn't move as cleanly as planned — stop and look, don't just note it and move on.

---
**Landed:** commits `6816a39` (split), `1ab56cd` (unrelated test-fragility fix, discovered while
verifying this task — see its own message). `npm run typecheck` clean, `npm run verify` 125/125 PASS,
full design-system e2e suite 34/34 PASS (1 pre-existing unrelated skip), every spec file's diff
against this task empty. `Editor` complexity 20 → 17 (ESLint); `FieldRow`'s 24 unchanged as expected;
`renderBrandActionRow`'s old complexity-12 warning gone entirely in its new home. Human checkbox:
screenshotted before/after, identical. One real thing discovered mid-verification, not part of this
task's own scope: a real user brand ("heyhey") created while manually testing broke two tests that
assumed a fixed brand list — fixed in `1ab56cd`, and surfaced a bigger follow-up (demo-child is a
checked-in fixture living in the same live, user-deletable `brands/` directory as real data) filed as
a new task, not fixed here.
