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

// Local one-liner, deliberately duplicated Task-1-style: it only serves the lenient
// utility-name heuristic below, and sharing build-tokens.mjs's canonical kebab would couple
// this test's loosest check to the generator's exact-case logic for no benefit.
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// Every path some other leaf's $value aliases via {path.to.token}.
const aliasedPaths = new Set();
for (const { leaf } of collectLeafPaths(tree)) {
  if (typeof leaf.$value === "string") {
    const m = /^\{([\w.]+)\}$/.exec(leaf.$value);
    if (m) aliasedPaths.add(m[1]);
  }
}

// Pre-existing, documented debt -- NOT fixed by this task. See spec §0 for
// why each one is here. focusOpacity/trackColor are single-token gaps;
// the four space.* steps are unused entries in an otherwise-live spacing
// scale (steps 3/6/1_5 survive via component aliases -- swatchSize, gap,
// paddingX/Y -- while 1/2/4/8 are referenced nowhere repo-wide). Keep this
// list exact: if this test fails because the actual orphan set no longer
// matches, either a NEW orphan appeared (investigate and wire it up, or add
// it here with a reason) or one of these got fixed (remove it -- don't
// leave a stale exemption).
// Dark.* leaves never get their own entries here: the test body normalizes
// every actual orphan to its base path (strips a leading "dark.") before
// comparing, mirroring the stripped-path usage detection in isOrphan above.
// A dark override is therefore covered by -- or flagged together with -- its
// base path's entry (Spec 0 amendment 2026-09-21).
const KNOWN_ORPHANS = new Set([
  "semantic.state.focusOpacity",
  "component.slider.trackColor",
  "semantic.space.1",
  "semantic.space.2",
  "semantic.space.4",
  "semantic.space.8",
]);

function isOrphan(path) {
  const varName = cssVarNameForPath(path);
  if (varName === null) return false; // primitive.* -- exempt by design
  const stripped = path.startsWith("dark.") ? path.slice("dark.".length) : path;
  // Bare custom-property name, NOT var(...)-wrapped: helpers like Task 3's
  // stateOverlayClassName receive these names as plain string arguments
  // (assembled into var(...) only at runtime), so wrapped-only matching would
  // false-flag exactly the tokens a shared helper exists to serve. Bare
  // matching is a strict superset -- every var(--x) contains --x.
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
  // Normalize dark.* orphans to their base path before comparing (Spec 0
  // amendment 2026-09-21): usage detection in isOrphan already operates on
  // the stripped path, so known-orphan matching must too -- otherwise every
  // dark override of an intentionally-unused base token would demand a
  // duplicate entry. A dark override of a *used* base token still fails here
  // (its normalized path is absent from KNOWN_ORPHANS), so nothing is masked.
  const normalizedOrphans = [
    ...new Set(actualOrphans.map((p) => (p.startsWith("dark.") ? p.slice("dark.".length) : p))),
  ].sort();
  assert.deepEqual(
    normalizedOrphans,
    [...KNOWN_ORPHANS].sort(),
    "orphan set changed from KNOWN_ORPHANS -- see this file's comment above KNOWN_ORPHANS",
  );
});
