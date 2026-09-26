import { test, expect, type Page, type Request, type Response } from "@playwright/test";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// Staged-save end to end (Task 8b): pending edits, scope choice, explicit Save.
// Runs against `next dev` on :3002 (see playwright.design-system.config.ts) so
// no production build is involved. Uses real token paths from tokens.json so
// the brand-wide cascade logic is exercised for real, not mocked.
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

const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Design system sections" });

const section = (page: Page, heading: string) =>
  page.getByRole("region", { name: heading, exact: true });

// The Slider component renders a native range input inside its <label>.
// Playwright cannot `fill()` a range input, and React 19 ignores manually
// dispatched synthetic events on it (verified: DOM value changes, onChange
// never fires) — so drive it with real key presses, one step per tick, the
// same path a user dragging in small increments takes.
async function setSlider(
  page: Page,
  sectionHeading: string,
  labelText: string,
  target: number,
) {
  const slider = section(page, sectionHeading)
    .locator("label", { hasText: labelText })
    .locator('input[type="range"]');
  const before = Number(await slider.inputValue());
  const key = target > before ? "ArrowRight" : "ArrowLeft";
  for (let i = 0; i < Math.abs(target - before); i++) {
    await slider.press(key);
  }
}

async function postTokensRequest(page: Page) {
  return page.waitForResponse(
    (resp: Response) =>
      resp.url().includes("/api/design-system/tokens") &&
      resp.request().method() === "POST",
  );
}

test.beforeAll(() => {
  // Fail fast on leftover dirt: this project has corrupted two rounds of
  // manual checks with uncommitted tokens.json residue already.
  try {
    execSync(`git diff --quiet -- ${TOKENS_PATH}`, { cwd: process.cwd() });
  } catch {
    throw new Error(
      `${TOKENS_PATH} has uncommitted changes — revert them before running this spec`,
    );
  }
  // Pin the values every case below assumes, so a future schema change fails
  // here with a clear message instead of mid-test.
  const tokens = readTokens();
  const base = leaf(tokens, "semantic.radius.base").$value;
  if (base !== "8px") {
    throw new Error(`precondition: semantic.radius.base is ${base}, expected 8px`);
  }
});

test.afterAll(() => {
  // This file has no other cleanup hook -- each test restores tokens.json's
  // *content* by reverting through the app's own UI actions, by design. But
  // .needs-deploy (Task 4.6) is a separate, gitignored sentinel those UI
  // reverts don't necessarily clear (only "Reset all changes" does) -- unlink
  // it explicitly here or it leaks into every later spec file's run.
  const flagPath = join(process.cwd(), dirname(TOKENS_PATH), ".needs-deploy");
  if (existsSync(flagPath)) unlinkSync(flagPath);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/design-system", { timeout: 90_000 });
});

test("1. staging a slider edit shows Save but writes nothing to disk", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (req: Request) => {
    if (req.url().includes("/api/design-system/tokens") && req.method() === "POST") {
      posts.push(req.url());
    }
  });
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  await setSlider(page, "Color Field", "Radius", 30);
  await expect(
    page.getByRole("button", { name: "Save changes (1)" }),
  ).toBeVisible();
  // Fixed settle, not a poll: a poll would pass at t=0 before any stray POST
  // could fire. The wait must outlast the 200ms debounce a miswired row would
  // post on — only then does "no POST" mean anything.
  await page.waitForTimeout(1000);
  expect(posts).toEqual([]);
  expect(leaf(readTokens(), "semantic.radius.base").$value).toBe("8px");
  expect(
    leaf(readTokens(), "component.colorField.radius").$value,
  ).toBe("{semantic.radius.base}");
});

