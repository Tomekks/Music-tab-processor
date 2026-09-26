# Task spec: Token orphan-detection test (Task 6)

> **Landed:** commit `c2f3733` — design-system workspace 81/81 passing (`npm test --workspace
> @guitar-tabs/design-system`, verified 2026-09-20). `KNOWN_ORPHANS` holds 6 entries (2 predicted +
> 4 found by the baseline run itself: `semantic.space.1`/`.2`/`.4`/`.8`). Archived per
> `WEB_APP_WORKFLOW.md` §5a. **This is a live gate, not a one-time check** — re-run
> `token-usage.test.mjs` after every future token-touching task per this file's own §7/§9, even
> though the spec itself is archived.

Corresponds to Task 6 of `docs/plans/2026-09-20-design-system-iteration-2/2026-09-20-design-system-iteration-2.md` — the
mandatory gate task (run as an early baseline now, and again as the closing check after every
token-touching task in the plan lands). Written against
`app/packages/design-system/src/build-tokens.mjs`,
`app/packages/design-system/src/build-tokens.test.mjs`,
`app/packages/design-system/src/token-writes.mjs`,
`app/packages/design-system/brands/default/tokens.json`, and a full grep audit of every
`semantic.*`/`component.*` leaf's actual usage across `app/app/**`, `app/components/**`, and
`app/packages/design-system/src/**` (§0) — if any of these have changed since this spec was
written, stop and re-read before implementing, per `WEB_APP_WORKFLOW.md` §3.

**Sequencing dependency on Task 3:** this spec's baseline (§0/§7) assumes
`docs/specs/design-system-state-overlay.md` (Task 3) has already landed — it consumes
`semantic.state.pressedOpacity`, which is otherwise a third real orphan alongside the two named
below. If Task 3 hasn't landed yet, §7's baseline run will find 3 orphans, not 2 — see §9.

## 0. Audit + resolved decisions (verified while writing this spec, not left open)

**The plan's literal test design — grep for `var(--...)` and `{path.to.token}` only — produces
false-positive orphans today, verified by hand.** Every `semantic.color.*` leaf's actual
consumption was traced across the app. Three color roles are consumed **exclusively through
Tailwind v4's auto-generated utility classes** (`bg-surface-hover`, `border-surface-active`,
`text-surface-active-text`, etc. — Tailwind generates these directly from the `--color-*`
properties this package's `generateCSS` emits into its `@theme inline` block), never through a
literal `var(--color-surface-hover)` and never as a `{semantic.color.surfaceHover}` alias inside
another leaf's `$value`:

- `semantic.color.surfaceHover` — used only as `hover:bg-surface-hover` /
  `hover:border-surface-hover` (`Button.tsx`, `components/StringOrientationToggle.tsx`,
  `components/MetronomeControls.tsx`).
- `semantic.color.surfaceActive` / `surfaceActiveText` — used only as
  `border-surface-active bg-surface-active text-surface-active-text`
  (`components/MetronomeControls.tsx`).

A test that only recognized `var(--...)`/`{...}` would flag these three as orphans on its very
first run, incorrectly — they're in active, real use. **Resolved: the "used" check gets a third
route, scoped to `semantic.color.*`/`dark.semantic.color.*` leaves only** (component.*, state,
focus, radius, layout, and typography leaves were all individually traced too — every one
of them is fully covered by the direct-name-or-alias-chain rule already, confirmed by hand, no
Tailwind-utility route needed for those sections; `space` is the documented exception — four of
its seven steps are real orphans, see the spacing-scale finding below): a color leaf also counts as used if its bare
kebab-case name (`surface-hover`, `accent`, `background`, ...) appears anywhere in scanned source
as a whole word — not restricted to a specific Tailwind prefix (`bg-`/`text-`/`border-`/`ring-`/
`accent-`/... is a long, growing list; hard-coding it risks silently missing one and reintroducing
exactly this false-positive problem). This is a deliberate, documented **heuristic, not a byte-
exact analyzer** — a whole-word match on a common short name (e.g. `border`) can in principle match
unrelated prose, but that only makes the check *more* lenient (a real orphan slips through), never
the dangerous direction (a real usage gets flagged as missing). Matches this task's own framing in
the plan — "fits this project's existing all-in-house convention," not an external linter.

