import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  VALID_ACTIONS,
  getLeaf,
  collectLeafPaths,
  validateWriteValue,
  stringifyTokens,
  applyWrite,
  applyBatchWrite,
  applyReset,
  applyResetAll,
  applySetAsDefault,
  applyResetToParent,
  applyGenerateFromSeed,
} from "./token-writes.mjs";
import { deepMerge } from "./deep-merge.mjs";
import { generateNeutralRamp, generateAccentPair } from "./generate-ramp.mjs";

// Small fixture trees — not the real brand data, so these tests stay fast
// and isolated from unrelated future schema changes.
const tokensTree = () => ({
  semantic: {
    color: {
      accent: { $value: "{primitive.color.accent}", $type: "color" },
      surface: { $value: "#ffffff", $type: "color" },
    },
    state: {
      hoverOpacity: { $value: "8%", $type: "percentage" },
    },
    typography: {
      sans: { $value: "var(--font-geist-sans)", $type: "fontFamily" },
    },
  },
  component: {
    button: {
      primaryBackground: { $value: "{semantic.color.accent}", $type: "color" },
    },
  },
});

const defaultsTree = () => ({
  semantic: {
    color: {
      accent: { $value: "{primitive.color.accent}", $type: "color" },
      surface: { $value: "#ffffff", $type: "color" },
    },
    state: {
      hoverOpacity: { $value: "8%", $type: "percentage" },
    },
    typography: {
      sans: { $value: "var(--font-geist-sans)", $type: "fontFamily" },
    },
  },
  component: {
    button: {
      primaryBackground: { $value: "{semantic.color.accent}", $type: "color" },
    },
  },
});

test("VALID_ACTIONS lists exactly the seven known actions", () => {
  assert.deepEqual(
    [...VALID_ACTIONS].sort(),
    ["batch-write", "generate-from-seed", "reset", "reset-all", "reset-to-parent", "set-as-default", "write"],
  );
});

test("getLeaf resolves a deep leaf", () => {
  assert.deepEqual(getLeaf(tokensTree(), "semantic.color.accent"), {
    $value: "{primitive.color.accent}",
    $type: "color",
  });
});

test("getLeaf returns null for each distinct miss case", () => {
  assert.equal(getLeaf(tokensTree(), "semantic.color.nope"), null, "unknown key");
  assert.equal(getLeaf(tokensTree(), "semantic.color"), null, "stops at a non-leaf node");
  assert.equal(getLeaf(tokensTree(), "semantic.color.accent.extra"), null, "extra segment past a leaf");
  assert.equal(getLeaf(tokensTree(), 42), null, "non-string path");
});

test("collectLeafPaths enumerates dot-joined leaf paths", () => {
  const paths = collectLeafPaths(tokensTree()).map((e) => e.path).sort();
  assert.deepEqual(paths, [
    "component.button.primaryBackground",
    "semantic.color.accent",
    "semantic.color.surface",
    "semantic.state.hoverOpacity",
    "semantic.typography.sans",
  ]);
});

test("validateWriteValue accepts valid formats per $type", () => {
  // Both hex lengths kept -- COLOR_RE has a real 3-digit/6-digit alternation, not just one pattern.
  assert.deepEqual(validateWriteValue({ $value: "", $type: "color" }, "#ae97f7"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "color" }, "#fff"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "dimension" }, "-4.5px"), { ok: true });
  // Both range boundaries kept -- they exercise the >=0 and <=100 comparisons directly.
  assert.deepEqual(validateWriteValue({ $value: "", $type: "percentage" }, "0%"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "percentage" }, "100%"), { ok: true });
});

test("validateWriteValue rejects bad formats, fontFamily, unknown types, non-strings", () => {
  assert.equal(validateWriteValue({ $value: "", $type: "color" }, "blue").ok, false, "regex mismatch");
  assert.equal(validateWriteValue({ $value: "", $type: "dimension" }, "12").ok, false, "regex mismatch");
  assert.equal(validateWriteValue({ $value: "", $type: "percentage" }, "8").ok, false, "regex mismatch (no %)");
  assert.equal(validateWriteValue({ $value: "", $type: "percentage" }, "150%").ok, false, "out of range");
  assert.equal(validateWriteValue({ $value: "", $type: "fontFamily" }, "Arial").ok, false, "read-only type");
  assert.equal(validateWriteValue({ $value: "", $type: "number" }, "12").ok, false, "unsupported type");
  assert.equal(validateWriteValue({ $value: "", $type: "color" }, 12).ok, false, "non-string value");
});

