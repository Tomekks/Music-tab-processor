import type { Handle } from "@sveltejs/kit";
import { ALLOWED_HOSTS, DATA_DIR, MANIFEST_PATH, PIPELINE_ROOT, PYTHON, RUNS_DIR } from "./lib/server/config.ts";
import { advanceChain, ensureChainTicker, readChain } from "./lib/server/chain.ts";
import { loadManifest } from "./lib/server/manifest.ts";
import { isRequestAllowed } from "./lib/server/origin.ts";
import { reconcile } from "./lib/server/runner.ts";

export const handle: Handle = async ({ event, resolve }) => {
  const allowed = isRequestAllowed(
    event.request.method,
    event.request.headers.get("host"),
    event.request.headers.get("origin"),
    ALLOWED_HOSTS
  );
  if (!allowed) return new Response("Forbidden", { status: 403 });
  return resolve(event);
};

// Records a run that ended while the server was down as soon as it starts.
// A missing manifest means this slice was never installed; fail loudly, not silently.
export async function init(): Promise<void> {
  const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
  const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
  reconcile(manifest, dirs);
  advanceChain(manifest, dirs);
  if (readChain(DATA_DIR) !== null) ensureChainTicker(manifest, dirs);
}
