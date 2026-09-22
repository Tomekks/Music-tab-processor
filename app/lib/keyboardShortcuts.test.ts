import test from "node:test";
import assert from "node:assert/strict";
import {
  isEditableTarget,
  TRANSPORT_SHORTCUTS,
  shouldHandleKey,
  matchTransportShortcut,
} from "./keyboardShortcuts.ts";

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

// Spec 1+4: TRANSPORT_SHORTCUTS is the single truth table. Arrows match by
// key, Space matches by code (layout-independent -- hence no key field).

test("TRANSPORT_SHORTCUTS: exactly the three pinned actions", () => {
  assert.deepEqual(
    TRANSPORT_SHORTCUTS.map((s) => s.action),
    ["step-back", "step-forward", "toggle-play"],
  );
});

test("TRANSPORT_SHORTCUTS: arrows carry key, Space carries code only", () => {
  const byAction = Object.fromEntries(TRANSPORT_SHORTCUTS.map((s) => [s.action, s]));
  assert.equal(byAction["step-back"].key, "ArrowLeft");
  assert.equal(byAction["step-forward"].key, "ArrowRight");
  assert.equal(byAction["toggle-play"].code, "Space");
  assert.equal(byAction["toggle-play"].key, undefined);
});

test("TRANSPORT_SHORTCUTS: every entry has kbd glyphs and a label", () => {
  for (const s of TRANSPORT_SHORTCUTS) {
    assert.ok(s.kbd.length > 0, `${s.action} needs kbd glyphs`);
    assert.ok(s.label.length > 0, `${s.action} needs a label`);
  }
});

test("matchTransportShortcut: arrows by key, Space by code, nothing else", () => {
  assert.equal(matchTransportShortcut({ key: "ArrowLeft", code: "ArrowLeft" })?.action, "step-back");
  assert.equal(matchTransportShortcut({ key: "ArrowRight", code: "ArrowRight" })?.action, "step-forward");
  assert.equal(matchTransportShortcut({ key: " ", code: "Space" })?.action, "toggle-play");
  assert.equal(matchTransportShortcut({ key: "Enter", code: "Enter" }), undefined);
  assert.equal(matchTransportShortcut({ key: "a", code: "KeyA" }), undefined);
});

const baseKey = (overrides = {}) => ({
  key: "",
  code: "",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...overrides,
});
const enabledInScope = { inScope: true };

test("shouldHandleKey: any meta/ctrl/alt modifier vetoes", () => {
  for (const mod of ["metaKey", "ctrlKey", "altKey"] as const) {
    assert.equal(
      shouldHandleKey(baseKey({ key: "ArrowLeft", [mod]: true }), { tagName: "BUTTON" }, enabledInScope),
      false,
    );
  }
});

test("shouldHandleKey: editable targets keep native behavior", () => {
  assert.equal(
    shouldHandleKey(baseKey({ key: "ArrowLeft" }), { tagName: "INPUT" }, enabledInScope),
    false,
  );
});

test("shouldHandleKey: out-of-scope never handles", () => {
  const arrow = baseKey({ key: "ArrowLeft" });
  assert.equal(shouldHandleKey(arrow, { tagName: "BUTTON" }, { inScope: false }), false);
});

test("shouldHandleKey: handles mapped keys, shiftKey ignored, others rejected", () => {
  const button = { tagName: "BUTTON" };
  assert.equal(shouldHandleKey(baseKey({ key: "ArrowLeft" }), button, enabledInScope), true);
  assert.equal(shouldHandleKey(baseKey({ key: "ArrowRight" }), button, enabledInScope), true);
  assert.equal(shouldHandleKey(baseKey({ key: " ", code: "Space" }), button, enabledInScope), true);
  // shiftKey deliberately ignored (matches today's listener).
  assert.equal(shouldHandleKey(baseKey({ key: "ArrowLeft", shiftKey: true }), button, enabledInScope), true);
  assert.equal(shouldHandleKey(baseKey({ key: "a", code: "KeyA" }), button, enabledInScope), false);
  assert.equal(shouldHandleKey(baseKey({ key: "Enter", code: "Enter" }), button, enabledInScope), false);
});
