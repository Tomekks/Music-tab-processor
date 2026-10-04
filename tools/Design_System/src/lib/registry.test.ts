import test from "node:test";
import assert from "node:assert/strict";
import { COMPONENTS, findComponent } from "./registry.ts";

test("COMPONENTS has exactly the five names in order", () => {
  assert.deepEqual(
    COMPONENTS.map((entry) => entry.name),
    ["Button", "Color Field", "Icon Button", "Segmented Control", "Slider"]
  );
});

test("slugs are unique", () => {
  const slugs = COMPONENTS.map((entry) => entry.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('findComponent("button") returns Button and findComponent("nope") is undefined', () => {
  assert.deepEqual(findComponent("button"), { slug: "button", name: "Button" });
  assert.equal(findComponent("nope"), undefined);
});
