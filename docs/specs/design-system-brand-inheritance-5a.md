# Task spec: Multi-brand inheritance — parent resolution + merge (5a)

Corresponds to Task 5a of `docs/superpowers/plans/2026-09-20-design-system-iteration-2.md` (Track
A, per that plan's "Tracks & sequencing" section — runs after Task 1, before 5b/3/6). Written
against `app/packages/design-system/src/build-tokens.mjs`,
`app/packages/design-system/src/build-tokens.test.mjs`,
`app/packages/design-system/src/contrast.test.mjs`, `app/app/api/design-system/tokens/route.ts`,
`docs/backlog-board/DESIGN.md`, and `docs/BACKLOG.md` item 14 directly — if any of these have
changed since this spec was written, stop and re-read before implementing, per
`WEB_APP_WORKFLOW.md` §3.

This is the logic half of Task 5 (parent-brand resolution + merge). 5b (reset-to-parent) and 5c
(editor UI, after Task 8) are separate specs — don't implement either here.

## 0. Resolved decisions (verified while writing this spec, not left open)

**Backlog-board migration is explicitly out of scope for this task — a synthetic demo brand is
used instead.** The plan's Task 5 text left open whether migrating `docs/backlog-board/`'s palette
to a real child brand belongs in this task. Read `docs/backlog-board/DESIGN.md`: its palette has
~27 color roles (`primary`/`primary-active`/`primary-disabled`, separate `success`/`warning`/
`error` status colors, multiple dark-surface variants) and a full serif+sans typography scale —
none of which exist in this package's current schema (`semantic.color` has 10 keys, no status
colors, no typography beyond `sans`/`mono`). Migrating it for real would mean extending the token
schema first — a materially different, larger task, not a natural extension of "wire up parent
resolution." Forcing a lossy mapping just to check a box would defeat the point. **Decision:** this
task creates one minimal, clearly-synthetic child brand (`brands/demo-child/`, §3.2) purely to
prove the parent-resolution/merge mechanism works end-to-end against a real brand directory (not
just in-memory fixtures) — not a production brand, not the backlog-board migration. That migration
stays a distinct, future, schema-extension task; `docs/BACKLOG.md` item 14's status line should
note this split rather than being marked done by this task (§7).

**`deepMerge` is extracted to a new shared module — `contrast.test.mjs` is touched.** The plan says
to reuse `contrast.test.mjs`'s existing `deepMerge` rather than write a second merge function, but
that function is private to a test file — not importable by production code as-is, and importing a
`.test.mjs` from `build-tokens.mjs` would be backwards. This task extracts it verbatim (unchanged
logic — it's already exercised by `contrast.test.mjs`'s 7 passing tests) into a new
`src/deep-merge.mjs`, and repoints `contrast.test.mjs` at the import instead of its local copy —
one of only two purposes to touch `contrast.test.mjs`, and it must not gain, lose, or reorder any
of its 7 existing test cases in doing so (verify with `git diff` — only the `deepMerge` definition
and one new import line should change). This is a stronger case for extraction than Task 1's
`luminance`/`ratio` duplication call: two genuinely-different production/test paths now both need
the *same* "inherited vs. overridden" merge semantics (`dark.*` overlaying `semantic.*`, and now a
child brand overlaying its parent) — letting them drift apart silently would be a real correctness
risk, not incidental duplication.

**Multi-level inheritance (grandparent chains) throws loudly, not silently truncates.** The plan
caps inheritance at one level (YAGNI beyond that). Verified: if a *parent* brand itself declares a
`parent` in its own `brand.json`, `resolveBrandTree` throws a clear error naming both brands,
rather than silently resolving only one level and producing a subtly-incomplete merge. This matches
this package's existing "throw loudly on an unhandled shape" convention
(`buildFieldDescriptors`'s unknown-section throw, `EXPANDED_LEAF_RE`'s single supported format).

## 1. Scope

