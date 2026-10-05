import { test, expect } from "@playwright/test";
import {
  hexField,
  openFoundations,
  previewBg,
  stageColor,
  swatch,
} from "./helpers";

// Color editing still works: typing a name stages its hex and marks the row.
test("typing red stages #ff0000 with a change count and Edited mark", async ({ page }) => {
  await openFoundations(page);
  await stageColor(page, "color-accent", "red");
  await expect(hexField(page, "color-accent")).toHaveValue("#ff0000");
  await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
  await expect(page.getByText("Edited")).toBeVisible();
});

// Invalid input is rejected: the old value stays and an error explains why.
test("typing nonsense keeps the old value with an invalid-color error", async ({ page }) => {
  await openFoundations(page);
  const field = hexField(page, "color-accent");
  const before = await field.inputValue();
  await stageColor(page, "color-accent", "nonsense");
  await expect(field).toHaveValue(before);
  await expect(page.getByText("Invalid color — kept the old value.")).toBeVisible();
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
  await nav.getByRole("link", { name: "Button" }).click();
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
  await expect(page.getByLabel("alpha channel")).toBeVisible();
  // The third-party color area has no accessible name, so click two spots
  // inside its popover (top region is the color area) by position.
  const popover = page
    .getByLabel("alpha channel")
    .locator("xpath=ancestor::div[@data-picker-popover][1]");
  const box = await popover.boundingBox();
  if (box === null) throw new Error("picker popover has no bounding box");
  await page.mouse.click(box.x + box.width * 0.3, box.y + 60);
  await page.mouse.click(box.x + box.width * 0.65, box.y + 120);
  await page.getByRole("heading", { name: "Foundations" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(field).toHaveValue(fileValue);
  await expect(page.getByRole("button", { name: "0 unsaved changes" })).toBeVisible();
});

// Opacity survives picking: alpha 0.5 plus a new spot keeps alpha and an 8-digit hex.
test("alpha 0.5 survives picking a new spot with an 8-digit hex", async ({ page }) => {
  await openFoundations(page);
  await swatch(page, "color-accent").click();
  const alpha = page.getByLabel("alpha channel");
  await expect(alpha).toBeVisible();
  await alpha.fill("0.5");
  // The third-party color area has no accessible name, so click a new spot
  // inside its popover by position (top region is the color area).
  const popover = page
    .getByLabel("alpha channel")
    .locator("xpath=ancestor::div[@data-picker-popover][1]");
  const box = await popover.boundingBox();
  if (box === null) throw new Error("picker popover has no bounding box");
  await page.mouse.click(box.x + box.width * 0.65, box.y + 120);
  await expect(hexField(page, "color-accent")).toHaveValue(/#[0-9a-f]{8}$/i);
  await expect(alpha).toHaveValue("0.5");
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
  const before = await below.boundingBox();
  await swatch(page, "color-accent").click();
  await expect(page.getByLabel("alpha channel")).toBeVisible();
  const after = await below.boundingBox();
  expect(after?.y).toBe(before?.y);
  await page.getByRole("heading", { name: "Foundations" }).click();
  await expect(page.getByLabel("alpha channel")).toHaveCount(0);
  await swatch(page, "color-accent").click();
  await expect(page.getByLabel("alpha channel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("alpha channel")).toHaveCount(0);
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
  await expect(panel.getByText(fileValue, { exact: true })).toBeVisible();
  await expect(panel.getByText("#0000ff", { exact: true })).toBeVisible();
  await expect(panel.getByText("#ff0000", { exact: true })).toHaveCount(0);
});
