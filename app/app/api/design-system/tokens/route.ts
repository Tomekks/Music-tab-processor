import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import {
  buildActiveBrand,
  resolveBrandDir,
  resolveBrandTree,
} from "../../../../packages/design-system/src/build-tokens.mjs";
import {
  VALID_ACTIONS,
  applyGenerateFromSeed,
  applyReset,
  applyResetAll,
  applyResetToParent,
  applySetAsDefault,
  applyWrite,
  stringifyTokens,
} from "../../../../packages/design-system/src/token-writes.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Atomic write: temp file in the same directory (same filesystem, so the
// rename is atomic), then rename over the real file. A crash mid-write can
// never leave a half-written token file behind.
function atomicWriteString(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, filePath);
}

function badRequest(error: string) {
  return Response.json({ ok: false, error }, { status: 400 });
}

const ACTION_LIST_ERROR = `action must be one of: ${VALID_ACTIONS.join(", ")}`;

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Request body is not valid JSON");
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Request body must be a JSON object");
    }
    const { action, path, value, neutralSeed, accentSeed } = body as {
      action?: unknown;
      path?: unknown;
      value?: unknown;
      neutralSeed?: unknown;
      accentSeed?: unknown;
    };
    if (typeof action !== "string" || !VALID_ACTIONS.includes(action)) {
      return badRequest(ACTION_LIST_ERROR);
    }
    // All file paths resolve from the active brand at request time — the
    // string "brands/default" appears nowhere here, so a second brand keeps
    // working without touching this route.
    const brandDir = resolveBrandDir();
    const readJson = (name: string) => JSON.parse(readFileSync(join(brandDir, name), "utf8"));

    switch (action) {
      case "write": {
        if (typeof path !== "string" || typeof value !== "string") {
          return badRequest('"write" requires "path" and "value" to be strings');
        }
        const result = applyWrite(readJson("tokens.json"), path, value);
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }
        atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
        buildActiveBrand();
        return Response.json({ ok: true });
      }
      case "reset": {
        if (typeof path !== "string") {
          return badRequest('"reset" requires "path" to be a string');
        }
        const result = applyReset(readJson("tokens.json"), readJson("tokens.default.json"), path);
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }
        atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
        buildActiveBrand();
        return Response.json({ ok: true });
      }
      case "reset-all": {
        const result = applyResetAll(readJson("tokens.json"), readJson("tokens.default.json"));
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }
        atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
        buildActiveBrand();
        return Response.json({ ok: true, reset: result.reset });
      }
      case "reset-to-parent": {
        if (typeof path !== "string") {
          return badRequest('"reset-to-parent" requires "path" to be a string');
        }
        const { parentBrandDir } = resolveBrandTree(brandDir);
        if (!parentBrandDir) {
          return badRequest('"reset-to-parent" is not valid for a brand with no parent');
        }
        const result = applyResetToParent(readJson("tokens.json"), path);
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }
        atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
        buildActiveBrand();
        return Response.json({ ok: true });
      }
      case "set-as-default": {
        if (typeof path !== "string") {
          return badRequest('"set-as-default" requires "path" to be a string');
        }
        const result = applySetAsDefault(
          readJson("tokens.json"),
          readJson("tokens.default.json"),
          path,
        );
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }
        atomicWriteString(join(brandDir, "tokens.default.json"), stringifyTokens(result.defaults));
        return Response.json({ ok: true });
      }
      case "generate-from-seed": {
        if (typeof neutralSeed !== "string" || typeof accentSeed !== "string") {
          return badRequest('"generate-from-seed" requires "neutralSeed" and "accentSeed" to be strings');
        }
        const { parentBrandDir } = resolveBrandTree(brandDir);
        if (parentBrandDir) {
          return badRequest('"generate-from-seed" is not valid for a child brand — generate on its parent brand instead');
        }
        const result = applyGenerateFromSeed(readJson("tokens.json"), neutralSeed, accentSeed);
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }
        atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
        buildActiveBrand();
        return Response.json({ ok: true });
      }
      default: {
        // Unreachable: VALID_ACTIONS gate above rejects anything else. Kept so
        // a future action added to VALID_ACTIONS without a case here fails
        // loudly at request time instead of falling through silently.
        return badRequest(ACTION_LIST_ERROR);
      }
    }
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
