import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveValue } from "./resolve.mjs";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(HERE, "..", "brands", "default", "tokens.json"), "utf8"));

function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override ?? {})) {
    out[key] =
      base?.[key] !== null && typeof base?.[key] === "object" && override[key] !== null && typeof override[key] === "object" && !("$value" in override[key])
        ? deepMerge(base[key], override[key])
        : override[key];
  }
  return out;
}

// Task 1 §3 merge rule: dark.semantic.* overlays base semantic.*; anything
// absent from dark resolves from base unchanged.
const lightTree = tokens;
const darkTree = { ...tokens, semantic: deepMerge(tokens.semantic, tokens.dark?.semantic ?? {}) };

const at = (tree, path) => path.split(".").reduce((node, segment) => node[segment], tree).$value;
const hex = (tree, path) => resolveValue(tree, at(tree, path));

function luminance(hexColor) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hexColor.slice(i + 1, i + 3), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS = [
  ["accent/onAccent (theme-invariant)", lightTree, "semantic.color.accent", "semantic.color.onAccent"],
  ["background/foreground (light)", lightTree, "semantic.color.background", "semantic.color.foreground"],
  ["background/foreground (dark)", darkTree, "semantic.color.background", "semantic.color.foreground"],
  ["surface/surfaceText (light)", lightTree, "semantic.color.surface", "semantic.color.surfaceText"],
  ["surface/surfaceText (dark)", darkTree, "semantic.color.surface", "semantic.color.surfaceText"],
  ["surfaceActive/surfaceActiveText (light)", lightTree, "semantic.color.surfaceActive", "semantic.color.surfaceActiveText"],
  ["surfaceActive/surfaceActiveText (dark)", darkTree, "semantic.color.surfaceActive", "semantic.color.surfaceActiveText"],
];

for (const [name, tree, fillPath, textPath] of PAIRS) {
  test(`${name} meets WCAG AA (4.5:1)`, () => {
    const r = ratio(hex(tree, fillPath), hex(tree, textPath));
    assert.ok(r >= 4.5, `${hex(tree, fillPath)} on ${hex(tree, textPath)} is ${r.toFixed(2)}:1, below 4.5:1`);
  });
}
