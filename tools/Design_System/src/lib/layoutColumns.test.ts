import test from "node:test";
import assert from "node:assert/strict";
import { bodyColumns } from "./layoutColumns.ts";

test("both open returns today's three-column grid", () => {
	assert.equal(bodyColumns(true, true), "200px 1fr 320px");
});

test("nav closed returns canvas plus inspector", () => {
	assert.equal(bodyColumns(false, true), "1fr 320px");
});

test("inspector closed returns nav plus canvas", () => {
	assert.equal(bodyColumns(true, false), "200px 1fr");
});

test("both closed returns a single canvas column", () => {
	assert.equal(bodyColumns(false, false), "1fr");
});
