import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_HOSTS, DATA_DIR, PIPELINE_ROOT } from "./config.ts";

test("PIPELINE_ROOT contains the pipeline folder", () => {
  assert.equal(existsSync(join(PIPELINE_ROOT, "pipeline")), true);
});

test("DATA_DIR points inside tools/Control_Centre/data", () => {
  assert.ok(DATA_DIR.endsWith(join("tools", "Control_Centre", "data")));
});

test("ALLOWED_HOSTS contains only loopback hosts", () => {
  assert.ok(ALLOWED_HOSTS.length > 0);
  for (const host of ALLOWED_HOSTS) {
    assert.match(host, /^(localhost|127\.0\.0\.1)(:\d+)?$/);
  }
});

test("package.json start script binds loopback explicitly", () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  assert.ok(pkg.scripts?.["start"]?.includes("HOST=127.0.0.1"));
});
