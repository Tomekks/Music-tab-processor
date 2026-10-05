import test from "node:test";
import assert from "node:assert/strict";
import { listColorTokens } from "./colorTokens.ts";

const tree = {
  primitive: {
    color: {
      accent: { $value: "#ae97f7", $type: "color" },
    },
  },
  semantic: {
    color: {
      background: { $value: "#e6dfd8", $type: "color", $description: "Base background." },
      accent: { $value: "{primitive.color.accent}", $type: "color" },
    },
    focus: {
      ringColor: { $value: "#111111", $type: "color" },
    },
    radius: {
      base: { $value: "8px", $type: "dimension" },
    },
  },
  component: {
    button: {
      x: { $value: "#ffffff", $type: "color" },
    },
  },
};

test("ignores non-color tokens and everything outside semantic", () => {
  const paths = listColorTokens(tree).map((token) => token.path);
  assert.ok(!paths.includes("semantic.radius.base"));
  assert.ok(!paths.includes("component.button.x"));
  assert.ok(paths.every((path) => path.startsWith("semantic.")));
});

test("resolves references; literals pass through", () => {
  const byPath = Object.fromEntries(listColorTokens(tree).map((token) => [token.path, token]));
  assert.equal(byPath["semantic.color.accent"].value, "#ae97f7");
  assert.equal(byPath["semantic.color.background"].value, "#e6dfd8");
});

test("cssVar matches the package naming", () => {
  const byPath = Object.fromEntries(listColorTokens(tree).map((token) => [token.path, token]));
  assert.equal(byPath["semantic.color.background"].cssVar, "--background");
  assert.equal(byPath["semantic.color.accent"].cssVar, "--color-accent");
  assert.equal(byPath["semantic.focus.ringColor"].cssVar, "--focus-ring-color");
});

test("keeps file order; missing description is an empty string", () => {
  const tokens = listColorTokens(tree);
  assert.deepEqual(
    tokens.map((token) => token.path),
    ["semantic.color.background", "semantic.color.accent", "semantic.focus.ringColor"]
  );
  assert.equal(tokens[0].description, "Base background.");
  assert.equal(tokens[1].description, "");
});

test("dangling reference throws and names the reference", () => {
  const bad = {
    primitive: { color: {} },
    semantic: {
      color: {
        broken: { $value: "{primitive.color.nope}", $type: "color" },
      },
    },
  };
  assert.throws(() => listColorTokens(bad), /primitive\.color\.nope/);
});

test("semantic dependents list component vars that reference them", () => {
  const refTree = {
    semantic: {
      color: {
        accent: { $value: "#ae97f7", $type: "color" },
        background: { $value: "#e6dfd8", $type: "color" },
      },
    },
    component: {
      button: {
        primaryBackground: { $value: "{semantic.color.accent}", $type: "color" },
      },
      iconButton: {
        primaryBackground: { $value: "{semantic.color.accent}", $type: "color" },
      },
    },
  };
  const byPath = Object.fromEntries(listColorTokens(refTree).map((token) => [token.path, token]));
  assert.deepEqual(byPath["semantic.color.accent"].dependents, [
    "--component-button-primary-background",
    "--component-icon-button-primary-background",
  ]);
  assert.deepEqual(byPath["semantic.color.background"].dependents, []);
});

test("each token carries its descriptor section", () => {
  const byPath = Object.fromEntries(listColorTokens(tree).map((token) => [token.path, token]));
  assert.equal(byPath["semantic.color.background"].section, "semantic.color");
  assert.equal(byPath["semantic.focus.ringColor"].section, "semantic.focus");
});

test("alias tokens report isAlias true and literal tokens report false", () => {
  const byPath = Object.fromEntries(listColorTokens(tree).map((token) => [token.path, token]));
  assert.equal(byPath["semantic.color.accent"].isAlias, true);
  assert.equal(byPath["semantic.color.background"].isAlias, false);
});

test("dependents are transitive with no duplicates or cycles", () => {
  const chainTree = {
    semantic: {
      color: {
        a: { $value: "#111111", $type: "color" },
        b: { $value: "{semantic.color.a}", $type: "color" },
        c: { $value: "{semantic.color.b}", $type: "color" },
        d: { $value: "{semantic.color.a}", $type: "color" },
      },
    },
  };
  const byPath = Object.fromEntries(
    listColorTokens(chainTree).map((token) => [token.path, token])
  );
  assert.deepEqual(byPath["semantic.color.a"].dependents, [
    "--color-b",
    "--color-d",
    "--color-c",
  ]);
});
