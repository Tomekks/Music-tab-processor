// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { buildFieldDescriptors, SECTIONS } from "../../../../../app/packages/design-system/src/field-descriptors.mjs";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { cssVarNameForPath } from "../../../../../app/packages/design-system/src/css-var-naming.mjs";

export interface OtherToken {
  path: string;
  cssVar: string;
  value: string;
  rawValue: string;
  description: string;
  isAlias: boolean;
}

export interface OtherTokenGroup {
  key: string;
  section: string;
  heading: string;
  tokens: OtherToken[];
}

const GROUP_ORDER = [
  "semantic.space",
  "semantic.radius",
  "semantic.typography",
  "semantic.state",
  "semantic.focus",
  "semantic.layout",
];

export function listOtherTokenGroups(tree: object): OtherTokenGroup[] {
  const descriptors = buildFieldDescriptors(tree, tree);
  const others = descriptors.filter(
    (descriptor) => descriptor.$type !== "color" && descriptor.section.startsWith("semantic.")
  );
  const groups: OtherTokenGroup[] = [];
  for (const section of GROUP_ORDER) {
    const sectionTokens = others.filter((descriptor) => descriptor.section === section);
    if (sectionTokens.length === 0) continue;
    const heading = SECTIONS.find((entry) => entry.key === section)?.heading ?? section;
    const key = section.split(".").at(-1) as string;
    groups.push({
      key,
      section,
      heading,
      tokens: sectionTokens.map((descriptor) => ({
        path: descriptor.path,
        cssVar: cssVarNameForPath(descriptor.path) as string,
        value: descriptor.value,
        rawValue: descriptor.rawValue,
        description: descriptor.description,
        isAlias: descriptor.isAlias,
      })),
    });
  }
  return groups;
}
