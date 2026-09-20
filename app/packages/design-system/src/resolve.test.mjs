import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveValue } from "./resolve.mjs";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(HERE, "..", "brands", "default", "tokens.json"), "utf8"));
const leaf = (path) => path.split(".").reduce((node, segment) => node[segment], tokens).$value;

test("multi-hop reference chains fully (focus.ringColor -> semantic accent -> primitive -> literal)", () => {
  assert.equal(resolveValue(tokens, leaf("semantic.focus.ringColor")), "#ae97f7");
});

test("single-hop reference resolves (onAccent -> primitive ink)", () => {
  assert.equal(resolveValue(tokens, leaf("semantic.color.onAccent")), "#141413");
});

test("reference to a missing path throws 'not found'", () => {
  assert.throws(() => resolveValue(tokens, "{semantic.color.nope}"), /Token reference not found: \{semantic\.color\.nope\}/);
});

test("reference to an existing non-token path throws 'does not resolve to a token'", () => {
  assert.throws(() => resolveValue(tokens, "{semantic.color}"), /does not resolve to a token/);
});

test("surrounding whitespace inside braces resolves identically", () => {
  assert.equal(resolveValue(tokens, "{ semantic.color.accent }"), resolveValue(tokens, "{semantic.color.accent}"));
});

test("raw non-reference values pass through unchanged", () => {
  assert.equal(resolveValue(tokens, "#ae97f7"), "#ae97f7");
  assert.equal(resolveValue(tokens, 12), 12);
  assert.equal(resolveValue(tokens, "var(--font-geist-sans)"), "var(--font-geist-sans)");
  assert.equal(resolveValue(tokens, undefined), undefined);
});

test("inherited prototype properties are not resolvable", () => {
  assert.throws(() => resolveValue(tokens, "{constructor}"), /Token reference not found/);
  assert.throws(() => resolveValue(tokens, "{toString}"), /Token reference not found/);
});

test("circular references throw naming the cycle instead of hanging", () => {
  const cyclic = { a: { $value: "{b}" }, b: { $value: "{a}" } };
  assert.throws(() => resolveValue(cyclic, "{a}"), /Circular token reference: a -> b -> a/);
  const self = { a: { $value: "{a}" } };
  assert.throws(() => resolveValue(self, "{a}"), /Circular token reference: a -> a/);
});
