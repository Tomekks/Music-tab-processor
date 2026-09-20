// Shared by contrast.test.mjs (dark.semantic.* overlaying semantic.*) and
// build-tokens.mjs's resolveBrandTree (a child brand's tokens.json overlaying
// its parent's) -- same "leaf-level override, deep-merge structure" shape in
// both places, extracted so the two never drift from each other.

/**
 * @param {object} base
 * @param {object} override
 * @returns {object} a new object; neither input is mutated
 */
export function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override ?? {})) {
    out[key] =
      base?.[key] !== null && typeof base?.[key] === "object" && override[key] !== null && typeof override[key] === "object" && !("$value" in override[key])
        ? deepMerge(base[key], override[key])
        : override[key];
  }
  return out;
}
