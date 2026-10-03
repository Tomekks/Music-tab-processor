import type { RunRecord } from "./records.ts";

export interface StageStats {
  done: number;
  failed: number;
  stopped: number;
  minSec: number | null;
  medianSec: number | null;
  maxSec: number | null;
}

export function stageDurations(records: RunRecord[]): Record<string, StageStats> {
  const lastByExec = new Map<string, RunRecord>();
  for (const record of records) {
    if (record.type !== "finished") continue;
    lastByExec.set(record.execId, record);
  }
  const counts = new Map<string, { done: number; failed: number; stopped: number; durations: number[] }>();
  for (const record of lastByExec.values()) {
    if (record.outcome === undefined) continue;
    let entry = counts.get(record.stage);
    if (entry === undefined) {
      entry = { done: 0, failed: 0, stopped: 0, durations: [] };
      counts.set(record.stage, entry);
    }
    if (record.outcome === "done") {
      entry.done += 1;
      if (typeof record.durationSec === "number" && Number.isFinite(record.durationSec)) {
        entry.durations.push(record.durationSec);
      }
    } else if (record.outcome === "failed") {
      entry.failed += 1;
    } else if (record.outcome === "stopped" || record.outcome === "interrupted") {
      entry.stopped += 1;
    }
  }
  const result: Record<string, StageStats> = {};
  for (const [stage, entry] of counts) {
    const sorted = [...entry.durations].sort((a, b) => a - b);
    let minSec: number | null = null;
    let medianSec: number | null = null;
    let maxSec: number | null = null;
    if (sorted.length > 0) {
      minSec = sorted[0];
      maxSec = sorted[sorted.length - 1];
      const mid = Math.floor(sorted.length / 2);
      medianSec = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    result[stage] = {
      done: entry.done,
      failed: entry.failed,
      stopped: entry.stopped,
      minSec,
      medianSec,
      maxSec,
    };
  }
  return result;
}
