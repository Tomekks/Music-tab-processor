// Pure validation + tree-mutation logic for the token write/reset API (Task 5).
// No filesystem access, no network, no mutation of the input trees —
// route.ts owns HTTP + disk and delegates here. All functions are importable
// by node --test without a running Next server.
import { generateNeutralRamp, generateAccentPair } from "./generate-ramp.mjs";

export const VALID_ACTIONS = ["write", "reset", "reset-all", "set-as-default", "reset-to-parent", "generate-from-seed"];

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

// Matches one expanded leaf object as JSON.stringify(tree, null, 2) emits it:
// {
//   "$value": <scalar>,
//   "$type": "<type>"
// }
// $value is a JSON string (possibly with escapes) or a JSON number.
const EXPANDED_LEAF_RE =
  /{\n([ \t]*)"\$value": ((?:"(?:[^"\\\n]|\\.)*"|-?\d+(?:\.\d+)?)),\n\1"\$type": ("(?:[^"\\\n]|\\.)*")\n[ \t]*}/g;

/**
 * Serialize a token tree exactly in the committed files' style: 2-space
 * indent, every {$value, $type} leaf on ONE line, single trailing newline.
 * Plain JSON.stringify(tree, null, 2) expands each leaf to four lines and
 * would reformat the whole file on the first write — verified against the
 * real tokens.json while writing Task 5, so this exists instead.
 * @param {object} tree
 * @returns {string}
 */
export function stringifyTokens(tree) {
  return (
    JSON.stringify(tree, null, 2).replace(
      EXPANDED_LEAF_RE,
      '{ "$value": $2, "$type": $3 }',
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
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {string} path
 * @param {string} value canonical string form, unit/suffix included
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyWrite(tokensTree, path, value) {
  const leaf = getLeaf(tokensTree, path);
  if (!leaf) {
    return { ok: false, status: 400, error: `"${path}" is not a known token path` };
  }
  const valid = validateWriteValue(leaf, value);
  if (!valid.ok) {
    return { ok: false, status: 400, error: valid.error };
  }
  const tokens = structuredClone(tokensTree);
  getLeaf(tokens, path).$value = value;
  return { ok: true, tokens };
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
