import { test, expect } from "@playwright/test";
import { hexField, openFoundations, resetBrandCopy, stageColor } from "./helpers";

test.beforeEach(async ({ page }) => {
	resetBrandCopy();
	await openFoundations(page);
});

// Both toggles start pressed and sit before the unsaved count.
test("both toggles are visible, pressed and before the unsaved count", async ({ page }) => {
	const navToggle = page.getByRole("button", { name: "Navigation", exact: true });
	const inspectorToggle = page.getByRole("button", { name: "Inspector", exact: true });
	const count = page.getByRole("button", { name: /unsaved change/ });
	await expect(navToggle).toBeVisible();
	await expect(inspectorToggle).toBeVisible();
	await expect(navToggle).toHaveAttribute("aria-pressed", "true");
	await expect(inspectorToggle).toHaveAttribute("aria-pressed", "true");
	const navBox = await navToggle.boundingBox();
	const inspectorBox = await inspectorToggle.boundingBox();
	const countBox = await count.boundingBox();
	if (navBox === null || inspectorBox === null || countBox === null) {
		throw new Error("toggle has no bounding box");
	}
	expect(navBox.x).toBeLessThan(countBox.x);
	expect(inspectorBox.x).toBeLessThan(countBox.x);
});

// Hiding the nav removes it and grows the canvas; toggling again restores both.
test("Navigation toggle hides the nav and grows the canvas", async ({ page }) => {
	const navToggle = page.getByRole("button", { name: "Navigation", exact: true });
	const nav = page.locator("nav.sidebar");
	const canvas = page.locator("main.canvas");
	const before = await canvas.boundingBox();
	if (before === null) throw new Error("canvas has no bounding box");
	await navToggle.click();
	await expect(nav).toBeHidden();
	await expect(navToggle).toHaveAttribute("aria-pressed", "false");
	const hidden = await canvas.boundingBox();
	if (hidden === null) throw new Error("canvas has no bounding box");
	expect(hidden.width - before.width).toBeGreaterThanOrEqual(150);
	await navToggle.click();
	await expect(nav).toBeVisible();
	await expect(navToggle).toHaveAttribute("aria-pressed", "true");
});

// Hiding the inspector removes it and grows the canvas; toggling again restores both.
test("Inspector toggle hides the inspector and grows the canvas", async ({ page }) => {
	const inspectorToggle = page.getByRole("button", { name: "Inspector", exact: true });
	const inspector = page.locator("aside.inspector");
	const canvas = page.locator("main.canvas");
	const before = await canvas.boundingBox();
	if (before === null) throw new Error("canvas has no bounding box");
	await inspectorToggle.click();
	await expect(inspector).toBeHidden();
	await expect(inspectorToggle).toHaveAttribute("aria-pressed", "false");
	const hidden = await canvas.boundingBox();
	if (hidden === null) throw new Error("canvas has no bounding box");
	expect(hidden.width - before.width).toBeGreaterThanOrEqual(150);
	await inspectorToggle.click();
	await expect(inspector).toBeVisible();
	await expect(inspectorToggle).toHaveAttribute("aria-pressed", "true");
});

// Both closed: the canvas fills the window under the top bar.
test("both closed fills the window with the canvas", async ({ page }) => {
	await page.getByRole("button", { name: "Navigation", exact: true }).click();
	await page.getByRole("button", { name: "Inspector", exact: true }).click();
	await expect(page.locator("nav.sidebar")).toBeHidden();
	await expect(page.locator("aside.inspector")).toBeHidden();
	const canvas = page.locator("main.canvas");
	const box = await canvas.boundingBox();
	if (box === null) throw new Error("canvas has no bounding box");
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(box.width).toBeGreaterThanOrEqual(viewportWidth - 2);
	expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
});

// Hiding and showing both sidebars keeps the staged edit.
test("hidden sidebars do not affect staged edits", async ({ page }) => {
	await stageColor(page, "color-accent", "red");
	await page.getByRole("button", { name: "Navigation", exact: true }).click();
	await page.getByRole("button", { name: "Inspector", exact: true }).click();
	await page.getByRole("button", { name: "Navigation", exact: true }).click();
	await page.getByRole("button", { name: "Inspector", exact: true }).click();
	await expect(page.getByRole("button", { name: "1 unsaved change" })).toBeVisible();
	await expect(hexField(page, "color-accent")).toHaveValue("#ff0000");
});

// Hiding is not remembered: a reload brings both sidebars back.
test("reload shows both sidebars again", async ({ page }) => {
	await page.getByRole("button", { name: "Navigation", exact: true }).click();
	await page.getByRole("button", { name: "Inspector", exact: true }).click();
	await expect(page.locator("nav.sidebar")).toBeHidden();
	await page.reload();
	await expect(page.locator('iframe[title="Preview"]')).toBeVisible();
	await expect(page.locator("nav.sidebar")).toBeVisible();
	await expect(page.locator("aside.inspector")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Navigation", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	await expect(
		page.getByRole("button", { name: "Inspector", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
});
