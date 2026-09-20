# Task spec: Design system — reference resolver, build script, and tests

Implements Task 2 of `docs/superpowers/plans/2026-09-19-design-system.md`. Read that task's
section first. Depends on Task 1 (`docs/specs/design-system-brand-data.md`), already implemented
and verified on the `task/design-system-brand-data` branch (not yet merged to `master`, but the
files are real, committed, and correct — verified independently, not just per the execution
model's own report) — `app/packages/design-system/brands/default/tokens.json` and
`active-brand.json` exist and are the real input this task works against, not a hypothetical
shape. Work from that branch, not `master`.

## 1. Scope

- `app/packages/design-system/src/resolve.mjs` (**new**): resolves a token's `$value`, following
  `{path.to.token}` references to their final literal value, detecting cycles.
- `app/packages/design-system/src/resolve.test.mjs` (**new**): tests for the above.
- `app/packages/design-system/src/build-tokens.mjs` (**new**): reads `active-brand.json` and
  that brand's `tokens.json`, resolves every token via `resolve.mjs`, returns generated CSS text.
  **Does not write to disk and has no CLI/main-module behavior in this task** — it's a pure
  function this task exposes; Task 3 adds the disk-writing entrypoint on top of it.
- `app/packages/design-system/src/tokens-validation.test.mjs` (**new**): path-parity between
  `tokens.json`/`tokens.default.json`, and `$value`/`$type` shape validation.
- `app/packages/design-system/src/contrast.test.mjs` (**new**): WCAG AA contrast check on the
  brand's five on-color pairs.
- `app/packages/design-system/package.json` (modify): add `"test": "node --test src/"`.
- `app/scripts/verify.sh` (modify): add a step running this package's tests.
- No `.env`/credential contact. No changes to `app/app/` — this task's output is exercised only
  by its own tests, not wired into the running app yet (that's Task 3).

## 2. Non-goals

- No CLI entrypoint, no disk writes, no `app/app/design-tokens.generated.css` — Task 3's job.
- No changes to `app/app/globals.css`.
- No new tokens, no changes to `tokens.json`/`tokens.default.json` content — this task consumes
  Task 1's data as-is.
- No dependency on any npm package for the contrast math — the WCAG relative-luminance formula
  is ~15 lines of plain arithmetic; don't add a color library for this.

## 3. Interface

### `resolve.mjs`

```ts
export function resolveValue(tree: TokenTree, value: unknown, path?: string[]): unknown;
```

- `tree` is the full parsed `tokens.json` object (needed because a reference can point anywhere
  in it, e.g. `component.button` referencing `semantic.color.accent`).
- `value` is whatever a token's `$value` currently holds: a literal (`"#ae97f7"`, `12`, `"12px"`)
  or a reference string (`"{semantic.color.accent}"`).
- Returns the fully-resolved literal — following reference chains until it lands on a
  non-reference value.
- **Passthrough rule:** any `value` that isn't a string starting with `{` and ending with `}`
  is returned unchanged. This is what makes `typography.sans`'s `"var(--font-geist-sans)"`
  resolve to itself — it doesn't start with `{`, so it's not a reference, it's a raw CSS value
  pointing at something outside the token system entirely.
- **Path resolution:** strip the braces, split on `.`, walk `tree` by that path
  (`"semantic.color.accent"` → `tree.semantic.color.accent`). If any segment is missing, throw
  `Error("Token reference not found: {semantic.color.accent}")` (exact path in the message).
  If the resolved node isn't a token object (no `$value` key), throw
  `Error("Token reference {path} does not resolve to a token")`.
- **Cycle detection:** `path` (the optional third parameter) accumulates every reference string
  resolved so far in the current call chain. Before resolving a reference, check whether it's
  already in `path` — if so, throw `Error` naming the full cycle (e.g.
  `"Circular token reference: {a} -> {b} -> {a}"`), not a stack overflow. Reference sketch (adapt
  freely, but the cycle check must work this way — check-before-recurse, not catch-after-crash):

  ```js
  export function resolveValue(tree, value, path = []) {
    if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) {
      return value;
    }
    const ref = value.slice(1, -1);
    if (path.includes(ref)) {
      throw new Error(`Circular token reference: ${[...path, ref].join(" -> ")}`);
    }
    let node = tree;
    for (const segment of ref.split(".")) {
      if (node == null || !(segment in node)) {
        throw new Error(`Token reference not found: {${ref}}`);
      }
      node = node[segment];
    }
    if (node == null || typeof node !== "object" || !("$value" in node)) {
      throw new Error(`Token reference {${ref}} does not resolve to a token`);
    }
    return resolveValue(tree, node.$value, [...path, ref]);
  }
  ```

### `build-tokens.mjs`

```ts
export function generateCSS(brandDir: string): string;
```

Given a brand's directory (e.g. `app/packages/design-system/brands/default`), reads
`tokens.json` from it, resolves every leaf via `resolveValue`, and returns the generated CSS as
a string. A separate, small piece of this task's own logic reads `active-brand.json` to find
which brand directory to pass — see Bad-case behavior (§4) for what happens when that file is
missing or names a brand that doesn't exist.

**Exact output, given Task 1's real `tokens.json`** (naming convention: `camelCase` JSON keys
become `kebab-case` CSS segments, e.g. `surfaceText` → `surface-text`, `onAccent` → `on-accent`,
except where noted — the table below is authoritative, don't derive names from a general rule
where this spec gives the literal name):

```css
/* Design tokens — auto-generated by build-tokens.mjs. Do not edit directly. */

:root {
  --background: #faf9f5;
  --foreground: #141413;
  --color-accent: #ae97f7;
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
  --sidebar-width: 240px;
  --state-hover-opacity: 0.08;
  --state-focus-opacity: 0.1;
  --state-pressed-opacity: 0.12;
  --state-disabled-opacity: 0.5;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-color: #ae97f7;
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
```

**Why this exact shape, not a "cleaner" one** — this replicates the current real
`app/app/globals.css` structure precisely (including its one real inconsistency: `background`/
`foreground` are bare names, everything else is `--color-`-prefixed), because Task 3's cutover
has to be a drop-in replacement for that file, and because `SheetDiagram.tsx` already consumes
`var(--background)`/`var(--foreground)` directly by their bare names — renaming them to
`--color-background`/`--color-foreground` here would silently break that component, which is out
of this task's (and this whole phase's) scope to touch. Specific points, since they're easy to
get wrong by "cleaning up" instead of replicating:

- `--color-surface-text`, `--color-surface-hover`, `--color-surface-active`,
  `--color-surface-active-text` appear in `@theme inline` and inside both `[data-theme]` blocks,
  but **not** in bare `:root`. That's not an oversight to fix — the real `globals.css` doesn't
  define them in `:root` either (see Task 1's spec, §3, on why `[data-theme]` is what's actually
  live; `:root` alone was never a complete fallback for these four properties, before or after
  this change).
- `accent`/`on-accent` are **not** redefined inside either `[data-theme]` block — they're
  theme-invariant in the schema (Task 1 §3), so they resolve once in `:root` and inherit
  unchanged through both theme scopes, exactly like the real CSS never redefines
  `--color-accent` per theme either.
- `@theme inline`'s entries that read `var(--color-X)` (not `var(--X)`) are intentional
  self-references, not a copy-paste mistake — this is the Tailwind v4 pattern that lets a
  `[data-theme]` override on `--color-X` keep flowing through to Tailwind's generated utility
  classes, rather than `@theme inline` snapshotting a build-time value.
- `radius`, `space-*`, `sidebar-width`, `state-*`, `focus-*` are plain `:root` custom properties,
  **not** promoted into `@theme inline` — only color tokens and the two font variables get
  promoted (matching the existing comment in `globals.css`: "Only color tokens are promoted into
  Tailwind's utility-generating namespace").
- `--font-sans`/`--font-mono` appear **only** inside `@theme inline`, never in bare `:root` —
  matching the real file exactly; these override Tailwind's own default `font-sans`/`font-mono`
  theme keys with the app's actual Geist variables.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `active-brand.json` file missing | Throw a clear error naming the expected path — don't default to a hardcoded brand name |
| `active-brand.json` isn't valid JSON | Let `JSON.parse` throw; don't catch-and-swallow it into a generic failure |
| `active-brand.json`'s `"brand"` names a folder that doesn't exist under `brands/` | Throw a clear error naming both the requested brand and the path it looked for |
| A token reference points at a path that doesn't exist | `resolveValue` throws (§3) — `build-tokens.mjs` doesn't catch this, lets it propagate |
| A token reference forms a cycle | `resolveValue` throws with the cycle named (§3) |
| `tokens.json` is missing a token this task's output table (§3) expects | Stop and ask (§9) — don't silently omit it from the generated CSS |

## 5. Forbidden patterns

- No bare `except`/swallowed errors anywhere in `resolve.mjs` or `build-tokens.mjs` — every
  failure mode in §4 propagates as a thrown `Error` with a specific message, not a generic
  catch-all or a silent `undefined`.
- No writing to `app/app/` from this task (see §2).
- No color-math npm dependency for `contrast.test.mjs` (§2).
- No touching `.env` or credentials.

## 6. File allowlist

- `app/packages/design-system/src/resolve.mjs` (new)
- `app/packages/design-system/src/resolve.test.mjs` (new)
- `app/packages/design-system/src/build-tokens.mjs` (new)
- `app/packages/design-system/src/tokens-validation.test.mjs` (new)
- `app/packages/design-system/src/contrast.test.mjs` (new)
- `app/packages/design-system/package.json` (modify)
- `app/scripts/verify.sh` (modify)

## 7. Test specifications

**`resolve.test.mjs`:**
- A multi-hop reference (e.g. resolving `semantic.color.onAccent`, which is
  `{primitive.color.ink}`) returns the final literal (`"#141413"`).
- A reference to a path that doesn't exist in the tree throws.
- A reference to a path that exists but isn't a token (no `$value`) throws.
- A raw, non-reference value (`"#ae97f7"`, `12`, `"var(--font-geist-sans)"`) returns unchanged.
- A synthetic circular reference — construct a small standalone token tree in the test itself
  (don't rely on `tokens.json` having a cycle, it doesn't and shouldn't) where `a`'s `$value` is
  `"{b}"` and `b`'s `$value` is `"{a}"` — resolving either throws, and the process doesn't hang.

**`tokens-validation.test.mjs`:**
- Every token path present in `app/packages/design-system/brands/default/tokens.json` is also
  present in `tokens.default.json`, and vice versa (walk both trees, collect every path that
  terminates in a `$value`, compare the two sets — should currently be equal since Task 1
  created them as an exact copy).
- Every leaf across both files has both `$value` and `$type`, and `$type` is one of `color` /
  `dimension` / `number` / `fontFamily`.

**`contrast.test.mjs`** — implement the WCAG relative-luminance formula (sRGB → linear per
channel → `0.2126R + 0.7152G + 0.0722B` → contrast ratio `(L1+0.05)/(L2+0.05)`, lighter over
darker) and assert **≥ 4.5:1** for exactly these five pairs, resolving each side through
`resolveValue` first (don't hardcode the hex values in the test — resolve them from the real
`tokens.json`, so the test actually re-checks the live data, not a frozen snapshot of it):

| Pair | Light | Dark |
|---|---|---|
| `accent` / `onAccent` | theme-invariant — one check, not two: `#ae97f7` / `#141413` → 7.52:1 | — |
| `surface` / `surfaceText` | `#ffffff` / `#141413` → 18.43:1 | `#535353` / `#ffffff` → 7.69:1 |
| `surfaceActive` / `surfaceActiveText` | `#141413` / `#faf9f5` → 17.50:1 | `#ffffff` / `#212121` → 16.10:1 |

(Numbers shown are what Task 1's real data currently produces — computed independently (Python,
the standard WCAG formula) while writing this spec, not asserted without basis. The test should
compute these itself from the live `tokens.json`, not hardcode the ratios — if the data changes
later and a pair drops below 4.5:1, this test is what's supposed to catch it, not a frozen table.)

## 8. Definition of done

`npm test --workspace @guitar-tabs/design-system` reports **5 test files, all passing** (check
the count, not just exit code — see the reasoning in the plan's Task 2 section about why a
shell-glob test-discovery bug would otherwise pass silently) + `npm run verify` passes with the
new step included + `git diff --stat` matches the allowlist (7 files: 5 new, 2 modified) +
checkpoint commit (ask-first per `AGENTS.md`).

## 9. Stop-conditions

- If any token in `tokens.json` doesn't map cleanly onto the naming table in §3 (a shape this
  spec didn't anticipate), stop and ask rather than inventing a name.
- If `resolveValue`'s cycle detection can't be made to work as sketched for some reason specific
  to this codebase's tooling, stop and ask before shipping a different mechanism.
- If the contrast test finds any of the five pairs actually failing 4.5:1 against the real,
  committed `tokens.json` (contradicting the numbers in §7's table), stop and ask — don't adjust
  the threshold or the data to make it pass.