Direct use above means the bare custom-property name (`--state-hover-opacity`), not the
`var(...)`-wrapped form: helper functions like Task 3's `stateOverlayClassName` receive these
names as plain string arguments, so wrapped-only matching would false-flag exactly the tokens a
shared helper exists to serve. Bare matching contains wrapped matching as a subset, so this
only ever errs lenient, never strict.

**Real orphans found, independent of the above — these are genuine gaps in the codebase today, not
false positives:**

- **`semantic.state.focusOpacity`** — defined in `tokens.json`, referenced nowhere (no `var()`, no
  alias). Every component's focus treatment is the ring (`semantic.focus.*`), not a color-mix
  overlay; Task 3's spec (`design-system-state-overlay.md` §0) resolves, on purpose, not to add
  one. Flagged as accepted debt below, not fixed here — fixing it means either wiring a real
  focus-overlay use case (none exists yet) or removing the token, and neither is this test-only
  task's call to make.
- **`component.slider.trackColor`** — defined, aliases nothing, referenced nowhere.
  `Slider.tsx` colors its native `<input type="range">` only via Tailwind's `accent-accent`
  utility (the thumb/fill); nothing sets the unfilled track's color from this token. A `Slider`
  styling fix, out of scope for a test-only spec.
- **`semantic.space.1` / `.2` / `.4` / `.8` — unused spacing-scale steps** (found by the
  baseline run itself, missed by the hand audit above, which traced the *used* steps and wrongly
  assumed the whole scale). Steps 3/6/`1_5` survive via real component aliases (`paddingX`,
  `swatchSize`+`gap`, `paddingY`); steps 1/2/4/8 are referenced nowhere repo-wide — no `var()`,
  no alias, no utility (Tailwind's default `p-1`/`gap-2`/etc. derive from its own `--spacing`
  base, not these `--space-*` props). Scales are legitimately defined ahead of use, so removing
  the steps would be the wrong fix; they join `KNOWN_ORPHANS` with this reason until something
  reaches for them.

**Resolved: these six are recorded as an explicit, maintained `KNOWN_ORPHANS` allowlist inside the
test itself, not silently exempted and not force-fixed.** The alternative of quietly widening the
grep to "make it pass" would defeat the whole point of this gate; forcing an unrelated component
fix into a test-only task would blow its scope. `KNOWN_ORPHANS` keeps the test honest (it asserts
the *exact* current orphan set, so any *new* orphan — the actual thing this gate exists to catch —
still fails loudly) while still letting `npm run verify` pass today, which the plan's Global
Constraints require after every task. Each entry carries its reason inline; removing a fixed
one (or investigating a genuinely new one, not just append-adding it) is part of using this test
correctly going forward — this task's own `Interfaces`/`Bad-case` sections spell that out.