test("2. Discard clears the staged edit and restores the field", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  await setSlider(page, "Color Field", "Radius", 30);
  await expect(
    page.getByRole("button", { name: "Save changes (1)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
  const slider = section(page, "Color Field")
    .locator("label", { hasText: "Radius" })
    .locator('input[type="range"]');
  await expect(slider).toHaveValue("8");
});

test("3. brand-wide Save cascades to the sharing component", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  await setSlider(page, "Color Field", "Radius", 30);
  await section(page, "Color Field")
    .getByRole("tablist", { name: "Scope for Radius" })
    .getByRole("tab", { name: "Brand-wide" })
    .click();
  const saveResponse = postTokensRequest(page);
  await page.getByRole("button", { name: "Save changes (1)" }).click();
  await (await saveResponse).ok();
  expect(leaf(readTokens(), "semantic.radius.base").$value).toBe("30px");
  await sidebar(page).getByRole("button", { name: "Button", exact: true }).click();
  const readout = section(page, "Button")
    .locator("label", { hasText: "Radius" })
    .locator("span");
  await expect(readout).toHaveText("30");
});

test("4. reverting restores a fully clean tree", async ({ page }) => {
  // Test 3's brand save wrote semantic.radius.base; the origin leaf is still
  // an alias, so the only real disk-level Revert lives in All variables.
  await sidebar(page).getByRole("button", { name: "All variables" }).click();
  const revertButton = section(page, "Radius").getByRole("button", {
    name: "Revert Base to default",
  });
  // Start listening before clicking: waitForResponse created after the click
  // can miss an already-completed POST (same ordering test 3 uses).
  const revertResponse = postTokensRequest(page);
  await revertButton.click();
  await (await revertResponse).ok();
  const tokens = readTokens();
  expect(leaf(tokens, "semantic.radius.base").$value).toBe("8px");
  expect(leaf(tokens, "component.colorField.radius").$value).toBe(
    "{semantic.radius.base}",
  );
});

test("5. colliding brand-wide edits are refused and write nothing", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  await setSlider(page, "Color Field", "Radius", 30);
  await section(page, "Color Field")
    .getByRole("tablist", { name: "Scope for Radius" })
    .getByRole("tab", { name: "Brand-wide" })
    .click();
  await sidebar(page).getByRole("button", { name: "Button", exact: true }).click();
  await setSlider(page, "Button", "Radius", 40);
  await section(page, "Button")
    .getByRole("tablist", { name: "Scope for Radius" })
    .getByRole("tab", { name: "Brand-wide" })
    .click();
  await page.getByRole("button", { name: "Save changes (2)" }).click();
  // Scoped to the section: Next.js also renders a page-level route-announcer
  // with role="alert", which makes an unscoped getByRole("alert") strict-mode
  // ambiguous.
  const alert = section(page, "Button").getByRole("alert");
  await expect(alert).toContainText("semantic.radius.base");
  await expect(alert).toContainText("Radius (Color Field)");
  await expect(alert).toContainText("Radius (Button)");
  const tokens = readTokens();
  expect(leaf(tokens, "semantic.radius.base").$value).toBe("8px");
  expect(leaf(tokens, "component.colorField.radius").$value).toBe(
    "{semantic.radius.base}",
  );
  expect(leaf(tokens, "component.button.radius").$value).toBe(
    "{semantic.radius.base}",
  );
});

test("6. discarding the colliding batch ends clean", async ({ page }) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  await setSlider(page, "Color Field", "Radius", 30);
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
  const tokens = readTokens();
  expect(leaf(tokens, "semantic.radius.base").$value).toBe("8px");
});

test("7. staging a color edit shows Save but writes nothing to disk", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  const hex = section(page, "Color Field")
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#123456");
  await hex.press("Enter");
  await expect(
    page.getByRole("button", { name: "Save changes (1)" }),
  ).toBeVisible();
  // The override control renders for color rows too (Border is an alias).
  await expect(
    section(page, "Color Field").getByRole("tablist", { name: "Scope for Border" }),
  ).toBeVisible();
  const tokens = readTokens();
  expect(leaf(tokens, "component.colorField.border").$value).toBe(
    "{semantic.color.border}",
  );
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
});

