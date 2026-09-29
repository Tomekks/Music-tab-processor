import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { isInsideRun, isSafeEntry } from "./stop.ts";

export interface StageDef {
  id: string;
  label: string;
  command: string[];
  argsFrom: "audioPath" | "runDir";
  requires: string[];
  produces: string[];
  // Run-folder-relative temp entries this stage may leave behind; deleted by Stop.
  temp: string[];
  // Relative folder inside the run folder to reveal in Finder.
  reveal: string;
}

export interface Manifest {
  version: number;
  stages: StageDef[];
}

// The whitelist: every command the server may run comes from this file.
export function loadManifest(path: string, opts: { python: string }): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`manifest not found or invalid JSON: ${path}`);
  }
  const stages = (raw as { stages?: unknown }).stages;
  if (!Array.isArray(stages)) throw new Error("manifest: stages must be an array");
  const seen = new Set<string>();
  return {
    version: (raw as { version?: number }).version ?? 1,
    stages: stages.map((s) => {
      const stage = s as Record<string, unknown>;
      if (typeof stage.id !== "string" || stage.id === "") throw new Error("manifest: stage id must be a string");
      if (seen.has(stage.id)) throw new Error(`manifest: duplicate stage id: ${stage.id}`);
      seen.add(stage.id);
      if (!Array.isArray(stage.command)) throw new Error(`manifest: command must be an array (${stage.id})`);
      for (const token of stage.command) {
        if (typeof token !== "string") throw new Error(`manifest: command tokens must be strings (${stage.id})`);
      }
      if (stage.argsFrom !== "audioPath" && stage.argsFrom !== "runDir") {
        throw new Error(`manifest: unknown argsFrom (${stage.id})`);
      }
      for (const key of ["requires", "produces", "temp"]) {
        const value = stage[key];
        if (!Array.isArray(value)) throw new Error(`manifest: ${key} must be an array (${stage.id})`);
        for (const entry of value) {
          if (typeof entry !== "string") throw new Error(`manifest: ${key} entries must be strings (${stage.id})`);
        }
      }
      for (const entry of stage.produces as string[]) {
        if (!isInsideRun(entry)) throw new Error(`manifest: unsafe produces entry (${stage.id}): ${entry}`);
      }
      for (const entry of stage.temp as string[]) {
        if (!isSafeEntry(entry)) throw new Error(`manifest: unsafe temp entry (${stage.id}): ${entry}`);
      }
      if (typeof stage.reveal !== "string") throw new Error(`manifest: reveal must be a string (${stage.id})`);
      if (isAbsolute(stage.reveal)) throw new Error(`manifest: reveal must be relative (${stage.id})`);
      if (stage.reveal.split("/").includes("..")) throw new Error(`manifest: reveal must not contain .. (${stage.id})`);
      return {
        id: stage.id,
        label: stage.label as string,
        command: (stage.command as string[]).map((t) => (t === "{python}" ? opts.python : t)),
        argsFrom: stage.argsFrom,
        requires: stage.requires as string[],
        produces: stage.produces as string[],
        temp: stage.temp as string[],
        reveal: stage.reveal
      };
    })
  };
}
