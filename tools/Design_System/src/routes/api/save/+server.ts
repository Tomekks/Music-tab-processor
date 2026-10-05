import { json } from "@sveltejs/kit";
// @ts-ignore - untyped package helper (checkJs is off by owner decision)
import { saveTokenEdits } from "../../../../../../app/packages/design-system/src/save-tokens.mjs";
import { brandDir, regenerateFor } from "$lib/server/brandDir.js";

export async function POST({ request }: { request: Request }) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return json(
        { ok: false, code: "invalid", error: err instanceof Error ? err.message : String(err) },
        { status: 400 },
      );
    }
    const edits = (body as { edits?: unknown } | null)?.edits;
    const loadedVersion = (body as { loadedVersion?: unknown } | null)?.loadedVersion;
    if (!Array.isArray(edits) || edits.length === 0 || typeof loadedVersion !== "string") {
      return json(
        { ok: false, code: "invalid", error: "Body must include a non-empty edits array and a loadedVersion string" },
        { status: 400 },
      );
    }
    const result = saveTokenEdits({
      brandDir: brandDir(),
      loadedVersion,
      edits,
      regenerate: regenerateFor(),
    });
    if (result.ok) return json(result, { status: 200 });
    if (result.code === "changed-on-disk") return json(result, { status: 409 });
    if (result.code === "invalid") return json(result, { status: 400 });
    return json(result, { status: 500 });
  } catch (err) {
    return json(
      { ok: false, code: "write-failed", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
