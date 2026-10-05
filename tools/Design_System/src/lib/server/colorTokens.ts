// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { buildFieldDescriptors } from "../../../../../app/packages/design-system/src/field-descriptors.mjs";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { cssVarNameForPath } from "../../../../../app/packages/design-system/src/css-var-naming.mjs";

export interface ColorToken {
  path: string;
  cssVar: string;
  value: string;
  description: string;
  dependents: string[];
}

export function listColorTokens(tree: object): ColorToken[] {
  const descriptors = buildFieldDescriptors(tree, tree);
  const colorDescriptors = descriptors.filter((descriptor) => descriptor.$type === "color");
  return descriptors
    .filter((descriptor) => descriptor.$type === "color" && descriptor.section.startsWith("semantic."))
    .map((descriptor) => ({
      path: descriptor.path,
      cssVar: cssVarNameForPath(descriptor.path) as string,
      value: descriptor.value,
      description: descriptor.description,
      dependents: colorDescriptors
        .filter(
          (other) => other.path !== descriptor.path && other.rawValue === `{${descriptor.path}}`
        )
        .map((other) => cssVarNameForPath(other.path) as string),
    }));
}
