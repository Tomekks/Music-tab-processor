import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readTokens, saveTokenEdits } from "./save-tokens.mjs";
import { resolveBrandDir } from "./build-tokens.mjs";
import { getLeaf, stringifyTokens } from "./token-writes.mjs";

const realDefaultDir = () => resolveBrandDir();

// Fresh temp copy of the real default brand's tokens.json (never the real file).
// Only tokens.json (+ optional brand.json) — no CSS, no active-brand pointer.
function makeTempBrand() {
  const dir = mkdtempSync(join(tmpdir(), "save-tokens-test-"));
  const originalText = readFileSync(join(realDefaultDir(), "tokens.json"), "utf8");
  writeFileSync(join(dir, "tokens.json"), originalText, "utf8");
  return { dir, originalText };
}

function makeTempChildBrand() {
  const { dir, originalText } = makeTempBrand();
  writeFileSync(join(dir, "brand.json"), JSON.stringify({ parent: "default" }, null, 2) + "\n", "utf8");
  return { dir, originalText };
}

const noopRegenerate = () => {};

test("readTokens returns the tree and a hash that changes when the file changes", () => {
  const { dir } = makeTempBrand();
  const first = readTokens(dir);
  assert.equal(getLeaf(first.tree, "primitive.color.accent").$value, "#ae97f7");
  assert.match(first.version, /^[0-9a-f]{64}$/);
  // Change the file on disk: the hash must change too.
  const changedText = readFileSync(join(dir, "tokens.json"), "utf8").replace("#ae97f7", "#000000");
  assert.notEqual(changedText, readFileSync(join(dir, "tokens.json"), "utf8").replace("#ae97f7", "#ae97f7"));
  writeFileSync(join(dir, "tokens.json"), changedText, "utf8");
  const second = readTokens(dir);
  assert.notEqual(second.version, first.version);
  assert.equal(getLeaf(second.tree, "primitive.color.accent").$value, "#000000");
});

test("saveTokenEdits saves, rebuilds, and returns a new version that allows a second save", () => {
  const { dir } = makeTempBrand();
  let rebuilds = 0;
  const { tree, version } = readTokens(dir);
  assert.ok(tree);
  const first = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "primitive.color.accent", value: "#111111" }],
    regenerate: () => { rebuilds++; },
  });
  assert.equal(first.ok, true);
  assert.equal(first.saved, 1);
  assert.match(first.version, /^[0-9a-f]{64}$/);
  assert.notEqual(first.version, version);
  assert.equal(rebuilds, 1);
  assert.equal(getLeaf(readTokens(dir).tree, "primitive.color.accent").$value, "#111111");
  assert.ok(existsSync(join(dir, ".needs-deploy")));
  // The returned version chains: a second save with it succeeds.
  const second = saveTokenEdits({
    brandDir: dir,
    loadedVersion: first.version,
    edits: [{ path: "primitive.color.accent", value: "#222222" }],
    regenerate: () => { rebuilds++; },
  });
  assert.equal(second.ok, true);
  assert.equal(rebuilds, 2);
  assert.equal(getLeaf(readTokens(dir).tree, "primitive.color.accent").$value, "#222222");
});

test("saveTokenEdits changes only the edited values (every other byte of the file is unchanged)", () => {
  const { dir, originalText } = makeTempBrand();
  const { version } = readTokens(dir);
  const result = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "semantic.color.border", value: "#123456" }],
    regenerate: noopRegenerate,
  });
  assert.equal(result.ok, true);
  const newText = readFileSync(join(dir, "tokens.json"), "utf8");
  assert.match(newText, /#123456/);
  // Reverting just the edited leaf and re-serializing must give back the original bytes.
  const newTree = JSON.parse(newText);
  getLeaf(newTree, "semantic.color.border").$value = getLeaf(JSON.parse(originalText), "semantic.color.border").$value;
  assert.equal(stringifyTokens(newTree), originalText);
});

test("saveTokenEdits refuses an invalid value and an unknown path and writes nothing", () => {
  const { dir, originalText } = makeTempBrand();
  const { version } = readTokens(dir);
  const badValue = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "primitive.color.accent", value: "blue" }],
    regenerate: noopRegenerate,
  });
  assert.equal(badValue.ok, false);
  assert.equal(badValue.code, "invalid");
  const unknownPath = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "semantic.nope", value: "#000000" }],
    regenerate: noopRegenerate,
  });
  assert.equal(unknownPath.ok, false);
  assert.equal(unknownPath.code, "invalid");
  assert.equal(readFileSync(join(dir, "tokens.json"), "utf8"), originalText);
});

