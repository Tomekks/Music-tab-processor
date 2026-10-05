import { error } from "@sveltejs/kit";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { readTokens } from "../../../../../app/packages/design-system/src/save-tokens.mjs";
import { listColorTokens } from "$lib/server/colorTokens.js";
import { brandDir } from "$lib/server/brandDir.js";

export function load() {
  try {
    const { tree, version } = readTokens(brandDir());
    return { tokens: listColorTokens(tree), previewUrl: "http://localhost:3000/workbench-preview", version };
  } catch (err) {
    error(500, err instanceof Error ? err.message : String(err));
  }
}
