import { readFileSync } from "node:fs";

export interface StageDef {
  id: string;
  label: string;
  command: string[];
  argsFrom: "audioPath" | "runDir";
  requires: string[];
  produces: string[];
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
      for (const key of ["requires", "produces"] as const) {
        if (!Array.isArray(stage[key])) throw new Error(`manifest: ${key} must be an array (${stage.id})`);
      }
      return {
        id: stage.id,
        label: stage.label as string,
        command: (stage.command as string[]).map((t) => (t === "{python}" ? opts.python : t)),
        argsFrom: stage.argsFrom,
        requires: stage.requires as string[],
        produces: stage.produces as string[]
      };
    })
  };
}
