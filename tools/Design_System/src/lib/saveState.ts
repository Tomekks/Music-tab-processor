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

function timeLabel(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function savedLabel(count: number, date: Date): string {
  const noun = count === 1 ? "token" : "tokens";
  return `Saved ${count} ${noun} ${timeLabel(date)}`;
}

export function discardedLabel(count: number): string {
  const noun = count === 1 ? "change" : "changes";
  return `Discarded ${count} ${noun}`;
}
