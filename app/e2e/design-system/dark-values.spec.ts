import { test, expect, type Page, type Response } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

// Dark-theme values shown and editable next to light (Task 10). Runs against
// `next dev` on :3002 (see playwright.design-system.config.ts), against real
// token paths in tokens.json — same real-write discipline as
// staged-save.spec.ts, on the same file, so this spec must not run
// concurrently with it (the design-system Playwright config runs files
// serially; keep it that way).
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

// "Color" (region) must be exact -- an unscoped substring match also hits
// "Color Field" (the Components section), which renders its own
// "Background"-labeled demo control.
const colorSection = (page: Page) => page.getByRole("region", { name: "Color", exact: true });

// Scope to the one row whose light label matches exactly -- e.g. "Accent"
// must not also match "On accent", and "Color" holds many rows, each of
// which may render its own "Dark" sibling control.
const colorRow = (page: Page, lightLabel: string) =>
  colorSection(page).locator("div.flex.items-start.justify-between.gap-3.py-2", {
    has: page.getByText(lightLabel, { exact: true }),
  });

test.beforeAll(() => {
  // Fail fast on leftover dirt -- same discipline as staged-save.spec.ts.
  try {
    execSync(`git diff --quiet -- ${TOKENS_PATH}`, { cwd: process.cwd() });
  } catch {
    throw new Error(
      `${TOKENS_PATH} has uncommitted changes — revert them before running this spec`,
    );
  }
  // Pin the values the cases below assume, so a future edit to the fixture
  // brand fails here with a clear message instead of mid-test.
  const tokens = readTokens();
  const dark = leaf(tokens, "dark.semantic.color.background").$value;
  if (dark !== "#1c1d1f") {
    throw new Error(
      `precondition: dark.semantic.color.background is ${dark}, expected #1c1d1f`,
    );
  }
  const light = leaf(tokens, "semantic.color.background").$value;
  if (light !== "{primitive.color.paper}") {
    throw new Error(
      `precondition: semantic.color.background is ${light}, expected {primitive.color.paper}`,
    );
  }
});

test.afterEach(() => {
  // Restore real state regardless of pass/fail -- same as every prior spec
  // that writes to tokens.json for real.
  execSync(`git checkout -- ${TOKENS_PATH}`, { cwd: process.cwd() });
});

test.beforeEach(async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
});

test("1. a semantic.color field with a dark override shows both controls on one row", async ({
  page,
}) => {
  const row = colorRow(page, "Background");
  await expect(row.getByText("Background", { exact: true })).toBeVisible();
  await expect(row.getByText("Dark", { exact: true })).toBeVisible();
});

test("2. a semantic.color field with no dark override shows only the light control", async ({
  page,
}) => {
  // accent has no dark.* counterpart in tokens.json's dark block.
  const row = colorRow(page, "Accent");
  await expect(row.getByText("Accent", { exact: true })).toBeVisible();
  await expect(row.getByText("Dark", { exact: true })).toHaveCount(0);
});

test("3. editing the dark value writes dark.semantic.color.background specifically", async ({
  page,
}) => {
  const row = colorRow(page, "Background");
  const darkHex = row.locator("label", { hasText: "Dark" }).locator('input[type="text"]');

  const writeResponse = postTokensRequest(page);
  await darkHex.fill("#222222");
  await darkHex.press("Enter");
  await (await writeResponse).ok();

  const tokens = readTokens();
  expect(leaf(tokens, "dark.semantic.color.background").$value).toBe("#222222");
  // The light value's raw $value on disk is untouched.
  expect(leaf(tokens, "semantic.color.background").$value).toBe("{primitive.color.paper}");
});

test("4. Revert on the dark value restores it independently of the light value", async ({
  page,
}) => {
  const row = colorRow(page, "Background");
  const darkHex = row.locator("label", { hasText: "Dark" }).locator('input[type="text"]');

  const writeResponse = postTokensRequest(page);
  await darkHex.fill("#333333");
  await darkHex.press("Enter");
  await (await writeResponse).ok();
  await expect(darkHex).toHaveValue("#333333");

  const revertResponse = postTokensRequest(page);
  await row.getByRole("button", { name: "Revert" }).click();
  await (await revertResponse).ok();
  await expect(darkHex).toHaveValue("#1c1d1f");

  const tokens = readTokens();
  expect(leaf(tokens, "dark.semantic.color.background").$value).toBe("#1c1d1f");
  expect(leaf(tokens, "semantic.color.background").$value).toBe("{primitive.color.paper}");
});
