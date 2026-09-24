import { test, expect, type Page, type Response } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// Inherited vs. overridden UI on a child brand (Task 5c). There is no in-UI
// brand switcher, so this spec owns its fixture lifecycle: it points
// active-brand.json at demo-child, seeds one component-level override (the
// fixture ships only a semantic one, which never reaches the staged-save
// panel), rebuilds CSS, and restores everything afterward — even on failure.
// NOTE: this flips GLOBAL mutable state (active brand + generated CSS), so
// this file must never run concurrently with staged-save.spec.ts (which
// assumes the default brand). The design-system Playwright config runs files
// serially; keep it that way.
const ACTIVE_BRAND_PATH = "packages/design-system/active-brand.json";
const CHILD_TOKENS_PATH = "packages/design-system/brands/demo-child/tokens.json";

type Leaf = { $value: string; $type: string };
type Tokens = { [key: string]: Tokens | Leaf };

function isLeaf(node: Tokens | Leaf): node is Leaf {
  return "$value" in node;
}

function readJson(relativePath: string): Tokens {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8")) as Tokens;
}

function leaf(tokens: Tokens, path: string): Leaf | null {
  let node: Tokens | Leaf = tokens;
  for (const segment of path.split(".")) {
    if (isLeaf(node)) throw new Error(`leaf() descended past a leaf at ${path}`);
    const next: Tokens | Leaf | undefined = node[segment];
    if (next === undefined) return null;
    node = next;
  }
  return isLeaf(node) ? node : null;
}

function sh(command: string) {
  execSync(command, { cwd: process.cwd(), stdio: "pipe", timeout: 120_000 });
}

function assertCleanTrees() {
  sh(`git diff --quiet -- ${ACTIVE_BRAND_PATH} ${CHILD_TOKENS_PATH}`);
}

const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Design system sections" });

const section = (page: Page, heading: string) =>
  page.getByRole("region", { name: heading });

async function postTokensRequest(page: Page) {
  return page.waitForResponse(
    (resp: Response) =>
      resp.url().includes("/api/design-system/tokens") &&
      resp.request().method() === "POST",
  );
}

test.beforeAll(() => {
  // Self-heal, don't assume (Task 4.7): demo-child is a checked-in fixture
  // this whole file depends on, but a real user can delete it through the
  // app at any time. Restore it from git before taking ownership below,
  // regardless of its current on-disk state.
  sh("git checkout HEAD -- packages/design-system/brands/demo-child/");
  // Fail fast on leftover dirt — then take ownership of the fixture.
  try {
    assertCleanTrees();
  } catch {
    throw new Error(
      `${ACTIVE_BRAND_PATH} or ${CHILD_TOKENS_PATH} has uncommitted changes — revert them before running this spec`,
    );
  }
  const brand = readJson(ACTIVE_BRAND_PATH) as unknown as { brand: string };
  if (brand.brand !== "default") {
    throw new Error(`precondition: active brand is ${brand.brand}, expected default`);
  }
  const child = readJson(CHILD_TOKENS_PATH);
  if (leaf(child, "semantic.color.accent")?.$value !== "#4a90d9") {
    throw new Error("precondition: demo-child fixture accent is not #4a90d9");
  }
  // Point at demo-child, seed one component-level override (a literal the UI
  // could have staged itself), and rebuild CSS for the newly active brand.
  writeFileSync(
    join(process.cwd(), ACTIVE_BRAND_PATH),
    JSON.stringify({ brand: "demo-child" }, null, 2) + "\n",
  );
  const seeded = readJson(CHILD_TOKENS_PATH);
  (seeded as Tokens).component = {
    button: { radius: { $value: "8px", $type: "dimension" } },
  };
  writeFileSync(
    join(process.cwd(), CHILD_TOKENS_PATH),
    JSON.stringify(seeded, null, 2) + "\n",
  );
  sh("npm run tokens:build");
});

test.afterAll(() => {
  // Guaranteed restore even on failure: Playwright always runs afterAll.
  // Checkout first, THEN rebuild — the build reads active-brand.json, so it
  // must already point at default again for the CSS to come back right.
  sh(`git checkout -- ${ACTIVE_BRAND_PATH} ${CHILD_TOKENS_PATH}`);
  // .needs-deploy is gitignored -- git checkout can't touch it. Real writes
  // in this file (against demo-child, via active-brand.json) now also mark
  // it (Task 4.6); unlink it explicitly or it leaks into every later spec
  // file's run.
  const flagPath = join(process.cwd(), dirname(CHILD_TOKENS_PATH), ".needs-deploy");
  if (existsSync(flagPath)) unlinkSync(flagPath);
  sh("npm run tokens:build");
  assertCleanTrees();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
});

test("1. inherited fields are captioned, overrides show Revert to parent", async ({
  page,
}) => {
  const color = section(page, "Color");
  await expect(color.getByText("Inherited from default").first()).toBeVisible();
  // The one shipped override (accent) is editable with parent-revert...
  await expect(
    color.getByRole("button", { name: "Revert Accent to parent" }),
  ).toBeVisible();
  // ...and nothing offers defaults-file actions on a child brand.
  await expect(
    page.getByRole("button", { name: "Set as default" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Reset all changes|Confirm reset/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate from seeds" }),
  ).toHaveCount(0);
});

test("2. editing an inherited field stages it, Save creates a real override", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  const border = section(page, "Color Field");
  await expect(border.getByText("Inherited from default").first()).toBeVisible();
  const hex = border
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#123456");
  await hex.press("Enter");
  await expect(
    page.getByRole("button", { name: "Save changes (1)" }),
  ).toBeVisible();
  const saveResponse = postTokensRequest(page);
  await page.getByRole("button", { name: "Save changes (1)" }).click();
  await (await saveResponse).ok();
  expect(leaf(readJson(CHILD_TOKENS_PATH), "component.colorField.border")?.$value).toBe(
    "#123456",
  );
  await expect(border.getByText("Overridden").first()).toBeVisible();
});

test("3. the seeded component override shows Revert to parent", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Button" }).click();
  await expect(
    section(page, "Button").getByRole("button", { name: "Revert Radius to parent" }),
  ).toBeVisible();
  await expect(
    section(page, "Button").getByRole("button", { name: "Revert Radius to default" }),
  ).toHaveCount(0);
});

test("4. a pending edit shows Discard wording, not Revert to parent", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  const hex = section(page, "Color Field")
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#654321");
  await hex.press("Enter");
  await expect(
    section(page, "Color Field").getByRole("button", {
      name: "Discard staged change to Border",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
});

test("5. Revert to parent deletes the override and flips the caption back", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Button" }).click();
  const revertResponse = postTokensRequest(page);
  await section(page, "Button")
    .getByRole("button", { name: "Revert Radius to parent" })
    .click();
  await (await revertResponse).ok();
  expect(
    leaf(readJson(CHILD_TOKENS_PATH), "component.button.radius"),
  ).toBeNull();
  await expect(
    section(page, "Button").getByText("Inherited from default").first(),
  ).toBeVisible();
  await expect(
    section(page, "Button").getByRole("button", { name: /Revert Radius/ }),
  ).toHaveCount(0);
});
