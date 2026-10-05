import test from "node:test";
import assert from "node:assert/strict";
import { brandDir, regenerateFor } from "./brandDir.ts";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { resolveBrandDirForSlug } from "../../../../../app/packages/design-system/src/build-tokens.mjs";

function withEnv(value: string | undefined, fn: () => void) {
  const had = "WORKBENCH_BRAND_DIR" in process.env;
  const prev = process.env.WORKBENCH_BRAND_DIR;
  try {
    if (value === undefined) delete process.env.WORKBENCH_BRAND_DIR;
    else process.env.WORKBENCH_BRAND_DIR = value;
    fn();
  } finally {
    if (had) process.env.WORKBENCH_BRAND_DIR = prev as string;
    else delete process.env.WORKBENCH_BRAND_DIR;
  }
}

test("brandDir: unset means today's default folder", () => {
  withEnv(undefined, () => {
    assert.equal(brandDir(), resolveBrandDirForSlug("default"));
  });
});

test("brandDir: absolute path with tokens.json is used as-is", () => {
  const dir = resolveBrandDirForSlug("default") as string;
  withEnv(dir, () => {
    assert.equal(brandDir(), dir);
  });
});

test("brandDir: relative path is refused with a message", () => {
  withEnv("relative/path", () => {
    assert.throws(() => brandDir(), (err: unknown) => {
      const message = (err as Error).message;
      return message.includes("WORKBENCH_BRAND_DIR") && message.includes("relative/path");
    });
  });
});

test("brandDir: folder without tokens.json is refused with a message", () => {
  const dir = "/tmp/definitely-no-brand-tokens-xyz";
  withEnv(dir, () => {
    assert.throws(() => brandDir(), (err: unknown) => {
      const message = (err as Error).message;
      return message.includes("WORKBENCH_BRAND_DIR") && message.includes(dir);
    });
  });
});

test("regenerateFor: unset means undefined, set means a no-op function", () => {
  withEnv(undefined, () => {
    assert.equal(regenerateFor(), undefined);
  });
  const dir = resolveBrandDirForSlug("default") as string;
  withEnv(dir, () => {
    const fn = regenerateFor();
    assert.equal(typeof fn, "function");
    assert.equal((fn as () => void)(), undefined);
  });
});
