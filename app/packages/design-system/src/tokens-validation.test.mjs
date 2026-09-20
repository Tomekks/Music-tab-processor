import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = join(HERE, "..", "brands", "default");
const KNOWN_TYPES = new Set(["color", "dimension", "number", "fontFamily"]);

// Every dot-joined path terminating in a {$value, $type} leaf.
function leafPaths(obj, prefix = []) {
  const out = [];
  for (const key of Object.keys(obj)) {
    const node = obj[key];
    if (node !== null && typeof node === "object" && !("$value" in node)) {
      out.push(...leafPaths(node, [...prefix, key]));
    } else if (node !== null && typeof node === "object" && "$value" in node) {
      out.push({ path: [...prefix, key].join("."), leaf: node });
    }
  }
  return out;
}

const live = JSON.parse(readFileSync(join(BRAND_DIR, "tokens.json"), "utf8"));
const factory = JSON.parse(readFileSync(join(BRAND_DIR, "tokens.default.json"), "utf8"));

test("tokens.json and tokens.default.json contain the same token paths", () => {
  const livePaths = new Set(leafPaths(live).map((e) => e.path));
  const factoryPaths = new Set(leafPaths(factory).map((e) => e.path));
  assert.deepEqual(
    [...livePaths].sort(),
    [...factoryPaths].sort(),
    "per-field reset is only safe when both files share every path",
  );
});

for (const [name, tree] of [["tokens.json", live], ["tokens.default.json", factory]]) {
  test(`${name}: every leaf has $value and a known $type`, () => {
    for (const { path, leaf } of leafPaths(tree)) {
      assert.ok("$value" in leaf, `${path} is missing $value`);
      assert.ok(KNOWN_TYPES.has(leaf.$type), `${path} has unknown $type ${JSON.stringify(leaf.$type)}`);
    }
  });
}
