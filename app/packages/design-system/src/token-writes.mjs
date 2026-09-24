// Pure validation + tree-mutation logic for the token write/reset API (Task 5).
// No filesystem access, no network, no mutation of the input trees —
// route.ts owns HTTP + disk and delegates here. All functions are importable
// by node --test without a running Next server.
import { generateNeutralRamp, generateAccentPair } from "./generate-ramp.mjs";
import { resolveValue } from "./resolve.mjs";
import { themeVaryingColorRef } from "./css-var-naming.mjs";

export const VALID_ACTIONS = ["write", "reset", "reset-all", "set-as-default", "reset-to-parent", "generate-from-seed", "batch-write", "set-description", "list-brands", "create-brand", "duplicate-brand", "delete-brand"];

/**
 * @typedef {object} TokenLeaf
 * @property {string} $value
 * @property {string} $type
 */

/**
 * @typedef {object} LeafRef
 * @property {string} path dot-joined path, e.g. "semantic.color.accent"
 * @property {TokenLeaf} leaf
 */

/**
 * @typedef {{ ok: true }} ValidationOk
 * @typedef {{ ok: false, error: string }} ValidationErr
 * @typedef {ValidationOk | ValidationErr} ValidationResult
 */

/**
 * @typedef {{ ok: false, status: 400, error: string }} ApplyErr
 * Each apply function returns its own success shape (with the changed
 * file tree(s) as REQUIRED properties, so route.ts's `if (!result.ok)`
 * narrowing gives TypeScript a definite type) or ApplyErr.
 */

