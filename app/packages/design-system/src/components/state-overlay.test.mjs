import test from "node:test";
import assert from "node:assert/strict";
import { stateOverlayClassName } from "./state-overlay.mjs";

test("stateOverlayClassName(hover) matches Button's original PRIMARY_HOVER string exactly", () => {
  assert.equal(
    stateOverlayClassName("hover", "--state-hover-opacity"),
    "hover:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-hover-opacity)),var(--color-on-accent)_var(--state-hover-opacity))]",
  );
});

test("stateOverlayClassName(active) builds the pressed overlay with a different opacity token", () => {
  assert.equal(
    stateOverlayClassName("active", "--state-pressed-opacity"),
    "active:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-pressed-opacity)),var(--color-on-accent)_var(--state-pressed-opacity))]",
  );
});

test("stateOverlayClassName accepts a custom base/overlay color pair", () => {
  assert.equal(
    stateOverlayClassName("hover", "--state-hover-opacity", "--color-foo", "--color-bar"),
    "hover:[background-color:color-mix(in_srgb,var(--color-foo)_calc(100%_-_var(--state-hover-opacity)),var(--color-bar)_var(--state-hover-opacity))]",
  );
});