test("stringifyTokens keeps leaves on one line in committed style", () => {
  const out = stringifyTokens({
    semantic: { color: { accent: { $value: "#ae97f7", $type: "color" } } },
  });
  assert.equal(
    out,
    '{\n  "semantic": {\n    "color": {\n      "accent": { "$value": "#ae97f7", "$type": "color" }\n    }\n  }\n}\n',
  );
  assert.match(out, /\{ "\$value": "#ae97f7", "\$type": "color" \}/);
  assert.doesNotMatch(out, /\{\n\s*"\$value"/);
});

test("applyWrite replaces a reference with a literal without mutating the input", () => {
  const before = tokensTree();
  const snapshot = structuredClone(before);
  const result = applyWrite(before, "component.button.primaryBackground", "#000000");
  assert.equal(result.ok, true);
  assert.equal(result.tokens.component.button.primaryBackground.$value, "#000000");
  assert.deepEqual(before, snapshot);
});

test("applyWrite rejects unknown paths and bad values", () => {
  assert.deepEqual(applyWrite(tokensTree(), "semantic.nope", "#000000"), {
    ok: false,
    status: 400,
    error: '"semantic.nope" is not a known token path',
  });
  const bad = applyWrite(tokensTree(), "semantic.color.surface", "blue");
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 400);
});

test("applyReset copies the default value verbatim, references included", () => {
  const edited = tokensTree();
  edited.component.button.primaryBackground.$value = "#000000";
  const result = applyReset(edited, defaultsTree(), "component.button.primaryBackground");
  assert.equal(result.ok, true);
  assert.equal(result.tokens.component.button.primaryBackground.$value, "{semantic.color.accent}");
  assert.deepEqual(edited.component.button.primaryBackground.$value, "#000000");
});

test("applyReset 400s when the path is missing from either file", () => {
  const tokens = tokensTree();
  const defaults = defaultsTree();
  delete defaults.semantic.color.surface;
  const r1 = applyReset(tokens, defaults, "semantic.color.surface");
  assert.equal(r1.ok, false);
  assert.equal(r1.status, 400);
  assert.match(r1.error, /tokens\.default\.json/);
  const r2 = applyReset(defaults, tokens, "semantic.color.surface");
  assert.equal(r2.ok, false);
  assert.match(r2.error, /tokens\.json/);
});

test("applyResetAll resets only differing leaves and reports their paths", () => {
  const edited = tokensTree();
  edited.semantic.color.surface.$value = "#000000";
  edited.semantic.state.hoverOpacity.$value = "20%";
  const result = applyResetAll(edited, defaultsTree());
  assert.equal(result.ok, true);
  assert.deepEqual(result.reset.sort(), ["semantic.color.surface", "semantic.state.hoverOpacity"]);
  assert.equal(result.tokens.semantic.color.surface.$value, "#ffffff");
  assert.equal(result.tokens.semantic.state.hoverOpacity.$value, "8%");
});

test("applyResetAll with no differences still succeeds with an empty list", () => {
  const result = applyResetAll(tokensTree(), defaultsTree());
  assert.deepEqual(result, { ok: true, tokens: tokensTree(), reset: [] });
});

test("applyResetAll 400s naming an orphan path missing from defaults", () => {
  const tokens = tokensTree();
  const defaults = defaultsTree();
  delete defaults.component.button.primaryBackground;
  const result = applyResetAll(tokens, defaults);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /component\.button\.primaryBackground/);
  assert.match(result.error, /tokens\.default\.json/);
});

test("applySetAsDefault writes only the defaults tree", () => {
  const tokens = tokensTree();
  tokens.semantic.color.surface.$value = "#000000";
  const defaults = defaultsTree();
  const result = applySetAsDefault(tokens, defaults, "semantic.color.surface");
  assert.equal(result.ok, true);
  assert.equal(result.defaults.semantic.color.surface.$value, "#000000");
  assert.ok(!("tokens" in result));
  assert.equal(defaults.semantic.color.surface.$value, "#ffffff");
});

test("tempfile round-trip: no-op transform is byte-identical", () => {
  const dir = mkdtempSync(join(tmpdir(), "token-writes-test-"));
  const file = join(dir, "tokens.json");
  const first = stringifyTokens(tokensTree());
  writeFileSync(file, first, "utf8");
  const readBack = JSON.parse(readFileSync(file, "utf8"));
  const second = stringifyTokens(structuredClone(readBack));
  writeFileSync(file, second, "utf8");
  assert.equal(readFileSync(file, "utf8"), first);
});

// A child brand's OWN tokens.json -- sparse, only the leaves it overrides.
const childTree = () => ({
  semantic: {
    color: {
      accent: { $value: "#4a90d9", $type: "color" },
    },
  },
});

test("applyResetToParent deletes the leaf, not copies a value", () => {
  const before = childTree();
  const snapshot = structuredClone(before);
  const result = applyResetToParent(before, "semantic.color.accent");
  assert.equal(result.ok, true);
  assert.equal(getLeaf(result.tokens, "semantic.color.accent"), null);
  assert.deepEqual(before, snapshot, "input not mutated");
});

