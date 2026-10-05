import test from "node:test";
import assert from "node:assert/strict";
import { ALLOWED_HOSTS } from "./config.ts";
import { isRequestAllowed } from "./origin.ts";

test("GET with an allowed host is allowed", () => {
  assert.equal(isRequestAllowed("GET", "localhost:5174", null, ALLOWED_HOSTS), true);
});

test("GET with a host that is not in the list is refused", () => {
  assert.equal(isRequestAllowed("GET", "evil.example", null, ALLOWED_HOSTS), false);
});

test("GET with a missing host is refused", () => {
  assert.equal(isRequestAllowed("GET", null, null, ALLOWED_HOSTS), false);
});

test("POST with no origin is refused", () => {
  assert.equal(isRequestAllowed("POST", "localhost:5174", null, ALLOWED_HOSTS), false);
});

test('POST with origin "null" is refused', () => {
  assert.equal(isRequestAllowed("POST", "localhost:5174", "null", ALLOWED_HOSTS), false);
});

test("POST with matching origin is allowed and foreign origin is refused", () => {
  assert.equal(
    isRequestAllowed("POST", "localhost:5174", "http://localhost:5174", ALLOWED_HOSTS),
    true
  );
  assert.equal(
    isRequestAllowed("POST", "localhost:5174", "http://evil.example", ALLOWED_HOSTS),
    false
  );
});
