// Reference resolver for design tokens.
// Follows `{path.to.token}` references to their final literal value.
// Any value that isn't a `{...}` string passes through unchanged.

export function resolveValue(tree, value, path = []) {
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) {
    return value;
  }
  const ref = value.slice(1, -1).trim();
  if (path.includes(ref)) {
    throw new Error(`Circular token reference: ${[...path, ref].join(" -> ")}`);
  }
  let node = tree;
  for (const segment of ref.split(".")) {
    if (node === null || typeof node !== "object" || !Object.hasOwn(node, segment)) {
      throw new Error(`Token reference not found: {${ref}}`);
    }
    node = node[segment];
  }
  if (node === null || typeof node !== "object" || !Object.hasOwn(node, "$value")) {
    throw new Error(`Token reference {${ref}} does not resolve to a token`);
  }
  return resolveValue(tree, node.$value, [...path, ref]);
}
