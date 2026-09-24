import test from "node:test";
import assert from "node:assert/strict";
import { themeVaryingColorRef } from "./css-var-naming.mjs";

const THEME_VARYING_KEYS = new Set(["surfaceText", "surfaceHover"]);

test("themeVaryingColorRef returns the key for a leaf aliasing a theme-varying semantic color", () => {
  const leaf = { $value: "{semantic.color.surfaceText}", $type: "color" };
  assert.equal(themeVaryingColorRef(leaf, THEME_VARYING_KEYS), "surfaceText");
});

test("themeVaryingColorRef returns null for a literal-valued leaf", () => {
  const leaf = { $value: "#141413", $type: "color" };
  assert.equal(themeVaryingColorRef(leaf, THEME_VARYING_KEYS), null);
});

test("themeVaryingColorRef returns null for a non-color leaf", () => {
  const leaf = { $value: "8px", $type: "dimension" };
  assert.equal(themeVaryingColorRef(leaf, THEME_VARYING_KEYS), null);
});

test("themeVaryingColorRef returns null for an alias to a non-theme-varying key", () => {
  const leaf = { $value: "{semantic.color.accent}", $type: "color" };
  assert.equal(themeVaryingColorRef(leaf, THEME_VARYING_KEYS), null);
});
