import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Manifest } from "./manifest.ts";
import { resolveRunDir } from "./runs.ts";

// The absolute folder to reveal in Finder, or null. The path is built only
// from resolveRunDir's accepted run ID plus the stage's manifest-declared
// reveal folder, and must exist as a directory.
export function resolveRevealDir(
  manifest: Manifest,
  stageId: string,
  runId: string,
  runsDir: string
): string | null {
  const stage = manifest.stages.find((s) => s.id === stageId);
  if (!stage) return null;
  const runDir = resolveRunDir(runsDir, runId);
  if (runDir === null) return null;
  const dir = join(runDir, stage.reveal);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  return dir;
}

// Opens an absolute folder in Finder. No shell and no interpolation: `dir`
// is always the absolute path resolveRevealDir returned, so it cannot be
// read as an option.
export function openInFinder(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("open", [dir], (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }
      resolve();
    });
  });
}
