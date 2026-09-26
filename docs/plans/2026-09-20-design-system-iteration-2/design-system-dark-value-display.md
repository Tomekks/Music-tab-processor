# Task spec: Dark-theme values shown and editable next to light (Task 10)

**Tier: S** — dev-only editor surface, no real user data, fully revertible via `git checkout`.
Written fresh against `field-descriptors.mjs` (101 lines), `editor.tsx` (post-Task-4, re-read
current line numbers before implementing — Task 4 touches `editor.tsx` too and may land first),
`token-writes.mjs`. Independent of Task 4 (app-wide toggle) — unrelated feature, coincidence of
both mentioning "dark"/"light."

## 0. User story

The design system already has light and dark theme values, but the `/design-system` editor only
ever shows and lets you edit the light one — the dark override is invisible, only changeable by
hand-editing `tokens.json`. With this task, any field that has a dark-theme override shows both
values side by side on the same row, each independently editable with its own Revert/Set-as-default.

## 1. Context (read, don't re-derive)

- **The write path already handles `dark.*` paths with zero changes needed** — confirmed by
  reading `collectLeafPaths` (`token-writes.mjs`): it's a generic recursive walker with no
  `dark`/`primitive` filtering at all. `applyWrite`/`applyReset`/`applySetAsDefault`/
  `applyResetAll` all operate on whatever path string they're given — `"dark.semantic.color.accent"`
  already works exactly like `"semantic.color.accent"` does, today, untested only because nothing
  in the editor has ever sent that path. **No changes to `token-writes.mjs` at all.**
- **Exactly 8 leaves have a dark override, all under `semantic.color.*`** — confirmed by reading
  `tokens.json`'s `dark` block directly: `background`, `foreground`, `border`, `surface`,
  `surfaceText`, `surfaceHover`, `surfaceActive`, `surfaceActiveText`. `tokens.default.json` has
  the same 8 under its own `dark` block, so `isModified`/Revert/Set-as-default all have a real
  comparison target already — no defaults-file gap like Task 5c hit on child brands.
- **`buildFieldDescriptors` currently skips `dark.*` paths entirely** (`path.startsWith("dark.")`
  → `continue`) — that's *why* dark values are invisible today. This task changes that exclusion
  into an attachment: a light descriptor whose path has a dark counterpart gets that counterpart
  attached, not iterated as its own separate top-level field.
- **Root-brand only.** No child brand has ever defined its own `dark` block (`demo-child` has
  none) — this task doesn't build cross-brand dark resolution. Scoped out explicitly (§3), not an
  oversight.

## 2. Scope

### `field-descriptors.mjs`

Add a `dark?: DarkValue` field to `FieldDescriptor`, where:

```js
/**
 * @typedef {object} DarkValue
 * @property {string} path e.g. "dark.semantic.color.accent"
 * @property {string} value resolved display value
 * @property {string} rawValue literal $value, may be "{...}"
 * @property {boolean} isModified
 * @property {boolean} isAlias
 */
```

In `buildFieldDescriptors`, after building each base descriptor, check for a dark counterpart at
`dark.${path}` in `tokensTree` via the existing `getLeaf` helper (already imported). If present,
attach it using the same `isModified`/`isAlias` logic already used for the base leaf (compare
against `dark.${path}` in `defaultsTree`, same `rawValue.startsWith("{")` check) — don't write a
second, parallel comparison function, reuse the exact same inline logic pattern already there.
Root-brand call shape only (`ownTree` param from Task 5c stays irrelevant here — a child brand
never has a `dark` block, so `getLeaf(tokensTree, `dark.${path}`)` naturally misses and `dark`
stays `undefined`, no extra guard needed).

### `editor.tsx`

**New, small, local component — deliberately not a recursive `<FieldRow>` call.** A dark value's
Revert/Set-as-default never involves staging, child-brand inheritance, or scope override (§1) —
reusing `FieldRow` wholesale would drag in all of that conditional logic for a case that can never
need it. A focused sibling component keeps the diff small and the dark column's behavior
obviously simple:

```tsx
function DarkValueColumn({
  d,
  disabled,
  onCommitValue,
  onRevert,
  onPromote,
}: {
  d: FieldDescriptor["dark"] & {}; // non-null, caller only renders this when d.dark exists
  disabled: boolean;
  onCommitValue: (path: string, value: string) => Promise<boolean>;
  onRevert: (path: string) => void;
  onPromote: (path: string) => void;
}) {
  // ColorRow needs a full FieldDescriptor shape — every dark leaf is $type
  // "color" (§1: all 8 are under semantic.color), so this cast is safe, not
  // a workaround for a real type mismatch.
  const asDescriptor: FieldDescriptor = {
    path: d.path,
    section: "semantic.color",
    label: "Dark",
    $type: "color",
    value: d.value,
    rawValue: d.rawValue,
    isModified: d.isModified,
    isAlias: d.isAlias,
    isInheritedFromParent: false,
    description: "",
  };
  return (
    <div className="min-w-0 flex-1">
      <ColorRow d={asDescriptor} baseline={d.value} disabled={disabled} commit={(v) => onCommitValue(d.path, v)} />
      {d.isAlias && <p className={cn(CAPTION, "mt-1")}>{d.rawValue}</p>}
      {d.isModified && (
        <div className="mt-1 flex items-center gap-2">
          <button type="button" disabled={disabled} onClick={() => onRevert(d.path)} className={MUTED_ACTION}>
            Revert
          </button>
          <button type="button" disabled={disabled} onClick={() => onPromote(d.path)} className={MUTED_ACTION}>
            Set as default
          </button>
        </div>
      )}
    </div>
  );
}
```

