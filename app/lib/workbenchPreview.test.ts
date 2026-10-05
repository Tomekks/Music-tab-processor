import test from "node:test";
import assert from "node:assert/strict";
import { readTokenMessage, forcedStateSelector, previewFitScale, workbenchOrigin } from "./workbenchPreview.ts";

const VARS = { "--color-accent": "#6d28d9" };
const MESSAGE = { type: "tokens", vars: VARS };

test("readTokenMessage: http://localhost:5174 with a valid message returns the vars", () => {
  assert.deepEqual(readTokenMessage("http://localhost:5174", MESSAGE), VARS);
});

test("readTokenMessage: http://127.0.0.1:5174 with a valid message returns the vars", () => {
  assert.deepEqual(readTokenMessage("http://127.0.0.1:5174", MESSAGE), VARS);
});

test("readTokenMessage: origin http://evil.example returns null", () => {
  assert.equal(readTokenMessage("http://evil.example", MESSAGE), null);
});

test("readTokenMessage: origin http://localhost:3000 returns null", () => {
  assert.equal(readTokenMessage("http://localhost:3000", MESSAGE), null);
});

test('readTokenMessage: type other than "tokens" returns null', () => {
  assert.equal(
    readTokenMessage("http://localhost:5174", { type: "brand", vars: VARS }),
    null,
  );
});

test("readTokenMessage: one bad key among good ones returns null", () => {
  for (const bad of ["color", "--A", "--x;y"]) {
    assert.equal(
      readTokenMessage("http://localhost:5174", {
        type: "tokens",
        vars: { "--color-accent": "#6d28d9", [bad]: "#000000" },
      }),
      null,
    );
  }
});

test("readTokenMessage: a value containing ; or } or over 100 characters returns null", () => {
  assert.equal(
    readTokenMessage("http://localhost:5174", {
      type: "tokens",
      vars: { "--color-accent": "red;evil" },
    }),
    null,
  );
  assert.equal(
    readTokenMessage("http://localhost:5174", {
      type: "tokens",
      vars: { "--color-accent": "red}evil" },
    }),
    null,
  );
  assert.equal(
    readTokenMessage("http://localhost:5174", {
      type: "tokens",
      vars: { "--color-accent": "x".repeat(101) },
    }),
    null,
  );
  assert.equal(
    readTokenMessage("http://localhost:5174", {
      type: "tokens",
      vars: { "--color-accent": 5 },
    }),
    null,
  );
});

test('forcedStateSelector: ".a:hover" returns ".force-hover .a"', () => {
  assert.equal(forcedStateSelector(".a:hover"), ".force-hover .a");
});

test("forcedStateSelector: :active gives .force-active, plain and listed selectors give null", () => {
  assert.equal(forcedStateSelector(".a:active"), ".force-active .a");
  assert.equal(forcedStateSelector(".a"), null);
  assert.equal(forcedStateSelector(".a:hover, .b:hover"), null);
});

test("readTokenMessage: non-object data returns null", () => {
  assert.equal(readTokenMessage("http://localhost:5174", null), null);
  assert.equal(readTokenMessage("http://localhost:5174", "tokens"), null);
  assert.equal(readTokenMessage("http://localhost:5174", [{ type: "tokens" }]), null);
  assert.equal(
    readTokenMessage(
      "http://localhost:5174",
      Object.assign([], { type: "tokens", vars: VARS }),
    ),
    null,
  );
  assert.equal(
    readTokenMessage("http://localhost:5174", { type: "tokens", vars: [] }),
    null,
  );
  assert.equal(
    readTokenMessage("http://localhost:5174", { type: "tokens", vars: "--x" }),
    null,
  );
  assert.equal(readTokenMessage("http://localhost:5174", { type: "tokens" }), null);
});

test("previewFitScale: narrower frame scales to frame/content", () => {
  assert.equal(previewFitScale(400, 800), 0.5);
});

test("previewFitScale: wider-or-equal frame stays 1", () => {
  assert.equal(previewFitScale(800, 400), 1);
  assert.equal(previewFitScale(800, 800), 1);
});

test("previewFitScale: zero or negative frame width stays 1", () => {
  assert.equal(previewFitScale(0, 800), 1);
  assert.equal(previewFitScale(-100, 800), 1);
});
test("forcedStateSelector: an escaped comma inside a class name is not a selector list", () => {
  // The Tailwind class for the primary Button hover is `.hover\:[…color-mix(in_srgb\,var(--a)\,…)]:hover`.
  assert.equal(
    forcedStateSelector(String.raw`.hover\:\[mix\(a\,b\)\]:hover`),
    String.raw`.force-hover .hover\:\[mix\(a\,b\)\]`,
  );
  assert.equal(
    forcedStateSelector(String.raw`.active\:\[mix\(a\,b\)\]:active`),
    String.raw`.force-active .active\:\[mix\(a\,b\)\]`,
  );
  assert.equal(forcedStateSelector(String.raw`.a\,b:hover, .c:hover`), null);
});

test("workbenchOrigin: answers the allowed origin the page was opened from", () => {
  assert.equal(workbenchOrigin("http://127.0.0.1:5174/foundations"), "http://127.0.0.1:5174");
  assert.equal(workbenchOrigin("http://localhost:5174/"), "http://localhost:5174");
});

test("workbenchOrigin: an unknown, empty or malformed referrer falls back to localhost", () => {
  assert.equal(workbenchOrigin("http://evil.example/foundations"), "http://localhost:5174");
  assert.equal(workbenchOrigin(""), "http://localhost:5174");
  assert.equal(workbenchOrigin("not a url"), "http://localhost:5174");
});
