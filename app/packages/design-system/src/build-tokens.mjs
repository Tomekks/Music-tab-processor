// Token build: tokens.json -> CSS custom properties.
// Generic leaf-walker with a small exception map (see below), not a hardcoded
// template — new leaves inside known sections (and future `component.*`
// blocks, Task 4) emit correctly without rewriting this file.
//
// Replicates app/app/globals.css's existing structure exactly, including its
// bare-vs-prefixed inconsistency (background/foreground are bare, everything
// else is --color- prefixed) and radius.base -> --radius /
// layout.sidebarWidth -> --sidebar-width. Task 4 extends the exception map in
// the one marked place; nothing else in this file should need to change.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveValue } from "./resolve.mjs";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");

// Color keys that keep their bare CSS name instead of gaining a --color- prefix.
// This is globals.css's real, provably-not-derivable inconsistency, not a guess.
const BARE_COLOR_KEYS = new Set(["background", "foreground"]);

// Color keys that never appear as bare :root properties — they only resolve
// through [data-theme] scopes (and @theme inline aliases). Replicates the real
// globals.css, where :root alone was never a complete fallback for these four.
const THEME_ONLY_COLOR_KEYS = new Set([
  "surfaceText",
  "surfaceHover",
  "surfaceActive",
  "surfaceActiveText",
]);

// One-off leaf renames. Task 4: extend here, nowhere else.
const LEAF_NAME_MAP = {
  "radius.base": "radius",
  "layout.sidebarWidth": "sidebar-width",
};

function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

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

function colorPropName(key) {
  return BARE_COLOR_KEYS.has(key) ? `--${key}` : `--color-${kebab(key)}`;
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

export function generateCSS(brandDir) {
  const tokens = JSON.parse(readFileSync(join(brandDir, "tokens.json"), "utf8"));
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
  // Future component.* blocks (Task 4): --<component>-<token-path>.
  for (const [path, leaf] of collectLeaves(tokens.component, ["component"])) {
    root.push(`  --${path.map(kebab).join("-")}: ${v(leaf)};`);
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