Add `resolveBrandTree(brandDir)` to `build-tokens.mjs`: reads a brand's `tokens.json`, and — if
that brand's directory has a `brand.json` declaring a `parent` — recursively resolves and
deep-merges the parent's tree underneath the child's overrides before returning. Wire
`generateCSS` to consume it instead of a bare `JSON.parse(readFileSync(...))`. Add one minimal
synthetic child brand on disk to prove it end-to-end.

Files this task may touch:
- `app/packages/design-system/src/build-tokens.mjs`
- `app/packages/design-system/src/build-tokens.test.mjs`
- `app/packages/design-system/src/deep-merge.mjs` (new)
- `app/packages/design-system/src/contrast.test.mjs` (import-only change, §0)
- `app/packages/design-system/brands/demo-child/tokens.json` (new)
- `app/packages/design-system/brands/demo-child/brand.json` (new)

No other file changes. **Not** `route.ts`, `token-writes.mjs`, `editor.tsx`, or
`field-descriptors.mjs` — those are 5b/5c. `.env`/credentials are not involved and out of scope
regardless.

## 2. Non-goals

- **No reset-to-parent logic.** That's Task 5b's `applyResetToParent` — this task only makes
  parent brands *resolvable*, it doesn't add any way to stop overriding a leaf.
- **No editor UI.** `isInheritedFromParent`, the sidebar, any visible "inherited vs. overridden"
  indicator — Task 5c, after Task 8.
- **No `active-brand.json` change.** `demo-child` is never made the active brand by this task — it
  exists on disk purely as a fixture `generateCSS`/`resolveBrandTree` can be pointed at directly
  (both already take an explicit `brandDir` argument; neither needs to touch the active brand to
  be exercised). Don't edit `active-brand.json` to point at it, even temporarily, "to test it."
- **No backlog-board migration.** See §0. Don't expand this task to touch
  `docs/backlog-board/DESIGN.md` or migrate its palette.
- **No support for a brand with no `tokens.default.json`.** `demo-child` (and any future real child
  brand) has no `tokens.default.json` — the existing `write`/`reset`/`reset-all`/`set-as-default`
  actions in `route.ts` would throw if ever run against a child brand made active, because they all
  call `readJson("tokens.default.json")` unconditionally. That's a real, known gap — **out of scope
  here**: this task never makes a child brand active, so it's never hit. Don't "fix" it by adding a
  `tokens.default.json` to `demo-child` or by touching `route.ts`'s existing actions; that's a
  bigger decision (does "default" even mean anything for a child brand?) for whenever a child brand
  is meant to actually run as the active brand, not this task.
- **No multi-level (grandparent) inheritance.** Throws loudly instead (§0) — don't implement
  support for it "since you're in here anyway."

## 3. Interface / exact changes

### 3.1 `resolveBrandTree` in `build-tokens.mjs`

Add the import and the function, and change `generateCSS`'s first two lines — exact diff (verified
working, all existing tests still pass unmodified):

```js
// Near the top, alongside the existing resolveValue import:
import { deepMerge } from "./deep-merge.mjs";
```

