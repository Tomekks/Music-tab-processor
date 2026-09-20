// Descriptor builder for the design-system editor page (Task 6). Pure module:
// no filesystem access, no mutation of inputs. page.tsx reads the JSON files
// and delegates here; editor.tsx renders what this returns.

import { getLeaf, collectLeafPaths } from "./token-writes.mjs";
import { resolveValue } from "./resolve.mjs";

/**
 * @typedef {object} SectionMeta
 * @property {string} key section key, e.g. "semantic.color"
 * @property {string} heading render heading, e.g. "Color"
 * @property {string} [group] umbrella heading for component sections, e.g. "Components"
 */

/**
 * @typedef {object} FieldDescriptor
 * @property {string} path dot-joined path, e.g. "component.button.primaryBackground"
 * @property {string} section matches a SECTIONS[].key
 * @property {string} label humanized last segment, e.g. "Primary background"
 * @property {string} $type one of "color" | "dimension" | "percentage" | "fontFamily"
 * @property {string} value resolved display value (references resolved)
 * @property {string} rawValue the literal $value in tokens.json — may be "{...}"
 * @property {boolean} isModified rawValue differs from the default file's rawValue
 * @property {boolean} isAlias rawValue starts with "{"
 */

/** @type {SectionMeta[]} Declared render order — never object insertion order. */
export const SECTIONS = [
  { key: "semantic.color", heading: "Color" },
  { key: "semantic.radius", heading: "Radius" },
  { key: "semantic.space", heading: "Space" },
  { key: "semantic.typography", heading: "Typography" },
  { key: "semantic.state", heading: "State opacities" },
  { key: "semantic.focus", heading: "Focus ring" },
  { key: "semantic.layout", heading: "Layout" },
  { key: "component.colorField", heading: "Color Field", group: "Components" },
  { key: "component.slider", heading: "Slider", group: "Components" },
  { key: "component.segmentedControl", heading: "Segmented Control", group: "Components" },
  { key: "component.button", heading: "Button", group: "Components" },
];

/**
 * "primaryBackground" -> "Primary background"; "1_5" -> "1.5".
 * @param {string} segment
 * @returns {string}
 */
export function humanize(segment) {
  const spaced = segment
    .replace(/_/g, ".")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Build the editor's field list. Skips primitive.* (role-bypassing edits)
 * and dark.* (no light-mode preview to verify against). Within each section,
 * dimension/percentage fields sort by resolved numeric value ascending —
 * Object.keys() order is unreliable for numeric-string keys (e.g. space "1_5"
 * enumerates after "8" regardless of insertion order); colors/fonts keep
 * schema order. Unknown top-level branches throw loudly: a new schema branch
 * needs its own review, not silent inclusion or silent omission.
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {object} defaultsTree tokens.default.json tree (not mutated)
 * @returns {FieldDescriptor[]}
 */
export function buildFieldDescriptors(tokensTree, defaultsTree) {
  const known = new Set(SECTIONS.map((s) => s.key));
  /** @type {Map<string, FieldDescriptor[]>} */
  const bySection = new Map(SECTIONS.map((s) => [s.key, []]));
  for (const { path, leaf } of collectLeafPaths(tokensTree)) {
    if (path.startsWith("primitive.") || path.startsWith("dark.")) continue;
    const section = path.split(".").slice(0, 2).join(".");
    if (!known.has(section)) {
      throw new Error(`Unknown token section: "${section}" (path "${path}")`);
    }
    const defLeaf = getLeaf(defaultsTree, path);
    const rawValue = String(leaf.$value);
    const defRaw = defLeaf ? String(defLeaf.$value) : null;
    bySection.get(section).push({
      path,
      section,
      label: humanize(path.split(".").at(-1)),
      $type: leaf.$type,
      value: String(resolveValue(tokensTree, leaf.$value)),
      rawValue,
      isModified: defRaw === null ? true : rawValue !== defRaw,
      isAlias: rawValue.startsWith("{"),
    });
  }
  const numericFirst = (/** @type {FieldDescriptor[]} */ fields) => {
    const numeric = fields
      .filter((f) => f.$type === "dimension" || f.$type === "percentage")
      .sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
    const rest = fields.filter((f) => f.$type !== "dimension" && f.$type !== "percentage");
    // Numeric fields first (ascending), colors/fonts after in schema order —
    // matches how the sections read visually (scales, then roles).
    return [...numeric, ...rest];
  };
  return SECTIONS.flatMap((s) => numericFirst(bySection.get(s.key)));
}
