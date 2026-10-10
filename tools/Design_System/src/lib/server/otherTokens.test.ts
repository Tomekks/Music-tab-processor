import test from "node:test";
import assert from "node:assert/strict";
import { listOtherTokenGroups } from "./otherTokens.ts";

const tree = {
  primitive: {
    color: {
      accent: { $value: "#ae97f7", $type: "color" },
    },
  },
  semantic: {
    color: {
      accent: { $value: "{primitive.color.accent}", $type: "color" },
    },
    space: {
      "1": { $value: "4px", $type: "dimension" },
      "2": { $value: "{semantic.space.1}", $type: "dimension" },
    },
    radius: {
      base: { $value: "8px", $type: "dimension", $description: "Base radius." },
    },
    typography: {
      sans: { $value: "var(--font-geist-sans)", $type: "fontFamily" },
    },
    state: {
      hoverOpacity: { $value: "8%", $type: "percentage" },
    },
    focus: {
      ringWidth: { $value: "2px", $type: "dimension" },
      ringColor: { $value: "#111111", $type: "color" },
    },
    layout: {
      sidebarWidth: { $value: "240px", $type: "dimension" },
    },
  },
  component: {
    button: {
      x: { $value: "8px", $type: "dimension" },
    },
  },
};

test("no color token and no primitive/dark/component path appears", () => {
  const groups = listOtherTokenGroups(tree);
  const paths = groups.flatMap((group) => group.tokens.map((token) => token.path));
  assert.ok(!paths.some((path) => path.includes("color.accent")));
  assert.ok(!paths.includes("semantic.focus.ringColor"));
  assert.ok(paths.every((path) => path.startsWith("semantic.")));
  assert.ok(!paths.some((path) => path.startsWith("primitive.")));
  assert.ok(!paths.some((path) => path.startsWith("dark.")));
  assert.ok(!paths.some((path) => path.startsWith("component.")));
});

test("group order and headings follow the spec", () => {
  const groups = listOtherTokenGroups(tree);
  assert.deepEqual(
    groups.map((group) => group.section),
    [
      "semantic.space",
      "semantic.radius",
      "semantic.typography",
      "semantic.state",
      "semantic.focus",
      "semantic.layout",
    ]
  );
  assert.deepEqual(
    groups.map((group) => group.heading),
    ["Space", "Radius", "Typography", "State opacities", "Focus ring", "Layout"]
  );
  assert.deepEqual(
    groups.map((group) => group.key),
    ["space", "radius", "typography", "state", "focus", "layout"]
  );
});

test("an alias value is resolved while rawValue keeps the braces", () => {
  const groups = listOtherTokenGroups(tree);
  const byPath = Object.fromEntries(
    groups.flatMap((group) => group.tokens.map((token) => [token.path, token]))
  );
  assert.equal(byPath["semantic.space.2"].value, "4px");
  assert.equal(byPath["semantic.space.2"].rawValue, "{semantic.space.1}");
  assert.equal(byPath["semantic.space.2"].isAlias, true);
  assert.equal(byPath["semantic.space.1"].isAlias, false);
  assert.equal(byPath["semantic.space.1"].cssVar, "--space-1");
});

test('missing $description gives ""', () => {
  const groups = listOtherTokenGroups(tree);
  const byPath = Object.fromEntries(
    groups.flatMap((group) => group.tokens.map((token) => [token.path, token]))
  );
  assert.equal(byPath["semantic.radius.base"].description, "Base radius.");
  assert.equal(byPath["semantic.space.1"].description, "");
});

test("a group with no tokens is omitted", () => {
  const sparse = {
    semantic: {
      space: {
        "1": { $value: "4px", $type: "dimension" },
      },
    },
  };
  const groups = listOtherTokenGroups(sparse);
  assert.deepEqual(groups.map((group) => group.section), ["semantic.space"]);
});

test("space tokens come out ascending", () => {
  const spaceTree = {
    semantic: {
      space: {
        "8": { $value: "32px", $type: "dimension" },
        "1": { $value: "4px", $type: "dimension" },
        "2": { $value: "8px", $type: "dimension" },
        "1_5": { $value: "6px", $type: "dimension" },
      },
    },
  };
  const groups = listOtherTokenGroups(spaceTree);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].tokens.map((token) => token.path),
    ["semantic.space.1", "semantic.space.1_5", "semantic.space.2", "semantic.space.8"]
  );
});
