import { test, expect } from "@playwright/test";

// App-wide Light/Dark toggle (Task 4): scripted interaction half. Visual
// judgment ("every view reads correctly in both themes") is the human
// checkbox in the spec, not asserted here.

test.describe("with light OS preference and no stored choice", () => {
  test.use({ colorScheme: "light" });

  test("defaults to light theme", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("with dark OS preference and no stored choice", () => {
  test.use({ colorScheme: "dark" });

  test("defaults to dark theme", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("toggle flips the theme and a reload preserves it", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Light mode" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: "Dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
