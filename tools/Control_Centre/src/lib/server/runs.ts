import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface RunEntry {
  id: string;
  ingestedAt: string;
}

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

// Every direct child folder with a readable metadata.json whose
// ingestedAt is a string, newest first. Anything else (a stray folder,
// a file, an unreadable or invalid metadata.json) is simply not a run.
// The client never sees a path.
export function listRuns(runsDir: string): RunEntry[] {
  if (!existsSync(runsDir)) return [];
  const runs: RunEntry[] = [];
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
    runs.push({ id, ingestedAt });
  }
  runs.sort((a, b) => (a.ingestedAt < b.ingestedAt ? 1 : a.ingestedAt > b.ingestedAt ? -1 : 0));
  return runs;
}

const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Returns the run's absolute path only for a syntactically safe ID that
// names a listed run; otherwise null. Every action taking a run ID goes
// through here, so no client-supplied path is ever built.
export function resolveRunDir(runsDir: string, runId: string): string | null {
  if (!RUN_ID_PATTERN.test(runId)) return null;
  if (runId.includes("..")) return null;
  if (!listRuns(runsDir).some((r) => r.id === runId)) return null;
  return join(runsDir, runId);
}

export interface RunSummary {
  id: string;
  title: string;
  artist: string | null;
  durationSec: number;
  sampleRate: number;
  channels: number;
}

// The metadata.json of a listed run, or null when a field is missing or
// has the wrong type (same field checks as the audio page's former
// readNewestRun). Takes an ID; never builds a path from a client value:
// callers pass an ID that came from listRuns/pickRun.
export function readRunSummary(runsDir: string, id: string): RunSummary | null {
  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(readFileSync(join(runsDir, id, "metadata.json"), "utf8"));
  } catch {
    return null;
  }
  if (
    typeof metadata.title !== "string" ||
    typeof metadata.durationSec !== "number" ||
    typeof metadata.sampleRate !== "number" ||
    typeof metadata.channels !== "number" ||
    (metadata.artist !== null && typeof metadata.artist !== "string")
  ) {
    return null;
  }
  return {
    id,
    title: metadata.title,
    artist: metadata.artist,
    durationSec: metadata.durationSec,
    sampleRate: metadata.sampleRate,
    channels: metadata.channels
  };
}

// Which run the page shows. requested is the raw ?run= value or null.
export function pickRun(runsDir: string, requested: string | null): { id: string | null; notFound: boolean } {
  const newest = listRuns(runsDir)[0]?.id ?? null;
  if (requested === null || requested === "") return { id: newest, notFound: false };
  if (resolveRunDir(runsDir, requested) !== null) return { id: requested, notFound: false };
  return { id: newest, notFound: true };
}
