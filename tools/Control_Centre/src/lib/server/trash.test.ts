import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { trashRun } from "./trash.ts";

function makeRun(runsDir: string, id: string): string {
  const dir = join(runsDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "metadata.json"), JSON.stringify({ runId: id, ingestedAt: "2026-06-01T12:00:00" }));
  return dir;
}

function makeDirs(): { runsDir: string; trashDir: string } {
  const root = mkdtempSync(join(tmpdir(), "trash-"));
  const runsDir = join(root, "runs");
  const trashDir = join(root, "trash");
  mkdirSync(runsDir, { recursive: true });
  mkdirSync(trashDir, { recursive: true });
  return { runsDir, trashDir };
}

test("a bad run id never reaches the trash", async () => {
  const { runsDir } = makeDirs();
  makeRun(runsDir, "real-run-20260601-120000");
  const trashed: string[] = [];
  const fakeTrash = async (p: string): Promise<void> => {
    trashed.push(p);
  };
  assert.deepEqual(await trashRun(runsDir, "../x", () => false, fakeTrash), { ok: false, reason: "badRun" });
  assert.deepEqual(await trashRun(runsDir, "no-such-run", () => false, fakeTrash), { ok: false, reason: "badRun" });
  assert.deepEqual(trashed, []);
  assert.ok(existsSync(join(runsDir, "real-run-20260601-120000")));
});

test("a live stage means busy and the folder is untouched", async () => {
  const { runsDir } = makeDirs();
  makeRun(runsDir, "real-run-20260601-120000");
  const trashed: string[] = [];
  const fakeTrash = async (p: string): Promise<void> => {
    trashed.push(p);
  };
  assert.deepEqual(await trashRun(runsDir, "real-run-20260601-120000", () => true, fakeTrash), {
    ok: false,
    reason: "busy"
  });
  assert.deepEqual(trashed, []);
  assert.ok(existsSync(join(runsDir, "real-run-20260601-120000")));
});

test("a run folder that is a symlink is refused", async () => {
  const { runsDir } = makeDirs();
  makeRun(runsDir, "real-run-20260601-120000");
  symlinkSync(join(runsDir, "real-run-20260601-120000"), join(runsDir, "link-run"));
  const trashed: string[] = [];
  const fakeTrash = async (p: string): Promise<void> => {
    trashed.push(p);
  };
  assert.deepEqual(await trashRun(runsDir, "link-run", () => false, fakeTrash), {
    ok: false,
    reason: "notADirectory"
  });
  assert.deepEqual(trashed, []);
});

test("a file is not a listed run, so it reports badRun", async () => {
  const { runsDir } = makeDirs();
  writeFileSync(join(runsDir, "plain.txt"), "x");
  const trashed: string[] = [];
  const fakeTrash = async (p: string): Promise<void> => {
    trashed.push(p);
  };
  assert.deepEqual(await trashRun(runsDir, "plain.txt", () => false, fakeTrash), { ok: false, reason: "badRun" });
  assert.deepEqual(trashed, []);
});

test("a rejecting trash reports trashFailed with its message", async () => {
  const { runsDir } = makeDirs();
  makeRun(runsDir, "real-run-20260601-120000");
  const fakeTrash = async (): Promise<void> => {
    throw new Error("Finder said no");
  };
  assert.deepEqual(await trashRun(runsDir, "real-run-20260601-120000", () => false, fakeTrash), {
    ok: false,
    reason: "trashFailed",
    message: "Finder said no"
  });
  assert.ok(existsSync(join(runsDir, "real-run-20260601-120000")));
});

test("a trash that leaves the folder behind reports trashFailed", async () => {
  const { runsDir } = makeDirs();
  makeRun(runsDir, "real-run-20260601-120000");
  const fakeTrash = async (): Promise<void> => {};
  assert.deepEqual(await trashRun(runsDir, "real-run-20260601-120000", () => false, fakeTrash), {
    ok: false,
    reason: "trashFailed",
    message: "folder still exists after Trash"
  });
});

test("a trash that moves the folder away reports ok", async () => {
  const { runsDir, trashDir } = makeDirs();
  makeRun(runsDir, "real-run-20260601-120000");
  const fakeTrash = async (p: string): Promise<void> => {
    renameSync(p, join(trashDir, basename(p)));
  };
  assert.deepEqual(await trashRun(runsDir, "real-run-20260601-120000", () => false, fakeTrash), { ok: true });
  assert.ok(!existsSync(join(runsDir, "real-run-20260601-120000")));
  assert.ok(existsSync(join(trashDir, "real-run-20260601-120000")));
});
