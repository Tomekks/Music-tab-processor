import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  resolveBrandDir,
  resolveBrandDirForSlug,
  resolveBrandTree,
  listBrands,
} from "../../packages/design-system/src/build-tokens.mjs";
import { buildFieldDescriptors } from "../../packages/design-system/src/field-descriptors.mjs";
import { Editor } from "./editor";

export const dynamic = "force-dynamic";

export default async function DesignSystemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const { brand: rawBrand } = await searchParams;
  const brands = listBrands();
  let brandDir: string;
  let selectedBrand: string;
  if (typeof rawBrand === "string") {
    if (!brands.includes(rawBrand)) notFound();
    brandDir = resolveBrandDirForSlug(rawBrand);
    selectedBrand = rawBrand;
  } else {
    brandDir = resolveBrandDir();
    selectedBrand = basename(brandDir);
  }
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
      key={selectedBrand}
      descriptors={descriptors}
      isChildBrand={parentBrandDir !== null}
      parentName={parentBrandDir ? basename(parentBrandDir) : null}
      brands={brands}
      selectedBrand={selectedBrand}
    />
  );
}
