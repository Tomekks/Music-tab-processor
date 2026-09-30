import test from "node:test";
import assert from "node:assert/strict";
import { nextTheme, resolveTheme, THEME_STORAGE_KEY } from "./theme.ts";

test("stored light or dark wins over the system", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("light", false), "light");
  assert.equal(resolveTheme("dark", true), "dark");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("null and junk values follow the system", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("blue", true), "dark");
  assert.equal(resolveTheme("", false), "light");
});

test("nextTheme flips both ways", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
});

test("storage key matches the web app", () => {
  assert.equal(THEME_STORAGE_KEY, "guitar-tabs-theme");
});
