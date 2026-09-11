import { test, expect } from "@playwright/test";

test("home page loads and shows the song list without a console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});