**`build-tokens.mjs` gains one small additive export, beyond the plan's literal "Files: create
token-usage.test.mjs" line — justified below, matching the precedent already set by Task 5a's
`deepMerge` extraction (same reasoning: two independent consumers of the same logic must not be
allowed to drift).** The orphan check needs, for every leaf path, the exact CSS custom-property
name `generateCSS` would emit for it — the naming logic already has real quirks (`BARE_COLOR_KEYS`,
`LEAF_NAME_MAP`'s one-off renames, per-section prefixes). Reimplementing that logic a second time,
by hand, inside the new test file risks exactly the kind of silent drift this project has
explicitly extracted shared logic to avoid before (5a). Instead, `build-tokens.mjs` exports one new
pure function, `cssVarNameForPath(path)`, built from the *same* constants `generateCSS` already
uses (no behavior change to `generateCSS` itself — it doesn't call the new function, it's a
read-only, additive sibling). §3.4 adds one consistency test proving the two never disagree.

**Source tree read directly from `brands/default/tokens.json`, not via `resolveBrandDir()`/
`resolveBrandTree()`.** Those two depend on `active-brand.json`'s current pointer, which Task 5b's
manual check (and any future one) temporarily flips mid-session — exactly the fragility that
task's own spec flagged and worked around. This test reads the default brand's own file directly,
by a fixed relative path from the test file's own location (same pattern `resolveBrandDir()`
itself uses — resolve from the module's location, never mutable state or `process.cwd()`).

## 1. Scope

Create `app/packages/design-system/src/token-usage.test.mjs`: walks `brands/default/tokens.json`,
and for every `semantic.*`/`component.*` leaf (including `dark.*`), asserts it's referenced
somewhere — directly by CSS var, as an alias target inside another leaf's own `$value`, or (color
leaves only) as a Tailwind-utility class name (§0) — except the two documented `KNOWN_ORPHANS`
(§0). `primitive.*` leaves are exempt by design (alias-only).

