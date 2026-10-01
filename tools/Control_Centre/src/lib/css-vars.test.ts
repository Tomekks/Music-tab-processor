import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(full));
    } else if (
      (full.endsWith(".svelte") || full.endsWith(".css")) &&
      !/\.test\.[^.]+$/.test(entry.name) &&
      entry.name !== "design-tokens.generated.css"
    ) {
      out.push(full);
    }
  }
  return out;
}

const VAR_USE = /var\(\s*(--[A-Za-z0-9-_]+)/g;
const DECL = /(--[A-Za-z0-9-_]+)\s*:/g;
const STYLE_BLOCK = /<style>([\s\S]*?)<\/style>/g;
const THEME_BLOCK = /@theme inline \{[^}]*\}/g;

test("every var(--name) used in src is defined outside @theme inline", () => {
  const used = new Set<string>();
  const defined = new Set<string>();
  // design-tokens.css is global: the whole file defines custom properties.
  const tokensCss = readFileSync(join(SRC, "lib", "design-tokens.css"), "utf8");
  for (const m of tokensCss.matchAll(DECL)) defined.add(m[1]);
  for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(VAR_USE)) used.add(m[1]);
    if (file.endsWith(".svelte")) {
      for (const block of text.matchAll(STYLE_BLOCK)) {
        for (const m of block[1].matchAll(DECL)) defined.add(m[1]);
      }
    } else {
      for (const m of text.replace(THEME_BLOCK, "").matchAll(DECL)) defined.add(m[1]);
    }
  }
  // The generated copy is definitions-only: everything outside @theme counts.
  const generated = readFileSync(join(SRC, "lib", "design-tokens.generated.css"), "utf8");
  for (const m of generated.replace(THEME_BLOCK, "").matchAll(DECL)) defined.add(m[1]);
  const undefinedVars = [...used].filter((name) => !defined.has(name)).sort();
  assert.deepEqual(undefinedVars, [], `undefined CSS variables: ${undefinedVars.join(", ")}`);
});
