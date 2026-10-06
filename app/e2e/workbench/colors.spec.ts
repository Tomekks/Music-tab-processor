import { test, expect } from "@playwright/test";
import {
  hexField,
  openFoundations,
  previewBg,
  stageColor,
  swatch,
} from "./helpers";

// Color editing still works: typing a name stages its hex and marks the row.
test("typing red stages #ff0000 with a change count and Reset button", async ({ page }) => {
  await openFoundations(page);
  await stageColor(page, "color-accent", "red");
  await expect(hexField(page, "color-accent")).toHaveValue("#ff0000");
  await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset color-accent" })).toBeVisible();
});

// Reset restores the file value as one undo step and clears a stale error.
test("Reset restores the file value and undo brings the edit back", async ({ page }) => {
  await openFoundations(page);
  const field = hexField(page, "color-accent");
  const fileValue = await field.inputValue();
  await stageColor(page, "color-accent", "red");
  await expect(field).toHaveValue("#ff0000");
  await page.getByRole("button", { name: "Reset color-accent" }).click();
  await expect(field).toHaveValue(fileValue);
  await expect(page.getByRole("button", { name: "0 unsaved changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset color-accent" })).toHaveCount(0);
  await stageColor(page, "color-accent", "red");
  await stageColor(page, "color-accent", "nonsense");
  await expect(page.getByText("Not a solid color — kept the old value.")).toBeVisible();
  await page.getByRole("button", { name: "Reset color-accent" }).click();
  await expect(page.getByText("Not a solid color — kept the old value.")).toHaveCount(0);
  await expect(field).toHaveValue(fileValue);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(field).toHaveValue("#ff0000");
  await expect(page.getByRole("button", { name: "Reset color-accent" })).toBeVisible();
});

// Invalid input is rejected: the old value stays and an error explains why.
test("typing nonsense keeps the old value with an invalid-color error", async ({ page }) => {
  await openFoundations(page);
  const field = hexField(page, "color-accent");
  const before = await field.inputValue();
  await stageColor(page, "color-accent", "nonsense");
  await expect(field).toHaveValue(before);
  await expect(page.getByText("Not a solid color — kept the old value.")).toBeVisible();
});

// Component variables follow: staging accent repaints Button and IconButton previews.
test("staging accent red repaints preview Button and IconButton", async ({ page }) => {
  await openFoundations(page);
  await stageColor(page, "color-accent", "red");
  await expect.poll(() => previewBg(page, "button", "Primary")).toBe("rgb(255, 0, 0)");
  await expect.poll(() => previewBg(page, "button", "Play")).toBe("rgb(255, 0, 0)");
});

// Late preview reload keeps colors: leaving and returning still shows the staged color.
test("staged color survives leaving for Button and returning to Foundations", async ({
  page,
}) => {
  await openFoundations(page);
  await stageColor(page, "color-accent", "red");
  await expect.poll(() => previewBg(page, "button", "Primary")).toBe("rgb(255, 0, 0)");
  const nav = page.getByRole("navigation", { name: "Components" });
  await nav.getByRole("link", { name: "Button", exact: true }).click();
  await nav.getByRole("link", { name: "Foundations" }).click();
  await expect(hexField(page, "color-accent")).toHaveValue("#ff0000");
  await expect.poll(() => previewBg(page, "button", "Primary")).toBe("rgb(255, 0, 0)");
});

