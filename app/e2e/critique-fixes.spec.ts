import { test, expect } from "@playwright/test";
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
