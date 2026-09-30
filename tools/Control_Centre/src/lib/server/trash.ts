import { execFile } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { resolveRunDir } from "./runs.ts";

export type Trasher = (absolutePath: string) => Promise<void>;

export type TrashRunResult =
  | { ok: true }
  | { ok: false; reason: "badRun" | "busy" | "notADirectory" | "trashFailed"; message?: string };

// Moves one run folder to the macOS Trash. Never deletes: the only
// filesystem operations here are a metadata check and the injected `trash`
// function. Order matters: the run ID is validated, liveness refuses the
// call, and the folder's shape is confirmed before anything is moved.
export async function trashRun(
  runsDir: string,
  runId: string,
  isBusy: () => boolean,
  trash: Trasher
): Promise<TrashRunResult> {
  const dir = resolveRunDir(runsDir, runId);
  if (dir === null) return { ok: false, reason: "badRun" };
  if (isBusy()) return { ok: false, reason: "busy" };
  let isDir = false;
  try {
    const stat = lstatSync(dir);
    isDir = stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    isDir = false;
  }
  if (!isDir) return { ok: false, reason: "notADirectory" };
  try {
    await trash(dir);
  } catch (err) {
    return { ok: false, reason: "trashFailed", message: err instanceof Error ? err.message : String(err) };
  }
  if (existsSync(dir)) {
    return { ok: false, reason: "trashFailed", message: "folder still exists after Trash" };
  }
  return { ok: true };
}

// The real trash: Finder's delete, which moves the folder to the Trash
// (restorable) instead of deleting it. The path travels as an argv argument,
// never inside the script text, and there is no shell. Not unit-tested: the
// owner exercises it by hand on a throwaway run.
export function trashWithFinder(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "osascript",
      [
        "-e",
        "on run argv",
        "-e",
        'tell application "Finder" to delete (POSIX file (item 1 of argv))',
        "-e",
        "end run",
        "--",
        dir
      ],
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve();
      }
    );
  });
}