test("applyResetToParent prunes now-empty ancestor objects", () => {
  const result = applyResetToParent(childTree(), "semantic.color.accent");
  assert.equal(result.ok, true);
  assert.deepEqual(result.tokens, {}, "no empty semantic/color scaffolding left behind");
});

test("applyResetToParent leaves sibling overrides untouched when pruning", () => {
  const tree = childTree();
  tree.semantic.color.border = { $value: "#000000", $type: "color" };
  const result = applyResetToParent(tree, "semantic.color.accent");
  assert.equal(result.ok, true);
  assert.deepEqual(result.tokens, {
    semantic: { color: { border: { $value: "#000000", $type: "color" } } },
  });
});

test("applyResetToParent 400s when the path isn't overridden in this brand (already inherited)", () => {
  const result = applyResetToParent(childTree(), "semantic.color.border");
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /semantic\.color\.border/);
});

test("applyResetToParent's result, re-merged with the parent, falls back to the parent's current value -- proving delete (not copy) actually keeps inheriting", () => {
  const parentTree = tokensTree(); // has its own semantic.color.accent
  const child = childTree(); // overrides semantic.color.accent to #4a90d9
  const beforeMerge = deepMerge(parentTree, child);
  assert.equal(beforeMerge.semantic.color.accent.$value, "#4a90d9", "override wins pre-reset");

  const result = applyResetToParent(child, "semantic.color.accent");
  const afterMerge = deepMerge(parentTree, result.tokens);
  assert.equal(
    afterMerge.semantic.color.accent.$value,
    parentTree.semantic.color.accent.$value,
    "post-reset, the merged tree reads the PARENT's live value, not a frozen copy",
  );
});

// Full default-brand-shaped color leaf set for applyGenerateFromSeed -- the
// small tokensTree() fixture above only has 2 color leaves and no dark block,
// so it cannot exercise a function that writes all 18 paths.
const NEUTRAL_SEED_KEYS = [
  "background", "foreground", "border", "surface",
  "surfaceText", "surfaceHover", "surfaceActive", "surfaceActiveText",
];

const seedTree = () => {
  const leaf = { $value: "#000000", $type: "color" };
  const block = (keys) => Object.fromEntries(keys.map((k) => [k, { ...leaf }]));
  return {
    semantic: {
      color: {
        ...block(NEUTRAL_SEED_KEYS),
        accent: { ...leaf },
        onAccent: { ...leaf },
      },
    },
    dark: { semantic: { color: block(NEUTRAL_SEED_KEYS) } },
  };
};

test("applyGenerateFromSeed populates all 18 color leaves from two seeds", () => {
  const result = applyGenerateFromSeed(seedTree(), "#faf9f5", "#ae97f7");
  assert.equal(result.ok, true);
  const ramp = generateNeutralRamp("#faf9f5");
  const pair = generateAccentPair("#ae97f7");
  for (const key of NEUTRAL_SEED_KEYS) {
    assert.equal(getLeaf(result.tokens, `semantic.color.${key}`).$value, ramp.light[key]);
    assert.equal(getLeaf(result.tokens, `dark.semantic.color.${key}`).$value, ramp.dark[key]);
  }
  assert.equal(getLeaf(result.tokens, "semantic.color.accent").$value, pair.accent);
  assert.equal(getLeaf(result.tokens, "semantic.color.onAccent").$value, pair.onAccent);
});

test("applyGenerateFromSeed 400s on non-6-digit seeds (including valid-but-short #fff)", () => {
  for (const [neutral, accent] of [
    ["#fff", "#ae97f7"],
    ["#faf9f5", "#fff"],
    ["blue", "#ae97f7"],
    ["#faf9f5", "{semantic.color.accent}"],
  ]) {
    const result = applyGenerateFromSeed(seedTree(), neutral, accent);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
});

test("applyGenerateFromSeed 400s naming the first missing path on a sparse tree", () => {
  const sparse = seedTree();
  delete sparse.dark.semantic.color.surface;
  const result = applyGenerateFromSeed(sparse, "#faf9f5", "#ae97f7");
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /dark\.semantic\.color\.surface/);
});

test("applyGenerateFromSeed does not mutate the input tree", () => {
  const before = seedTree();
  const snapshot = structuredClone(before);
  const result = applyGenerateFromSeed(before, "#faf9f5", "#ae97f7");
  assert.equal(result.ok, true);
  assert.deepEqual(before, snapshot);
});

test("applyBatchWrite applies every edit in an all-valid batch in one call", () => {
  const result = applyBatchWrite(tokensTree(), [
    { path: "semantic.color.surface", value: "#000000", scope: "exception" },
    { path: "semantic.state.hoverOpacity", value: "50%", scope: "exception" },
  ]);
  assert.equal(result.ok, true);
  assert.equal(getLeaf(result.tokens, "semantic.color.surface").$value, "#000000");
  assert.equal(getLeaf(result.tokens, "semantic.state.hoverOpacity").$value, "50%");
});

