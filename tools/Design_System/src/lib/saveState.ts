export interface StagedEntryInput {
  was: string;
  now: string;
}

export type StagedMapInput = Record<string, StagedEntryInput>;

export interface SaveBody {
  edits: { path: string; value: string }[];
  loadedVersion: string;
}

export function buildSaveBody(staged: StagedMapInput, loadedVersion: string): SaveBody {
  return {
    edits: Object.entries(staged).map(([path, entry]) => ({ path, value: entry.now })),
    loadedVersion,
  };
}

export type SaveFailureKind = "changed" | "failed";

export interface SaveFailure {
  kind: SaveFailureKind;
  message: string;
}

export function describeSaveFailure(code: string | undefined, error: string | undefined): SaveFailure {
  if (code === "changed-on-disk") {
    return {
      kind: "changed",
      message: "tokens.json changed outside the workbench. Nothing was written.",
    };
  }
  if (code === "not-writable" || code === "write-failed" || code === "invalid") {
    const detail = typeof error === "string" && error !== "" ? ` ${error}` : "";
    return { kind: "failed", message: `Nothing was written.${detail}` };
  }
  return { kind: "failed", message: "Nothing was written. Couldn't save your changes." };
}

export function savedLabel(secondsLeft: number): string {
  return `Saved ${secondsLeft}`;
}

export interface RevertBeforeInput {
  path: string;
  was: string;
}

export function revertBody(before: RevertBeforeInput[], loadedVersion: string): SaveBody {
  return {
    edits: before.map((entry) => ({ path: entry.path, value: entry.was })),
    loadedVersion,
  };
}

export function discardedLabel(count: number): string {
  const noun = count === 1 ? "change" : "changes";
  return `Discarded ${count} ${noun}`;
}
