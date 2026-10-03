import test from "node:test";
import assert from "node:assert/strict";
import type { RunRecord } from "./records.ts";
import { stageDurations } from "./stats.ts";

function finished(execId: string, stage: string, outcome?: RunRecord["outcome"], durationSec?: number): RunRecord {
  const record: RunRecord = {
    schemaVersion: 1,
    type: "finished",
    execId,
    stage,
    startedAt: "2026-09-30T10:00:00+02:00",
    finishedAt: "2026-09-30T10:00:05+02:00",
    outcome,
  };
  if (durationSec !== undefined) record.durationSec = durationSec;
  return record;
}

function started(execId: string, stage: string): RunRecord {
  return {
    schemaVersion: 1,
    type: "started",
    execId,
    stage,
    startedAt: "2026-09-30T10:00:00+02:00",
  };
}

test("empty input gives {}", () => {
  assert.deepEqual(stageDurations([]), {});
});

test("one done run: counts and min = median = max", () => {
  assert.deepEqual(stageDurations([finished("a", "s01", "done", 5)]), {
    s01: { done: 1, failed: 0, stopped: 0, minSec: 5, medianSec: 5, maxSec: 5 },
  });
});

test("odd number of done runs: median is the middle one", () => {
  const records = [
    finished("a", "s01", "done", 3),
    finished("b", "s01", "done", 1),
    finished("c", "s01", "done", 2),
  ];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 3, failed: 0, stopped: 0, minSec: 1, medianSec: 2, maxSec: 3 },
  });
});

test("even number: median is the mean of the two middle values", () => {
  const records = [
    finished("a", "s01", "done", 1),
    finished("b", "s01", "done", 4),
    finished("c", "s01", "done", 2),
    finished("d", "s01", "done", 3),
  ];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 4, failed: 0, stopped: 0, minSec: 1, medianSec: 2.5, maxSec: 4 },
  });
});

test("interrupted then stopped for the same execId counts as one stopped run", () => {
  const records = [
    finished("a", "s01", "interrupted", 9),
    finished("a", "s01", "stopped"),
  ];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 0, failed: 0, stopped: 1, minSec: null, medianSec: null, maxSec: null },
  });
});

test("a failed run is counted but its duration is not in min/median/max", () => {
  const records = [
    finished("a", "s01", "done", 4),
    finished("b", "s01", "failed", 100),
  ];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 1, failed: 1, stopped: 0, minSec: 4, medianSec: 4, maxSec: 4 },
  });
});

test("a started record with no finished record is ignored", () => {
  assert.deepEqual(stageDurations([started("a", "s01")]), {});
});

test("a done run without durationSec counts as done but stays out of the durations", () => {
  const records = [finished("a", "s01", "done"), finished("b", "s01", "done", 6)];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 2, failed: 0, stopped: 0, minSec: 6, medianSec: 6, maxSec: 6 },
  });
});

test("two stages are summarized separately", () => {
  const records = [
    finished("a", "s01", "done", 2),
    finished("b", "s01", "done", 4),
    finished("c", "s02", "done", 10),
    finished("d", "s02", "failed", 99),
  ];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 2, failed: 0, stopped: 0, minSec: 2, medianSec: 3, maxSec: 4 },
    s02: { done: 1, failed: 1, stopped: 0, minSec: 10, medianSec: 10, maxSec: 10 },
  });
});

test("the last finished record per execId wins, and a lone interrupted run counts as stopped", () => {
  const records = [
    finished("a", "s01", "failed", 3),
    finished("a", "s01", "done", 5),
    finished("b", "s01", "interrupted"),
  ];
  assert.deepEqual(stageDurations(records), {
    s01: { done: 1, failed: 0, stopped: 1, minSec: 5, medianSec: 5, maxSec: 5 },
  });
});
