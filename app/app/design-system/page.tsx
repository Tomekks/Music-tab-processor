import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { resolveBrandDir, resolveBrandTree } from "../../packages/design-system/src/build-tokens.mjs";
import { buildFieldDescriptors } from "../../packages/design-system/src/field-descriptors.mjs";
import { Editor } from "./editor";

export const dynamic = "force-dynamic";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const brandDir = resolveBrandDir();
  const { tree, parentBrandDir } = resolveBrandTree(brandDir);
  // tokens.default.json exists only for root brands — reading it for a child
  // brand would crash with ENOENT (and the concept doesn't apply there: no
  // child-level defaults file exists, by design).
  const descriptors = parentBrandDir
    ? buildFieldDescriptors(
        tree,
        {}, // ignored when ownTree is passed — see field-descriptors.mjs
        JSON.parse(readFileSync(join(brandDir, "tokens.json"), "utf8")),
      )
    : buildFieldDescriptors(
        tree,
        JSON.parse(readFileSync(join(brandDir, "tokens.default.json"), "utf8")),
      );
  return (
    <Editor
      descriptors={descriptors}
      isChildBrand={parentBrandDir !== null}
      parentName={parentBrandDir ? basename(parentBrandDir) : null}
    />
  );
}
