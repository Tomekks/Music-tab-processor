import { test, expect, type Page } from "@playwright/test";
import {
  DESKTOP_VIEWPORT,
  NARROW_VIEWPORT,
  gotoReady,
  collectConsoleErrors,
} from "./critique-helpers";

// Spec 1+4 blocks. Later specs append their own named describe blocks here;
// nothing below is restructured without asking (spec 1+4 §1).

/** #rrggbb -> rgb(r, g, b), matching getComputedStyle serialization. */
function hexToRgb(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a 6-digit hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff})`;
}

test.describe("spec 1+4 toolbar layout", () => {
  test("1280px: tabs and transport share one row", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tabs = page.getByRole("tablist", { name: "Tab display mode" });
    const play = page.getByRole("button", { name: "Play" });
    const tb = await tabs.boundingBox();
    const pb = await play.boundingBox();
    expect(tb, "tablist visible").not.toBeNull();
    expect(pb, "Play visible").not.toBeNull();
    // One row: the two vertical ranges overlap.
    expect(tb!.y).toBeLessThan(pb!.y + pb!.height);
    expect(pb!.y).toBeLessThan(tb!.y + tb!.height);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("767px: tabs own row 1, transport wraps row 2, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tabs = page.getByRole("tablist", { name: "Tab display mode" });
    const play = page.getByRole("button", { name: "Play" });
    const tb = await tabs.boundingBox();
    const pb = await play.boundingBox();
    expect(tb, "tablist visible").not.toBeNull();
    expect(pb, "Play visible").not.toBeNull();
    // Stacked: the TabSelector's bottom edge sits at or above the transport.
    expect(tb!.y + tb!.height).toBeLessThanOrEqual(pb!.y);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(NARROW_VIEWPORT.width);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("Play is primary: computed background resolves the accent token", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const play = page.getByRole("button", { name: "Play" });
    // Resolution, not a hex: the expected value is read from the token
    // variable itself at runtime.
    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--component-button-primary-background"),
    );
    const background = await play.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe(hexToRgb(token));

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("spec 1+4 shortcut scoping", () => {
  test("sidebar keys keep native behavior, transport unchanged", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Out-of-scope keys must keep fully native behavior. Note: Space does
    // not activate links in any browser (verified: focused link + Space =>
    // keyup with no click, defaultPrevented false throughout), so Enter
    // proves native activation and Space proves non-hijack.
    const sidebar = page.getByRole("navigation", { name: "Songs" });
    await sidebar.getByRole("link").first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\?song=/);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    const urlBefore = page.url();
    await sidebar.getByRole("link").first().focus();
    await page.keyboard.press("Space");
    // Native Space-on-link behavior is nothing-at-all: same URL, and the
    // transport never engaged (a hijack would read "Pause").
    expect(page.url()).toBe(urlBefore);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("Play-focused Space toggles via the shortcut (no double-toggle)", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const play = page.getByRole("button", { name: "Play" });
    await play.focus();
    await page.keyboard.press("Space");
    // Exactly one toggle: handler preventDefaults the keydown (suppressing
    // the native keyup click), so the label lands on Pause, not back on Play.
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("Tempo keeps native arrows", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tempo = page.locator("label", { hasText: "Tempo" }).locator("input");
    await tempo.focus();
    const before = Number(await tempo.inputValue());
    await page.keyboard.press("ArrowUp");
    expect(Number(await tempo.inputValue())).toBe(before + 1);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

test.describe("spec 1+4 shortcut opt-out", () => {
  test("switch off kills in-scope keys, persists across reload", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const evolves = page.getByRole("switch", { name: "Keyboard shortcuts" });
    await expect(evolves).toHaveAttribute("aria-checked", "true");

    // Arrows are live while opted in: starting playback, then stepping,
    // stops it (observable via the Play label).
    const play = page.getByRole("button", { name: "Play" });
    await play.click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    // Opt out. Arrows on the focused Play button have no native activation,
    // so "still paused/playing" proves our handler is dead, not native.
    await evolves.click();
    await expect(evolves).toHaveAttribute("aria-checked", "false");
    await play.click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("tabbytab:shortcuts"));
    expect(stored).toBe("0");

    await page.reload();
    await gotoReady(page, "/");
    // Hydration-safe default (on) flips off via the mount effect -- retried.
    await expect(page.getByRole("switch", { name: "Keyboard shortcuts" })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

// Spec 2 blocks (appended; spec 1+4's blocks above untouched).

/**
 * Drags steps ~10%-60% across the first Sheet staff system and returns the
 * resulting pill text (e.g. "Loop: steps 3–5 ✕"). Throws via expect when no
 * range results, so a too-short song fails loudly instead of silently.
 */
async function dragLoopOnFirstStaff(page: Page): Promise<string> {
  const staff = page.locator("svg.cursor-crosshair").first();
  await expect(staff).toBeVisible();
  // Atomic, retried rect read: after song navigation the detail Suspense
  // boundary can swap the svg node between two separate locator calls
  // (visible-then-null boundingBox observed live), so read coordinates in
  // one evaluate. Mouse events use coordinates, immune to later swaps.
  let rect: { x: number; y: number; width: number; height: number } | null = null;
  await expect(async () => {
    const r = await staff.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
    expect(r.width).toBeGreaterThan(0);
    rect = r;
  }).toPass({ timeout: 10000 });
  const y = rect!.y + rect!.height / 2;
  await page.mouse.move(rect!.x + rect!.width * 0.1, y);
  await page.mouse.down();
  await page.mouse.move(rect!.x + rect!.width * 0.6, y, { steps: 8 });
  await page.mouse.up();
  const pill = page.getByRole("button", { name: /Loop: steps/ });
  await expect(pill).toBeVisible();
  const text = await pill.textContent();
  const m = /Loop: steps (\d+)–(\d+) ✕/.exec(text ?? "");
  expect(m, `drag produced a loop range, pill read: ${text}`).not.toBeNull();
  return text!;
}

async function expectEmptyPill(page: Page): Promise<void> {
  await expect(page.getByText("Loop: not selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Loop/ })).toHaveCount(0);
}

test.describe("spec 2 loop pill", () => {
  test("empty state on all three tabs, never a button", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await expectEmptyPill(page);
    await page.getByRole("tab", { name: "Fretboard" }).click();
    await expectEmptyPill(page);
    await page.getByRole("tab", { name: "Ascii" }).click();
    await expectEmptyPill(page);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("Sheet drag sets the loop on every tab; X clears everywhere", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Longest song per quoted DB evidence (Friction, 1343 notes) -- room to drag.
    await page.getByRole("navigation", { name: "Songs" }).getByRole("link", { name: /Friction/ }).click();
    await expect(page.getByText("Loop: not selected", { exact: true })).toBeVisible();

    const pillText = await dragLoopOnFirstStaff(page);

    await page.getByRole("tab", { name: "Fretboard" }).click();
    await expect(page.getByRole("button", { name: /Loop: steps/ })).toHaveText(pillText);
    await page.getByRole("tab", { name: "Ascii" }).click();
    await expect(page.getByRole("button", { name: /Loop: steps/ })).toHaveText(pillText);

    await page.getByRole("button", { name: /Loop: steps/ }).click();
    await expectEmptyPill(page);
    await page.getByRole("tab", { name: "Sheet" }).click();
    await expectEmptyPill(page);
    await page.getByRole("tab", { name: "Fretboard" }).click();
    await expectEmptyPill(page);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  // layout-rerun (discharges the obligation pinned in specs 1+4 §10 and 3 §10):
  // spec 1+4's row assertions, repeated with the every-tab pill set and
  // unset, at both breakpoints.
  test("layout-rerun: every-tab pill preserves rows in both states", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("navigation", { name: "Songs" }).getByRole("link", { name: /Friction/ }).click();
    await expect(page.getByText("Loop: not selected", { exact: true })).toBeVisible();
    await dragLoopOnFirstStaff(page);

    const assertOneRow = async () => {
      const tabs = page.getByRole("tablist", { name: "Tab display mode" });
      const play = page.getByRole("button", { name: "Play" });
      const tb = await tabs.boundingBox();
      const pb = await play.boundingBox();
      expect(tb, "tablist visible").not.toBeNull();
      expect(pb, "Play visible").not.toBeNull();
      expect(tb!.y).toBeLessThan(pb!.y + pb!.height);
      expect(pb!.y).toBeLessThan(tb!.y + tb!.height);
    };
    const assertStackedNoOverflow = async (width: number) => {
      const tabs = page.getByRole("tablist", { name: "Tab display mode" });
      const play = page.getByRole("button", { name: "Play" });
      const tb = await tabs.boundingBox();
      const pb = await play.boundingBox();
      expect(tb, "tablist visible").not.toBeNull();
      expect(pb, "Play visible").not.toBeNull();
      expect(tb!.y + tb!.height).toBeLessThanOrEqual(pb!.y);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    };

    // Loop set: desktop one row, narrow stacked.
    await assertOneRow();
    await page.setViewportSize(NARROW_VIEWPORT);
    await assertStackedNoOverflow(NARROW_VIEWPORT.width);

    // Loop cleared: narrow stacked, desktop one row.
    await page.getByRole("button", { name: /Loop: steps/ }).click();
    await expectEmptyPill(page);
    await assertStackedNoOverflow(NARROW_VIEWPORT.width);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await assertOneRow();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});
