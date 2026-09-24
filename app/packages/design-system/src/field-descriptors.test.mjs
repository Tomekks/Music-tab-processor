import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTIONS,
  buildFieldDescriptors,
  humanize,
} from "./field-descriptors.mjs";

// Fixture shaped like the real schema's section structure (not the real brand
// data — counts here guard the builder's behavior, not the live token inventory).
const tokensTree = () => ({
  semantic: {
    // Deliberately scrambled key order: the builder must emit SECTIONS order.
    space: {
      8: { $value: "32px", $type: "dimension" },
      1: { $value: "4px", $type: "dimension" },
      "1_5": { $value: "6px", $type: "dimension" },
      3: { $value: "12px", $type: "dimension" },
    },
    color: {
      accent: { $value: "{primitive.color.accent}", $type: "color" },
      surface: { $value: "{primitive.color.white}", $type: "color" },
    },
  },
  primitive: {
    color: {
      accent: { $value: "#ae97f7", $type: "color" },
      white: { $value: "#ffffff", $type: "color" },
    },
  },
  component: {
    button: {
      paddingX: { $value: "{semantic.space.3}", $type: "dimension" },
      primaryBackground: { $value: "{semantic.color.accent}", $type: "color" },
    },
  },
  dark: {
    semantic: {
      color: {
        surface: { $value: "#535353", $type: "color" },
      },
    },
  },
});

const defaultsTree = () => ({
  semantic: {
    space: {
      8: { $value: "32px", $type: "dimension" },
      1: { $value: "4px", $type: "dimension" },
      "1_5": { $value: "6px", $type: "dimension" },
      3: { $value: "12px", $type: "dimension" },
    },
    color: {
      accent: { $value: "{primitive.color.accent}", $type: "color" },
      surface: { $value: "{primitive.color.white}", $type: "color" },
    },
  },
  component: {
    button: {
      paddingX: { $value: "{semantic.space.3}", $type: "dimension" },
      primaryBackground: { $value: "{semantic.color.accent}", $type: "color" },
    },
  },
});

test("humanize renders labels the spec's way", () => {
  assert.equal(humanize("primaryBackground"), "Primary background");
  assert.equal(humanize("1_5"), "1.5");
  assert.equal(humanize("swatchSize"), "Swatch size");
});

test("humanize converts a kebab-case brand slug to a spaced label", () => {
  assert.equal(humanize("demo-child"), "Demo child");
  assert.equal(humanize("default"), "Default");
});

test("SECTIONS lists 11 keys with the Components umbrella last", () => {
  assert.equal(SECTIONS.length, 11);
  assert.deepEqual(
    SECTIONS.map((s) => s.key),
    [
      "semantic.color",
      "semantic.radius",
      "semantic.space",
      "semantic.typography",
      "semantic.state",
      "semantic.focus",
      "semantic.layout",
      "component.colorField",
      "component.slider",
      "component.segmentedControl",
      "component.button",
    ],
  );
  assert.deepEqual(
    SECTIONS.filter((s) => s.group).map((s) => s.key),
    ["component.colorField", "component.slider", "component.segmentedControl", "component.button"],
  );
});

test("sections emit in SECTIONS order regardless of fixture key order", () => {
  const sections = buildFieldDescriptors(tokensTree(), defaultsTree()).map((f) => f.section);
  const order = [...new Set(sections)];
  assert.deepEqual(order, ["semantic.color", "semantic.space", "component.button"]);
});

test("numeric fields sort by resolved value ascending within a section", () => {
  const fields = buildFieldDescriptors(tokensTree(), defaultsTree());
  const space = fields.filter((f) => f.section === "semantic.space");
  assert.deepEqual(
    space.map((f) => f.value),
    ["4px", "6px", "12px", "32px"],
  );
});

test("primitive.* and dark.* never appear in the output", () => {
  const paths = buildFieldDescriptors(tokensTree(), defaultsTree()).map((f) => f.path);
  assert.ok(paths.every((p) => !p.startsWith("primitive.") && !p.startsWith("dark.")));
});