test("saveTokenEdits refuses a read-only file with not-writable and writes nothing", () => {
  const { dir, originalText } = makeTempBrand();
  const { version } = readTokens(dir);
  const file = join(dir, "tokens.json");
  chmodSync(file, 0o444);
  try {
    const result = saveTokenEdits({
      brandDir: dir,
      loadedVersion: version,
      edits: [{ path: "primitive.color.accent", value: "#123123" }],
      regenerate: noopRegenerate,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "not-writable");
    assert.equal(readFileSync(file, "utf8"), originalText);
  } finally {
    chmodSync(file, 0o644);
  }
});

test("saveTokenEdits refuses when the file changed since it was read, names tokens.json, and does not overwrite", () => {
  const { dir } = makeTempBrand();
  const { version } = readTokens(dir);
  // Someone else (git, another session) edits the file between read and save.
  const otherText = readFileSync(join(dir, "tokens.json"), "utf8").replace("#ae97f7", "#999999");
  writeFileSync(join(dir, "tokens.json"), otherText, "utf8");
  const result = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "primitive.color.accent", value: "#111111" }],
    regenerate: () => { throw new Error("must not rebuild on a refused save"); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "changed-on-disk");
  assert.match(result.error, /tokens\.json/);
  assert.equal(readFileSync(join(dir, "tokens.json"), "utf8"), otherText);
});

test("saveTokenEdits puts the old file back when regenerating fails", () => {
  const { dir, originalText } = makeTempBrand();
  const { version } = readTokens(dir);
  const result = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "primitive.color.accent", value: "#123456" }],
    regenerate: () => { throw new Error("css boom"); },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "write-failed");
  assert.match(result.error, /css boom/);
  assert.equal(readFileSync(join(dir, "tokens.json"), "utf8"), originalText);
  const leftovers = readdirSync(dir).filter((name) => name.includes(".tmp-"));
  assert.deepEqual(leftovers, []);
});

test("saveTokenEdits refuses a child brand", () => {
  const { dir, originalText } = makeTempChildBrand();
  const { version } = readTokens(dir);
  const result = saveTokenEdits({
    brandDir: dir,
    loadedVersion: version,
    edits: [{ path: "primitive.color.accent", value: "#123456" }],
    regenerate: noopRegenerate,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "invalid");
  assert.equal(readFileSync(join(dir, "tokens.json"), "utf8"), originalText);
});

test("saveTokenEdits refuses an unreadable tokens.json and a brand that is not the active one when regenerate is not injected", () => {
  // Missing tokens.json.
  const emptyDir = mkdtempSync(join(tmpdir(), "save-tokens-test-"));
  const missing = saveTokenEdits({
    brandDir: emptyDir,
    loadedVersion: "deadbeef",
    edits: [{ path: "primitive.color.accent", value: "#123456" }],
    regenerate: noopRegenerate,
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "invalid");
  assert.match(missing.error, /tokens\.json/);
  // Invalid JSON.
  const { dir, originalText } = makeTempBrand();
  writeFileSync(join(dir, "tokens.json"), "not json{{{", "utf8");
  const invalid = saveTokenEdits({
    brandDir: dir,
    loadedVersion: "deadbeef",
    edits: [{ path: "primitive.color.accent", value: "#123456" }],
    regenerate: noopRegenerate,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, "invalid");
  assert.match(invalid.error, /tokens\.json/);
  // Valid temp brand, but regenerate not injected: only the active brand may use the default rebuild.
  const { dir: otherDir } = makeTempBrand();
  const { version } = readTokens(otherDir);
  assert.notEqual(otherDir, realDefaultDir());
  const notActive = saveTokenEdits({
    brandDir: otherDir,
    loadedVersion: version,
    edits: [{ path: "primitive.color.accent", value: "#123456" }],
  });
  assert.equal(notActive.ok, false);
  assert.equal(notActive.code, "invalid");
  assert.equal(readFileSync(join(otherDir, "tokens.json"), "utf8"), readFileSync(join(realDefaultDir(), "tokens.json"), "utf8"));
  assert.ok(originalText.length > 0);
});
