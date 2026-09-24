import { test, expect, type Page, type Response, type Route } from "@playwright/test";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// Brand switcher: list + select (Task 1). Runs against `next dev` on :3002
// (see playwright.design-system.config.ts). Tests 5 and 7 write real state
// (to prove the in-flight guard, and the write-scoping fix respectively) —
// same real-write discipline as staged-save.spec.ts/dark-values.spec.ts/
// descriptions.spec.ts, on the same files, so this spec must not run
// concurrently with them (the design-system Playwright config runs files
// serially; keep it that way).
const TOKENS_PATH = "packages/design-system/brands/default/tokens.json";
const DEMO_CHILD_TOKENS_PATH = "packages/design-system/brands/demo-child/tokens.json";
const REAL_WRITE_PATHS = [TOKENS_PATH, DEMO_CHILD_TOKENS_PATH];

type Leaf = { $value: string; $type: string };
type Tokens = { [key: string]: Tokens | Leaf };

function isLeaf(node: Tokens | Leaf): node is Leaf {
  return "$value" in node;
}

function readTokens(path: string = TOKENS_PATH): Tokens {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8")) as Tokens;
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
  // Self-heal, don't assume (Task 4.7): demo-child is a checked-in fixture
  // several tests below depend on, but a real user can delete it through the
  // app at any time. Restore it from git before the dirty-check below,
  // regardless of its current on-disk state.
  execSync("git checkout HEAD -- packages/design-system/brands/demo-child/", { cwd: process.cwd() });
  for (const path of REAL_WRITE_PATHS) {
    try {
      execSync(`git diff --quiet -- ${path}`, { cwd: process.cwd() });
    } catch {
      throw new Error(`${path} has uncommitted changes — revert them before running this spec`);
    }
  }
});

test.afterEach(() => {
  for (const path of REAL_WRITE_PATHS) {
    execSync(`git checkout -- ${path}`, { cwd: process.cwd() });
    // .needs-deploy is gitignored -- git checkout can't touch it. A real
    // write here (tests 5, 7) now also marks it (Task 4.6); unlink it
    // explicitly or it leaks into every later spec file's run.
    const flagPath = join(process.cwd(), dirname(path), ".needs-deploy");
    if (existsSync(flagPath)) unlinkSync(flagPath);
  }
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

test("7. editing a field on a selected non-default brand writes to that brand's own tokens.json, not default's", async ({
  page,
}) => {
  await page.goto("/design-system?brand=demo-child", { timeout: 90_000 });
  const hex = colorSection(page).locator("label", { hasText: "Border" }).locator('input[type="text"]');
  await hex.fill("#abcdef");
  const writeResponse = postTokensRequest(page);
  await hex.press("Enter");
  await (await writeResponse).ok();

  const childTokens = readTokens(DEMO_CHILD_TOKENS_PATH);
  expect(leaf(childTokens, "semantic.color.border").$value).toBe("#abcdef");

  const defaultTokens = readTokens(TOKENS_PATH);
  expect(leaf(defaultTokens, "semantic.color.border").$value).not.toBe("#abcdef");
});
