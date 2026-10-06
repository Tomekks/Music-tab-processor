import { test, expect } from "@playwright/test";
import { hexField, openFoundations } from "./helpers";

// All six token groups render with their values and descriptions.
test("six group headings are visible with space-4 at 16px and hover opacity at 8%", async ({
  page,
}) => {
  await openFoundations(page);
  for (const name of ["Space", "Radius", "Typography", "State opacities", "Focus ring", "Layout"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  const spaceRow = page.locator("#group-space .other-row").filter({ hasText: "space-4" });
  await expect(spaceRow).toContainText("16px");
  const stateRow = page
    .locator("#group-state .other-row")
    .filter({ hasText: "state-hover-opacity" });
  await expect(stateRow).toContainText("8%");
});

// The On-this-page Space link scrolls the Space group into view.
test("clicking the Space link brings the Space heading into view", async ({ page }) => {
  await openFoundations(page);
  const nav = page.getByRole("navigation", { name: "On this page" });
  await nav.getByRole("link", { name: "Space" }).click();
  await expect(page.getByRole("heading", { name: "Space" })).toBeInViewport();
});

// Colors and Preview keep working below the new groups.
test("Colors still shows the accent hex field and the Preview iframe is visible", async ({
  page,
}) => {
  await openFoundations(page);
  await expect(hexField(page, "color-accent")).toBeVisible();
  await expect(page.locator('iframe[title="Preview"]')).toBeVisible();
});

// The new groups are read-only: no inputs inside them.
test("new group sections contain no inputs", async ({ page }) => {
  await openFoundations(page);
  for (const id of [
    "#group-space",
    "#group-radius",
    "#group-typography",
    "#group-state",
    "#group-focus",
    "#group-layout",
  ]) {
    await expect(page.locator(`${id} input`)).toHaveCount(0);
  }
});
