import { execFile } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
// testable without opening a dialog.
export function isCancelError(stderr: string): boolean {
  return stderr.includes("User canceled");
}

export function browseForAudio(): Promise<{ cancelled: true } | { cancelled: false; path: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      "osascript",
      ["-e", 'POSIX path of (choose file with prompt "Choose an audio file")'],
      { timeout: 300000 },
      (error, stdout, stderr) => {
        if (error) {
          if (isCancelError(stderr)) {
            resolve({ cancelled: true });
            return;
          }
          reject(new Error(`Browse failed: ${stderr.trim() || error.message}`));
          return;
        }
        resolve({ cancelled: false, path: stdout.trim() });
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
