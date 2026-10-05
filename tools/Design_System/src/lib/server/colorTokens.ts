// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { buildFieldDescriptors } from "../../../../../app/packages/design-system/src/field-descriptors.mjs";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { cssVarNameForPath } from "../../../../../app/packages/design-system/src/css-var-naming.mjs";

export interface ColorToken {
  path: string;
  cssVar: string;
  value: string;
  description: string;
  section: string;
  dependents: string[];
}

export function listColorTokens(tree: object): ColorToken[] {
  const descriptors = buildFieldDescriptors(tree, tree);
  const colorDescriptors = descriptors.filter((descriptor) => descriptor.$type === "color");
  const directDependents = (path: string) =>
    colorDescriptors.filter(
      (other) => other.path !== path && other.rawValue === `{${path}}`
    );
  const transitiveDependents = (path: string): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    const queue = directDependents(path);
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (seen.has(next.path)) continue;
      seen.add(next.path);
      result.push(cssVarNameForPath(next.path) as string);
      for (const follow of directDependents(next.path)) {
        if (!seen.has(follow.path)) queue.push(follow);
      }
    }
    return result;
  };
  return descriptors
    .filter((descriptor) => descriptor.$type === "color" && descriptor.section.startsWith("semantic."))
    .map((descriptor) => ({
      path: descriptor.path,
      cssVar: cssVarNameForPath(descriptor.path) as string,
      value: descriptor.value,
      description: descriptor.description,
      section: descriptor.section,
      dependents: transitiveDependents(descriptor.path),
    }));
}
