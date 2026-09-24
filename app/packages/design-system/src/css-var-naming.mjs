// CSS custom-property naming for design tokens (extracted from build-tokens.mjs,
// Task 2 of the iteration-2 plan). Pure: no fs/path/url, no imports — safe to import
// from client code (`editor.tsx`), which cannot bundle `node:fs`. Same extraction
// pattern as `deep-merge.mjs`.

// Color keys that keep their bare CSS name instead of gaining a --color- prefix.
// This is globals.css's real, provably-not-derivable inconsistency, not a guess.
export const BARE_COLOR_KEYS = new Set(["background", "foreground"]);

// One-off leaf renames. Task 4: extend here, nowhere else.
export const LEAF_NAME_MAP = {
  "radius.base": "radius",
  "layout.sidebarWidth": "sidebar-width",
};

export function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function colorPropName(key) {
  return BARE_COLOR_KEYS.has(key) ? `--${key}` : `--color-${kebab(key)}`;
}

// A component.* leaf whose $value is a direct single reference to a
// theme-varying semantic color (a key present in the dark override block)
// must stay a live alias (emitted as var(--color-x), or in this module's
// other caller, copied as-is) instead of a resolved literal -- the alias
// re-resolves live, so [data-theme] overrides flow through automatically.
// Anything else (non-color leaves, theme-invariant colors like
// accent/onAccent) resolves to a literal exactly as before. Shared by
// generateCSS (build-tokens.mjs) and applyDuplicateBrand (token-writes.mjs)
// so the two never define this rule differently.
export function themeVaryingColorRef(leaf, themeVaryingKeys) {
  if (typeof leaf.$value !== "string") return null;
  const m = /^\{\s*semantic\.color\.([A-Za-z0-9_]+)\s*\}$/.exec(leaf.$value);
  if (!m) return null;
  return themeVaryingKeys.has(m[1]) ? m[1] : null;
}

/**
 * The exact CSS custom-property name generateCSS() emits for a given leaf
 * path (dot-joined, e.g. "semantic.color.accent", "component.button.
 * primaryBackground", "dark.semantic.color.surfaceHover"), or null for a
 * primitive.* leaf (alias-only by design, never emitted directly). Exported
 * (Task 6) so token-usage.test.mjs derives its expected var names from the
 * exact same logic generateCSS uses -- see that task's spec §0 for why a
 * second, independent copy of this naming logic was rejected.
 * @param {string} path
 * @returns {string | null}
 */
export function cssVarNameForPath(path) {
  const raw = path.startsWith("dark.") ? path.slice("dark.".length) : path;
  const segments = raw.split(".");
  const [top] = segments;
  if (top === "primitive") return null;
  if (top === "component") {
    return `--${segments.map(kebab).join("-")}`;
  }
  // top === "semantic"
  const section = segments[1];
  const key = segments[segments.length - 1];
  if (section === "color") {
    return BARE_COLOR_KEYS.has(key) ? `--${key}` : `--color-${kebab(key)}`;
  }
  if (section === "state" || section === "focus") {
    return `--${section}-${kebab(key)}`;
  }
  if (section === "radius") {
    return `--${LEAF_NAME_MAP[`radius.${key}`] ?? `radius-${kebab(key)}`}`;
  }
  if (section === "space") {
    return `--space-${key}`;
  }
  if (section === "layout") {
    return `--${LEAF_NAME_MAP[`layout.${key}`] ?? kebab(key)}`;
  }
  if (section === "typography") {
    return `--font-${kebab(key)}`;
  }
  return null;
}
