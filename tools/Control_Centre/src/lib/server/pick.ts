import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { nowIso } from "./records.ts";

export const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".flac", ".aac", ".ogg", ".aif", ".aiff", ".opus"];

export interface PickedFile {
  path: string;
  name: string;
  size: number;
  pickedAt: string;
}

export function pickedPath(dataDir: string): string {
  return join(dataDir, "picked.json");
}

// Pure parser for the osascript failure mode, so the cancel path is
// testable without opening a dialog. macOS spells it "cancelled" (two l's)
// and always carries the -128 error number.
export function isCancelError(text: string): boolean {
  return /user cancel/i.test(text) || text.includes("(-128)");
}

export type BrowseResult =
  | { cancelled: true }
  | { cancelled: false; failed: false; path: string }
  | { cancelled: false; failed: true; message: string };

export function browseForAudio(): Promise<BrowseResult> {
  return new Promise((resolve) => {
    execFile(
      "osascript",
      [
        "-e",
        'tell application "System Events"',
        "-e",
        "activate",
        "-e",
        'set f to choose file with prompt "Choose an audio file"',
        "-e",
        "POSIX path of f",
        "-e",
        "end tell"
      ],
      { timeout: 300000 },
      (error, stdout, stderr) => {
        if (error) {
          // Never throw: every Browse outcome must stay a plain action
          // result, never a 500 error page.
          if (isCancelError(`${stderr}\n${error.message}`)) {
            resolve({ cancelled: true });
            return;
          }
          resolve({ cancelled: false, failed: true, message: stderr.trim() || error.message });
          return;
        }
        resolve({ cancelled: false, failed: false, path: stdout.trim() });
      }
    );
  });
}

export function validatePickedPath(path: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Not a file: ${path}`);
  }
  if (!AUDIO_EXTENSIONS.includes(extname(path).toLowerCase())) {
    throw new Error(`Not a supported audio file: ${basename(path)}`);
  }
}

// Validates the path (s01 does the real audio validation) and remembers
// the pick server-side. Returns the client-safe shape (no path).
export function savePicked(dataDir: string, path: string): { name: string; size: number } {
  validatePickedPath(path);
  mkdirSync(dataDir, { recursive: true });
  const picked: PickedFile = { path, name: basename(path), size: statSync(path).size, pickedAt: nowIso() };
  writeFileSync(pickedPath(dataDir), JSON.stringify(picked), "utf8");
  return { name: picked.name, size: picked.size };
}

export function readPicked(dataDir: string): PickedFile | null {
  const path = pickedPath(dataDir);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as PickedFile;
}

export function readPickedForClient(dataDir: string): { name: string; size: number } | null {
  const picked = readPicked(dataDir);
  if (!picked) return null;
  return { name: picked.name, size: picked.size };
}

export function clearPicked(dataDir: string): void {
  rmSync(pickedPath(dataDir), { force: true });
}
