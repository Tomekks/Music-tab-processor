import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Returns the run ID (folder name) of the newest run whose ingestedAt
// (local time, second precision, no tz) is at or after startedAt
// truncated to the second; null if none. The client never sees a path.
export function findRunDir(runsDir: string, startedAt: string): string | null {
  if (!existsSync(runsDir)) return null;
  const startedTrunc = startedAt.slice(0, 19);
  let best: { id: string; ingestedAt: string } | null = null;
  for (const id of readdirSync(runsDir)) {
    const metaPath = join(runsDir, id, "metadata.json");
    if (!existsSync(metaPath)) continue;
    let ingestedAt: unknown;
    try {
      ingestedAt = (JSON.parse(readFileSync(metaPath, "utf8")) as { ingestedAt?: unknown }).ingestedAt;
    } catch {
      continue;
    }
    if (typeof ingestedAt !== "string") continue;
    if (ingestedAt < startedTrunc) continue;
    if (best === null || ingestedAt > best.ingestedAt) best = { id, ingestedAt };
  }
  return best?.id ?? null;
}
