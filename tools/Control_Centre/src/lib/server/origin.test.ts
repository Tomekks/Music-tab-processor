import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_HOSTS } from "./config.ts";
import { isRequestAllowed } from "./origin.ts";

test("GET with a loopback host and no origin is allowed", () => {
  assert.equal(isRequestAllowed("GET", "localhost:5173", null, ALLOWED_HOSTS), true);
});

test("HEAD with a loopback host and no origin is allowed", () => {
  assert.equal(isRequestAllowed("HEAD", "localhost:5173", null, ALLOWED_HOSTS), true);
});

test("POST with matching localhost origin and host is allowed", () => {
  assert.equal(
    isRequestAllowed("POST", "localhost:5173", "http://localhost:5173", ALLOWED_HOSTS),
    true
  );
});

test("POST with matching 127.0.0.1 origin and host is allowed", () => {
  assert.equal(
    isRequestAllowed("POST", "127.0.0.1:5173", "http://127.0.0.1:5173", ALLOWED_HOSTS),
    true
  );
});

test("POST with a foreign origin is rejected", () => {
  assert.equal(
    isRequestAllowed("POST", "localhost:5173", "http://evil.test", ALLOWED_HOSTS),
    false
  );
});

test("POST with no origin is rejected", () => {
  assert.equal(isRequestAllowed("POST", "localhost:5173", null, ALLOWED_HOSTS), false);
});

test('POST with the string "null" origin is rejected', () => {
  assert.equal(isRequestAllowed("POST", "localhost:5173", "null", ALLOWED_HOSTS), false);
});

test("POST with an origin on the wrong port is rejected", () => {
  assert.equal(
    isRequestAllowed("POST", "localhost:5173", "http://localhost:5174", ALLOWED_HOSTS),
    false
  );
});

test("POST with a malformed origin is rejected", () => {
  assert.equal(isRequestAllowed("POST", "localhost:5173", "not a url", ALLOWED_HOSTS), false);
});

test("DELETE with no origin is rejected", () => {
  assert.equal(isRequestAllowed("DELETE", "localhost:5173", null, ALLOWED_HOSTS), false);
});

test("PUT with no origin is rejected", () => {
  assert.equal(isRequestAllowed("PUT", "localhost:5173", null, ALLOWED_HOSTS), false);
});

test("PATCH with no origin is rejected", () => {
  assert.equal(isRequestAllowed("PATCH", "localhost:5173", null, ALLOWED_HOSTS), false);
});

test("GET with a foreign host is rejected", () => {
  assert.equal(isRequestAllowed("GET", "evil.test", null, ALLOWED_HOSTS), false);
});

test("GET with a missing host is rejected", () => {
  assert.equal(isRequestAllowed("GET", null, null, ALLOWED_HOSTS), false);
});

test("POST with a loopback origin but a foreign host is rejected", () => {
  assert.equal(
    isRequestAllowed("POST", "evil.test", "http://localhost:5173", ALLOWED_HOSTS),
    false
  );
});
