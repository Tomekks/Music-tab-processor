// Safe batch save for the design-system workbench (slice 1, task 1d).
// Plain Node library: reads brands/default/tokens.json and saves color edits
// all-or-nothing, refusing when the file changed since it was read (hash
// check), when it is read-only, and restoring the old file when the CSS
// rebuild fails. The old editor route keeps its own path; this reuses its
// validation/serialization and the package build helpers.
import { readFileSync, writeFileSync, renameSync, unlinkSync, accessSync, constants } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { applyBatchWrite, stringifyTokens } from "./token-writes.mjs";
import { resolveBrandTree, resolveBrandDir, buildActiveBrand, markNeedsDeploy } from "./build-tokens.mjs";

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function tokensFile(brandDir) {
  return join(brandDir, "tokens.json");
}

/**
 * Read a brand's tokens.json, returning the parsed tree and a version hash
 * (SHA-256 hex of the file's exact bytes) for a later saveTokenEdits call.
 * Missing or invalid JSON throws a message naming the file.
 */
export function readTokens(brandDir) {
  const file = tokensFile(brandDir);
  let bytes;
  try {
    bytes = readFileSync(file);
  } catch (err) {
    throw new Error(`Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
  let tree;
  try {
    tree = JSON.parse(bytes.toString("utf8"));
  } catch (err) {
    throw new Error(`Cannot parse ${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { tree, version: hashBytes(bytes) };
}

/**
 * Save a batch of color edits atomically. Returns { ok: true, saved, version }
 * or { ok: false, code, error }; never throws for the four coded failures.
 */
export function saveTokenEdits({ brandDir, loadedVersion, edits, regenerate } = {}) {
  const useDefaultRegenerate = regenerate === undefined;
  if (useDefaultRegenerate) regenerate = buildActiveBrand;
  const file = tokensFile(brandDir);

  // 1. Resolve the live tree; reject unreadable files and child brands.
  let tree;
  try {
    const resolved = resolveBrandTree(brandDir);
    if (resolved.parentBrandDir) {
      return { ok: false, code: "invalid", error: `Child brands are not supported (brand at ${brandDir} has a parent)` };
    }
    tree = resolved.tree;
  } catch (err) {
    return { ok: false, code: "invalid", error: `Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (useDefaultRegenerate) {
    let activeDir;
    try {
      activeDir = resolveBrandDir();
    } catch (err) {
      return { ok: false, code: "invalid", error: err instanceof Error ? err.message : String(err) };
    }
    if (brandDir !== activeDir) {
      return { ok: false, code: "invalid", error: `Saving a brand other than the active one requires an explicit regenerate (got ${brandDir}, active is ${activeDir})` };
    }
  }

  // 2. Validate every edit before touching disk.
  const scoped = Array.isArray(edits) ? edits.map((e) => ({ ...e, scope: "exception" })) : edits;
  const applied = applyBatchWrite(tree, scoped);
  if (!applied.ok) {
    return { ok: false, code: "invalid", error: applied.error };
  }

  // 3. Explicit writability check: a rename over a read-only file would
  // succeed when the folder is writable, so check the file itself.
  try {
    accessSync(file, constants.W_OK);
  } catch {
    return { ok: false, code: "not-writable", error: `File is not writable: ${file}` };
  }

  // 4. Optimistic-concurrency check: refuse when changed since readTokens.
  let originalBytes;
  try {
    originalBytes = readFileSync(file);
  } catch (err) {
    return { ok: false, code: "write-failed", error: `Cannot read ${file}: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (hashBytes(originalBytes) !== loadedVersion) {
    return { ok: false, code: "changed-on-disk", error: `tokens.json changed on disk since it was read (not overwriting ${file})` };
  }

  // 5. Temp-file-then-rename, verified by reading back.
  const newText = stringifyTokens(applied.tokens);
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let renamed = false;
  try {
    writeFileSync(tmp, newText, "utf8");
    renameSync(tmp, file);
    renamed = true;
    const readBack = readFileSync(file, "utf8");
    if (readBack !== newText) {
      throw new Error(`verification read mismatch for ${file}`);
    }
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* temp may already be renamed */ }
    if (renamed) {
      try { writeFileSync(file, originalBytes); } catch { /* best effort restore */ }
    }
    return { ok: false, code: "write-failed", error: `Cannot write ${file}: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 6. Rebuild CSS; a failed rebuild restores the old tokens.
  try {
    regenerate();
  } catch (err) {
    try { writeFileSync(file, originalBytes); } catch { /* best effort restore */ }
    return { ok: false, code: "write-failed", error: `Rebuilding CSS failed, restored ${file}: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 7. Same "not deployed" flag the old editor sets.
  markNeedsDeploy(brandDir);

  const saved = new Set(edits.map((e) => e?.path)).size;
  return { ok: true, saved, version: hashBytes(Buffer.from(newText, "utf8")) };
}
