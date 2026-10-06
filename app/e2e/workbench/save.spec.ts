import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import {
  brandCopyDir,
  hexField,
  openFoundations,
  resetBrandCopy,
  stageColor,
} from "./helpers";

function copyFile(): string {
  return path.join(brandCopyDir(), "tokens.json");
}

function readCopy(): {
  semantic: { color: { accent: { $value: string }; background: { $value: string } } };
} {
  return JSON.parse(readFileSync(copyFile(), "utf8")) as {
    semantic: { color: { accent: { $value: string }; background: { $value: string } } };
  };
}

test.beforeEach(async ({ page }) => {
  resetBrandCopy();
  await openFoundations(page);
});

// Save writes the staged edit to the throwaway copy and clears the count.
test("staging accent and Save writes the copy with a Saved countdown", async ({ page }) => {
  await stageColor(page, "color-accent", "red");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved [1-5]/)).toBeVisible();
  await expect(page.getByRole("button", { name: "0 unsaved changes" })).toBeVisible();
  expect(readCopy().semantic.color.accent.$value).toBe("#ff0000");
});

// Revert after Save writes the old resolved hex back as a plain value, not the link.
test("Revert after Save writes the old hex back and shows Reverted", async ({ page }) => {
  await stageColor(page, "color-accent", "red");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved [1-5]/)).toBeVisible();
  expect(readCopy().semantic.color.accent.$value).toBe("#ff0000");
  await page.getByRole("button", { name: "Revert", exact: true }).click();
  await expect(page.getByText("Reverted")).toBeVisible();
  expect(readCopy().semantic.color.accent.$value).toBe("#ae97f7");
});

// The Saved countdown clears by itself after 5 seconds (fake clock, no real wait).
test("Saved countdown goes away after 5 seconds", async ({ page }) => {
  await page.clock.install();
  await stageColor(page, "color-accent", "red");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved [1-5]/)).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(page.getByText(/Saved [1-5]/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revert", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Saved/)).toHaveCount(0);
});

// Discard clears the edit and Undo brings it back.
test("Discard clears the field and Undo brings the edit back", async ({ page }) => {
  const field = hexField(page, "color-accent");
  const fileValue = await field.inputValue();
  await stageColor(page, "color-accent", "red");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.getByText("Discarded 1 change")).toBeVisible();
  await expect(field).toHaveValue(fileValue);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(field).toHaveValue("#ff0000");
  await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
});

// A hand edit to the copy makes Save stop without writing; Reload keeps the staged edit.
test("hand-edited copy stops Save naming tokens.json and Reload keeps the edit", async ({
  page,
}) => {
  await stageColor(page, "color-accent", "red");
  const before = readCopy();
  const handEdited = structuredClone(before);
  handEdited.semantic.color.background.$value = "#123456";
  writeFileSync(copyFile(), JSON.stringify(handEdited, null, 2));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/tokens\.json/)).toBeVisible();
  const afterSave = readCopy();
  expect(afterSave.semantic.color.accent.$value).toBe(before.semantic.color.accent.$value);
  expect(afterSave.semantic.color.background.$value).toBe("#123456");
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await expect(page.getByText(/tokens\.json/)).toHaveCount(0);
  await expect(hexField(page, "color-accent")).toHaveValue("#ff0000");
  await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
});

// A read-only copy refuses the write and Retry save works once writable.
test("read-only copy says nothing was written and Retry save works", async ({ page }) => {
  await stageColor(page, "color-accent", "red");
  chmodSync(copyFile(), 0o444);
  try {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/Nothing was written/)).toBeVisible();
    await expect(hexField(page, "color-accent")).toHaveValue("#ff0000");
    await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
  } finally {
    chmodSync(copyFile(), 0o644);
  }
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByText(/Saved [1-5]/)).toBeVisible();
  await expect(page.getByRole("button", { name: "0 unsaved changes" })).toBeVisible();
});

// Staging while the Discarded message shows clears the Undo.
test("staging while Discarded shows clears the Undo", async ({ page }) => {
  await stageColor(page, "color-accent", "red");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
  await stageColor(page, "color-accent", "blue");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Discarded/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
});

// An edited alias row warns the save will unlink it from the main color.
test("staging accent shows Will unlink from main beside Reset", async ({ page }) => {
  await stageColor(page, "color-accent", "red");
  await expect(page.getByText("Will unlink from main")).toBeVisible();
});

// Discard shows a fixed top-centre toast outside the bar without moving the bar.
test("Discard toast is top-centre outside the bar and the bar does not move", async ({
  page,
}) => {
  await stageColor(page, "color-accent", "red");
  const bar = page.locator("header");
  const count = page.getByRole("button", { name: /unsaved change/ });
  const barBefore = await bar.boundingBox();
  const countBefore = await count.boundingBox();
  if (barBefore === null || countBefore === null) throw new Error("bar has no bounding box");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  const toast = page.getByRole("status");
  await expect(toast).toBeVisible();
  await expect(bar.getByRole("status")).toHaveCount(0);
  const toastBox = await toast.boundingBox();
  if (toastBox === null) throw new Error("toast has no bounding box");
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const toastCentre = toastBox.x + toastBox.width / 2;
  expect(Math.abs(toastCentre - viewportWidth / 2)).toBeLessThanOrEqual(4);
  expect(toastBox.y).toBeLessThan(100);
  const barAfter = await bar.boundingBox();
  const countAfter = await count.boundingBox();
  if (barAfter === null || countAfter === null) throw new Error("bar has no bounding box");
  expect(Math.abs(barAfter.height - barBefore.height)).toBeLessThanOrEqual(1);
  expect(Math.abs((countAfter?.y ?? 0) - countBefore.y)).toBeLessThanOrEqual(1);
});
