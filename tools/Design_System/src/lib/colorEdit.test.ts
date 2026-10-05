import test from "node:test";
import assert from "node:assert/strict";
import { normalizeColor } from "./colorEdit.ts";

test("colorEdit: lowercase hex passes through unchanged", () => {
  assert.equal(normalizeColor("#ff0000"), "#ff0000");
});

test("colorEdit: names, rgb() and short hex normalise to lowercase #rrggbb", () => {
  assert.equal(normalizeColor("red"), "#ff0000");
  assert.equal(normalizeColor("rgb(255, 0, 0)"), "#ff0000");
  assert.equal(normalizeColor("#F00"), "#ff0000");
  assert.equal(normalizeColor("  #FF0000  "), "#ff0000");
});

test("colorEdit: invalid input returns null (caller keeps the old value)", () => {
  assert.equal(normalizeColor("not-a-color"), null);
  assert.equal(normalizeColor("#gggggg"), null);
});

test("colorEdit: empty or whitespace returns null", () => {
  assert.equal(normalizeColor(""), null);
  assert.equal(normalizeColor("   "), null);
});