Additive export in `build-tokens.mjs` (§0's justification): `cssVarNameForPath(path)`, plus one
new consistency test in `build-tokens.test.mjs` proving it agrees with `generateCSS`'s real output.

Files this task may touch:
- `app/packages/design-system/src/token-usage.test.mjs` (new)
- `app/packages/design-system/src/build-tokens.mjs` (one new exported function, additive only)
- `app/packages/design-system/src/build-tokens.test.mjs` (one new test)

No other file changes. **Not** `docs/BACKLOG.md` — the two `KNOWN_ORPHANS` aren't a backlog item
this task is closing, and that file has uncommitted concurrent-session changes per the plan's own
top-level note; report the two findings in this task's own report instead of writing to it.
`.env`/credentials are not involved.

## 2. Non-goals

- **Not fixing `semantic.state.focusOpacity`, `component.slider.trackColor`, or the four unused
  space steps.** §0 — recorded as `KNOWN_ORPHANS`, not fixed. Don't add a focus overlay, touch
  `Slider.tsx`, or prune the spacing scale to make the count zero; that's scope creep into other
  tasks' territory (and scales are defined ahead of use — pruning would be the wrong fix).
- **No new npm dependency, no external linter (Design Token Kit, a Stylelint plugin).** Plan says
  so explicitly — this stays a `node --test` file like everything else in this package.
- **No change to `generateCSS`'s actual behavior.** `cssVarNameForPath` is a new, separate, purely
  additive export; nothing about what CSS gets written changes.
- **No scanning of `node_modules`, `.next`, or the gitignored
  `app/app/design-tokens.generated.css`.** The generated file is `generateCSS`'s own output —
  scanning it as "usage evidence" would be circular (its `--component-slider-track-color: var(--color-border);`
  line, for instance, is a *definition*, not a *consumption*, of either variable).
- **No scanning `*.test.mjs`/`*.test.ts` files as usage evidence.** Test fixtures assert what the generator
  *produces* (e.g. `build-tokens.test.mjs`'s golden `EXPECTED` string contains literal
  `--state-focus-opacity: 10%;` as an expected *definition* line) — not real product consumption.
  Counting them would let a token look "used" purely because a test happens to assert its
  generated value, masking a real orphan.

## 3. Interface / exact changes

### 3.1 `build-tokens.mjs`: new exported `cssVarNameForPath`

Add after the existing `colorPropName` function (uses the same module-scope `kebab`,
`BARE_COLOR_KEYS`, `LEAF_NAME_MAP` this file already defines — no new constants):

```js
/**
 * The exact CSS custom-property name generateCSS() emits for a given leaf
 * path (dot-joined, e.g. "semantic.color.accent", "component.button.
 * primaryBackground", "dark.semantic.color.surfaceHover"), or null for a
 * primitive.* leaf (alias-only by design, never emitted directly). Exported
 * (Task 6) so token-usage.test.mjs derives its expected var names from the
 * exact same logic generateCSS uses -- see that task's spec §0 for why a
 * second, independent copy of this naming logic was rejected.
 * @param {string} path
 * @returns {string | null}
 */
export function cssVarNameForPath(path) {
  const raw = path.startsWith("dark.") ? path.slice("dark.".length) : path;
  const segments = raw.split(".");
  const [top] = segments;
  if (top === "primitive") return null;
  if (top === "component") {
    return `--${segments.map(kebab).join("-")}`;
  }
  // top === "semantic"
  const section = segments[1];
  const key = segments[segments.length - 1];
  if (section === "color") {
    return BARE_COLOR_KEYS.has(key) ? `--${key}` : `--color-${kebab(key)}`;
  }
  if (section === "state" || section === "focus") {
    return `--${section}-${kebab(key)}`;
  }
  if (section === "radius") {
    return `--${LEAF_NAME_MAP[`radius.${key}`] ?? `radius-${kebab(key)}`}`;
  }
  if (section === "space") {
    return `--space-${key}`;
  }
  if (section === "layout") {
    return `--${LEAF_NAME_MAP[`layout.${key}`] ?? kebab(key)}`;
  }
  if (section === "typography") {
    return `--font-${kebab(key)}`;
  }
  return null;
}
```

### 3.2 `build-tokens.test.mjs`: one new consistency test

Add to the existing imports (`generateCSS`, `resolveBrandDir`, `resolveBrandTree` are already
imported):

```js
import { generateCSS, resolveBrandDir, resolveBrandTree, cssVarNameForPath } from "./build-tokens.mjs";
import { collectLeafPaths } from "./token-writes.mjs";
```

Add, after the existing tests:

```js
test("cssVarNameForPath agrees with generateCSS's real output for every default-brand leaf (no drift between the two)", () => {
  const brandDir = resolveBrandDir();
  const css = generateCSS(brandDir);
  const { tree } = resolveBrandTree(brandDir);
  for (const { path } of collectLeafPaths(tree)) {
    const varName = cssVarNameForPath(path);
    if (varName === null) {
      assert.equal(path.split(".")[0], "primitive", `${path} unexpectedly has no CSS var name`);
      continue;
    }
    assert.ok(
      css.includes(`${varName}:`),
      `${path} -> "${varName}" not found as a declared property in generateCSS's real output`,
    );
  }
});
```

### 3.3 `token-usage.test.mjs` (new)

```js
// Token orphan-detection (Task 6). Every semantic.*/component.* leaf
// (dark.* included) must be referenced somewhere: directly by CSS var, as
// an alias target inside another leaf's own $value, or (color leaves only)
// as a Tailwind-generated utility class name -- see this task's spec §0
// for why the third route exists and is scoped to colors only.
// primitive.* leaves are exempt by design (alias-only, never used
// directly per this package's own convention).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { cssVarNameForPath } from "./build-tokens.mjs";
import { collectLeafPaths } from "./token-writes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(HERE, "../../.."); // .../app (src -> design-system -> packages -> app)

// Read the default brand's own file directly, not via resolveBrandDir() --
// that depends on active-brand.json's current (mutable) pointer. See §0.
const tree = JSON.parse(readFileSync(join(HERE, "../brands/default/tokens.json"), "utf8"));

const SCAN_ROOTS = [HERE, join(APP_ROOT, "app"), join(APP_ROOT, "components")];
const SCAN_EXTENSIONS = new Set([".tsx", ".ts", ".mjs", ".css"]);
const EXCLUDE_FILE = join(APP_ROOT, "app/design-tokens.generated.css"); // gitignored, generated -- see §2

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(full));
    } else if (
      SCAN_EXTENSIONS.has(extname(entry.name)) &&
      !/\.test\.(mjs|ts)$/.test(entry.name) &&
      full !== EXCLUDE_FILE
    ) {
      out.push(full);
    }
  }
  return out;
}

