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
