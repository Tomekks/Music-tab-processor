import test from "node:test";
import assert from "node:assert/strict";
import { pickerPosition } from "./pickerPosition.ts";

const VIEWPORT = { width: 1024, height: 768 };
const POPOVER = { width: 260, height: 320 };

test("pickerPosition: sits to the right of the swatch with an 8px gap when it fits", () => {
  const at = pickerPosition({ x: 100, y: 100, width: 32, height: 32 }, POPOVER, VIEWPORT);
  assert.deepEqual(at, { left: 140, top: 100 });
});

test("pickerPosition: clamps the top so a low swatch keeps the whole popover on screen", () => {
  const at = pickerPosition({ x: 100, y: 700, width: 32, height: 32 }, POPOVER, VIEWPORT);
  assert.deepEqual(at, { left: 140, top: 448 });
});

test("pickerPosition: flips left of the swatch when there is no room on the right", () => {
  const at = pickerPosition({ x: 900, y: 100, width: 32, height: 32 }, POPOVER, VIEWPORT);
  assert.deepEqual(at, { left: 632, top: 100 });
});
