import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type RecordType = "started" | "finished";
export type Outcome = "done" | "failed" | "interrupted";

export interface RunRecord {
  schemaVersion: 1;
  type: RecordType;
  execId: string;
  stage: string;
  startedAt: string;
  finishedAt?: string;
  runId?: string | null;
  exitCode?: number | null;
  outcome?: Outcome;
  durationSec?: number;
  logFile?: string;
  command?: string[];
  reason?: string;
}

// Local ISO timestamp with a numeric timezone offset (e.g. +02:00), never bare UTC.
export function nowIso(date: Date = new Date()): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const pad = (n: number): string => String(Math.abs(n)).padStart(2, "0");
  const shifted = new Date(date.getTime() + offsetMin * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}${sign}${pad(Math.floor(Math.abs(offsetMin) / 60))}:${pad(Math.abs(offsetMin) % 60)}`;
}

export function recordsPath(dataDir: string): string {
  return join(dataDir, "records.jsonl");
}

// Append-only; the server is the only writer.
export function appendRecord(dataDir: string, record: RunRecord): void {
  mkdirSync(dataDir, { recursive: true });
  appendFileSync(recordsPath(dataDir), JSON.stringify(record) + "\n", "utf8");
}

export function readRecords(dataDir: string): RunRecord[] {
  const path = recordsPath(dataDir);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as RunRecord);
}

export function hasFinishedRecord(records: RunRecord[], execId: string): boolean {
  return records.some((r) => r.type === "finished" && r.execId === execId);
}
