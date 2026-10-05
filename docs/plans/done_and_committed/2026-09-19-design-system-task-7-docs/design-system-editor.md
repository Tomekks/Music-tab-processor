# Task spec: Design system — visual editor page

Implements Task 6 of `docs/plans/2026-09-19-design-system/2026-09-19-design-system.md` (design spec §5.2, the
page half). Depends on Tasks 1–5, checkpointed on `task/design-system-brand-data` (commits
`602d268`, `aebc3ed`). Work from that branch. Read the plan's Task 6 section, design spec §5.2,
Task 5's spec (`docs/specs/design-system-token-api.md` §2.1's consumer contract is binding here),
and Task 4's real component prop signatures (`packages/design-system/src/components/*.tsx`,
already implemented — read the files, not just Task 4's spec prose) before implementing.

**Revision note:** an earlier draft of this spec was reviewed before implementation began. The
review found two outright factual errors (a section-count claim that contradicted the spec's own
group list, and an undercounted read-only-row claim), one real interface gap (no specified
`string`↔`number` conversion between the token API's canonical strings and `Slider`'s numeric
prop), a genuine JS-semantics bug (object key ordering silently misorders one token group), and a
scope question (whether to extract/test the descriptor-building logic the way Task 5 extracted and
tested its validation logic). All verified directly against the real `tokens.json` and component
files, not assumed. Resolved below — where the earlier draft's author (the user) didn't explicitly
answer a question before asking for this spec, the resolution is marked and reasoned so it can be
overridden in review rather than silently locked in.

| Question | Resolution |
|---|---|
| 11 flat section headers, or 8 with the four `component.*` blocks collapsed under one "Components" umbrella? | **8** — one "Components" heading containing four subheadings (§3). Reads better: the four `component.*` blocks are conceptually one layer (Task 4's Layer 1), distinct from the seven `semantic.*` groups (Layer 0). |
| Do read-only (`fontFamily`) rows get revert/set-as-default controls, given Task 5's `reset`/`set-as-default` don't actually check `$type`? | **No controls on read-only rows** — simplest, matches "read-only" as a UI promise, and the edge case (a hand-diverged `fontFamily` value outside the UI) is rare enough to defer. If it's ever needed, adding the two buttons to an inert row is a small, additive change, not a rework. |
| Does "visible only when modified" gate both revert *and* set-as-default? | **Yes, both** — set-as-default on an unmodified field is a no-op (there's nothing to promote), so it's gated the same as revert. |
| Extract the tree-walking/descriptor-building logic into a pure, tested module (mirroring Task 5's `token-writes.mjs` split), or keep it inline in the server component with manual-only verification (Task 4's policy)? | **Extract and test** (§4) — the two factual errors this review caught (section count, read-only row count) are exactly the class of bug an automated assertion on the descriptor list would have caught immediately. Task 5 already established the "pure logic gets unit tests, the fs/HTTP or rendering adapter stays manually verified" split one task ago; not repeating it here would be a regression, not a simplification. |
| `space.1_5`'s JS object-key-order bug (below) — fix generically, or special-case `space`? | **Generic fix**: within each rendered section, sort `dimension`/`percentage` fields by resolved numeric value ascending; leave `color`/`fontFamily` fields in their natural (schema) order, since there's no meaningful numeric ordering for those. Not a `space`-specific hack — the same rule would silently protect against the identical bug in any future numerically-keyed section. |

## 0. Things verified while writing this spec

**(a) The real, current schema has exactly 48 editable leaves across 11 subsections, outside
`primitive.*`/`dark.*`** (both deliberately excluded — see Non-goals). Counted directly from
`tokens.json`, not estimated:

| Section | Leaves | `$type` breakdown |
|---|---|---|
| `semantic.color` | 10 | 10 color |
| `semantic.state` | 6 | 6 percentage |
| `semantic.focus` | 3 | 2 dimension, 1 color |
| `semantic.radius` | 1 | 1 dimension |
| `semantic.space` | 7 | 7 dimension |
| `semantic.typography` | 2 | 2 fontFamily |
| `semantic.layout` | 1 | 1 dimension |
| `component.colorField` | 6 | 2 dimension, 1 fontFamily, 3 color |
| `component.slider` | 1 | 1 color |
| `component.segmentedControl` | 2 | 1 dimension, 1 color |
| `component.button` | 9 | 3 dimension, 1 fontFamily, 5 color |
| **Total** | **48** | **21 color, 23 (6 percentage + 17 dimension), 4 fontFamily** |

That means: **21 `ColorField` rows, 23 `Slider` rows, 4 read-only rows** — not "~48 fields (2
read-only typography rows)" as an earlier draft claimed (that undercounts read-only rows by half:
2 of the 4 `fontFamily` leaves live inside `component.colorField`/`component.button`, not
`semantic.typography`). §7's acceptance criteria state these exact numbers so a tester can check
them precisely instead of eyeballing "looks about right."