// Matches one expanded leaf object as JSON.stringify(tree, null, 2) emits it,
// with an optional third $description field (always last when present --
// applySetDescription below always assigns it as a new property, never an
// in-place update, so JSON.stringify emits $value, $type, $description in
// that order):
// {
//   "$value": <scalar>,
//   "$type": "<type>"[,
//   "$description": "<string>"]
// }
// $value is a JSON string (possibly with escapes) or a JSON number.
const EXPANDED_LEAF_RE =
  /{\n([ \t]*)"\$value": ((?:"(?:[^"\\\n]|\\.)*"|-?\d+(?:\.\d+)?)),\n\1"\$type": ("(?:[^"\\\n]|\\.)*")(?:,\n\1"\$description": ("(?:[^"\\\n]|\\.)*"))?\n[ \t]*}/g;

/**
 * Serialize a token tree exactly in the committed files' style: 2-space
 * indent, every {$value, $type} (or {$value, $type, $description}) leaf on
 * ONE line, single trailing newline. Plain JSON.stringify(tree, null, 2)
 * expands each leaf to four (or five) lines and would reformat the whole
 * file on the first write — verified against the real tokens.json while
 * writing Task 5, so this exists instead.
 * @param {object} tree
 * @returns {string}
 */
export function stringifyTokens(tree) {
  return (
    JSON.stringify(tree, null, 2).replace(
      EXPANDED_LEAF_RE,
      (_match, _indent, value, type, description) =>
        description
          ? `{ "$value": ${value}, "$type": ${type}, "$description": ${description} }`
          : `{ "$value": ${value}, "$type": ${type} }`,
    ) + "\n"
  );
}

/**
 * Look up `path` (dot-joined string) in `tree`. Returns the leaf node or
 * null. Matching is exact: no trimming, and every segment must be consumed —
 * trailing segments past a leaf ("a.b.$value") or into a non-leaf both miss.
 * @param {object} tree
 * @param {unknown} path
 * @returns {TokenLeaf | null}
 */
export function getLeaf(tree, path) {
  if (typeof path !== "string") return null;
  const segments = path.split(".");
  let node = tree;
  for (let i = 0; i < segments.length; i++) {
    if (
      node === null ||
      typeof node !== "object" ||
      !Object.hasOwn(node, segments[i])
    ) {
      return null;
    }
    node = node[segments[i]];
    const last = i === segments.length - 1;
    const isLeaf =
      node !== null &&
      typeof node === "object" &&
      Object.hasOwn(node, "$value");
    if (isLeaf && !last) return null;
    if (last) return isLeaf ? node : null;
  }
  return null;
}

/**
 * Every {path, leaf} pair in `tree`, dot-joined paths. Used only by
 * applyResetAll's diff.
 * @param {object} tree
 * @returns {LeafRef[]}
 */
export function collectLeafPaths(tree) {
  const out = [];
  const walk = (node, prefix) => {
    for (const key of Object.keys(node ?? {})) {
      const child = node[key];
      if (child !== null && typeof child === "object" && !("$value" in child)) {
        walk(child, [...prefix, key]);
      } else if (
        child !== null &&
        typeof child === "object" &&
        "$value" in child
      ) {
        out.push({ path: [...prefix, key].join("."), leaf: child });
      }
    }
  };
  walk(tree, []);
  return out;
}

const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DIMENSION_RE = /^-?\d+(?:\.\d+)?px$/;
const PERCENTAGE_RE = /^(\d+(?:\.\d+)?)%$/;

/**
 * Format/range-check `value` against the leaf's own $type. The server decides
 * the type from the schema; the request never supplies one. Never coerces —
 * validates the string as sent.
 * @param {TokenLeaf} leaf
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateWriteValue(leaf, value) {
  if (typeof value !== "string") {
    return { ok: false, error: '"value" must be a string' };
  }
  switch (leaf.$type) {
    case "color":
      return COLOR_RE.test(value)
        ? { ok: true }
        : { ok: false, error: `expected a hex color like #rrggbb, got ${JSON.stringify(value)}` };
    case "dimension":
      return DIMENSION_RE.test(value)
        ? { ok: true }
        : { ok: false, error: `expected a px dimension like 12px, got ${JSON.stringify(value)}` };
    case "percentage": {
      const m = PERCENTAGE_RE.exec(value);
      if (!m) {
        return { ok: false, error: `expected a percentage like 8%, got ${JSON.stringify(value)}` };
      }
      const n = Number(m[1]);
      return n >= 0 && n <= 100
        ? { ok: true }
        : { ok: false, error: `expected a percentage within 0%-100%, got ${JSON.stringify(value)}` };
    }
    case "fontFamily":
      return { ok: false, error: "fontFamily tokens are read-only" };
    default:
      return { ok: false, error: `unsupported token type for write: ${leaf.$type}` };
  }
}

/**
 * Ensure `path` exists as a leaf in `ownTree` (a SPARSE, already-cloned tree),
 * creating intermediate objects and the leaf itself if missing — using
 * `typeHint` ($type from the resolved/merged leaf) for the created leaf's
 * $type, since a brand-new leaf has no $type of its own yet. A present-but-
 * malformed value where an intermediate object or the leaf itself is expected
 * is a malformed file, not a missing path: throw loudly (the caller maps it
 * to 400) rather than silently overwriting unrelated data.
 * @param {object} ownTree mutable — already a clone, this function mutates it
 * @param {string} path
 * @param {string} typeHint
 * @returns {TokenLeaf} the (possibly newly-created) leaf, mutated by the caller
 */
function ensureOwnLeaf(ownTree, path, typeHint) {
  const segments = path.split(".");
  let node = ownTree;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (node[seg] === undefined) {
      node[seg] = {};
    }
    if (
      node[seg] === null ||
      typeof node[seg] !== "object" ||
      Array.isArray(node[seg]) ||
      "$value" in node[seg]
    ) {
      throw new Error(`unexpected existing value at "${segments.slice(0, i + 1).join(".")}" — expected an object`);
    }
    node = node[seg];
  }
  const last = segments.at(-1);
  if (node[last] === undefined) {
    node[last] = { $value: "", $type: typeHint };
  } else if (node[last] === null || typeof node[last] !== "object" || !("$value" in node[last])) {
    throw new Error(`unexpected existing value at "${path}" — expected a token leaf`);
  }
  return node[last];
}

/**
 * @param {object} mergedTree live tokens.json tree (resolveBrandTree's `.tree`
 *   for a child brand, or the root brand's own tokens.json directly) — the tree
 *   paths are validated against; never mutated
 * @param {string} path
 * @param {string} value canonical string form, unit/suffix included
 * @param {object | null} [ownTree] the child brand's own sparse tree to write
 *   into — omitted/null for a root brand (then mergedTree is written, exactly
 *   as before)
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyWrite(mergedTree, path, value, ownTree = null) {
  const leaf = getLeaf(mergedTree, path);
  if (!leaf) {
    return { ok: false, status: 400, error: `"${path}" is not a known token path` };
  }
  const valid = validateWriteValue(leaf, value);
  if (!valid.ok) {
    return { ok: false, status: 400, error: valid.error };
  }
  if (ownTree === null) {
    // Root brand: byte-for-byte today's behavior, own === merged.
    const tokens = structuredClone(mergedTree);
    getLeaf(tokens, path).$value = value;
    return { ok: true, tokens };
  }
  const own = structuredClone(ownTree);
  try {
    ensureOwnLeaf(own, path, leaf.$type).$value = value;
  } catch (err) {
    return { ok: false, status: 400, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, tokens: own };
}

/**
 * Apply a batch of edits atomically: validate every edit first; if any fails,
 * return the FIRST failure and write nothing. A "brand"-scoped edit resolves
 * to its alias target (read from the tree at that path) before writing; an
 * "exception"-scoped edit writes `path` as-is. A "brand" edit whose leaf is
 * not an alias fails the whole batch (fail-closed — there's nothing to
 * cascade to). Two edits resolving to the same target path apply last-wins,
 * in array order — 8b's UI owns warning on that case, not this function.
 * @param {object} mergedTree live tokens.json tree (resolveBrandTree's `.tree`
 *   for a child brand, or the root brand's own tokens.json directly) — every
 *   edit is validated against this tree; never mutated
 * @param {{ path: string, value: string, scope: "exception" | "brand" }[]} edits
 * @param {object | null} [ownTree] the child brand's own sparse tree to write
 *   into — omitted/null for a root brand (then mergedTree is written, exactly
 *   as before)
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyBatchWrite(mergedTree, edits, ownTree = null) {
  if (!Array.isArray(edits) || edits.length === 0) {
    return { ok: false, status: 400, error: '"edits" must be a non-empty array' };
  }
  const collected = [];
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    if (!edit || typeof edit !== "object") {
      return {
        ok: false,
        status: 400,
        error: `edit at index ${i}: must be an object with "path", "value" and "scope"`,
      };
    }
    const { path, value, scope } = edit;
    if (
      typeof path !== "string" ||
      typeof value !== "string" ||
      (scope !== "exception" && scope !== "brand")
    ) {
      return {
        ok: false,
        status: 400,
        error: `edit at index ${i}: "path" and "value" must be strings and "scope" must be "exception" or "brand"`,
      };
    }
    const leaf = getLeaf(mergedTree, path);
    if (!leaf) {
      return { ok: false, status: 400, error: `edit at index ${i}: "${path}" is not a known token path` };
    }
    let targetPath = path;
    let targetLeaf = leaf;
    if (scope === "brand") {
      if (typeof leaf.$value !== "string" || !leaf.$value.startsWith("{")) {
        return {
          ok: false,
          status: 400,
          error: `edit at index ${i}: "${path}" is not an alias — nothing to cascade to for a brand-wide edit`,
        };
      }
      targetPath = leaf.$value.slice(1, -1);
      targetLeaf = getLeaf(mergedTree, targetPath);
      if (!targetLeaf) {
        return { ok: false, status: 400, error: `edit at index ${i}: "${targetPath}" is not a known token path` };
      }
    }
    const valid = validateWriteValue(targetLeaf, value);
    if (!valid.ok) {
      return { ok: false, status: 400, error: `edit at index ${i}: ${valid.error}` };
    }
    collected.push({ targetPath, targetType: targetLeaf.$type, value });
  }
  if (ownTree === null) {
    // Root brand: byte-for-byte today's behavior, own === merged.
    const tokens = structuredClone(mergedTree);
    for (const { targetPath, value } of collected) {
      getLeaf(tokens, targetPath).$value = value;
    }
    return { ok: true, tokens };
  }
  const own = structuredClone(ownTree);
  try {
    for (const { targetPath, targetType, value } of collected) {
      ensureOwnLeaf(own, targetPath, targetType).$value = value;
    }
  } catch (err) {
    return { ok: false, status: 400, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, tokens: own };
}

/**
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {object} defaultsTree tokens.default.json tree (not mutated)
 * @param {string} path
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyReset(tokensTree, defaultsTree, path) {
  const leaf = getLeaf(tokensTree, path);
  const defLeaf = getLeaf(defaultsTree, path);
  if (!leaf || !defLeaf) {
    const missing = !leaf ? "tokens.json" : "tokens.default.json";
    return { ok: false, status: 400, error: `"${path}" is missing from ${missing}` };
  }
  const tokens = structuredClone(tokensTree);
  getLeaf(tokens, path).$value = defLeaf.$value;
  return { ok: true, tokens };
}

/**
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {object} defaultsTree tokens.default.json tree (not mutated)
 * @returns {{ok: true, tokens: object, reset: string[]} | ApplyErr}
 */
export function applyResetAll(tokensTree, defaultsTree) {
  const reset = [];
  const tokens = structuredClone(tokensTree);
  for (const { path, leaf } of collectLeafPaths(tokensTree)) {
    const defLeaf = getLeaf(defaultsTree, path);
    if (!defLeaf) {
      return { ok: false, status: 400, error: `"${path}" is missing from tokens.default.json` };
    }
    if (leaf.$value !== defLeaf.$value) {
      getLeaf(tokens, path).$value = defLeaf.$value;
      reset.push(path);
    }
  }
  return { ok: true, tokens, reset };
}

/**
 * @param {object} tokensTree live tokens.json tree (not mutated, not written)
 * @param {object} defaultsTree tokens.default.json tree (not mutated)
 * @param {string} path
 * @returns {{ok: true, defaults: object} | ApplyErr} defaults tree only
 */
export function applySetAsDefault(tokensTree, defaultsTree, path) {
  const leaf = getLeaf(tokensTree, path);
  const defLeaf = getLeaf(defaultsTree, path);
  if (!leaf || !defLeaf) {
    const missing = !leaf ? "tokens.json" : "tokens.default.json";
    return { ok: false, status: 400, error: `"${path}" is missing from ${missing}` };
  }
  const defaults = structuredClone(defaultsTree);
  getLeaf(defaults, path).$value = leaf.$value;
  return { ok: true, defaults };
}

const DESCRIPTION_MAX_LENGTH = 200;

/**
 * A description is never touched by applyReset/applySetAsDefault -- both
 * write only `.$value` on the target leaf, already, today, with no change
 * needed here.
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {string} path
 * @param {string} description empty string clears an existing description
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applySetDescription(tokensTree, path, description) {
  const leaf = getLeaf(tokensTree, path);
  if (!leaf) {
    return { ok: false, status: 400, error: `"${path}" is not a known token path` };
  }
  if (typeof description !== "string") {
    return { ok: false, status: 400, error: '"description" must be a string' };
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer (got ${description.length})`,
    };
  }
  const tokens = structuredClone(tokensTree);
  const target = getLeaf(tokens, path);
  if (description === "") {
    delete target.$description;
  } else {
    // Assign as a new property, not an update to an existing key, so it's
    // always the last key JSON.stringify emits — stringifyTokens's regex
    // above depends on $value, $type, $description appearing in that order.
    delete target.$description;
    target.$description = description;
  }
  return { ok: true, tokens };
}

/**
 * Delete a leaf from a CHILD brand's own tokens.json tree -- not copy a
 * value, delete -- so it goes back to inheriting the parent brand's value
 * (including any future changes to it), rather than freezing a snapshot the
 * way applyReset's tokens.default.json copy does. Also prunes any ancestor
 * object left empty by the deletion, so the child's tokens.json only ever
 * contains leaves it genuinely still overrides -- no empty scaffolding.
 * @param {object} tokensTree the CHILD brand's own live tokens.json tree (not mutated) --
 *   NOT the merged/resolved tree; a sparse tree containing only overrides
 * @param {string} path
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyResetToParent(tokensTree, path) {
  const leaf = getLeaf(tokensTree, path);
  if (!leaf) {
    return {
      ok: false,
      status: 400,
      error: `"${path}" is not present in this brand's own tokens.json -- nothing to reset (it's already inherited, or not a valid path)`,
    };
  }
  const tokens = structuredClone(tokensTree);
  const segments = path.split(".");
  const chain = [tokens];
  for (let i = 0; i < segments.length - 1; i++) {
    chain.push(chain[i][segments[i]]);
  }
  delete chain[chain.length - 1][segments[segments.length - 1]];
  for (let i = chain.length - 1; i > 0; i--) {
    if (Object.keys(chain[i]).length === 0) {
      delete chain[i - 1][segments[i - 1]];
    } else {
      break;
    }
  }
  return { ok: true, tokens };
}

const SEED_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const NEUTRAL_KEYS = [
  "background", "foreground", "border", "surface",
  "surfaceText", "surfaceHover", "surfaceActive", "surfaceActiveText",
];

/**
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {string} neutralSeed 6-digit hex, e.g. "#faf9f5"
 * @param {string} accentSeed 6-digit hex, e.g. "#ae97f7"
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyGenerateFromSeed(tokensTree, neutralSeed, accentSeed) {
  if (!SEED_COLOR_RE.test(neutralSeed) || !SEED_COLOR_RE.test(accentSeed)) {
    return {
      ok: false,
      status: 400,
      error: `expected 6-digit hex colors like #rrggbb, got ${JSON.stringify(neutralSeed)} / ${JSON.stringify(accentSeed)}`,
    };
  }
  const ramp = generateNeutralRamp(neutralSeed);
  const { accent, onAccent } = generateAccentPair(accentSeed);
  for (const hex of [...Object.values(ramp.light), ...Object.values(ramp.dark), accent, onAccent]) {
    if (typeof hex !== "string" || !SEED_COLOR_RE.test(hex)) {
      return {
        ok: false,
        status: 500,
        error: `generator produced a non-hex value ${JSON.stringify(hex)} -- not writing anything (see stop-conditions)`,
      };
    }
  }
  const writes = [
    ...NEUTRAL_KEYS.map((key) => [`semantic.color.${key}`, ramp.light[key]]),
    ["semantic.color.accent", accent],
    ["semantic.color.onAccent", onAccent],
    ...NEUTRAL_KEYS.map((key) => [`dark.semantic.color.${key}`, ramp.dark[key]]),
  ];
  for (const [path] of writes) {
    if (!getLeaf(tokensTree, path)) {
      return {
        ok: false,
        status: 400,
        error: `"${path}" is missing from this brand's tokens.json -- generate-from-seed requires the full default-brand leaf set, not a sparse child brand`,
      };
    }
  }
  const tokens = structuredClone(tokensTree);
  for (const [path, hex] of writes) {
    getLeaf(tokens, path).$value = hex;
  }
  return { ok: true, tokens };
}

/**
 * @param {unknown} name free-text brand display name
 * @param {string[]} existingSlugs current brand directory names (from listBrands())
 * @returns {{ok: true, slug: string} | {ok: false, error: string}}
 */
export function validateBrandName(name, existingSlugs) {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { ok: false, error: '"name" must be a non-empty string' };
  }
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    return { ok: false, error: `"${name}" has no letters or numbers to build a brand slug from` };
  }
  if (existingSlugs.includes(slug)) {
    return { ok: false, error: `A brand named "${slug}" already exists` };
  }
  return { ok: true, slug };
}

