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

// Spec 5 blocks (appended; earlier specs' blocks above untouched).

test.describe("spec 5 sidebar", () => {
  test("desktop: geometry identical after the shell move", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Exactly one visible navigation landmark.
    await expect(page.locator("nav:visible")).toHaveCount(1);
    const nav = page.getByRole("navigation", { name: "Songs" });

    // Token contract, both halves: root resolves 240px AND the nav
    // declaration uses the var (a literal 240px passes only the first).
    const rootVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim(),
    );
    expect(rootVar).toBe("240px");
    expect(await nav.getAttribute("style")).toContain("var(--sidebar-width, 240px)");
    expect(await nav.evaluate((el) => getComputedStyle(el).width)).toBe("240px");

    // Geometry: nav at x=0, top at header bottom, full content-row height.
    // First <header> in DOM order is the app shell header (the detail pane
    // renders its own song header further down).
    const headerBox = await page.locator("header").first().boundingBox();
    const navBox = await nav.boundingBox();
    expect(headerBox, "header visible").not.toBeNull();
    expect(navBox, "nav visible").not.toBeNull();
    expect(navBox!.x).toBe(0);
    expect(navBox!.y).toBeCloseTo(headerBox!.y + headerBox!.height, 0);
    expect(navBox!.width).toBe(240);
    const rowHeight = await nav.evaluate((el) => el.parentElement!.getBoundingClientRect().height);
    expect(navBox!.height).toBeCloseTo(rowHeight, 0);

    // Detail fills the rest; toggle hidden; no overflow.
    const detailBox = await page.getByTestId("detail-column").boundingBox();
    expect(detailBox, "detail visible").not.toBeNull();
    expect(detailBox!.x).toBe(240);
    expect(detailBox!.x + detailBox!.width).toBe(DESKTOP_VIEWPORT.width);
    await expect(page.getByRole("button", { name: "Songs", exact: true })).toBeHidden();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("mobile: toggle opens drawer with nested nav, list scrolls internally", async ({ page }) => {
    // Short viewport (DB holds 3 songs; quoted as evidence): the ~280px of
    // drawer content must overflow the 240px-tall panel.
    await page.setViewportSize({ width: 390, height: 240 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Desktop nav hidden; detail full width.
    await expect(page.locator("nav:visible")).toHaveCount(0);
    const detailBox = await page.getByTestId("detail-column").boundingBox();
    expect(detailBox, "detail visible").not.toBeNull();
    expect(detailBox!.x).toBe(0);
    expect(detailBox!.x + detailBox!.width).toBe(390);

    const toggle = page.getByRole("button", { name: "Songs", exact: true });
    await expect(toggle).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
    expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAttribute("aria-controls", "songs-drawer");

    // Closed dialog: hidden with zero tab stops.
    const dialog = page.getByRole("dialog", { name: "Songs" });
    await expect(dialog).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("navigation", { name: "Songs" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close songs" })).toBeVisible();

    const scroller = dialog.locator("div.overflow-y-auto");
    const overflow = await scroller.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
    expect(overflow.sh, `3-song list overflows (scrollHeight=${overflow.sh}, clientHeight=${overflow.ch})`).toBeGreaterThan(
      overflow.ch,
    );

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("drawer focus: contained cycling, Escape and backdrop return focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const toggle = page.getByRole("button", { name: "Songs", exact: true });
    const dialog = page.getByRole("dialog", { name: "Songs" });
    const closeBtn = dialog.getByRole("button", { name: "Close songs" });

    // Open moves focus to the selected link (whichever the DB selects).
    await toggle.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('a[aria-current="true"]')).toBeFocused();

    // Native containment both directions, starting from Close.
    await closeBtn.focus();
    await page.keyboard.press("Tab");
    await expect(dialog.locator("a").first()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeBtn).toBeFocused();
    // Sweep: focus never lands on an interactive outside element. Verified
    // live (twice, with and without tabindex on the dialog): Chromium's
    // native modal wrap transiently touches BODY on the forward wrap, then
    // re-enters -- so the assertion is "never outside", not "never body",
    // plus proof the cycle returns inside.
    const stops = new Set<string>();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const where = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return "body";
        const d = document.getElementById("songs-drawer");
        return d && d.contains(a) ? "inside" : `outside:${a.tagName}`;
      });
      expect(where.startsWith("outside"), `tab ${i} never lands outside`).toBe(false);
      stops.add(where);
    }
    expect(stops.has("inside"), "focus returns into the dialog").toBe(true);

    // Escape closes with focus back on the toggle.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();

    // Backdrop click (right of the 288px panel) does the same.
    await toggle.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(360, 350);
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("drawer with no links focuses the container", async ({ page }) => {
    // Simulated-empty variant: emptying Turso would be a DB write (out of
    // scope), so links are removed from the DOM to exercise the genuine
    // no-link focus path in production code.
    await page.setViewportSize({ width: 390, height: 700 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const toggle = page.getByRole("button", { name: "Songs", exact: true });
    const dialog = page.getByRole("dialog", { name: "Songs" });
    await toggle.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.evaluate(() => {
      document.querySelectorAll("#songs-drawer a").forEach((a) => a.remove());
    });
    await toggle.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("resize preserves drawer state both directions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const toggle = page.getByRole("button", { name: "Songs", exact: true });
    const dialog = page.getByRole("dialog", { name: "Songs" });
    await toggle.click();
    await expect(dialog).toBeVisible();

    // To desktop: mobile tree inaccessible, desktop nav back.
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeHidden();
    await expect(page.locator("nav:visible")).toHaveCount(1);

    // Back to mobile: prior open state intact, native behavior verified.
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("selecting a song keeps the drawer open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const toggle = page.getByRole("button", { name: "Songs", exact: true });
    const dialog = page.getByRole("dialog", { name: "Songs" });
    await toggle.click();
    await expect(dialog).toBeVisible();

    // All link assertions scoped via the dialog, never global selectors.
    await dialog.getByRole("link", { name: /Friction/ }).click();
    await expect(page).toHaveURL(/\?song=/);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Friction/ })).toHaveAttribute("aria-current", "true");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

// Spec 6 blocks (appended; earlier specs' blocks above untouched).

const ASCII_BANNER_COPY = "Ascii is a static reference — follow playback on Sheet or Fretboard.";

/** The Sheet playhead: the only dashed line in the Sheet staff svg. */
function sheetPlayhead(page: Page) {
  return page.locator('svg line[stroke-dasharray="3 2"]').first();
}

/**
 * Polls the playhead's x1 position attribute until it differs from `from`,
 * returning the new value. Each observed change is one proven step advance --
 * no arbitrary sleeps. Times out loudly (instead of passing vacuously) when
 * the helper cannot observe advances.
 */
async function waitPlayheadAdvance(page: Page, from: string | null): Promise<string> {
  await expect
    .poll(async () => await sheetPlayhead(page).getAttribute("x1"), { timeout: 30000 })
    .not.toBe(from);
  const next = await sheetPlayhead(page).getAttribute("x1");
  expect(next, "playhead x1 readable after advance").not.toBeNull();
  return next!;
}

test.describe("spec 6 ascii banner", () => {
  test("Ascii shows the static-reference banner above an untouched pre", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("tab", { name: "Ascii" }).click();
    const banner = page.getByRole("status");
    await expect(banner).toHaveText(ASCII_BANNER_COPY);
    // Banner first: its next sibling is the tab text itself.
    expect(await banner.evaluate((el) => el.nextElementSibling?.tagName)).toBe("PRE");
    // <pre> class contract unchanged (spec 6 §1 conformance is by diff review;
    // this guards the class half in automation).
    const pres = page.locator("pre");
    await expect(pres).toHaveCount(1);
    await expect(pres.first()).toHaveAttribute(
      "class",
      "bg-background text-foreground text-sm rounded-lg p-6 overflow-x-auto font-mono leading-relaxed",
    );

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("banner node is stable across playback advances; transport survives the switch", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Sheet is the default tab; start playback and prove two step advances
    // deterministically via the playhead's x1 position attribute.
    await page.getByRole("tab", { name: "Sheet" }).click();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    // Attached, not visible: a zero-width vertical SVG line has an empty
    // bounding box, so Playwright's visibility check never passes on it --
    // but its x1 position attribute is observable and advances per step.
    await expect(sheetPlayhead(page)).toBeAttached();
    const x0 = await sheetPlayhead(page).getAttribute("x1");
    expect(x0, "playhead x1 readable once playing").not.toBeNull();
    const x1 = await waitPlayheadAdvance(page, x0);
    const t1 = Date.now();
    const x2 = await waitPlayheadAdvance(page, x1);
    const t2 = Date.now();
    const cadenceMs = Math.max(t2 - t1, 1);

    // Switch to Ascii: banner mounted once, exact copy, above the pre.
    await page.getByRole("tab", { name: "Ascii" }).click();
    const banner = page.getByRole("status");
    await expect(banner).toHaveText(ASCII_BANNER_COPY);
    // Pin the banner DOM node identity, then watch it for mutations while
    // playback keeps ticking underneath.
    await banner.evaluate((el) => {
      const w = window as unknown as { __spec6BannerNode?: Element; __spec6BannerMutations?: number };
      w.__spec6BannerNode = el;
      w.__spec6BannerMutations = 0;
      new MutationObserver((records) => {
        w.__spec6BannerMutations = (w.__spec6BannerMutations ?? 0) + records.length;
      }).observe(el, { attributes: true, characterData: true, childList: true, subtree: true });
    });
    // Dwell sized from the measured in-run step cadence (room for >=2
    // advances), not an arbitrary sleep: the two proven advances above
    // calibrated it. Proves mount-once + zero playback-driven mutations --
    // NOT actual screen-reader speech (unverified residual, spec 6 §3).
    await page.waitForTimeout(cadenceMs * 2 + 500);
    const mutations = await page.evaluate(
      () => (window as unknown as { __spec6BannerMutations?: number }).__spec6BannerMutations,
    );
    expect(mutations, "zero playback-driven mutations on the banner node").toBe(0);
    expect(
      await banner.evaluate(
        (el) => el === (window as unknown as { __spec6BannerNode?: Element }).__spec6BannerNode,
      ),
      "same banner DOM node across the advances",
    ).toBe(true);
    await expect(banner).toHaveText(ASCII_BANNER_COPY);

    // Playback lived through the whole Ascii visit: back on Sheet the playhead
    // has moved on, and the transport is still playing (regression guard).
    await page.getByRole("tab", { name: "Sheet" }).click();
    await expect
      .poll(async () => await sheetPlayhead(page).getAttribute("x1"), { timeout: 30000 })
      .not.toBe(x2);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

// Spec 7 blocks (appended; earlier specs' blocks above untouched).

const ORIENTATION_KEY = "tabbytab:orientation";
const THIN_E_NAME = "Flip strings (currently thin e on top)";
const THICK_E_NAME = "Flip strings (currently thick E on top)";

/** Clear the persisted orientation, then load fresh: every block below starts
 *  from the thin-e-on-top default regardless of order or retries. */
async function gotoWithDefaultOrientation(page: Page): Promise<void> {
  await gotoReady(page, "/");
  await page.evaluate((key) => window.localStorage.removeItem(key), ORIENTATION_KEY);
  await page.reload();
  await gotoReady(page, "/");
}

/** Top string of the first diagram svg, via string-label DOM order (both
 *  diagrams position monospace pitch-name labels with getDisplayRow):
 *  "e" = thin e on top, "E" = thick E on top. */
async function expectTopString(page: Page, expected: string): Promise<void> {
  await expect(async () => {
    const top = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const rows = Array.from(svg.querySelectorAll("text"))
        .filter((el) => /^[A-Ga-g]$/.test((el.textContent ?? "").trim()))
        .map((el) => ({ text: el.textContent!.trim(), y: el.getBoundingClientRect().y }));
      rows.sort((a, b) => a.y - b.y);
      return rows.length ? rows[0]!.text : null;
    });
    expect(top, "first diagram svg exposes a top string label").toBe(expected);
  }).toPass({ timeout: 5000 });
}

test.describe("spec 7 orientation", () => {
  test("single Flip strings control on every tab", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoWithDefaultOrientation(page);

    for (const tab of ["Sheet", "Fretboard", "Ascii"] as const) {
      await page.getByRole("tab", { name: tab }).click();
      // Same toolbar resident, not per-view copies: exactly one match, and
      // the old dynamic copy is gone everywhere.
      const flip = page.getByRole("button", { name: /Flip strings/ });
      await expect(flip).toHaveCount(1);
      await expect(flip).toBeVisible();
      await expect(flip).toHaveAttribute("aria-pressed", "true");
      await expect(flip).toHaveAttribute("title", THIN_E_NAME);
      await expect(flip).toHaveAccessibleName(THIN_E_NAME);
      await expect(page.getByRole("button", { name: /Flip to/ })).toHaveCount(0);
    }

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("flip on Sheet reflects on Fretboard and back", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoWithDefaultOrientation(page);

    const flip = page.getByRole("button", { name: /Flip strings/ });
    await expect(flip).toHaveAttribute("aria-pressed", "true");
    await expectTopString(page, "e");

    // Flip on Sheet: control state + Sheet rendering agree.
    await flip.click();
    await expect(flip).toHaveAttribute("aria-pressed", "false");
    await expect(flip).toHaveAccessibleName(THICK_E_NAME);
    await expect(flip).toHaveAttribute("title", THICK_E_NAME);
    await expectTopString(page, "E");

    // Fretboard follows without its own click.
    await page.getByRole("tab", { name: "Fretboard" }).click();
    await expectTopString(page, "E");

    // Flip on the Fretboard tab (same toolbar control): both agree again.
    await flip.click();
    await expect(flip).toHaveAttribute("aria-pressed", "true");
    await expect(flip).toHaveAccessibleName(THIN_E_NAME);
    await expectTopString(page, "e");
    await page.getByRole("tab", { name: "Sheet" }).click();
    await expectTopString(page, "e");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("reload preserves the stored choice", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoWithDefaultOrientation(page);

    const flip = page.getByRole("button", { name: /Flip strings/ });
    await flip.click();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), ORIENTATION_KEY)).toBe("0");

    await page.reload();
    await gotoReady(page, "/");
    await expect(page.getByRole("button", { name: /Flip strings/ })).toHaveAttribute("aria-pressed", "false");
    await expectTopString(page, "E");

    await page.getByRole("button", { name: /Flip strings/ }).click();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), ORIENTATION_KEY)).toBe("1");

    await page.reload();
    await gotoReady(page, "/");
    await expect(page.getByRole("button", { name: /Flip strings/ })).toHaveAttribute("aria-pressed", "true");
    await expectTopString(page, "e");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

// Spec 8b blocks (appended; earlier specs' blocks above untouched).
//
// Live-data note: the suite runs against the real song list, so which art
// variants exist is data, not code. Each test quotes its observed
// rows-with-art / rows-without-art counts as an annotation; a missing
// variant is reported, never silently skipped. The empty-list and
// empty-detail branches cannot render against a populated database (no
// fixture per spec 8b §2/§9), so their exact copy is covered by diff/code
// review plus the human checkbox -- NOT claimed as runtime e2e here. Spec
// 5's no-links drawer test stays as focus regression coverage only.

test.describe("spec 8b empty states", () => {
  test("populated rows: art and placeholder boxes each reserve 48px", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Visible desktop nav only (the drawer's nav is hidden at this width).
    const nav = page.locator('nav[aria-label="Songs"]:visible');
    await expect(nav).toHaveCount(1);

    // Rows identified semantically: one link per song row.
    const rowCount = await nav.getByRole("link").count();
    expect(rowCount, "live list is populated").toBeGreaterThan(0);

    const artImgs = nav.locator("li img");
    const placeholders = nav.locator('li div[aria-hidden="true"]');
    const artCount = await artImgs.count();
    const placeholderCount = await placeholders.count();
    test.info().annotations.push({
      type: "spec-8b-live-data",
      description: `rows-with-art=${artCount} rows-without-art=${placeholderCount} rows-total=${rowCount}`,
    });
    expect(
      artCount + placeholderCount,
      "every visible row contributes exactly one art box (loaded art or placeholder)",
    ).toBe(rowCount);

    if (artCount === 0) {
      test.info().annotations.push({
        type: "spec-8b-missing-variant",
        description: "no rows with loaded art in the live list -- loaded-art geometry half not runtime-covered (source diff + human review only)",
      });
    } else {
      for (let i = 0; i < artCount; i++) {
        const img = artImgs.nth(i);
        await expect(img).toHaveAttribute(
          "class",
          "w-12 h-12 shrink-0 object-cover rounded-[var(--radius)]",
        );
        const box = await img.boundingBox();
        expect(box, "loaded-art box exists").not.toBeNull();
        expect(box!.width, `loaded-art box ${i} width`).toBeCloseTo(48, 0);
        expect(box!.height, `loaded-art box ${i} height`).toBeCloseTo(48, 0);
      }
    }

    if (placeholderCount === 0) {
      test.info().annotations.push({
        type: "spec-8b-missing-variant",
        description: "no rows without art in the live list -- placeholder geometry half not runtime-covered (source diff + human review only)",
      });
    } else {
      for (let i = 0; i < placeholderCount; i++) {
        const ph = placeholders.nth(i);
        // Rendered class contract: the w-12 size correction AND the
        // foreground token utility (no text-zinc-500) in one assertion.
        await expect(ph).toHaveAttribute(
          "class",
          "w-12 h-12 shrink-0 bg-foreground/10 rounded-[var(--radius)]",
        );
        const box = await ph.boundingBox();
        expect(box, "placeholder box exists").not.toBeNull();
        expect(box!.width, `placeholder box ${i} width`).toBeCloseTo(48, 0);
        expect(box!.height, `placeholder box ${i} height`).toBeCloseTo(48, 0);
      }
    }

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("no publish link or button on the live page", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // The empty-branch copy mentions publishing as plain guidance, never as
    // a control; the populated page must therefore have no publish-named
    // link or button at all. (The empty branches themselves are unreachable
    // against the populated DB -- their no-CTA half is diff + human review.)
    await expect(page.getByRole("link", { name: /publish/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});