**(b) `Object.keys()` on `semantic.space` does not return schema/insertion order — verified
directly:** `['1','2','3','4','6','8','1_5']`. This is JavaScript's spec-mandated behavior:
string keys that parse as array indices (`"1"`–`"8"`) always enumerate first, in ascending numeric
order, before any non-index string key — regardless of where they appear in the source JSON.
`"1_5"` isn't a valid index string (the underscore disqualifies it), so it falls through to
"insertion order among non-index keys" and lands **last**, after `8` (32px) — even though its
value (6px) belongs between `4` (16px) and `6` (24px). A naive walk of this section would render
Space sliders in the visually-confusing order 4, 8, 12, 16, 24, 32, **6** px. This is the *only*
section with numeric-string keys, but the fix (§4's `buildFieldDescriptors`) is written generically
(sort `dimension`/`percentage` fields by resolved value within every section) so it silently
protects any future section that hits the same JS quirk, not just this one.

**(c) `token-writes.mjs` (Task 5) already exports `getLeaf` and `collectLeafPaths`** — both
general-purpose tree-walkers, not payload-specific. This task reuses them directly instead of
writing a fifth tree-walker (Task 5's spec flagged four separate walkers already existing across
the package as deferred debt — reusing here closes one of those instances rather than adding a
fifth).

## 1. Scope

- Create `app/packages/design-system/src/field-descriptors.mjs`: pure module, no filesystem
  access. Exports `buildFieldDescriptors(tokensTree, defaultsTree): FieldDescriptor[]` (§4) plus
  the section-metadata table it uses internally (`SECTIONS`, exported for the page/tests to read
  section headings without duplicating the list).
- Create `app/packages/design-system/src/field-descriptors.test.mjs`: asserts the exact section
  count/order, exact leaf count/type breakdown from §0(a), the `space` ordering fix from §0(b),
  and `isModified`/`isAlias` flag correctness — against small in-memory fixture trees, not the
  real brand data (isolates the test from unrelated future schema changes, same convention as
  `token-writes.test.mjs`).
- Create `app/app/design-system/page.tsx` — server component. `export const dynamic =
  "force-dynamic"`. Calls `notFound()` (from `next/navigation`) when `process.env.NODE_ENV ===
  "production"`, before reading any file. Reads `tokens.json`/`tokens.default.json` fresh on every
  render via `resolveBrandDir()` + `readFileSync`/`JSON.parse`, calls `buildFieldDescriptors`, and
  renders `<Editor descriptors={...} />`.
- Create `app/app/design-system/editor.tsx` — `"use client"`. Owns all interactivity: commit
  triggers, debounce, POSTs, `router.refresh()`, error/pending UI, reset-all confirmation. Uses
  `cn` from `@/lib/cn` for class merging.
- No `.env`/credential contact. No changes to the API route, `token-writes.mjs`, `build-tokens.mjs`,
  or any component from Task 4 — this task is a pure consumer of all of them.

**Exact import paths** (verified by directory depth, not assumed — `page.tsx` sits two levels
shallower than Task 5's `route.ts`, so Task 5's `../../../../` path is wrong here):

```ts
// from app/app/design-system/page.tsx
import { resolveBrandDir } from "../../packages/design-system/src/build-tokens.mjs";
import { buildFieldDescriptors } from "../../packages/design-system/src/field-descriptors.mjs";
```

```js
// from app/packages/design-system/src/field-descriptors.mjs (same directory as its dependencies)
import { getLeaf, collectLeafPaths } from "./token-writes.mjs";
import { resolveValue } from "./resolve.mjs";
```

Component imports (`ColorField`, `Slider`, `Button`) go through the package barrel
(`@guitar-tabs/design-system`) **only if** `package.json` has gained a `main`/`exports` field by
the time this task starts — Task 5's spec flagged that none exists yet, which would make that bare
specifier unresolvable. **Check this first.** If it's still missing, `editor.tsx` imports the
components by explicit relative path instead
(`../../../packages/design-system/src/components/ColorField.tsx`, etc.), and this is the task that
should add the missing `"main"`/`"exports"` field to `package.json` (one line, e.g. `"exports":
"./src/index.ts"`) rather than working around the gap a second time — Task 6 is the first real
consumer of the component barrel, so this is exactly where the gap becomes load-bearing, not
optional to fix.

## 2. Non-goals

- No editing of `primitive.*` or `dark.*` — primitive edits would bypass role semantics (every
  `semantic.*` token that references a primitive would silently drift together, which is a bigger,
  separate feature — "edit the primitive and see every dependent semantic token move" — not what a
  flat field list should do by accident); dark-theme overrides have no light-mode preview to
  verify against, since the app is dark-only today (§0 note: `StudioShell` hardcodes
  `data-theme="dark"`).
- No `SegmentedControl` usage — there is no theme picker (nothing to switch between) and no other
  legitimate use for it on this page. Do not invent one to justify the import; an unused-but-tested
  component is not a defect.
- No migration of existing app buttons to `Button`.
- No new tokens, no range metadata added to the schema, no changes to the API route or package
  internals beyond the `package.json` fix noted in §1 if needed.
- No visual-regression tooling, no Storybook.
- No undo history beyond current-vs-default; no concurrent-edit handling (inherits Task 5's
  documented non-goal — single-user local dev tool).
- No multi-brand switcher UI (`active-brand.json` stays untouched).

## 3. Page structure (rendering, `editor.tsx`)

8 top-level sections, in this exact order — 7 flat `semantic.*` groups, then one "Components"
umbrella containing 4 subheadings:

| Render heading | `FieldDescriptor.section` value(s) it contains |
|---|---|
| Color | `semantic.color` |
| Radius | `semantic.radius` |
| Space | `semantic.space` |
| Typography | `semantic.typography` |
| State opacities | `semantic.state` |
| Focus ring | `semantic.focus` |
| Layout | `semantic.layout` |
| **Components** (umbrella, 4 subheadings) | Color Field → `component.colorField`; Slider → `component.slider`; Segmented Control → `component.segmentedControl`; Button → `component.button` |

`field-descriptors.mjs`'s `SECTIONS` export (§4) carries this exact table (key, render heading,
optional `group` label) so `page.tsx`/`editor.tsx` never hardcode section names separately from
what the descriptor builder actually walks.

