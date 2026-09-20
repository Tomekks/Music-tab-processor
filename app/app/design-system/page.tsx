import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBrandDir } from "../../packages/design-system/src/build-tokens.mjs";
import { buildFieldDescriptors } from "../../packages/design-system/src/field-descriptors.mjs";
import { Editor } from "./editor";

export const dynamic = "force-dynamic";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const brandDir = resolveBrandDir();
  const tokens = JSON.parse(readFileSync(join(brandDir, "tokens.json"), "utf8"));
  const defaults = JSON.parse(readFileSync(join(brandDir, "tokens.default.json"), "utf8"));
  return <Editor descriptors={buildFieldDescriptors(tokens, defaults)} />;
}
