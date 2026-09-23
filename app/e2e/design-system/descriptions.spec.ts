import { test, expect, type Page, type Response } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

// Per-token descriptions, manually saved (Task 9). Runs against `next dev`
// on :3002 (see playwright.design-system.config.ts), against real token
// paths in tokens.json — same real-write discipline as staged-save.spec.ts
// and dark-values.spec.ts, on the same file, so this spec must not run
// concurrently with either (the design-system Playwright config runs files
// serially; keep it that way).
const TOKENS_PATH = "packages/design-system/brands/default/tokens.json";

type Leaf = { $value: string; $type: string; $description?: string };
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

const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Design system sections" });

const section = (page: Page, heading: string) =>
  page.getByRole("region", { name: heading, exact: true });

const descriptionInput = (page: Page, sectionHeading: string, label: string) =>
  section(page, sectionHeading)
    .locator("div.flex.items-start.justify-between.gap-3.py-2", {
      has: page.getByText(label, { exact: true }),
    })
    .getByLabel(`Description for ${label}`);

test.beforeAll(() => {
  // Fail fast on leftover dirt -- same discipline as every prior spec that
  // writes to tokens.json for real.
  try {
    execSync(`git diff --quiet -- ${TOKENS_PATH}`, { cwd: process.cwd() });
  } catch {
    throw new Error(
      `${TOKENS_PATH} has uncommitted changes — revert them before running this spec`,
    );
  }
  const tokens = readTokens();
  const existing = leaf(tokens, "component.button.radius").$description;
  if (existing !== undefined) {
    throw new Error(
      `precondition: component.button.radius already has a description (${existing}) — pick a different fixture field`,
    );
  }
});

test.afterEach(() => {
  // Restore real state regardless of pass/fail.
  execSync(`git checkout -- ${TOKENS_PATH}`, { cwd: process.cwd() });
});

test.beforeEach(async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
});

test("1. the Save button only appears once the text differs from the current value", async ({
  page,
}) => {
  const input = descriptionInput(page, "Button", "Radius");
  await expect(
    section(page, "Button").getByRole("button", { name: "Save" }),
  ).toHaveCount(0);
  await input.fill("Corner rounding on the primary/secondary buttons.");
  await expect(section(page, "Button").getByRole("button", { name: "Save" })).toBeVisible();
  await input.fill("");
  await expect(
    section(page, "Button").getByRole("button", { name: "Save" }),
  ).toHaveCount(0);
});

test("2. Save writes the description, and it persists across a reload", async ({
  page,
}) => {
  const input = descriptionInput(page, "Button", "Radius");
  await input.fill("Corner rounding on the primary/secondary buttons.");
  const writeResponse = postTokensRequest(page);
  await section(page, "Button").getByRole("button", { name: "Save" }).click();
  await (await writeResponse).ok();

  const tokens = readTokens();
  expect(leaf(tokens, "component.button.radius").$description).toBe(
    "Corner rounding on the primary/secondary buttons.",
  );

  await page.reload();
  await expect(descriptionInput(page, "Button", "Radius")).toHaveValue(
    "Corner rounding on the primary/secondary buttons.",
  );
});

test("3. the same field's description reads identically in All variables and its per-component panel", async ({
  page,
}) => {
  // Seed a description for real first (via the API directly, not the UI --
  // this test is about read-consistency across views, not the write path).
  const writeResponse = postTokensRequest(page);
  await descriptionInput(page, "Button", "Radius").fill("Corner rounding on the buttons.");
  await section(page, "Button").getByRole("button", { name: "Save" }).click();
  await (await writeResponse).ok();

  await page.reload();
  await expect(descriptionInput(page, "Button", "Radius")).toHaveValue(
    "Corner rounding on the buttons.",
  );

  // "All variables" also renders every component section (under "Components"),
  // not just the semantic ones -- same field, same description, read there too.
  await sidebar(page).getByRole("button", { name: "All variables" }).click();
  await expect(descriptionInput(page, "Button", "Radius")).toHaveValue(
    "Corner rounding on the buttons.",
  );
});

test("4. clicking away without Save does not persist the edit", async ({ page }) => {
  const input = descriptionInput(page, "Button", "Radius");
  await input.fill("This should never be saved.");
  await expect(section(page, "Button").getByRole("button", { name: "Save" })).toBeVisible();
  // Click elsewhere on the page -- blur, not Save.
  await page.locator("h1").first().click();

  const tokens = readTokens();
  expect(leaf(tokens, "component.button.radius").$description).toBeUndefined();

  await page.reload();
  await expect(descriptionInput(page, "Button", "Radius")).toHaveValue("");
});