**Field dispatch on `$type`:** `color` → `ColorField`; `dimension`/`percentage` → `Slider`
(`showValue` default `true`); `fontFamily` → a plain read-only row (label + value text, no
control — consistent with the API's `400` on any `fontFamily` write). An unknown `$type` (should
be unreachable given §0(a)'s inventory) also renders the read-only fallback — see Stop-conditions.

**`Slider` numeric contract (closes the interface gap the earlier draft left open):** every
`dimension`/`percentage` `FieldDescriptor.value` is a canonical string (`"12px"`, `"8%"`).
`editor.tsx` derives the unit **from `$type`, never by parsing the current string** —
`const UNIT = { dimension: "px", percentage: "%" }` — and:
- Initializes `Slider`'s numeric `value` via `parseFloat(descriptor.value)`.
- On `Slider`'s `onChange(n)`, formats the POST body's `value` as `` `${n}${UNIT[$type]}` ``.

This is simpler than round-tripping whatever suffix happened to be in the resolved string, and
it's always correct because Task 5's own validator fixes the suffix per `$type` regardless.

**Slider ranges** (editor-local table — tokens carry no range metadata, and adding it would be
scope creep for a one-page consumer). Verified this table's five rows exactly partition all 23
`dimension`/`percentage` leaves, with none left over and none double-covered:

| Rule | `min` | `max` | `step` | Covers (exact paths) |
|---|---|---|---|---|
| `$type === "percentage"` (all 6) | 0 | 100 | 1 | `semantic.state.*` (all 6) |
| `$type === "dimension"` named `swatchSize` | 8 | 48 | 1 | `component.colorField.swatchSize` |
| `$type === "dimension"` named `ringWidth`/`ringOffset` | 0 | 8 | 1 | `semantic.focus.ringWidth`, `semantic.focus.ringOffset` |
| `$type === "dimension"` named `sidebarWidth` | 120 | 360 | 1 | `semantic.layout.sidebarWidth` |
| Every other `dimension` | 0 | 64 | 1 | `semantic.radius.base`, `semantic.space.*` (7), `component.colorField.radius`, `component.segmentedControl.gap`, `component.button.paddingX`/`paddingY`/`radius` (13 total) |

`1 + 2 + 1 + 13 = 17` dimension leaves + `6` percentage = `23`, matching §0(a)'s count exactly.

**Reference display:** a field whose `isAlias` is `true` shows its resolved `value` in the control
normally, plus a muted caption below it showing the raw reference (`{semantic.color.accent}`).
Editing posts a literal (alias → override, per Task 5's documented semantics); a subsequent
`reset` restores the alias and the caption reappears.

**Commit triggers:**
- `ColorField`: local text state; POSTs on blur or Enter, only if the value actually changed from
  the last-committed one; `Escape` discards the local edit back to the prop value.
- `Slider`: updates local numeric state immediately on every drag tick (responsive); POSTs
  debounced ~200ms after the last tick. Implementation: a single timer id held in a `useRef` per
  field, cleared and replaced on every new tick (a plain debounce — not modeled on any specific
  existing hook in this codebase; nothing here needs to match `useMetronome.ts`'s scheduling loop,
  which solves a different problem: continuous playback scheduling, not "wait for input to settle
  before firing once").

**Per-field actions:** `revert` (only when `isModified`) and `set-as-default` (also only when
`isModified` — resolved above) render as small muted-text buttons in the same visual style as
`ColorField`'s built-in reset affordance (reuse that styling convention directly; these buttons
sit outside `ColorField`/`Slider` in `editor.tsx`'s row wrapper, not passed in as `onReset`, since
`Slider` has no equivalent prop and both field types need identical revert/promote behavior).
Read-only (`fontFamily`) rows get neither control (§ decision table).

**Page-level `reset-all`:** one `Button` (`variant="secondary"` — nothing on this page is a
"primary" action), placed above the field list, behind a two-step inline confirm: first click →
label becomes `Confirm reset of N changed fields?` (N computed live from the current descriptor
list's `isModified` count) → second click commits. No `window.confirm`, no modal component.
Success feedback uses the API's `reset: [...]` array length: `Reset N fields` (or `Nothing to
reset` when the array is empty — §5).

**Refresh:** after every successful POST (any of the four actions), call `router.refresh()`. The
server component re-reads both files, so revert controls, alias captions, and modified-state all
update with no client-side state duplication and no read endpoint. **Note on `/`'s live update**:
editing a token here also regenerates `design-tokens.generated.css` on disk (via the API route's
in-process `buildActiveBrand()` call); Next's dev-server file watcher picks that up as ordinary CSS
HMR for *any* open page importing it, including `/` — this is unrelated to and independent of this
page's own `router.refresh()`, which only re-renders this route's React tree. Don't conflate the
two when documenting or debugging "why did `/` update."

**Error handling:** one `aria-live="polite"` error region showing the last API error string
(the `400`/`500` JSON shape's `error` field verbatim); cleared on the next success. While a
field's own request is in flight, that row's controls are `disabled` (a `Set<string>` of
in-flight paths in `editor.tsx` state, or equivalent).

**Page chrome:** `<h1>`, one-line description, a muted note stating the dark-only editing
limitation (§2), a link back to `/`.

## 4. `field-descriptors.mjs` — pure module, tested

```ts
export interface FieldDescriptor {
  path: string;            // dot-joined, e.g. "component.button.primaryBackground"
  section: string;         // e.g. "component.button" — matches a SECTIONS[].key
  label: string;           // humanized last segment, e.g. "Primary background"
  $type: "color" | "dimension" | "percentage" | "fontFamily";
  value: string;           // resolved display value (references resolved via resolveValue)
  rawValue: string;        // the literal $value in tokens.json — may be "{...}"
  defaultValue: string;    // resolved default, for comparison display only
  isModified: boolean;     // rawValue !== the default file's rawValue at this path (string compare)
  isAlias: boolean;        // rawValue starts with "{"
}

export const SECTIONS: { key: string; heading: string; group?: string }[]; // the table in §3

export function buildFieldDescriptors(tokensTree: object, defaultsTree: object): FieldDescriptor[];
```

Implementation notes (binding, not suggestions — this is what closes §0's findings):
- Walk `tokensTree` via `collectLeafPaths` (imported from `token-writes.mjs`, §0(c) — do not
  reimplement this walk).
- Skip any leaf whose path starts with `primitive.` or `dark.` (§2).
- For each remaining leaf, look up the same path in `defaultsTree` via `getLeaf` (also imported,
  not reimplemented). `rawValue`/`defaultValue`/`isModified`/`isAlias` follow directly from the two
  raw `$value` strings; `value`/`defaultValue`'s resolved forms come from `resolveValue` (imported
  from `resolve.mjs`), called against `tokensTree`/`defaultsTree` respectively.
- Group by the leaf's first two path segments (`path.split(".").slice(0, 2).join(".")`), matching
  `SECTIONS[].key`.
- **Within each section, sort `dimension`/`percentage` entries by their resolved numeric value
  ascending** (parse the resolved string with `parseFloat`); leave `color`/`fontFamily` entries in
  the order `collectLeafPaths` produced them. This is the generic fix for §0(b)'s ordering bug —
  applied to every section, not special-cased to `space`.
- Order sections per `SECTIONS`' declared order (§3's table), not object insertion order (closes
  the same class of bug §0(b) found, at the section level too).

`field-descriptors.test.mjs` asserts, against small fixture trees (not the real brand data):
- Exact leaf count and `$type` breakdown for a fixture shaped like the real schema's section
  structure (regression-guards §0(a)'s numbers without hardcoding the *real* 48/21/23/4 into a test
  that would need updating every time the real schema grows — the fixture is what's counted).
- A fixture section with out-of-numeric-order keys (mirroring `semantic.space`'s real shape)
  produces ascending-by-value output — regression-guards §0(b) directly.
- `primitive.*`/`dark.*` paths in the fixture never appear in the output.
- `isModified`/`isAlias` correctness across: identical raw values, a literal override that differs
  from an aliased default, and a default itself being an alias.
- Section order matches `SECTIONS`' declared order regardless of the fixture's own key order.

## 5. Bad-case behavior

| Case | Required behavior |
|---|---|
| Production build (`npm run stage`) | `notFound()` → 404 for the whole page |
| API returns 400/500 | Message shown verbatim in the error region; local field state untouched; no `router.refresh()` |
| `Slider` drag while a previous debounced POST for the same path is still in flight | Single timer per path, last tick wins; that row's controls disabled until its own request settles |
| `tokens.json` hand-corrupted (invalid JSON) | Page throws in dev — loud, uncaught, same as a broken build; don't catch-and-hide a data problem |
| A reference that doesn't resolve (`resolveValue` throws during `buildFieldDescriptors`) | Same as corruption — loud throw, fix the data, don't swallow |
| `reset-all` with zero diffs | Still succeeds (Task 5 already handles this); feedback reads "Nothing to reset" |
| A leaf's `$type` isn't one of the four known values | Read-only fallback row (§3) — see Stop-conditions, this shouldn't happen given §0(a)'s inventory |

## 6. Forbidden patterns

- No bare-number POSTs — always the canonical `$type` string (`"12px"`, `"8%"`), constructed via
  §3's `UNIT` map, never by reusing whatever suffix the display string happened to have.
- No `SegmentedControl` import to "use everything" (§2).
- No new `$type` dispatch invented at implementation time for an unknown type — falls to the
  read-only fallback (§3), and if that's ever actually hit, that's a schema change needing its own
  review (§8's stop-condition), not something to patch around silently here.
- No reimplementing `collectLeafPaths`/`getLeaf` — import them from `token-writes.mjs` (§0(c)).
- No touching `.env`/credentials. No new GET/read endpoint. No editing `tokens.json` except through
  the existing API route.

## 7. File allowlist

- `app/packages/design-system/src/field-descriptors.mjs` (create)
- `app/packages/design-system/src/field-descriptors.test.mjs` (create)
- `app/app/design-system/page.tsx` (create)
- `app/app/design-system/editor.tsx` (create)
- `app/packages/design-system/package.json` (modify — **only if** it still lacks a
  `main`/`exports` field per §1; otherwise unchanged)

## 8. Acceptance criteria

- `npm test --workspace @guitar-tabs/design-system` passes, including the new
  `field-descriptors.test.mjs` suite (record before/after test count).
- `npm run verify` passes (typecheck + lint + unit tests).
- Manual, `npm run dev` — each assertion checked independently, not as one paragraph:
  1. Open `/design-system`: exactly **8** top-level section headings render (7 flat + one
     "Components" umbrella with 4 subheadings).
  2. Total rows: **48** (21 `ColorField`, 23 `Slider`, 4 read-only).
  3. The Space section's sliders read in ascending pixel order (4, 6, 8, 12, 16, 24, 32px) — not
     the raw-key order (4, 8, 12, 16, 24, 32, 6) §0(b) found.
  4. Alias captions (`{semantic.color.accent}`-style) are visible on every component token whose
     factory value is still a reference.
  5. Edit `semantic.color.accent` to a new valid hex → `200`; the field's own row updates via
     `router.refresh()`; `/` (open in another tab) picks up the new accent color via CSS HMR
     (mechanism note in §3 — this is the one token where the dark-only limitation doesn't hide the
     change, since `accent` is theme-invariant).
  6. That field's revert control appears; clicking it restores the value and the alias caption
     reappears (for a token whose default is an alias) or the literal default reappears (for one
     whose default is a literal).
  7. `set-as-default` on a modified field makes its revert control disappear.
  8. `reset-all`'s two-step confirm: first click shows the "Confirm reset of N changed fields?"
     label with the correct live count; second click commits and shows "Reset N fields".
  9. `reset-all` with nothing modified shows "Nothing to reset".
  10. An invalid hex typed into a `ColorField`, committed on blur → the API's `400` message
      appears in the error region verbatim; `tokens.json` is unchanged.
- Manual, `npm run stage`: `/design-system` returns 404.
- **Restore `tokens.json` to its committed state** before this task is done (the manual checks
  above mutate it) — `git checkout -- app/packages/design-system/brands/default/tokens.json` (or a
  final `reset-all`), verified via `git status` showing no diff, same discipline as Task 5.
- `git diff --stat` matches the file allowlist (§7): 4 created (5 if `package.json` needed the
  `exports` fix).

## 9. Definition of done

`npm test --workspace @guitar-tabs/design-system` passes + `npm run verify` passes + all manual
dev/stage checks in §8 pass + `tokens.json` restored to its committed state (verified via `git
status`) + `git diff --stat` matches the allowlist + checkpoint commit (ask-first per `AGENTS.md`,
made routinely per `docs/WEB_APP_WORKFLOW.md` §4 once verified — see
`[[checkpoint-commit-policy]]`).

## 10. Stop-conditions

- If a leaf in the real schema turns out to have a `$type` outside `color`/`dimension`/
  `percentage`/`fontFamily` (none do, per §0(a)'s direct count — re-verify against the real file
  before assuming it still holds), stop — render it via the read-only fallback for now, but don't
  silently treat this as normal; it means the schema changed since this spec was written and needs
  its own review, same policy as Task 5's equivalent stop-condition on the write side.
- If any of §3's five Slider-range rules don't cleanly and exclusively cover a real dimension/
  percentage leaf (i.e., a leaf matches zero rows or more than one), stop — don't guess a range;
  amend the table explicitly. (Verified to partition exactly as of this writing — §3.)
- If `router.refresh()` doesn't pick up a just-written value on the next render (stale display),
  stop — the whole no-read-endpoint design assumes it re-invokes the server component fully; if
  that assumption is wrong, the refresh design needs rethinking, not a workaround `fetch`.
- If `@guitar-tabs/design-system`'s `package.json` needs the `main`/`exports` fix (§1) and adding
  one changes how *Task 4's* components resolve anywhere else unexpectedly (there is no other
  consumer yet, so this should be impossible — verify via `git grep` for any existing import of
  the bare specifier before assuming it's safe), stop and ask rather than proceeding.
- **Rollback:** `rm -f app/packages/design-system/src/field-descriptors.mjs
  app/packages/design-system/src/field-descriptors.test.mjs
  app/app/design-system/page.tsx app/app/design-system/editor.tsx` restores the pre-task state
  (plus `git checkout -- app/packages/design-system/package.json` if §1's `exports` fix was
  applied). Manual-test residue in `tokens.json` goes via `git checkout --` per §8, same as
  every prior task on this branch.

---
**Landed:** commit `c22d574` (Iteration 1, Task 6). `/design-system` editor confirmed live and extended multiple times this session (Tasks 9, 10).