**In `FieldRow`'s return** (root-brand, "All variables" call site only — the per-component panel
never shows `semantic.color` fields at all, per Task 7's own scoping, so `d.dark` is structurally
never populated there; no extra guard needed beyond what already exists), render
`<DarkValueColumn>` **next to** the light control in the same flex row, not stacked below it —
matches the user story's "same line." The existing top-level row is
`<div className="flex items-start justify-between gap-3 py-2">`; when `d.dark` exists, the light
control's wrapper and the new `DarkValueColumn` both become flex children of that same row
(`flex-1` each, so they split the row width), instead of the light control alone claiming the
full `min-w-0 flex-1` space it does today. When `d.dark` is absent (every non-`semantic.color`
field), layout is **byte-for-byte unchanged** — confirm this explicitly in the diff.

`onCommitValue`/`onRevert`/`onPromote` passed to `DarkValueColumn` are the **same** functions
`FieldRow` already receives for the light value (`runWrite`/`runReset`/`runPromote` from the "All
variables" call site) — they're generic over `path`, no new `Editor`-level functions needed (§1).

## 3. Non-goals

- Child-brand dark values — no child brand has one today (§1); this task doesn't build resolution
  for a case that can't currently occur.
- The per-component staged-save panel — `semantic.color` fields never appear there (Task 7's own
  scoping), so this task adds nothing to `ComponentDetailView`.
- No change to `token-writes.mjs`, `route.ts`, or `build-tokens.mjs` — all already correct (§1).

## 4. File allowlist

- `app/packages/design-system/src/field-descriptors.mjs`
- `app/packages/design-system/src/field-descriptors.test.mjs`
- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/dark-values.spec.ts` (new)

No `.env`/credentials, no new npm dependency, no `token-writes.mjs`/`route.ts` changes (§1/§3).

## 5. Acceptance criteria

- `npm run verify` passes, including a new `field-descriptors.test.mjs` case: a fixture tree with
  a `dark.semantic.color.X` leaf produces a descriptor for `X` carrying a populated `dark` field
  with the right `value`/`isModified`/`isAlias`; a leaf with no dark counterpart has `dark`
  `undefined`; a non-`semantic.color` leaf is unaffected regardless of a same-named `dark.*` path
  existing elsewhere in the tree (there shouldn't be one today, but the check should be by full
  path, not by leaf name, and the test should prove that explicitly).
- **Required: `app/e2e/design-system/dark-values.spec.ts`, run via `npm run test:e2e:design-system`**
  (per `docs/WEB_APP_WORKFLOW.md` §3). Same fail-fast/cleanup discipline as every prior spec that
  writes real state: assert `tokens.json` clean before starting, restore it after. Cover: a
  `semantic.color` field (e.g. `background`) shows both a light and a dark color control on one
  row; editing the dark one writes to `dark.semantic.color.background` specifically (confirm via
  reading the file, not just the UI) without touching the light value; Revert on the dark value
  restores it independently of the light value's own Revert.
- `git diff --stat` matches the allowlist.
- **Human checkbox:** open `/design-system`, confirm every `semantic.color` field shows both
  values on one line with no layout break, and every other section's fields (no `dark`
  counterpart) look exactly as they did before this task.
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- `tokens.json` restored to committed state after the Playwright run and any manual check;
  checkpoint commit (not pushed).

## 6. Stop-conditions

- If `editor.tsx`'s current shape has drifted from what §2 describes (especially if Task 4 landed
  first and touched the same file), stop and confirm the real current `FieldRow` structure before
  wiring the two-column layout.
- If any `semantic.color` field somehow gets a `dark` counterpart whose `$type` isn't `"color"`
  (contradicting §1's "all 8 are under semantic.color, all color type" claim), stop — the
  `asDescriptor` cast in §2 assumes this is always true; don't guess at Slider/other handling for
  a case this spec never designed for.

---
**Landed:** commit `787ad88`; deployed pending push. 3 new field-descriptors.test.mjs cases, 4 new e2e cases (app/e2e/design-system/dark-values.spec.ts), `npm run verify:full` PASS, human visual checkbox passed via screenshot. Note: the spec claimed "exactly 8" dark leaves; the real count is 9 (`playbackActive` added since) — didn't affect correctness, implementation is generic over count.
