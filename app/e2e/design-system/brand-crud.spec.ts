import { test, expect, type Page, type Response } from "@playwright/test";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

// Brand create/duplicate/delete (Tasks 2/3/4). Runs against `next dev` on
// :3002 (see playwright.design-system.config.ts). Every test here creates
// and/or deletes a real brand directory — same real-write discipline as
// brand-switcher.spec.ts/staged-save.spec.ts/etc, so this spec must not run
// concurrently with them (the design-system Playwright config runs files
// serially; keep it that way).
const BRANDS_DIR = join(process.cwd(), "packages/design-system/brands");
const ACTIVE_BRAND_PATH = "packages/design-system/active-brand.json";
// Snapshotted in beforeAll, not hardcoded: any brand except "default" can be
// freely created or deleted by a real user at any time (that's the actual
// product rule — see docs/superpowers/plans/2026-09-23-design-system-brand-management.md),
// so a real, permanent third+ brand existing alongside "demo-child" is
// expected, not a fixture-hygiene failure this spec should refuse to run
// against. This spec only needs to guarantee it doesn't leave anything NEW
// behind, not that the world matches some fixed list.
let knownBrands: Set<string>;

function extraBrandEntries(): string[] {
  return readdirSync(BRANDS_DIR).filter((name) => !knownBrands.has(name));
}

test.beforeAll(() => {
  // Self-heal, don't assume (Task 4.7): test 4 asserts demo-child (a checked-in
  // fixture) is still visible after deleting a different brand, but a real
  // user can delete demo-child itself through the app at any time. Restore
  // it from git before the dirty-check below, regardless of its current
  // on-disk state.
  execSync("git checkout HEAD -- packages/design-system/brands/demo-child/", { cwd: process.cwd() });
  try {
    execSync(`git diff --quiet -- ${ACTIVE_BRAND_PATH}`, { cwd: process.cwd() });
  } catch {
    throw new Error(`${ACTIVE_BRAND_PATH} has uncommitted changes — revert before running this spec`);
  }
  knownBrands = new Set(readdirSync(BRANDS_DIR));
});

test.afterEach(() => {
  // Remove any brand this spec created, or any leftover .tmp-*/.trash-*
  // staging/trash directory from an aborted run.
  for (const name of extraBrandEntries()) {
    rmSync(join(BRANDS_DIR, name), { recursive: true, force: true });
  }
  execSync(`git checkout -- ${ACTIVE_BRAND_PATH}`, { cwd: process.cwd() });
  // active-brand.json's revert alone doesn't rebuild the generated CSS a
  // prior test's buildActiveBrand() call may have left pointed at a
  // since-deleted brand — rebuild so the next test (or a human) never sees a
  // stale build (per spec-template.md's revert-and-rebuild rule).
  execSync("npm run tokens:build", { cwd: process.cwd() });
});

function postTokensRequest(page: Page) {
  return page.waitForResponse(
    (resp: Response) => resp.url().includes("/api/design-system/tokens") && resp.request().method() === "POST",
  );
}

function readTokens(slug: string) {
  return JSON.parse(readFileSync(join(BRANDS_DIR, slug, "tokens.json"), "utf8"));
}

const brandNav = (page: Page) => page.getByRole("navigation", { name: "Brands", exact: true });

test("1. creating a brand via the UI lands on it", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await page.getByRole("button", { name: "New brand" }).click();
  await page.getByRole("textbox", { name: "New brand name" }).fill("E2E Test Brand");
  const response = postTokensRequest(page);
  await page.getByRole("button", { name: "Create" }).click();
  await (await response).ok();

  await expect(page).toHaveURL(/\/design-system\?brand=e2e-test-brand/);
  expect(readTokens("e2e-test-brand")).toEqual({});
  const brandMeta = JSON.parse(readFileSync(join(BRANDS_DIR, "e2e-test-brand", "brand.json"), "utf8"));
  expect(brandMeta).toEqual({ parent: "default" });
});

test("2. duplicating default freezes a non-theme-varying alias, keeps a theme-varying one unresolved", async ({
  page,
}) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await page.getByRole("button", { name: "Duplicate this brand" }).click();
  await page.getByRole("textbox", { name: "Duplicate brand name" }).fill("E2E Duplicate Brand");
  const response = postTokensRequest(page);
  await page.getByRole("button", { name: "Create" }).click();
  await (await response).ok();

  await expect(page).toHaveURL(/\/design-system\?brand=e2e-duplicate-brand/);
  const tokens = readTokens("e2e-duplicate-brand");
  expect(tokens.component.button.radius.$value).toBe("8px");
  expect(tokens.component.colorField.text.$value).toBe("{semantic.color.surfaceText}");
});

test("3. the default brand has no delete control", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await expect(page.getByRole("button", { name: "Delete this brand" })).toHaveCount(0);
});

test("4. deleting the active brand falls back active-brand.json to default and navigates there", async ({
  page,
}) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await page.getByRole("button", { name: "New brand" }).click();
  await page.getByRole("textbox", { name: "New brand name" }).fill("E2E Delete Me");
  const createResponse = postTokensRequest(page);
  await page.getByRole("button", { name: "Create" }).click();
  await (await createResponse).ok();
  await expect(page).toHaveURL(/\/design-system\?brand=e2e-delete-me/);

  // Make it the active brand directly (no UI path to this today — Task 6,
  // deferred), so deleting it exercises the active-brand.json fallback.
  writeFileSync(join(process.cwd(), ACTIVE_BRAND_PATH), JSON.stringify({ brand: "e2e-delete-me" }));

  await page.reload({ timeout: 90_000 });
  await page.getByRole("button", { name: "Delete this brand" }).click();
  await page.getByRole("textbox", { name: "Type brand name to confirm deletion" }).fill("e2e-delete-me");
  const deleteResponse = postTokensRequest(page);
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await (await deleteResponse).ok();

  await expect(page).toHaveURL(/\/design-system\?brand=default/);
  const active = JSON.parse(readFileSync(join(process.cwd(), ACTIVE_BRAND_PATH), "utf8"));
  expect(active).toEqual({ brand: "default" });
  await expect(brandNav(page).getByRole("link", { name: "Demo child" })).toBeVisible();
});
