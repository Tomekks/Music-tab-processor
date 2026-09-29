import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRecord, hasFinishedRecord, nowIso, readRecords } from "./records.ts";

test("append + read back keeps schemaVersion and execId", () => {
  const dir = mkdtempSync(join(tmpdir(), "records-"));
  appendRecord(dir, { schemaVersion: 1, type: "started", execId: "abc", stage: "s01_ingest", startedAt: nowIso() });
  const records = readRecords(dir);
  assert.equal(records.length, 1);
  assert.equal(records[0].schemaVersion, 1);
  assert.equal(records[0].execId, "abc");
  assert.equal(hasFinishedRecord(records, "abc"), false);
  appendRecord(dir, {
    schemaVersion: 1, type: "finished", execId: "abc", stage: "s01_ingest",
    startedAt: records[0].startedAt, finishedAt: nowIso(), runId: null,
    exitCode: 0, outcome: "done", durationSec: 1, logFile: "s01_ingest.log", command: ["ingest.py"]
  });
  assert.equal(hasFinishedRecord(readRecords(dir), "abc"), true);
});

test("timestamps carry a timezone offset", () => {
  assert.match(nowIso(), /([+-]\d{2}:\d{2}|Z)$/);
  assert.match(nowIso(new Date("2026-01-15T10:30:00Z")), /T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/);
});
