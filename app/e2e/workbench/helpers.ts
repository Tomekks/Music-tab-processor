import { expect, type FrameLocator, type Locator, type Page } from "@playwright/test";

// Open the Foundations page like a person would, waiting for the live preview
// and the first color field before any test touches the page.
export async function openFoundations(page: Page): Promise<void> {
  await page.goto("/foundations");
  await expect(page.locator('iframe[title="Preview"]')).toBeVisible();
  await expect(page.getByLabel(/Hex value for /).first()).toBeVisible();
}

// Hex text field for one token; varName has no leading dashes (color-accent).
export function hexField(page: Page, varName: string): Locator {
  return page.getByLabel(`Hex value for ${varName}`, { exact: true });
}

// Swatch button that opens the picker for one token.
export function swatch(page: Page, varName: string): Locator {
  return page.getByLabel(`Pick a color for ${varName}`, { exact: true });
}

// The live preview iframe mandated by the workbench config.
export function previewFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Preview"]');
}

// Computed backgroundColor of one preview element (first match is the Default column).
export async function previewBg(
  page: Page,
  role: "button",
  name: string,
): Promise<string> {
  const target = previewFrame(page).getByRole(role, { name }).first();
  return target.evaluate((node) => getComputedStyle(node).backgroundColor);
}

// Stage a typed color the way a person does: select all, type, commit with Enter.
export async function stageColor(page: Page, varName: string, text: string): Promise<void> {
  const field = hexField(page, varName);
  await field.click({ clickCount: 3 });
  await field.pressSequentially(text);
  await field.press("Enter");
}
