import { expect, type ConsoleMessage, type Page } from "@playwright/test";

// Spec 1+4 owns this file; later specs consume these helpers without
// restructuring them. Viewport presets mirror the spec assertions exactly:
// 1280px desktop single-row, 767px just below the md (768px) breakpoint.

export const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
export const NARROW_VIEWPORT = { width: 767, height: 800 };

/** Goto + wait until the app is interactive (transport Play is mounted). */
export async function gotoReady(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
}

/** Collects console errors from now on; assert on `errors` when done. */
export function collectConsoleErrors(page: Page): { errors: string[]; stop: () => void } {
  const errors: string[] = [];
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
  page.on("console", handler);
  return { errors, stop: () => page.off("console", handler) };
}