test("isModified compares raw values, isAlias detects references", () => {
  const tokens = tokensTree();
  tokens.semantic.color.surface.$value = "#000000";
  const fields = buildFieldDescriptors(tokens, defaultsTree());
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  assert.equal(byPath["semantic.color.surface"].isModified, true);
  assert.equal(byPath["semantic.color.surface"].isAlias, false);
  assert.equal(byPath["semantic.color.surface"].value, "#000000");
  assert.equal(byPath["semantic.color.accent"].isModified, false);
  // Default itself an alias, live value a literal override of the same target.
  assert.equal(byPath["component.button.primaryBackground"].isAlias, true);
});

test("resolved values follow live references, defaults resolve against defaults", () => {
  const tokens = tokensTree();
  tokens.semantic.color.accent.$value = "{primitive.color.white}";
  const fields = buildFieldDescriptors(tokens, defaultsTree());
  const accent = fields.find((f) => f.path === "semantic.color.accent");
  assert.equal(accent.value, "#ffffff");
  assert.equal(accent.isModified, true);
  assert.equal(accent.isAlias, true);
  assert.equal(accent.rawValue, "{primitive.color.white}");
});

test("unknown top-level branches throw loudly instead of rendering or vanishing", () => {
  const tokens = tokensTree();
  tokens.experimental = { foo: { $value: "1px", $type: "dimension" } };
  assert.throws(() => buildFieldDescriptors(tokens, defaultsTree()), /Unknown token section/);
});

// Sparse child-brand own tree: only what this brand overrides.
const ownTree = () => ({
  semantic: {
    color: {
      surface: { $value: "#000000", $type: "color" },
    },
  },
});

test("ownTree marks present leaves overridden and absent leaves inherited", () => {
  const fields = buildFieldDescriptors(tokensTree(), defaultsTree(), ownTree());
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  assert.equal(byPath["semantic.color.surface"].isInheritedFromParent, false);
  assert.equal(byPath["semantic.color.accent"].isInheritedFromParent, true);
  assert.equal(
    byPath["component.button.primaryBackground"].isInheritedFromParent,
    true,
  );
});

test("ownTree forces isModified false even where raw values differ", () => {
  const fields = buildFieldDescriptors(tokensTree(), defaultsTree(), ownTree());
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  // surface's own raw ("#000000") differs from the defaults raw — still not
  // "modified": there is no child-level defaults file to differ from.
  assert.equal(byPath["semantic.color.surface"].isModified, false);
  assert.equal(byPath["semantic.color.accent"].isModified, false);
});

test("a leaf with a dark counterpart carries a populated dark field", () => {
  const fields = buildFieldDescriptors(tokensTree(), defaultsTree());
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  const surface = byPath["semantic.color.surface"];
  assert.ok(surface.dark);
  assert.equal(surface.dark.path, "dark.semantic.color.surface");
  assert.equal(surface.dark.value, "#535353");
  assert.equal(surface.dark.rawValue, "#535353");
  assert.equal(surface.dark.isAlias, false);
  // defaultsTree() has no dark block at all -- absent default means modified,
  // same "no comparison target" rule the base leaf already follows.
  assert.equal(surface.dark.isModified, true);
});

test("a leaf with no dark counterpart has dark undefined", () => {
  const fields = buildFieldDescriptors(tokensTree(), defaultsTree());
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  assert.equal(byPath["semantic.color.accent"].dark, undefined);
});

test("dark attachment matches by full path, not by leaf name", () => {
  // component.button.primaryBackground and semantic.color.surface both end in
  // a leaf name that isn't "surface" for the button one -- the real guard
  // here is that a dark.* leaf only attaches to the light leaf at the exact
  // same path, never by matching the last segment alone.
  const tokens = tokensTree();
  const fields = buildFieldDescriptors(tokens, defaultsTree());
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  assert.equal(byPath["component.button.primaryBackground"].dark, undefined);
  assert.equal(byPath["semantic.space.1_5"].dark, undefined);
});

test("without ownTree every leaf is root-brand shaped", () => {
  const fields = buildFieldDescriptors(tokensTree(), defaultsTree());
  assert.ok(fields.every((f) => f.isInheritedFromParent === false));
  const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
  assert.equal(byPath["semantic.color.surface"].isModified, false);
  const edited = tokensTree();
  edited.semantic.color.surface.$value = "#000000";
  const editedFields = buildFieldDescriptors(edited, defaultsTree());
  assert.equal(
    editedFields.find((f) => f.path === "semantic.color.surface").isModified,
    true,
  );
});