```js
// Resolves a brand's full token tree, following its `brand.json`'s `parent`
// declaration (if any) exactly one level up and deep-merging the child's
// tokens.json on top. Capped at one level by design -- a parent that itself
// declares a parent throws loudly instead of silently truncating the chain,
// so a real second-level use case has to touch this function, not sneak
// past it.
export function resolveBrandTree(brandDir) {
  const tokens = JSON.parse(readFileSync(join(brandDir, "tokens.json"), "utf8"));
  const metaPath = join(brandDir, "brand.json");
  if (!existsSync(metaPath)) {
    return { tree: tokens, parentBrandDir: null };
  }
  const { parent } = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!parent) {
    return { tree: tokens, parentBrandDir: null };
  }
  const parentBrandDir = join(PACKAGE_ROOT, "brands", parent);
  if (!existsSync(parentBrandDir)) {
    throw new Error(`Unknown parent brand "${parent}" for ${brandDir} (looked for ${parentBrandDir})`);
  }
  if (existsSync(join(parentBrandDir, "brand.json"))) {
    const parentMeta = JSON.parse(readFileSync(join(parentBrandDir, "brand.json"), "utf8"));
    if (parentMeta.parent) {
      throw new Error(
        `Brand "${parent}" (parent of ${brandDir}) itself declares a parent ("${parentMeta.parent}") -- ` +
          `multi-level brand inheritance is not supported (by design, YAGNI until a real use case exists)`,
      );
    }
  }
  const parentTokens = JSON.parse(readFileSync(join(parentBrandDir, "tokens.json"), "utf8"));
  return { tree: deepMerge(parentTokens, tokens), parentBrandDir };
}

export function generateCSS(brandDir) {
  const { tree: tokens } = resolveBrandTree(brandDir);
  const base = tokens.semantic ?? {};
  // ...rest of generateCSS's body is completely unchanged below this line.
```

`PACKAGE_ROOT`, `existsSync`, `join`, `readFileSync` are all already imported/defined in this file
— no other new imports needed.

### 3.2 `deep-merge.mjs` (new)

Moved verbatim from `contrast.test.mjs`'s current local function — identical logic, just relocated
and exported:

```js
// Shared by contrast.test.mjs (dark.semantic.* overlaying semantic.*) and
// build-tokens.mjs's resolveBrandTree (a child brand's tokens.json overlaying
// its parent's) -- same "leaf-level override, deep-merge structure" shape in
// both places, extracted so the two never drift from each other.

/**
 * @param {object} base
 * @param {object} override
 * @returns {object} a new object; neither input is mutated
 */
export function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override ?? {})) {
    out[key] =
      base?.[key] !== null && typeof base?.[key] === "object" && override[key] !== null && typeof override[key] === "object" && !("$value" in override[key])
        ? deepMerge(base[key], override[key])
        : override[key];
  }
  return out;
}
```

### 3.3 `contrast.test.mjs`: swap local `deepMerge` for the import

Delete the local `function deepMerge(...) {...}` block; add
`import { deepMerge } from "./deep-merge.mjs";` alongside the existing `resolveValue` import.
Nothing else in this file changes — same 7 tests, same assertions, same `lightTree`/`darkTree`
construction.

### 3.4 `brands/demo-child/` (new, minimal, synthetic — see §0)

`brand.json`:
```json
{ "parent": "default" }
```

`tokens.json` (overrides exactly one leaf — theme-invariant, so no `dark` block needed):
```json
{
  "semantic": {
    "color": {
      "accent": { "$value": "#4a90d9", "$type": "color" }
    }
  }
}
```

This single override is enough to prove both halves of the mechanism: `accent` cascades to every
place that references it (`--color-accent`, `--focus-ring-color`,
`--component-button-primary-background` — all alias `semantic.color.accent`), while everything
else (`background`/`foreground`/`border`/`surface`, the entire `dark` block, every other
`component.*` leaf) resolves unchanged from `default`. No `tokens.default.json` — see §2's
non-goal on this.

### 3.5 `build-tokens.test.mjs`: new tests

Add near the top (imports must stay at the top of the file — don't insert a mid-file `import` the
way an earlier draft of this spec's own verification pass did; that was a shortcut, not a pattern
to follow):

```js
import { generateCSS, resolveBrandDir, resolveBrandTree } from "./build-tokens.mjs";
import { join, dirname } from "node:path";
```

(`resolveBrandTree` added to the existing `build-tokens.mjs` import; `join`/`dirname` new.)

Then, after the existing two tests:

