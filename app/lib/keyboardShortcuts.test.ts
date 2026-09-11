import test from "node:test";
import assert from "node:assert/strict";
import { isEditableTarget } from "./keyboardShortcuts.ts";

test("isEditableTarget: null target is never editable", () => {
  assert.equal(isEditableTarget(null), false);
});

test("isEditableTarget: input, textarea, and select all count as editable", () => {
  assert.equal(isEditableTarget({ tagName: "INPUT" }), true);
  assert.equal(isEditableTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isEditableTarget({ tagName: "SELECT" }), true);
});

test("isEditableTarget: a contentEditable element counts even with an unrelated tag", () => {
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true }), true);
});

test("isEditableTarget: a plain button or div is not editable", () => {
  assert.equal(isEditableTarget({ tagName: "BUTTON" }), false);
  assert.equal(isEditableTarget({ tagName: "DIV" }), false);
});
