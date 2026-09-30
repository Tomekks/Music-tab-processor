import test from "node:test";
import assert from "node:assert/strict";
import { nextTheme, resolveTheme, THEME_STORAGE_KEY } from "./theme.ts";

test("stored light or dark wins", () => {
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("dark"), "dark");
});

test("null and junk values give dark", () => {
  assert.equal(resolveTheme(null), "dark");
  assert.equal(resolveTheme("blue"), "dark");
  assert.equal(resolveTheme(""), "dark");
});

test("nextTheme flips both ways", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
});

test("storage key matches the web app", () => {
  assert.equal(THEME_STORAGE_KEY, "guitar-tabs-theme");
});