```js
const childDir = () => join(dirname(resolveBrandDir()), "demo-child");

// Task 5a: parent-brand inheritance. demo-child (brands/demo-child/) declares
// { "parent": "default" } and overrides only semantic.color.accent -- proves
// both halves: the override cascades everywhere accent is referenced
// (--color-accent, --focus-ring-color, --component-button-primary-background),
// and everything NOT overridden (background/foreground/border/surface, the
// entire dark block, all other component.* leaves) resolves unchanged from
// the parent. Captured from the real generateCSS(demo-child dir) output, not
// hand-derived -- same discipline as EXPECTED above.
const DEMO_CHILD_EXPECTED = `/* Design tokens — auto-generated by build-tokens.mjs. Do not edit directly. */

:root {
  --background: #faf9f5;
  --foreground: #141413;
  --color-accent: #4a90d9;
  --color-on-accent: #141413;
  --color-border: #e6dfd8;
  --color-surface: #ffffff;
  --radius: 12px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-1_5: 6px;
  --sidebar-width: 240px;
  --state-hover-opacity: 8%;
  --state-focus-opacity: 10%;
  --state-pressed-opacity: 12%;
  --state-disabled-opacity: 50%;
  --state-muted-text-opacity: 40%;
  --state-muted-text-hover-opacity: 70%;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-color: #4a90d9;
  --component-color-field-swatch-size: 24px;
  --component-color-field-radius: 12px;
  --component-color-field-font-family: var(--font-geist-mono);
  --component-color-field-border: var(--color-border);
  --component-color-field-background: var(--color-surface);
  --component-color-field-text: var(--color-surface-text);
  --component-slider-track-color: var(--color-border);
  --component-segmented-control-gap: 24px;
  --component-segmented-control-border: var(--color-border);
  --component-button-padding-x: 12px;
  --component-button-padding-y: 6px;
  --component-button-radius: 12px;
  --component-button-font-family: var(--font-geist-sans);
  --component-button-primary-background: #4a90d9;
  --component-button-primary-text: #141413;
  --component-button-secondary-background: var(--color-surface);
  --component-button-secondary-text: var(--color-surface-text);
  --component-button-secondary-border: var(--color-border);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-accent: var(--color-accent);
  --color-on-accent: var(--color-on-accent);
  --color-border: var(--color-border);
  --color-surface: var(--color-surface);
  --color-surface-text: var(--color-surface-text);
  --color-surface-hover: var(--color-surface-hover);
  --color-surface-active: var(--color-surface-active);
  --color-surface-active-text: var(--color-surface-active-text);
}

[data-theme="light"] {
  --background: #faf9f5;
  --foreground: #141413;
  --color-border: #e6dfd8;
  --color-surface: #ffffff;
  --color-surface-text: #141413;
  --color-surface-hover: #f0efe9;
  --color-surface-active: #141413;
  --color-surface-active-text: #faf9f5;
}

[data-theme="dark"] {
  --background: #1c1d1f;
  --foreground: #ededed;
  --color-border: #353434;
  --color-surface: #535353;
  --color-surface-text: #ffffff;
  --color-surface-hover: #5c5c5c;
  --color-surface-active: #ffffff;
  --color-surface-active-text: #212121;
}
`;

test("generateCSS(demo-child) inherits everything except its one override (accent)", () => {
  assert.equal(generateCSS(childDir()), DEMO_CHILD_EXPECTED);
});

test("resolveBrandTree(default brand) has no parent", () => {
  assert.deepEqual(resolveBrandTree(resolveBrandDir()).parentBrandDir, null);
});

test("resolveBrandTree(demo-child) merges parent's tree under its own override", () => {
  const { tree, parentBrandDir } = resolveBrandTree(childDir());
  assert.match(parentBrandDir, /brands[\\/]default$/);
  assert.equal(tree.semantic.color.accent.$value, "#4a90d9");
  assert.equal(tree.semantic.color.background.$value, "{primitive.color.paper}");
  assert.ok(tree.dark, "dark block inherited from parent");
});
```

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A brand has no `brand.json` at all (every brand today, including `default`) | `resolveBrandTree` returns `{ tree: tokens, parentBrandDir: null }` unchanged — `generateCSS(resolveBrandDir())`'s existing golden test must keep passing character-for-character with zero modification to that test. |
| A brand's `brand.json` names a `parent` that doesn't exist under `brands/` | Throw, naming both the missing parent and the brand that referenced it (verified: `Unknown parent brand "X" for <dir> (looked for <path>)`). Don't return a partial/empty tree. |
| A brand's parent itself declares a `parent` | Throw (§0) — verified message names both the mid-chain brand and its own parent. |
| `demo-child`'s single override (`semantic.color.accent`) vs. everything it doesn't override | Override wins everywhere `accent` is referenced (directly or via alias); everything else — including the entire `dark` block, which `demo-child`'s `tokens.json` doesn't mention at all — resolves from `default` unchanged. Verified via the golden test (§3.5). |