const sourceText = SCAN_ROOTS.flatMap(walk)
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(); // local one-liner, deliberately duplicated Task-1-style: it only serves the lenient utility-name heuristic, and sharing build-tokens.mjs's canonical kebab would couple this test's loosest check to the generator's exact-case logic for no benefit

// Every path some other leaf's $value aliases via {path.to.token}.
const aliasedPaths = new Set();
for (const { leaf } of collectLeafPaths(tree)) {
  if (typeof leaf.$value === "string") {
    const m = /^\{([\w.]+)\}$/.exec(leaf.$value);
    if (m) aliasedPaths.add(m[1]);
  }
}

// Pre-existing, documented debt -- NOT fixed by this task. See spec §0 for
// why each one is here. Keep this list exact: if this test fails because
// the actual orphan set no longer matches, either a NEW orphan appeared
// (investigate and wire it up, or add it here with a reason) or one of
// these got fixed (remove it -- don't leave a stale exemption).
const KNOWN_ORPHANS = new Set([
  "semantic.state.focusOpacity",
  "component.slider.trackColor",
]);

function isOrphan(path) {
  const varName = cssVarNameForPath(path);
  if (varName === null) return false; // primitive.* -- exempt by design
  const stripped = path.startsWith("dark.") ? path.slice("dark.".length) : path;
  // Bare custom-property name, NOT var(...)-wrapped: Task 3's stateOverlayClassName passes
  // these names as plain string arguments (assembled into var(...) only at runtime), so a
  // wrapped-only match would false-flag hoverOpacity/pressedOpacity. Bare matching is a strict
  // superset -- every var(--x) contains --x, so nothing genuinely used stops passing.
  const usedDirectly = sourceText.includes(varName);
  const usedAsAlias = aliasedPaths.has(stripped);
  const section = stripped.split(".")[1];
  const key = stripped.split(".").pop();
  const usedAsUtility = section === "color" && new RegExp(`\\b${kebab(key)}\\b`).test(sourceText);
  return !(usedDirectly || usedAsAlias || usedAsUtility);
}

