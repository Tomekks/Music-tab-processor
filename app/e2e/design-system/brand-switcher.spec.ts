import { test, expect, type Page, type Response, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

// Brand switcher: list + select (Task 1). Runs against `next dev` on :3002
// (see playwright.design-system.config.ts). Only one test (5) writes real
// state (to prove the in-flight guard) — same real-write discipline as
// staged-save.spec.ts/dark-values.spec.ts/descriptions.spec.ts, on the same
// file, so this spec must not run concurrently with them (the design-system
// Playwright config runs files serially; keep it that way).
const TOKENS_PATH = "packages/design-system/brands/default/tokens.json";

type Leaf = { $value: string; $type: string };
type Tokens = { [key: string]: Tokens | Leaf };

function isLeaf(node: Tokens | Leaf): node is Leaf {
  return "$value" in node;
}

function readTokens(): Tokens {
  return JSON.parse(readFileSync(join(process.cwd(), TOKENS_PATH), "utf8")) as Tokens;
}

function leaf(tokens: Tokens, path: string): Leaf {
  let node: Tokens | Leaf = tokens;
  for (const segment of path.split(".")) {
    if (isLeaf(node)) throw new Error(`leaf() descended past a leaf at ${path}`);
    const next: Tokens | Leaf | undefined = node[segment];
    if (next === undefined) throw new Error(`leaf() missing segment at ${path}`);
    node = next;
  }
  if (!isLeaf(node)) throw new Error(`leaf() ${path} is not a leaf`);
  return node;
}

function postTokensRequest(page: Page) {
  return page.waitForResponse(
    (resp: Response) =>
      resp.url().includes("/api/design-system/tokens") &&
      resp.request().method() === "POST",
  );
}

const brandNav = (page: Page) => page.getByRole("navigation", { name: "Brands", exact: true });
const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Design system sections" });
const colorSection = (page: Page) => page.getByRole("region", { name: "Color", exact: true });

test.beforeAll(() => {
  try {
    execSync(`git diff --quiet -- ${TOKENS_PATH}`, { cwd: process.cwd() });
  } catch {
    throw new Error(
      `${TOKENS_PATH} has uncommitted changes — revert them before running this spec`,
    );
  }
});

test.afterEach(() => {
  execSync(`git checkout -- ${TOKENS_PATH}`, { cwd: process.cwd() });
});

test("1. both real brands appear in the switcher, current selection is not a link", async ({
  page,
}) => {
  await page.goto("/design-system", { timeout: 90_000 });
  const nav = brandNav(page);
  await expect(nav.getByRole("link", { name: "Demo child" })).toBeVisible();
  // "Default" is the currently-selected brand on the bare URL -- plain text,
  // not a link.
  await expect(nav.getByRole("link", { name: "Default", exact: true })).toHaveCount(0);
  await expect(nav.getByText("Default", { exact: true })).toBeVisible();
});

test("2. clicking a brand navigates and shows that brand's own values", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  const accentInput = colorSection(page).getByRole("textbox", { name: "Accent", exact: true });
  await expect(accentInput).toHaveValue("#ae97f7");

  await brandNav(page).getByRole("link", { name: "Demo child" }).click();
  await expect(page).toHaveURL(/\/design-system\?brand=demo-child/);
  await expect(
    colorSection(page).getByRole("textbox", { name: "Accent", exact: true }),
  ).toHaveValue("#4a90d9");
});

test("3. staging a pending edit blocks switching to the other brand", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  const hex = page
    .getByRole("region", { name: "Color Field" })
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#123456");
  await hex.press("Enter");
  await expect(page.getByRole("button", { name: "Save changes (1)" })).toBeVisible();

  const otherBrand = brandNav(page).getByText("Demo child", { exact: true });
  await expect(otherBrand).toBeVisible();
  await expect(brandNav(page).getByRole("link", { name: "Demo child" })).toHaveCount(0);
  await expect(otherBrand).toHaveAttribute(
    "title",
    "Save or discard your pending changes before switching brands",
  );
});

test("4. discarding the pending edit re-enables switching", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  const hex = page
    .getByRole("region", { name: "Color Field" })
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#123456");
  await hex.press("Enter");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("button", { name: /Save changes/ })).toHaveCount(0);
  await expect(brandNav(page).getByRole("link", { name: "Demo child" })).toBeVisible();
});

test("5. an in-flight write blocks switching until it resolves", async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });

  // Delay the write response so the in-flight window is wide enough to
  // reliably assert against -- a real round trip is too fast (tens of ms)
  // for a stable check either way.
  let releaseResponse: () => void = () => {};
  const delay = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/design-system/tokens", async (route: Route) => {
    await delay;
    await route.continue();
  });

  const hex = colorSection(page).locator("label", { hasText: "Border" }).locator('input[type="text"]');
  await hex.fill("#654321");
  await hex.press("Enter");

  await expect(brandNav(page).getByRole("link", { name: "Demo child" })).toHaveCount(0);
  await expect(brandNav(page).getByText("Demo child", { exact: true })).toHaveAttribute(
    "title",
    "Wait for the current change to finish saving",
  );

  const writeResponse = postTokensRequest(page);
  releaseResponse();
  await (await writeResponse).ok();

  await expect(brandNav(page).getByRole("link", { name: "Demo child" })).toBeVisible();
});

test("6. navigating to an unknown brand slug 404s", async ({ page }) => {
  const response = await page.goto("/design-system?brand=nope", { timeout: 90_000 });
  expect(response?.status()).toBe(404);
});