## 5. Forbidden patterns

- No bare `except`/swallowed errors — the two new `throw new Error(...)` calls in
  `resolveBrandTree` are deliberate, loud failures, not caught anywhere in this task's own code.
- No hardcoded colors/spacing beyond `demo-child/tokens.json`'s one deliberate demo override
  (`#4a90d9`) — which is fixture data, not styling.
- No touching `.env`/credentials.
- No new npm dependencies.
- No modifying `contrast.test.mjs` beyond the exact swap in §3.3 — same test count, same
  assertions, same fixture trees.

## 6. File allowlist

- `app/packages/design-system/src/build-tokens.mjs`
- `app/packages/design-system/src/build-tokens.test.mjs`
- `app/packages/design-system/src/deep-merge.mjs` (new)
- `app/packages/design-system/src/contrast.test.mjs`
- `app/packages/design-system/brands/demo-child/tokens.json` (new)
- `app/packages/design-system/brands/demo-child/brand.json` (new)

## 7. Acceptance criteria

- `npm run verify` passes — typecheck, lint, and `node --test` including: the existing
  `build-tokens.test.mjs`, `contrast.test.mjs` tests (all passing, same count as today plus this
  task's additions — verify the count explicitly, don't just check for zero failures), and the new
  `resolveBrandTree`/`demo-child` tests.
- `git diff --stat` shows only the files in §6.
- Manual check (no dev-server involvement needed — `generateCSS`/`resolveBrandTree` are plain
  functions): from `app/packages/design-system/`, run
  `node -e 'import("./src/build-tokens.mjs").then(({generateCSS}) => console.log(generateCSS(process.cwd()+"/brands/demo-child")))'`
  and confirm the printed CSS matches §3.5's `DEMO_CHILD_EXPECTED` by eye.
- Update `docs/BACKLOG.md` item 14's status to note that parent-resolution/merge is now
  implemented (this task) but the backlog-board's own migration is still open and now understood to
  need a schema extension first (§0) — don't mark the whole item done.

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` matches §6's file allowlist.
- Manual check above passed.
- `docs/BACKLOG.md` item 14 updated per §7.
- Self-check (per `WEB_APP_WORKFLOW.md` §3): before reporting back, confirm every concrete claim
  in the report — the file list, the test count (existing + 3 new), the golden-CSS output
  described in §3.5 — against what's actually on disk and what `npm run verify` actually printed.
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).

## 9. Stop-conditions

- If `build-tokens.mjs`'s `generateCSS`/`resolveBrandDir` shape has changed since this spec was
  written (i.e. doesn't match §3.1's "before" state), **stop and ask** rather than adapting
  silently.
- If `contrast.test.mjs`'s local `deepMerge` has changed (different logic, not just the one
  currently documented in §3.2), **stop and ask** before extracting it — this spec assumes it's
  still the exact function shown.
- If `docs/BACKLOG.md` item 14 has uncommitted changes from a concurrent session when you reach
  §7's update step, **stop and ask** rather than risking clobbering someone else's edit (checked
  clean at this spec's writing time, but re-check — this exact staleness bit this plan once
  already, per the plan's own note).