test("every semantic.*/component.* leaf (including dark.*) is referenced somewhere, except the documented KNOWN_ORPHANS", () => {
  const allPaths = collectLeafPaths(tree).map(({ path }) => path);
  const actualOrphans = allPaths.filter(isOrphan).sort();
  assert.deepEqual(
    actualOrphans,
    [...KNOWN_ORPHANS].sort(),
    "orphan set changed from KNOWN_ORPHANS -- see this file's comment above KNOWN_ORPHANS",
  );
});
```

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A `component.*` leaf's `$value` is `{semantic.color.border}` (an alias), and nothing in app source ever writes `var(--color-border)` or the bare word `border` elsewhere | `semantic.color.border` still counts as used, via `aliasedPaths` (§3.3) — the alias reference from `component.colorField.border` etc. is real usage, matching the plan's own scoping rule. |
| A `semantic.color.*` leaf is consumed only via a Tailwind utility class (`bg-surface-hover`), never `var()` or `{...}` | Counted as used via the utility-name fallback (§0/§3.3) — not a false orphan. |
| Task 3 hasn't landed yet when this test runs | `semantic.state.pressedOpacity` shows up as a third real orphan, not in `KNOWN_ORPHANS` — the test correctly fails. See §9; this is the intended behavior, not a bug. |
| A future task removes `component.slider.trackColor` from `tokens.json` entirely (fixes the Slider styling gap) | `collectLeafPaths` no longer yields that path at all, so it drops out of `actualOrphans` naturally — but `KNOWN_ORPHANS` still lists it, so the `deepEqual` fails until `KNOWN_ORPHANS` is updated to remove it. Intended — forces an explicit acknowledgment rather than a silent pass. |

## 5. Forbidden patterns

- No bare `except`/swallowed errors.
- No touching `.env`/credentials.
- No new npm dependencies.
- **No widening `KNOWN_ORPHANS` to absorb an unexpected new orphan without investigating first**
  (§9) — the whole point of this gate is catching exactly that case.
- **No scanning the generated CSS file or `*.test.mjs`/`*.test.ts` fixtures as usage evidence** (§0/§2) —
  circular, would mask real orphans.

## 6. File allowlist

- `app/packages/design-system/src/token-usage.test.mjs` (new)
- `app/packages/design-system/src/build-tokens.mjs`
- `app/packages/design-system/src/build-tokens.test.mjs`

## 7. Acceptance criteria

- `npm run verify` passes — typecheck, lint, and `node --test` including the existing 79 tests
  (76 + Task 3's 3, which lands first per §0 — unchanged), `build-tokens.test.mjs`'s one new consistency test, and `token-usage.test.mjs`'s one
  new orphan-set test.
- `git diff --stat` shows only the files in §6.
- **This is the early baseline run** (per the plan): confirm the orphan test passes today with
  `actualOrphans` equal to exactly `["component.slider.trackColor", "semantic.space.1",
  "semantic.space.2", "semantic.space.4", "semantic.space.8", "semantic.state.focusOpacity"]`
  (assuming Task 3 has landed — §9 if not; the four space steps are the baseline's own finding,
  §0). If it passes with a *different* orphan set than predicted here, that's a real, reportable finding — investigate before assuming this spec's audit
  was wrong, same as the plan's own instruction, but also don't silently edit `KNOWN_ORPHANS` to
  match without saying so in the report.

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` matches §6.
- Baseline orphan set confirmed against §7's prediction, any discrepancy reported explicitly.
- Self-check (per `WEB_APP_WORKFLOW.md` §3): before reporting back, confirm every concrete claim —
  file list, test count (existing 79 + 2 new), the exact `actualOrphans` contents — against what's
  actually on disk and what `npm run verify` printed.
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).
- **Reminder for future tasks (not this task's own done-criteria, informational):** per the plan,
  this test must be re-run as the mandatory closing gate after every subsequent token-touching
  task in this plan lands (5a/5b already landed before this task; anything after — 1b, 8a, 5c,
  etc. — should re-run `npm test --workspace @guitar-tabs/design-system` and treat any change to
  `actualOrphans` as a real finding for *that* task, not a flaw in this one).

## 9. Stop-conditions

- If the baseline run finds `semantic.state.pressedOpacity` as an orphan alongside the two
  `KNOWN_ORPHANS`, **that means Task 3 hasn't landed yet** — stop and ask whether to proceed with
  a 3-entry `KNOWN_ORPHANS` (not recommended — masks a task-ordering mistake) or wait for Task 3.
  Don't silently add it to `KNOWN_ORPHANS` and move on.
- If the baseline run finds *any other* orphan beyond the three named in this spec, **stop and
  investigate** before adding it anywhere — this spec's §0 audit was done by hand against the
  tree as of this writing; a real drift (a leaf renamed, a component changed) is exactly the kind
  of finding this task exists to surface, not paper over.
- If `build-tokens.mjs`'s `kebab`/`BARE_COLOR_KEYS`/`LEAF_NAME_MAP` constants have changed shape
  since this spec was written, **stop and ask** before writing `cssVarNameForPath` — §3.1 assumes
  their exact current form.
- If `token-writes.mjs`'s `collectLeafPaths` return shape (`{path, leaf}[]`, dot-joined path)
  differs from what 5b's spec already documented, **stop** — both `build-tokens.test.mjs`'s new
  test and `token-usage.test.mjs` depend on it.