test("applyBatchWrite with one invalid edit applies none of them", () => {
  const before = tokensTree();
  const snapshot = structuredClone(before);
  const result = applyBatchWrite(before, [
    { path: "semantic.color.surface", value: "#000000", scope: "exception" },
    { path: "semantic.nope", value: "#000000", scope: "exception" },
    { path: "semantic.state.hoverOpacity", value: "50%", scope: "exception" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /index 1/);
  assert.equal("tokens" in result, false);
  assert.deepEqual(before, snapshot);
});

test("applyBatchWrite resolves a brand-scoped edit to the alias target", () => {
  const result = applyBatchWrite(tokensTree(), [
    { path: "component.button.primaryBackground", value: "#123456", scope: "brand" },
  ]);
  assert.equal(result.ok, true);
  assert.equal(getLeaf(result.tokens, "semantic.color.accent").$value, "#123456");
  assert.equal(
    getLeaf(result.tokens, "component.button.primaryBackground").$value,
    "{semantic.color.accent}",
  );
});

test("applyBatchWrite fails a brand-scoped edit on a non-alias leaf", () => {
  const result = applyBatchWrite(tokensTree(), [
    { path: "semantic.color.surface", value: "#123456", scope: "brand" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /semantic\.color\.surface/);
});

test("applyBatchWrite rejects an empty edits array", () => {
  for (const bad of [[], "nope", null]) {
    const result = applyBatchWrite(tokensTree(), bad);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  }
});

test("applyBatchWrite lets the last of two same-target edits win", () => {
  const result = applyBatchWrite(tokensTree(), [
    { path: "semantic.color.surface", value: "#111111", scope: "exception" },
    { path: "semantic.color.surface", value: "#222222", scope: "exception" },
  ]);
  assert.equal(result.ok, true);
  assert.equal(getLeaf(result.tokens, "semantic.color.surface").$value, "#222222");
});

test("applyBatchWrite rejects non-object edits elements with 400, not 500", () => {
  for (const badEdit of [null, "semantic.color.surface", 42]) {
    const result = applyBatchWrite(tokensTree(), [badEdit]);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.match(result.error, /index 0/);
  }
});

// Sparse child-brand own tree: only what this brand overrides.
const ownTree = () => ({
  semantic: {
    color: {
      surface: { $value: "#000000", $type: "color" },
    },
  },
});

test("applyWrite with ownTree creates a missing leaf with the merged $type", () => {
  const mergedSnapshot = structuredClone(tokensTree());
  const ownSnapshot = structuredClone(ownTree());
  const result = applyWrite(
    tokensTree(),
    "component.button.primaryBackground",
    "#123456",
    ownTree(),
  );
  assert.equal(result.ok, true);
  // Created in the OWN tree (which had no component branch at all) ...
  assert.equal(
    getLeaf(result.tokens, "component.button.primaryBackground").$value,
    "#123456",
  );
  assert.equal(
    getLeaf(result.tokens, "component.button.primaryBackground").$type,
    "color",
  );
  // ... and neither input tree was mutated.
  assert.deepEqual(tokensTree(), mergedSnapshot);
  assert.deepEqual(ownTree(), ownSnapshot);
});

test("applyWrite with ownTree on an existing own path matches the 3-arg call", () => {
  const viaOwn = applyWrite(
    tokensTree(),
    "semantic.color.surface",
    "#123456",
    ownTree(),
  );
  const direct = applyWrite(ownTree(), "semantic.color.surface", "#123456");
  assert.equal(viaOwn.ok, true);
  assert.deepEqual(viaOwn.tokens, direct.tokens);
});

test("applyBatchWrite with ownTree creates a brand target missing from own", () => {
  const result = applyBatchWrite(
    tokensTree(),
    [
      { path: "component.button.primaryBackground", value: "#123456", scope: "brand" },
    ],
    ownTree(),
  );
  assert.equal(result.ok, true);
  // The alias target is created in the own tree ...
  assert.equal(getLeaf(result.tokens, "semantic.color.accent").$value, "#123456");
  assert.equal(getLeaf(result.tokens, "semantic.color.accent").$type, "color");
  // ... while the originating path is left untouched there.
  assert.equal(getLeaf(result.tokens, "component.button.primaryBackground"), null);
});

test("applyWrite with ownTree 400s on a malformed own tree instead of overwriting", () => {
  const malformed = { semantic: "nope" };
  const result = applyWrite(tokensTree(), "semantic.color.surface", "#123456", malformed);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /unexpected existing value/);
  assert.deepEqual(malformed, { semantic: "nope" });
});
