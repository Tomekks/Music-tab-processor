// Token build: tokens.json -> CSS custom properties.
// Generic leaf-walker with a small exception map (see below), not a hardcoded
// template — new leaves inside known sections (and future `component.*`
// blocks, Task 4) emit correctly without rewriting this file.
//
// Replicates app/app/globals.css's existing structure exactly, including its
// bare-vs-prefixed inconsistency (background/foreground are bare, everything
// else is --color- prefixed) and radius.base -> --radius /
// layout.sidebarWidth -> --sidebar-width. Task 4 adds the component.* var()
// alias branch in the marked loop below; nothing else in this file changes.

import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveValue } from "./resolve.mjs";
import { deepMerge } from "./deep-merge.mjs";
import { kebab, BARE_COLOR_KEYS, LEAF_NAME_MAP, colorPropName, cssVarNameForPath } from "./css-var-naming.mjs";

export { cssVarNameForPath };

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");

// Color keys that never appear as bare :root properties — they only resolve
// through [data-theme] scopes (and @theme inline aliases). Replicates the real
// globals.css, where :root alone was never a complete fallback for these four.
const THEME_ONLY_COLOR_KEYS = new Set([
  "surfaceText",
  "surfaceHover",
  "surfaceActive",
  "surfaceActiveText",
]);

// Every [pathArray, leaf] under obj whose leaf is a {$value, ...} token object.
function collectLeaves(obj, prefix = []) {
  const out = [];
  for (const key of Object.keys(obj ?? {})) {
    const node = obj[key];
    if (node !== null && typeof node === "object" && !("$value" in node)) {
      out.push(...collectLeaves(node, [...prefix, key]));
    } else if (node !== null && typeof node === "object" && "$value" in node) {
      out.push([[...prefix, key], node]);
    }
  }
  return out;
}

// Task 4 §0(a): a component.* leaf whose $value is a direct single reference
// to a theme-varying semantic color (a key present in the dark override
// block) emits a var() alias to that color's own CSS variable instead of a
// resolved literal. The alias re-resolves live, so [data-theme] overrides
// flow through automatically — no per-theme duplication needed. Anything
// else (non-color leaves, theme-invariant colors like accent/onAccent)
// resolves to a literal exactly as before.
function themeVaryingColorRef(leaf, themeVaryingKeys) {
  if (typeof leaf.$value !== "string") return null;
  const m = /^\{\s*semantic\.color\.([A-Za-z0-9_]+)\s*\}$/.exec(leaf.$value);
  if (!m) return null;
  return themeVaryingKeys.has(m[1]) ? m[1] : null;
}

// Read active-brand.json and return the absolute path of that brand's directory.
// Paths resolve from this file's location, never process.cwd(), so the build
// script (Task 3), the API route (Task 5), and tests all get the same answer.
export function resolveBrandDir() {
  const activePath = join(PACKAGE_ROOT, "active-brand.json");
  const parsed = JSON.parse(readFileSync(activePath, "utf8"));
  const brandDir = join(PACKAGE_ROOT, "brands", parsed.brand);
  if (!existsSync(brandDir)) {
    throw new Error(`Unknown brand "${parsed.brand}" (looked for ${brandDir})`);
  }
  return brandDir;
}

// Resolve a specific brand by slug, independent of active-brand.json --
// lets a caller (the editor's brand switcher, Task 1) operate on a brand
// other than the currently active one without touching that file.
export function resolveBrandDirForSlug(slug) {
  const brandDir = join(PACKAGE_ROOT, "brands", slug);
  if (!existsSync(brandDir)) {
    throw new Error(`Unknown brand "${slug}" (looked for ${brandDir})`);
  }
  return brandDir;
}

