import test from "node:test";
import assert from "node:assert/strict";
import { readPreviewHeight } from "./previewHeight.ts";

const PREVIEW_ORIGIN = "http://localhost:3000";
const FRAME = { id: "iframe-window" };
const MESSAGE = { type: "preview-height", height: 420 };

test("readPreviewHeight: preview origin plus the iframe window plus a positive finite height returns the height", () => {
  assert.equal(readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, MESSAGE), 420);
});

test("readPreviewHeight: any other origin returns null", () => {
  assert.equal(readPreviewHeight("http://evil.example", FRAME, FRAME, MESSAGE), null);
  assert.equal(readPreviewHeight("http://localhost:5174", FRAME, FRAME, MESSAGE), null);
});

test("readPreviewHeight: any other source window returns null", () => {
  assert.equal(readPreviewHeight(PREVIEW_ORIGIN, { id: "other" }, FRAME, MESSAGE), null);
});

test("readPreviewHeight: non-numeric or non-positive height returns null", () => {
  assert.equal(
    readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, { type: "preview-height", height: "420" }),
    null,
  );
  assert.equal(
    readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, { type: "preview-height", height: 0 }),
    null,
  );
  assert.equal(
    readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, { type: "preview-height", height: -10 }),
    null,
  );
  assert.equal(
    readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, { type: "preview-height", height: NaN }),
    null,
  );
  assert.equal(
    readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, { type: "preview-height", height: Infinity }),
    null,
  );
  assert.equal(
    readPreviewHeight(PREVIEW_ORIGIN, FRAME, FRAME, { type: "other", height: 420 }),
    null,
  );
});
