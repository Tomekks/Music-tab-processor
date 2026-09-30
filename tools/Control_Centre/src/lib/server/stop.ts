import { existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { StageDef } from "./manifest.ts";

// The structural rule: a name is inside the run folder only if it is a plain
// relative path whose every segment is real (no "", ".", ".."). The name can
// never point at the run folder itself, or outside it.
export function isInsideRun(name: string): boolean {
  if (name === "") return false;
  if (name.startsWith("/")) return false;
  const segments = name.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") return false;
  }
  return true;
}

// The deletion guard: inside the run folder AND not a protected name. The
// filesystem is case-insensitive, so the protected-name check is too.
export function isSafeEntry(name: string): boolean {
  if (!isInsideRun(name)) return false;
  const segments = name.split("/");
  const base = segments[segments.length - 1].toLowerCase();
  if (base === "metadata.json") return false;
  if (base.startsWith("source.")) return false;
  return true;
}

// Deletes only the stage's own files under `runDir`: produces files this
// execution wrote (mtime at/after startedAtMs) plus its known temp entries.
// Every name is re-checked with isSafeEntry at delete time, so a bad manifest
// cannot remove a protected file or the run folder itself. dryRun returns the
// same list without touching anything.
export function deleteStageOutputs(
  stage: StageDef,
  runDir: string,
  startedAtMs: number,
  opts: { dryRun?: boolean } = {}
): { deleted: string[] } {
  const dryRun = opts.dryRun === true;
  const deleted: string[] = [];

  for (const entry of stage.produces) {
    if (!isSafeEntry(entry)) continue;
    const path = join(runDir, entry);
    let mtimeMs: number;
    try {
      const stat = statSync(path);
      if (!stat.isFile()) continue;
      mtimeMs = stat.mtimeMs;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
    if (mtimeMs < startedAtMs) continue;
    if (!dryRun) rmSync(path, { force: true });
    deleted.push(entry);
  }

  for (const entry of stage.temp) {
    if (!isSafeEntry(entry)) continue;
    const path = join(runDir, entry);
    if (!existsSync(path)) continue;
    if (!dryRun) rmSync(path, { recursive: true, force: true });
    deleted.push(entry);
  }

  return { deleted };
}

// What the page refresh shows for Stop: the same list a real delete would
// remove, computed without touching anything. The page load must only call
// this, never deleteStageOutputs.
export function previewStageOutputs(stage: StageDef, runDir: string, startedAtMs: number): { deleted: string[] } {
  return deleteStageOutputs(stage, runDir, startedAtMs, { dryRun: true });
}