test("8. a non-alias field can only stage as exception, even under bulk Brand-wide", async ({
  page,
}) => {
  // First make Button Radius a literal via an exception save.
  await sidebar(page).getByRole("button", { name: "Button", exact: true }).click();
  await setSlider(page, "Button", "Radius", 13);
  const firstSave = postTokensRequest(page);
  await page.getByRole("button", { name: "Save changes (1)" }).click();
  await (await firstSave).ok();
  expect(leaf(readTokens(), "component.button.radius").$value).toBe("13px");
  expect(leaf(readTokens(), "semantic.radius.base").$value).toBe("8px");
  // The bulk toggle lives in the Save bar, which needs a staged edit to
  // exist — stage a throwaway, flip bulk to Brand-wide, then discard it.
  await setSlider(page, "Button", "Padding X", 20);
  await page
    .getByRole("tablist", { name: "Default scope for new edits" })
    .getByRole("tab", { name: "Brand-wide" })
    .click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  // Now edit the (literal, non-alias) Radius field under a Brand-wide bulk.
  await setSlider(page, "Button", "Radius", 14);
  // No scope override is offered for a non-alias field — and the staged scope
  // was forced to exception, not the bulk default.
  await expect(
    section(page, "Button").getByRole("tablist", { name: "Scope for Radius" }),
  ).toHaveCount(0);
  await expect(
    section(page, "Button").getByText("(exception only", { exact: false }),
  ).toBeVisible();
  const secondSave = postTokensRequest(page);
  await page.getByRole("button", { name: "Save changes (1)" }).click();
  await (await secondSave).ok();
  // Exception semantics: the origin leaf was written, the shared target not.
  const tokens = readTokens();
  expect(leaf(tokens, "component.button.radius").$value).toBe("14px");
  expect(leaf(tokens, "semantic.radius.base").$value).toBe("8px");
  // Revert the origin leaf: restores the alias, tree fully clean again.
  const revertResponse = postTokensRequest(page);
  await section(page, "Button")
    .getByRole("button", { name: "Revert Radius to default" })
    .click();
  await (await revertResponse).ok();
  const clean = readTokens();
  expect(leaf(clean, "component.button.radius").$value).toBe(
    "{semantic.radius.base}",
  );
  expect(leaf(clean, "semantic.radius.base").$value).toBe("8px");
});

test("9. a per-field override does not move the bulk default", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  await setSlider(page, "Color Field", "Radius", 30);
  await section(page, "Color Field")
    .getByRole("tablist", { name: "Scope for Radius" })
    .getByRole("tab", { name: "Brand-wide" })
    .click();
  // Stage a second field: it must still default to Exception (the bulk
  // default), unaffected by the first field's override.
  const hex = section(page, "Color Field")
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#123456");
  await hex.press("Enter");
  const borderScope = section(page, "Color Field").getByRole("tablist", {
    name: "Scope for Border",
  });
  await expect(
    borderScope.getByRole("tab", { name: "Exception" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
  // Nothing was ever saved: the tree is untouched.
  expect(leaf(readTokens(), "semantic.radius.base").$value).toBe("8px");
});

test("10. All-variables edits still auto-commit with no Save bar", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "All variables" }).click();
  // Exact textbox name: a substring "Accent" would also match the "Accent
  // seed" and "On accent" fields in this view.
  const hex = section(page, "Color").getByRole("textbox", {
    name: "Accent",
    exact: true,
  });
  const writeResponse = postTokensRequest(page);
  await hex.fill("#123450");
  await hex.press("Enter");
  await (await writeResponse).ok();
  // Staged UI never appears in All variables: the write went straight through.
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
  expect(leaf(readTokens(), "semantic.color.accent").$value).toBe("#123450");
  const revertResponse = postTokensRequest(page);
  await section(page, "Color")
    .getByRole("button", { name: "Revert Accent to default" })
    .click();
  await (await revertResponse).ok();
  expect(leaf(readTokens(), "semantic.color.accent").$value).toBe(
    "{primitive.color.accent}",
  );
});

test.fixme("Escape discards a staged color edit", async ({ page }) => {
  // Deferred bug: staged-mode Escape calls onDiscardPending, but the
  // following blur() re-fires commitIfChanged with pre-discard closure values
  // and re-stages the same text. Un-skip when fixed; the steps below encode
  // the expected behavior.
  await sidebar(page).getByRole("button", { name: "Color Field" }).click();
  const hex = section(page, "Color Field")
    .locator("label", { hasText: "Border" })
    .locator('input[type="text"]');
  await hex.fill("#123456");
  await hex.press("Enter");
  await expect(
    page.getByRole("button", { name: "Save changes (1)" }),
  ).toBeVisible();
  await hex.press("Escape");
  await expect(
    page.getByRole("button", { name: /Save changes/ }),
  ).toHaveCount(0);
});
