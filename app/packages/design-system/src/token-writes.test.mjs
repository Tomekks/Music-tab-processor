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
  applyReset,
  applyResetAll,
  applySetAsDefault,
} from "./token-writes.mjs";

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

test("VALID_ACTIONS lists exactly the four known actions", () => {
  assert.deepEqual([...VALID_ACTIONS].sort(), ["reset", "reset-all", "set-as-default", "write"]);
});

test("getLeaf resolves a deep leaf", () => {
  assert.deepEqual(getLeaf(tokensTree(), "semantic.color.accent"), {
    $value: "{primitive.color.accent}",
    $type: "color",
  });
});

test("getLeaf returns null for unknown paths and sections", () => {
  assert.equal(getLeaf(tokensTree(), "semantic.color.nope"), null);
  assert.equal(getLeaf(tokensTree(), "semantic.color"), null);
  assert.equal(getLeaf(tokensTree(), ""), null);
  assert.equal(getLeaf(tokensTree(), "semantic..color"), null);
});

test("getLeaf consumes every segment exactly, never trims", () => {
  assert.equal(getLeaf(tokensTree(), "semantic.color.accent.$value"), null);
  assert.equal(getLeaf(tokensTree(), "semantic.color.accent.extra"), null);
  assert.equal(getLeaf(tokensTree(), " semantic.color.accent"), null);
  assert.equal(getLeaf(tokensTree(), 42), null);
  assert.equal(getLeaf(tokensTree(), null), null);
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
  assert.deepEqual(validateWriteValue({ $value: "", $type: "color" }, "#ae97f7"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "color" }, "#fff"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "dimension" }, "12px"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "dimension" }, "-4.5px"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "percentage" }, "8%"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "percentage" }, "0%"), { ok: true });
  assert.deepEqual(validateWriteValue({ $value: "", $type: "percentage" }, "100%"), { ok: true });
});

test("validateWriteValue rejects bad formats, fontFamily, unknown types, non-strings", () => {
  assert.equal(validateWriteValue({ $value: "", $type: "color" }, "blue").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "color" }, "#gggggg").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "color" }, "{semantic.color.accent}").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "dimension" }, "12").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "dimension" }, "12rem").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "percentage" }, "8").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "percentage" }, "150%").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "percentage" }, "-5%").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "fontFamily" }, "Arial").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "number" }, "12").ok, false);
  assert.equal(validateWriteValue({ $value: "", $type: "color" }, 12).ok, false);
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