// Every brand slug (directory name) under brands/, sorted alphabetically.
export function listBrands() {
  return readdirSync(join(PACKAGE_ROOT, "brands"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

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
  const darkColors = tokens.dark?.semantic?.color ?? {};
  const v = (leaf) => String(resolveValue(tokens, leaf.$value));

  // ---- :root ----
  const root = [];
  for (const [path, leaf] of collectLeaves(base.color, ["color"])) {
    const key = path[path.length - 1];
    if (THEME_ONLY_COLOR_KEYS.has(key)) continue;
    root.push(`  ${colorPropName(key)}: ${v(leaf)};`);
  }
  for (const [section, namer] of [
    ["radius", (key) => `--${LEAF_NAME_MAP[`radius.${key}`] ?? `radius-${kebab(key)}`}`],
    ["space", (key) => `--space-${key}`],
    ["layout", (key) => `--${LEAF_NAME_MAP[`layout.${key}`] ?? kebab(key)}`],
    ["state", (key) => `--state-${kebab(key)}`],
    ["focus", (key) => `--focus-${kebab(key)}`],
  ]) {
    for (const [path, leaf] of collectLeaves(base[section], [section])) {
      root.push(`  ${namer(path[path.length - 1])}: ${v(leaf)};`);
    }
  }
  // Component.* blocks (Task 4): --<component>-<token-path>.
  // Leaves referencing a theme-varying semantic color emit a var() alias
  // (§0(a)); everything else resolves to a literal.
  const themeVaryingKeys = new Set(Object.keys(darkColors));
  for (const [path, leaf] of collectLeaves(tokens.component, ["component"])) {
    const name = `--${path.map(kebab).join("-")}`;
    const refKey = themeVaryingColorRef(leaf, themeVaryingKeys);
    root.push(refKey ? `  ${name}: var(${colorPropName(refKey)});` : `  ${name}: ${v(leaf)};`);
  }

  // ---- @theme inline ----
  // Bare color keys (background/foreground) alias their bare name; every
  // other color key self-references its own --color-* property (the Tailwind
  // v4 pattern that keeps [data-theme] overrides flowing into utilities).
  const theme = [];
  // Bare keys first (mirrors globals.css @theme order: background/foreground
  // aliases, then fonts, then the --color-* self-references).
  for (const [path] of collectLeaves(base.color, ["color"])) {
    const key = path[path.length - 1];
    if (BARE_COLOR_KEYS.has(key)) theme.push(`  --color-${key}: var(--${key});`);
  }
  for (const [path, leaf] of collectLeaves(base.typography, ["typography"])) {
    theme.push(`  --font-${kebab(path[path.length - 1])}: ${v(leaf)};`);
  }
  for (const [path] of collectLeaves(base.color, ["color"])) {
    const key = path[path.length - 1];
    if (!BARE_COLOR_KEYS.has(key)) {
      theme.push(`  --color-${kebab(key)}: var(--color-${kebab(key)});`);
    }
  }

  // ---- [data-theme] overrides ----
  // Exactly the keys present in dark data (the varying keys); light values
  // come from base, dark values from the dark block. Theme-invariant keys
  // (accent, onAccent, ...) resolve once in :root and inherit unchanged.
  const block = (lookup) =>
    Object.keys(darkColors).map((key) => {
      const leaf = lookup === "dark" ? darkColors[key] : base.color[key];
      return `  ${colorPropName(key)}: ${v(leaf)};`;
    });

  return (
    `/* Design tokens — auto-generated by build-tokens.mjs. Do not edit directly. */\n` +
    `\n` +
    `:root {\n${root.join("\n")}\n}\n` +
    `\n` +
    `@theme inline {\n${theme.join("\n")}\n}\n` +
    `\n` +
    `[data-theme="light"] {\n${block("light").join("\n")}\n}\n` +
    `\n` +
    `[data-theme="dark"] {\n${block("dark").join("\n")}\n}\n`
  );
}

// Rebuild the active brand's generated CSS on disk. Extracted (Task 5) so
// the token API route can trigger exactly the same build in-process;
// the CLI guard below becomes a thin caller. Behavior is identical either way.
export function buildActiveBrand() {
  const outPath = resolve(HERE, "../../../app/design-tokens.generated.css");
  writeFileSync(outPath, generateCSS(resolveBrandDir()));
  return outPath;
}

// CLI entrypoint (Task 3). Gated behind a main-module check so merely
// importing this file (tests, Task 5's API route) never writes to disk.
// fileURLToPath/resolve comparison — not import.meta.url string-concat — so
// this fires whether argv[1] arrives absolute or relative.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`Generated: ${buildActiveBrand()}`);
}
