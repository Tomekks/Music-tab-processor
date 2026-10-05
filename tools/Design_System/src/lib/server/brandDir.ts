import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { resolveBrandDirForSlug } from "../../../../../app/packages/design-system/src/build-tokens.mjs";

export function brandDir(): string {
  const override = process.env.WORKBENCH_BRAND_DIR;
  if (!override) return resolveBrandDirForSlug("default");
  if (!isAbsolute(override)) {
    throw new Error(`WORKBENCH_BRAND_DIR must be an absolute path (got ${override})`);
  }
  const file = join(override, "tokens.json");
  if (!existsSync(file)) {
    throw new Error(`WORKBENCH_BRAND_DIR has no tokens.json (got ${file})`);
  }
  return override;
}

export function regenerateFor(): (() => void) | undefined {
  if (!process.env.WORKBENCH_BRAND_DIR) return undefined;
  return () => {};
}