/**
 * Freeze a source brand's fully-merged tree into a fully-populated
 * (non-sparse) tree for a new Duplicate brand -- every leaf's $value resolved
 * to its literal, EXCEPT a component.* leaf aliasing a theme-varying semantic
 * color (per themeVaryingColorRef), which keeps its alias string so
 * [data-theme="dark"] overrides keep working on the duplicate. That kept
 * alias now points at the duplicate's own already-frozen copy of that
 * semantic color -- no ongoing link back to the source brand.
 * @param {object} mergedTree resolveBrandTree(...).tree of the SOURCE brand — already
 *   fully resolved against its own parent if it has one; never mutated
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyDuplicateBrand(mergedTree) {
  const themeVaryingKeys = new Set(Object.keys(mergedTree.dark?.semantic?.color ?? {}));
  const tokens = {};
  try {
    for (const { path, leaf } of collectLeafPaths(mergedTree)) {
      const segments = path.split(".");
      let node = tokens;
      for (let i = 0; i < segments.length - 1; i++) {
        node = node[segments[i]] ??= {};
      }
      const themeKey = themeVaryingColorRef(leaf, themeVaryingKeys);
      const frozen = themeKey
        ? { $value: leaf.$value, $type: leaf.$type }
        : { $value: resolveValue(mergedTree, leaf.$value), $type: leaf.$type };
      if (leaf.$description) frozen.$description = leaf.$description;
      node[segments.at(-1)] = frozen;
    }
  } catch (err) {
    return { ok: false, status: 400, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, tokens };
}