// Picker drags are one undo step: a single undo returns the field to the file value.
test("two picker spots undo in one step back to the file value", async ({ page }) => {
  await openFoundations(page);
  const field = hexField(page, "color-accent");
  const fileValue = await field.inputValue();
  await swatch(page, "color-accent").click();
  await expect(page.locator("[data-picker-popover]")).toBeVisible();
  // The third-party color area has no accessible name, so click two spots
  // inside its popover (top region is the color area) by position.
  const popover = page.locator("[data-picker-popover]");
  const box = await popover.boundingBox();
  if (box === null) throw new Error("picker popover has no bounding box");
  await page.mouse.click(box.x + box.width * 0.3, box.y + 60);
  await page.mouse.click(box.x + box.width * 0.65, box.y + 120);
  await page.getByRole("heading", { name: "Foundations" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(field).toHaveValue(fileValue);
  await expect(page.getByRole("button", { name: "0 unsaved changes" })).toBeVisible();
});

// Picker has no opacity field and typed transparency is refused like an invalid color.
test("picker shows no opacity field and typed rgba is refused", async ({ page }) => {
  await openFoundations(page);
  await swatch(page, "color-accent").click();
  const popover = page.locator("[data-picker-popover]");
  await expect(popover).toBeVisible();
  expect(await popover.locator("input, button").count()).toBeGreaterThan(0);
  await expect(page.getByRole("spinbutton", { name: "alpha channel" })).toHaveCount(0);
  const field = hexField(page, "color-accent");
  const before = await field.inputValue();
  await stageColor(page, "color-accent", "rgba(255, 0, 0, 0.5)");
  await expect(field).toHaveValue(before);
  await expect(page.getByText("Not a solid color — kept the old value.")).toBeVisible();
});

// Help icons explain: hovering shows one tooltip, icons carry no title, rows all have icons.
test("hovering an info icon shows exactly one tooltip without title attributes", async ({
  page,
}) => {
  await openFoundations(page);
  const info = page
    .getByTestId("tooltip")
    .first()
    .locator("xpath=ancestor::button[1]");
  await info.hover();
  await expect(info).not.toHaveAttribute("title", /./);
  await expect(page.getByTestId("tooltip").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByLabel("No description yet").first()).toBeVisible();
  expect(await page.getByLabel(/Hex value for /).count()).toBeGreaterThan(0);
  expect(await page.getByLabel(/Hex value for /).count()).toBe(
    await page.getByTestId("tooltip").count(),
  );
});

// Tabs switch token groups: Focus shows only focus-ring-color with no semantic word.
test("Color and Focus tabs switch the list without the word semantic", async ({ page }) => {
  await openFoundations(page);
  const tabs = page.getByRole("tablist", { name: "Color sections" });
  await expect(hexField(page, "color-accent")).toBeVisible();
  await tabs.getByRole("tab", { name: "Focus" }).click();
  await expect(hexField(page, "focus-ring-color")).toBeVisible();
  await expect(hexField(page, "color-accent")).toHaveCount(0);
  await expect(page.getByText("semantic")).toHaveCount(0);
  await tabs.getByRole("tab", { name: "Color" }).click();
  await expect(hexField(page, "color-accent")).toBeVisible();
});

// Switching tabs keeps the canvas scroll position: the shorter Focus list holds the taller Color height.
test("switching tabs keeps the canvas scroll position", async ({ page }) => {
  await openFoundations(page);
  const canvas = page.locator("main.canvas");
  const tabs = page.getByRole("tablist", { name: "Color sections" });
  await canvas.evaluate((node) => (node as HTMLElement).scrollTo(0, 400));
  await expect.poll(() => canvas.evaluate((node) => (node as HTMLElement).scrollTop)).toBe(400);
  const topBefore = await tabs.evaluate((node) => node.getBoundingClientRect().top);
  await tabs.getByRole("tab", { name: "Focus" }).click();
  await expect(hexField(page, "focus-ring-color")).toBeVisible();
  const afterFocus = await canvas.evaluate((node) => (node as HTMLElement).scrollTop);
  expect(Math.abs(afterFocus - 400)).toBeLessThanOrEqual(1);
  expect(await tabs.evaluate((node) => node.getBoundingClientRect().top)).toBe(topBefore);
  await tabs.getByRole("tab", { name: "Color" }).click();
  await expect(hexField(page, "color-accent")).toBeVisible();
  const afterColor = await canvas.evaluate((node) => (node as HTMLElement).scrollTop);
  expect(Math.abs(afterColor - 400)).toBeLessThanOrEqual(1);
  expect(await tabs.evaluate((node) => node.getBoundingClientRect().top)).toBe(topBefore);
});

// Picker floats: opening it never moves the row below, outside-click and Escape close it.
test("opening the picker holds rows still and both dismissals close it", async ({ page }) => {
  await openFoundations(page);
  const all = await page.getByLabel(/Hex value for /).all();
  let index = -1;
  for (let i = 0; i < all.length; i++) {
    if ((await all[i].getAttribute("aria-label")) === "Hex value for color-accent") index = i;
  }
  if (index < 0 || index + 1 >= all.length) throw new Error("no row below color-accent");
  const below = all[index + 1];
  // Distance between the two rows, not an absolute position: opening the picker may scroll the page.
  const gap = async () =>
    ((await below.boundingBox())?.y ?? NaN) - ((await hexField(page, "color-accent").boundingBox())?.y ?? NaN);
  const before = await gap();
  await swatch(page, "color-accent").click();
  await expect(page.locator("[data-picker-popover]")).toBeVisible();
  expect(await gap()).toBe(before);
  await page.getByRole("heading", { name: "Foundations" }).click();
  await expect(page.locator("[data-picker-popover]")).toHaveCount(0);
  await swatch(page, "color-accent").click();
  await expect(page.locator("[data-picker-popover]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-picker-popover]")).toHaveCount(0);
});

// Change history stays honest: two edits to one token still show the file value as was.
test("two edits to one token show the file value as was in the changes panel", async ({
  page,
}) => {
  await openFoundations(page);
  const fileValue = await hexField(page, "color-accent").inputValue();
  await stageColor(page, "color-accent", "red");
  await stageColor(page, "color-accent", "blue");
  await page.getByRole("button", { name: /unsaved change/ }).click();
  const panel = page.getByTestId("changes-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("color-accent", { exact: true })).toBeVisible();
  await expect(panel.getByText("semantic.color.accent")).toHaveCount(0);
  const row = panel.locator(".change-row").filter({ hasText: "color-accent" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(fileValue);
  await expect(row).toContainText("#0000ff");
  await expect(row).toContainText("→");
  await expect(
    row.getByRole("button", { name: "Reset color-accent in changes" }),
  ).toBeVisible();
  await expect(panel.getByText("#ff0000", { exact: true })).toHaveCount(0);
});

// Reset in the changes list removes one edit, keeps the other, and undo brings it back.
test("Reset in the changes list removes only that edit and undo brings it back", async ({
  page,
}) => {
  await openFoundations(page);
  const accentField = hexField(page, "color-accent");
  const borderField = hexField(page, "color-border");
  const accentFile = await accentField.inputValue();
  await stageColor(page, "color-accent", "red");
  await stageColor(page, "color-border", "blue");
  await page.getByRole("button", { name: /unsaved change/ }).click();
  const panel = page.getByTestId("changes-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Reset color-accent in changes" }).click();
  await expect(accentField).toHaveValue(accentFile);
  await expect(borderField).toHaveValue("#0000ff");
  await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
  await expect(panel.getByText("color-accent")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(accentField).toHaveValue("#ff0000");
  await expect(page.getByRole("button", { name: "2 unsaved changes" })).toBeVisible();
  await panel.getByRole("button", { name: "Reset color-accent in changes" }).click();
  await panel.getByRole("button", { name: "Reset color-border in changes" }).click();
  await expect(page.getByRole("button", { name: "0 unsaved changes" })).toBeVisible();
  await expect(panel.getByText("No unsaved changes.")).toBeVisible();
});

// The documented host is 127.0.0.1: the preview must answer the page's own origin, or colors vanish after a page change.
test("staged color survives a page change when opened at 127.0.0.1", async ({ page }) => {
  await page.goto("http://127.0.0.1:5174/foundations");
  await expect(hexField(page, "color-accent")).toBeVisible();
  await stageColor(page, "color-accent", "red");
  await expect.poll(() => previewBg(page, "button", "Primary")).toBe("rgb(255, 0, 0)");
  const nav = page.getByRole("navigation", { name: "Components" });
  await nav.getByRole("link", { name: "Button", exact: true }).click();
  await nav.getByRole("link", { name: "Foundations" }).click();
  await expect.poll(() => previewBg(page, "button", "Primary")).toBe("rgb(255, 0, 0)");
});

// The accent tooltip wraps and stays inside the canvas instead of running under the Inspector.
test("accent tooltip stays fully inside the canvas at 1000px wide", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 720 });
  await openFoundations(page);
  const accentRow = page.locator(".color-row").filter({ hasText: "color-accent" });
  const info = accentRow.getByTestId("tooltip").locator("xpath=ancestor::button[1]");
  await info.hover();
  const tip = accentRow.getByTestId("tooltip").filter({ visible: true });
  await expect(tip).toBeVisible();
  const tipBox = await tip.boundingBox();
  const canvasBox = await page.locator("main.canvas").boundingBox();
  if (tipBox === null || canvasBox === null) throw new Error("tooltip or canvas has no box");
  expect(tipBox.x).toBeGreaterThanOrEqual(canvasBox.x - 1);
  expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);
  expect(tipBox.y).toBeGreaterThanOrEqual(canvasBox.y - 1);
  expect(tipBox.y + tipBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height + 1);
});
