import { test, expect, type Page, type Response } from "@playwright/test";
import { existsSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// Undeployed-changes indicator (Task 4.6). Runs against `next dev` on :3002
// (see playwright.design-system.config.ts). Every test here creates a real
// brand and/or flips a real .needs-deploy sentinel — same real-write
// discipline as brand-crud.spec.ts, so this spec must not run concurrently
// with the rest of this suite (the design-system Playwright config runs
// files serially; keep it that way).
const BRANDS_DIR = join(process.cwd(), "packages/design-system/brands");
const ACTIVE_BRAND_PATH = "packages/design-system/active-brand.json";
const TOKENS_PATH = "packages/design-system/brands/default/tokens.json";
// Snapshotted, not hardcoded -- see brand-crud.spec.ts's own KNOWN_BRANDS
// fix (Task 4.7 will remove the need for this discipline entirely once test
// fixtures stop living in the real brands/ directory).
let knownBrands: Set<string>;

function extraBrandEntries(): string[] {
  return readdirSync(BRANDS_DIR).filter((name) => !knownBrands.has(name));
}

test.beforeAll(() => {
  for (const path of [ACTIVE_BRAND_PATH, TOKENS_PATH]) {
    try {
      execSync(`git diff --quiet -- ${path}`, { cwd: process.cwd() });
    } catch {
      throw new Error(`${path} has uncommitted changes — revert before running this spec`);
    }
  }
  knownBrands = new Set(readdirSync(BRANDS_DIR));
});

test.afterEach(() => {
  for (const name of extraBrandEntries()) {
    rmSync(join(BRANDS_DIR, name), { recursive: true, force: true });
  }
  execSync(`git checkout -- ${ACTIVE_BRAND_PATH} ${TOKENS_PATH}`, { cwd: process.cwd() });
  execSync("npm run tokens:build", { cwd: process.cwd() });
  // Defense in depth: don't rely on whichever test ran last happening to
  // leave default's flag cleared (only test 3/4 explicitly clear it) --
  // guarantee it regardless of test order or a mid-test failure.
  const flagPath = join(process.cwd(), dirname(TOKENS_PATH), ".needs-deploy");
  if (existsSync(flagPath)) unlinkSync(flagPath);
});

function postTokensRequest(page: Page) {
  return page.waitForResponse(
    (resp: Response) => resp.url().includes("/api/design-system/tokens") && resp.request().method() === "POST",
  );
}

const brandNav = (page: Page) => page.getByRole("navigation", { name: "Brands", exact: true });
const colorSection = (page: Page) => page.getByRole("region", { name: "Color", exact: true });

test("1. creating a brand shows its undeployed-changes badge immediately", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await page.getByRole("button", { name: "New brand" }).click();
  await page.getByRole("textbox", { name: "New brand name" }).fill("Deploy Status Test");
  const response = postTokensRequest(page);
  await page.getByRole("button", { name: "Create" }).click();
  await (await response).ok();
  await expect(page).toHaveURL(/brand=deploy-status-test/);

  expect(existsSync(join(BRANDS_DIR, "deploy-status-test", ".needs-deploy"))).toBe(true);
  await expect(brandNav(page).getByTitle("Has changes that may not be deployed yet")).toBeVisible();
});

test("2. editing a field shows the banner for that brand only, dismissing with No leaves it showing", async ({
  page,
}) => {
  await page.goto("/design-system", { timeout: 90_000 });
  const hex = colorSection(page).locator("label", { hasText: "Border" }).locator('input[type="text"]');
  await hex.fill("#123123");
  const response = postTokensRequest(page);
  await hex.press("Enter");
  await (await response).ok();

  await expect(page.getByText("This brand has changes that may not be deployed yet.")).toBeVisible();

  await page.getByRole("button", { name: "Dismiss undeployed-changes notice" }).click();
  await expect(page.getByText("Have these changes been deployed?")).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByText("This brand has changes that may not be deployed yet.")).toBeVisible();

  await page.goto("/design-system?brand=demo-child", { timeout: 90_000 });
  await expect(page.getByText("This brand has changes that may not be deployed yet.")).toHaveCount(0);
});

test("3. answering Yes clears the flag and survives a reload", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  const hex = colorSection(page).locator("label", { hasText: "Border" }).locator('input[type="text"]');
  await hex.fill("#456456");
  const writeResponse = postTokensRequest(page);
  await hex.press("Enter");
  await (await writeResponse).ok();

  await page.getByRole("button", { name: "Dismiss undeployed-changes notice" }).click();
  const markResponse = postTokensRequest(page);
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await (await markResponse).ok();

  await expect(page.getByText("This brand has changes that may not be deployed yet.")).toHaveCount(0);
  expect(existsSync(join(BRANDS_DIR, "default", ".needs-deploy"))).toBe(false);

  await page.reload({ timeout: 90_000 });
  await expect(page.getByText("This brand has changes that may not be deployed yet.")).toHaveCount(0);
});

test("4. Reset all to defaults clears the flag without an explicit Yes", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  const hex = colorSection(page).locator("label", { hasText: "Border" }).locator('input[type="text"]');
  await hex.fill("#789789");
  const writeResponse = postTokensRequest(page);
  await hex.press("Enter");
  await (await writeResponse).ok();
  expect(existsSync(join(BRANDS_DIR, "default", ".needs-deploy"))).toBe(true);

  await page.getByRole("button", { name: "Reset all changes" }).click();
  const resetResponse = postTokensRequest(page);
  await page.getByRole("button", { name: /Confirm reset/ }).click();
  await (await resetResponse).ok();

  expect(existsSync(join(BRANDS_DIR, "default", ".needs-deploy"))).toBe(false);
});
