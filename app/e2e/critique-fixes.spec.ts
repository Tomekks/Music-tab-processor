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

type RowBox = { x: number; y: number; width: number; height: number };

// Row clustering by bounding-box center-y (items-center aligns centers
// within a row; rows sit >=12px apart). Returns names per row, top first.
// Hoisted top-level (8d-wrap fix-spec, third amendment exception) so the two
// amended row assertions below share the exact mechanism with spec 8d.
function rowsOf(boxes: Record<string, RowBox>): string[][] {
  const entries = Object.entries(boxes).map(([name, b]) => ({ name, cy: b.y + b.height / 2 }));
  entries.sort((a, b) => a.cy - b.cy);
  const rows: string[][] = [];
  for (const e of entries) {
    const prev = rows[rows.length - 1];
    if (!prev) {
      rows.push([e.name]);
      continue;
    }
    const prevCys = entries.filter((x) => prev.includes(x.name)).map((x) => x.cy);
    const prevMean = prevCys.reduce((a, b) => a + b, 0) / prevCys.length;
    if (Math.abs(e.cy - prevMean) <= 6) prev.push(e.name);
    else rows.push([e.name]);
  }
  return rows.map((r) => r.sort());
}

test.describe("spec 1+4 toolbar layout", () => {
  // Amended by the 8d-wrap fix-spec (third amendment exception, granted):
  // the shared-row contract is retired. Fallback contract: tabs own row 1,
  // the complete transport occupies row 2, no horizontal overflow.
  test("1280px: tabs own row 1, complete transport row 2, no overflow", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const raw: Record<string, RowBox | null> = {
      tabs: await page.getByRole("tablist", { name: "Tab display mode" }).boundingBox(),
      pill: await page.getByText("Loop: not selected", { exact: true }).boundingBox(),
      reset: await page.getByRole("button", { name: "Reset to start" }).boundingBox(),
      play: await page.getByRole("button", { name: "Play" }).boundingBox(),
      tempo: await page.locator("label", { hasText: "Tempo" }).boundingBox(),
      midi: await page.getByRole("button", { name: "MIDI sound" }).boundingBox(),
      flip: await page.getByRole("button", { name: /Flip strings/ }).boundingBox(),
    };
    for (const [name, box] of Object.entries(raw)) {
      expect(box, `${name} laid out`).not.toBeNull();
    }
    expect(rowsOf(raw as Record<string, RowBox>), "1280: tabs row + complete transport row").toEqual([
      ["tabs"],
      ["flip", "midi", "pill", "play", "reset", "tempo"],
    ]);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width);

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

// Spec 3 blocks (written for the playback-state contract; Playwright execution
// was explicitly skipped for this closeout and is reported as unverified).

test.describe("spec 3 Fretboard playback state", () => {
  test("active playback segment exposes one current step without changing segment sizes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 320 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("tab", { name: "Fretboard" }).click();
    const segments = page.locator("[data-step-index]");
    await expect(segments.first()).toBeVisible();
    const before = await segments.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));

    await expect.poll(async () => await page.locator('[aria-current="true"]').count(), { timeout: 30000 }).toBe(1);
    const after = await segments.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(after).toHaveLength(before.length);
    after.forEach((box, i) => {
      expect(box.width).toBe(before[i].width);
      expect(box.height).toBe(before[i].height);
    });

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("looped Fretboard segments use the loop token wash", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("tab", { name: "Sheet" }).click();
    await dragLoopOnFirstStaff(page);
    await page.getByRole("tab", { name: "Fretboard" }).click();
    const looped = page.locator('[data-looped="true"]');
    await expect(looped.first()).toBeVisible();

    const expected = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.background = "color-mix(in srgb, var(--color-loop-range) var(--state-loop-range-opacity), transparent)";
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    });
    expect(await looped.first().evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(expected);

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

// Spec 2 blocks (appended; spec 1+4's blocks above untouched).
// (Spec 8d amendment 1 of 2: the "spec 1+4 shortcut opt-out" describe that
// lived here -- lines 135-174 -- is DELETED with the opt-out removal. The
// stale-key behavior it used to cover is proven instead by spec 8d's
// "stale opt-out key is ignored" block appended at the end of this file.)

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
  // the fallback row assertions, repeated with the every-tab pill set and
  // unset, at both breakpoints (desktop: tabs row + transport row).
  test("layout-rerun: every-tab pill preserves rows in both states", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("navigation", { name: "Songs" }).getByRole("link", { name: /Friction/ }).click();
    await expect(page.getByText("Loop: not selected", { exact: true })).toBeVisible();
    const setPillText = await dragLoopOnFirstStaff(page);

    // Amended by the 8d-wrap fix-spec (third amendment exception, granted):
    // desktop follows the fallback contract in both loop states -- tabs row,
    // then the complete transport row (loop set: pill button; loop unset:
    // status span -- both must hold the same structure).
    const assertTwoRows = async (pillName: string) => {
      const raw: Record<string, RowBox | null> = {
        tabs: await page.getByRole("tablist", { name: "Tab display mode" }).boundingBox(),
        pill: await page.getByText(pillName, { exact: true }).boundingBox(),
        reset: await page.getByRole("button", { name: "Reset to start" }).boundingBox(),
        play: await page.getByRole("button", { name: "Play" }).boundingBox(),
        tempo: await page.locator("label", { hasText: "Tempo" }).boundingBox(),
        midi: await page.getByRole("button", { name: "MIDI sound" }).boundingBox(),
        flip: await page.getByRole("button", { name: /Flip strings/ }).boundingBox(),
      };
      for (const [name, box] of Object.entries(raw)) {
        expect(box, `${name} laid out`).not.toBeNull();
      }
      expect(rowsOf(raw as Record<string, RowBox>), `desktop two rows (pill: ${pillName})`).toEqual([
        ["tabs"],
        ["flip", "midi", "pill", "play", "reset", "tempo"],
      ]);
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

    // Loop set: desktop two rows, narrow stacked.
    await assertTwoRows(setPillText);
    await page.setViewportSize(NARROW_VIEWPORT);
    await assertStackedNoOverflow(NARROW_VIEWPORT.width);

    // Loop cleared: narrow stacked, desktop two rows.
    await page.getByRole("button", { name: /Loop: steps/ }).click();
    await expectEmptyPill(page);
    await assertStackedNoOverflow(NARROW_VIEWPORT.width);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await assertTwoRows("Loop: not selected");

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
    // Spec 8d: the drawer open control lives in the header now -- hidden on
    // desktop, and the sidebar renders no toggle of its own.
    await expect(page.locator("header").getByRole("button", { name: "Songs", exact: true })).toBeHidden();
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

    // Spec 8d: the toggle is the header island now -- exactly one Songs
    // button on the page, and it lives in the header.
    await expect(page.getByRole("button", { name: "Songs", exact: true })).toHaveCount(1);
    const toggle = page.locator("header").getByRole("button", { name: "Songs", exact: true });
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

    // Spec 8d: focus returns to the header button on every close path.
    const toggle = page.locator("header").getByRole("button", { name: "Songs", exact: true });
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

    const toggle = page.locator("header").getByRole("button", { name: "Songs", exact: true });
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

    const toggle = page.locator("header").getByRole("button", { name: "Songs", exact: true });
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

    const toggle = page.locator("header").getByRole("button", { name: "Songs", exact: true });
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

// Spec 8a blocks (appended; earlier specs' blocks above untouched).

/** The tempo input -- same locator spec 1+4's native-arrows block uses. */
function tempoInput(page: Page) {
  return page.locator("label", { hasText: "Tempo" }).locator("input");
}

test.describe("spec 8a tempo honesty", () => {
  test("clearing the field mid-playback never freezes playback", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("tab", { name: "Sheet" }).click();
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(sheetPlayhead(page)).toBeAttached();

    const tempo = tempoInput(page);
    await tempo.fill("");
    await expect(tempo, "clearing is draft-only, no commit").toHaveValue("");

    // Baseline read AFTER the clear: both advances below are then proven to
    // happen with the field empty (an advance before the clear proves nothing).
    const x0 = await sheetPlayhead(page).getAttribute("x1");
    const x1 = await waitPlayheadAdvance(page, x0);
    expect(await tempo.inputValue(), "still empty at advance 1").toBe("");
    const x2 = await waitPlayheadAdvance(page, x1);
    expect(await tempo.inputValue(), "still empty at advance 2").toBe("");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("Enter commits a valid tempo, keeps focus, commits exactly once", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    const tempo = tempoInput(page);
    await tempo.fill("90");
    await tempo.press("Enter");
    await expect(tempo, "Enter keeps focus in the field").toBeFocused();
    await expect(tempo).toHaveValue("90");

    // Exactly one commit: the blur that follows Enter must not re-commit or
    // revert the value (the suppression guard is what makes this hold).
    await page.keyboard.press("Tab");
    await expect(tempo, "no revert flicker after the Enter-then-blur").toHaveValue("90");

    const x0 = await sheetPlayhead(page).getAttribute("x1");
    await waitPlayheadAdvance(page, x0);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("blur commits a valid tempo", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tempo = tempoInput(page);
    await tempo.fill("100");
    await page.keyboard.press("Tab");
    await expect(tempo).toHaveValue("100");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("positive out-of-range values clamp, each in a fresh setup", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tempo = tempoInput(page);
    const defaultBpm = await tempo.inputValue();

    await tempo.fill("5");
    await tempo.press("Enter");
    await expect(tempo).toHaveValue("20");

    // Fresh setup for the second clamp -- tempo changes playback speed, so a
    // reload (resetting to the song's own tempo) instead of chaining values.
    await page.reload();
    await gotoReady(page, "/");
    await expect(tempo).toHaveValue(defaultBpm);
    await tempo.fill("999");
    await tempo.press("Enter");
    await expect(tempo).toHaveValue("300");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("clear-and-blur reverts to the established tempo; playback uninterrupted", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tempo = tempoInput(page);
    await tempo.fill("90");
    await tempo.press("Enter");
    await expect(tempo).toHaveValue("90");

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await tempo.fill("");
    await expect(tempo).toHaveValue("");
    await page.keyboard.press("Tab");
    await expect(tempo, "invalid input reverts, never commits").toHaveValue("90");

    // Nothing was committed on the invalid path: the clock still runs at 90.
    const xAfter = await sheetPlayhead(page).getAttribute("x1");
    await waitPlayheadAdvance(page, xAfter);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("spinner ArrowUp commits the stepped value on blur", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const tempo = tempoInput(page);
    await tempo.fill("90");
    await tempo.press("Enter");
    await expect(tempo).toHaveValue("90");

    await tempo.focus();
    await page.keyboard.press("ArrowUp");
    await expect(tempo, "stepper edits the draft").toHaveValue("91");
    await page.keyboard.press("Tab");
    await expect(tempo).toHaveValue("91");

    // Prove the commit (not just draft text): the revert target is the
    // committed bpm, so clear + blur must return the field to 91.
    await tempo.fill("");
    await page.keyboard.press("Tab");
    await expect(tempo, "committed bpm is 91 (revert target)").toHaveValue("91");

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

// Spec 8c blocks (appended; earlier specs' blocks above untouched).
//
// Self-contained: theme is normalized through the UI (a Light mode click)
// inside the block that measures it -- no localStorage assumptions, no test
// order dependence, no spec-8b selectors or fixtures.

test.describe("spec 8c control polish", () => {
  test("theme toggles meet the 44px target, state semantics unchanged", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Normalize via the UI regardless of prior state.
    const light = page.getByRole("button", { name: "Light mode" });
    const dark = page.getByRole("button", { name: "Dark mode" });
    await light.click();
    await expect(light).toHaveAttribute("aria-current", "true");

    for (const [label, target] of [["Light mode", light], ["Dark mode", dark]] as const) {
      const box = await target.boundingBox();
      expect(box, `${label} box exists`).not.toBeNull();
      expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
    }

    // Behavior unchanged: clicking Dark still flips the theme + aria-current.
    await dark.click();
    await expect(dark).toHaveAttribute("aria-current", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("Reset shows its label, meets the target, and still rewinds to the start", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Accessible name stays "Reset to start" (aria-label overrides content):
    // locate by that name, assert the new visible content.
    const reset = page.getByRole("button", { name: "Reset to start" });
    await expect(reset).toHaveText("⏮ Reset");
    const box = await reset.boundingBox();
    expect(box, "Reset box exists").not.toBeNull();
    expect(box!.width, "Reset width").toBeGreaterThanOrEqual(44);
    expect(box!.height, "Reset height").toBeGreaterThanOrEqual(44);

    // Existing behavior only. First reset (after one proven advance) lands
    // definitively on the song's first step and pauses; stepping forward
    // free-roam then proves the second reset returns to that same step.
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(sheetPlayhead(page)).toBeAttached();
    const xAdvanced = await waitPlayheadAdvance(page, await sheetPlayhead(page).getAttribute("x1"));
    await reset.click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect.poll(async () => await sheetPlayhead(page).getAttribute("x1")).not.toBe(xAdvanced);
    const xStep0 = await sheetPlayhead(page).getAttribute("x1");
    expect(xStep0, "playhead readable at song start").not.toBeNull();

    // Free-roam one step forward (ArrowRight pauses first), then reset back.
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => await sheetPlayhead(page).getAttribute("x1")).not.toBe(xStep0);
    await reset.click();
    await expect.poll(async () => await sheetPlayhead(page).getAttribute("x1")).toBe(xStep0);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("header metadata is three labelled spans with unchanged visible text", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const meta = page.locator('header p:has(span[aria-label="Song length"])');
    await expect(meta).toHaveCount(1);

    // Exactly three labelled items, two decorative separators (aria-hidden).
    await expect(meta.locator("span[aria-label]")).toHaveCount(3);
    await expect(meta.locator('span[aria-hidden="true"]')).toHaveCount(2);
    await expect(meta.locator('span[aria-label="Song length"]')).toHaveText(/^\d+:\d{2}$/);
    await expect(meta.locator('span[aria-label="Tuning"]')).toHaveText(/^tuning [A-Ga-g]+(-[A-Ga-g]+)*$/);
    await expect(meta.locator('span[aria-label="Tempo"]')).toHaveText(/^\d+ bpm$/);

    // Visible text: the former single run-on pattern, unchanged.
    await expect(meta).toHaveText(/^\d+:\d{2} • tuning [A-Ga-g]+(-[A-Ga-g]+)* • \d+ bpm$/);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});

// Spec 8d blocks (appended; spec-5 blocks above carry the quoted header-button
// amendment instead of being restructured. Self-contained: theme state via
// the UI, no order dependence, no cross-spec selectors).

test.describe("spec 8d consolidation", () => {
  test("stale opt-out key is ignored: shortcuts stay on", async ({ page, context }) => {
    // A stored "0" from the retired opt-out must change nothing: shortcuts
    // work, no off-state UI renders, and the key is left untouched (migration
    // declined -- proven inert here, not just stated).
    await context.addInitScript(() => window.localStorage.setItem("tabbytab:shortcuts", "0"));
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");
    await page.reload();
    await gotoReady(page, "/");

    // (1) In-scope Space/arrows still work (Play/Pause-label pattern): Space
    // on the focused Play button toggles exactly once, then ArrowRight steps
    // (which pauses) -- a dead handler would leave Play / Pause respectively.
    const play = page.getByRole("button", { name: "Play" });
    await play.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    // (2) The stale key is left untouched.
    expect(await page.evaluate(() => localStorage.getItem("tabbytab:shortcuts"))).toBe("0");

    // (3) No off-state UI exists anywhere.
    await expect(page.getByText("Keyboard shortcuts off", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("switch", { name: "Keyboard shortcuts" })).toHaveCount(0);

    // (4) Tempo keeps native arrows (editable-target rule survives the
    // predicate change): Up bumps the value and never engages transport.
    const tempo = page.locator("label", { hasText: "Tempo" }).locator("input");
    await tempo.focus();
    const before = Number(await tempo.inputValue());
    await page.keyboard.press("ArrowUp");
    expect(Number(await tempo.inputValue())).toBe(before + 1);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("header layout: Songs + hint visibility and DOM order", async ({ page }) => {
    const { errors } = collectConsoleErrors(page);

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await gotoReady(page, "/");
    const header = page.locator("header").first();
    const songsBtn = header.getByRole("button", { name: "Songs", exact: true });

    // Desktop: Songs island hidden, hint visible with the exact static copy.
    await expect(songsBtn).toBeHidden();
    const hint = header.locator("p");
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText("Space play/pause · ←/→ step");

    // DOM order Songs -> title -> hint -> toggle holds at every width
    // (asserted once here; order is viewport-independent).
    const ordered = await header.evaluate((h) => {
      const songs = h.querySelector('button[aria-controls="songs-drawer"]');
      const title = h.querySelector('a[href="/"]');
      const hintP = h.querySelector("p");
      const toggle = h.querySelector('button:not([aria-controls="songs-drawer"])');
      if (!songs || !title || !hintP || !toggle) return null;
      const seq = [songs, title, hintP, toggle];
      return seq.every(
        (el, i) => i === 0 || seq[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(ordered, "header DOM order is Songs -> title -> hint -> toggle").toBe(true);

    // Below md the hint hides and the icon-only Songs button shows before
    // the title (767 and 390 probe both sides of nothing -- md is 768, so
    // both are drawer widths; 767 guards the boundary).
    for (const width of [767, 390]) {
      await page.setViewportSize({ width, height: 700 });
      await expect(hint).toBeHidden();
      await expect(songsBtn).toBeVisible();
      // Icon-only: the button's whole text is the (aria-hidden) glyph; the
      // accessible name still resolves to Songs (that's how this handle found
      // it). It sits before the title in reading order.
      expect((await songsBtn.textContent())?.trim()).toBe("☰");
      const songsBox = await songsBtn.boundingBox();
      const titleBox = await header.locator('a[href="/"]').boundingBox();
      expect(songsBox, "songs button laid out").not.toBeNull();
      expect(titleBox, "title laid out").not.toBeNull();
      expect(songsBox!.x).toBeLessThan(titleBox!.x);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    }

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("drawer via header: Close-button path returns focus to the header button", async ({ page }) => {
    // Spec-5's amended blocks own the Escape + backdrop paths; this block owns
    // the remaining Close-songs path, so every close path is proven to land
    // on the header button.
    await page.setViewportSize({ width: 390, height: 700 });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    const toggle = page.locator("header").getByRole("button", { name: "Songs", exact: true });
    const dialog = page.getByRole("dialog", { name: "Songs" });
    await toggle.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close songs" }).click();
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("hover: Play/Reset/MIDI filter responds, Flip background responds", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Play/Reset/MIDI: idle filter none -> hovered non-none -> unhovered none
    // (computed styles only, never class names).
    const filterButtons = [
      page.getByRole("button", { name: "Play" }),
      page.getByRole("button", { name: "Reset to start" }),
      page.getByRole("button", { name: "MIDI sound" }),
    ];
    for (const btn of filterButtons) {
      const idle = await btn.evaluate((el) => getComputedStyle(el).filter);
      expect(idle, "idle filter is none").toBe("none");
      await btn.hover();
      const hovered = await btn.evaluate((el) => getComputedStyle(el).filter);
      expect(hovered, "hovered filter is non-none").not.toBe("none");
      await page.mouse.move(4, 4);
      const back = await btn.evaluate((el) => getComputedStyle(el).filter);
      expect(back, "unhovered filter returns to none").toBe("none");
    }

    // Flip strings keeps its own mechanism: background-color change + return.
    const flip = page.getByRole("button", { name: /Flip strings/ });
    const bgIdle = await flip.evaluate((el) => getComputedStyle(el).backgroundColor);
    await flip.hover();
    const bgHovered = await flip.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgHovered, "hovered background differs").not.toBe(bgIdle);
    await page.mouse.move(4, 4);
    const bgBack = await flip.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgBack, "unhovered background returns").toBe(bgIdle);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("heights: Reset, Play, MIDI, and Flip measure equal", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");

    // Live bug report: Reset/Play rendered larger than MIDI/Flip. All four
    // share min-h-[44px]; measured equality proves no button stands out.
    const names = ["Reset to start", "Play", "MIDI sound", /Flip strings/] as const;
    const heights: number[] = [];
    for (const name of names) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box, `${String(name)} laid out`).not.toBeNull();
      heights.push(box!.height);
    }
    test.info().annotations.push({
      type: "spec-8d-heights",
      description: `reset=${heights[0]}px play=${heights[1]}px midi=${heights[2]}px flip=${heights[3]}px`,
    });
    for (const h of heights) expect(h, "all four button heights equal").toBe(heights[0]);

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  // Wrap-row helpers (8d-wrap fix-spec): each width below is its own
  // independent test, so a failure at one width never hides the evidence
  // from the others. RowBox/rowsOf live top-level (shared with the two
  // amended row assertions above).
  // Stable names, never DOM order: the pill (fresh page => unset span), the
  // four named controls, and the tablist. Throws loudly when any is missing.
  async function transportHandles(page: Page): Promise<Record<string, RowBox>> {
    const raw: Record<string, RowBox | null> = {
      tabs: await page.getByRole("tablist", { name: "Tab display mode" }).boundingBox(),
      pill: await page.getByText("Loop: not selected", { exact: true }).boundingBox(),
      reset: await page.getByRole("button", { name: "Reset to start" }).boundingBox(),
      play: await page.getByRole("button", { name: "Play" }).boundingBox(),
      tempo: await page.locator("label", { hasText: "Tempo" }).boundingBox(),
      midi: await page.getByRole("button", { name: "MIDI sound" }).boundingBox(),
      flip: await page.getByRole("button", { name: /Flip strings/ }).boundingBox(),
    };
    for (const [name, box] of Object.entries(raw)) {
      expect(box, `${name} laid out`).not.toBeNull();
    }
    return raw as Record<string, RowBox>;
  }

  // No control narrower than its content.
  async function expectControlsFitContent(page: Page): Promise<void> {
    const locs = [
      page.getByRole("tablist", { name: "Tab display mode" }),
      page.getByRole("button", { name: "Reset to start" }),
      page.getByRole("button", { name: "Play" }),
      page.locator("label", { hasText: "Tempo" }),
      page.getByRole("button", { name: "MIDI sound" }),
      page.getByRole("button", { name: /Flip strings/ }),
    ];
    for (const loc of locs) {
      const fits = await loc.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits, "control fits its content").toBe(true);
    }
  }

  // Below xl the wrappers flow: tabs row alone, then controls fill row by
  // row in explicit order (primary -> flip -> pill -> midi -> tempo). Row
  // membership is emergent from real widths, pinned per width below.
  async function expectFlowRows(page: Page, width: number, height: number, expected: string[][]): Promise<void> {
    await page.setViewportSize({ width, height });
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");
    const b = await transportHandles(page);
    expect(rowsOf(b), `${width}: flow rows`).toEqual(expected);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);
    await expectControlsFitContent(page);
    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  }

  test("wrap rows: xl tabs row plus complete transport row", async ({ page }) => {
    // 8d-wrap fix-spec fallback (measured: shared-row slack 0.0px even after
    // the final permitted xl spacing adjustment): at xl the tabs own the
    // first row and the collapsed wrappers form one complete transport row
    // below them. The compact spacing was reverted with the fallback -- this
    // asserts the relaxed contract, with slack reported, never bar-gated.
    await page.setViewportSize(DESKTOP_VIEWPORT);
    const { errors } = collectConsoleErrors(page);
    await gotoReady(page, "/");
    const b = await transportHandles(page);
    expect(rowsOf(b), "1280: tabs row + complete transport row").toEqual([
      ["tabs"],
      ["flip", "midi", "pill", "play", "reset", "tempo"],
    ]);
    const detailBox = await page.getByTestId("detail-column").boundingBox();
    expect(detailBox, "detail laid out").not.toBeNull();
    const lastRight = Math.max(
      ...["pill", "reset", "play", "tempo", "midi", "flip"].map((n) => b[n].x + b[n].width),
    );
    const slack = detailBox!.x + detailBox!.width - 32 - lastRight;
    test.info().annotations.push({
      type: "spec-8d-xl-slack",
      description: `slack=${slack.toFixed(1)}px`,
    });
    expect(slack, "transport row stays inside the toolbar content").toBeGreaterThanOrEqual(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width);
    await expectControlsFitContent(page);
    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });

  test("wrap rows: 1024 tabs own row, flow rows below", async ({ page }) => {
    await expectFlowRows(page, 1024, 800, [
      ["tabs"],
      ["flip", "midi", "pill", "play", "reset", "tempo"],
    ]);
  });

  test("wrap rows: 767 flow rows", async ({ page }) => {
    await expectFlowRows(page, 767, 700, [
      ["tabs"],
      ["flip", "midi", "play", "reset", "tempo"],
      ["pill"],
    ]);
  });

  test("wrap rows: 390 flow rows", async ({ page }) => {
    await expectFlowRows(page, 390, 700, [["tabs"], ["flip", "play", "reset"], ["midi", "tempo"], ["pill"]]);
  });

  test("wrap rows: tabs hold their row across transport-state changes", async ({ page }) => {
    // 8d-wrap fix-spec: no cross-width equality (the song header legitimately
    // wraps at 390, outside every allowlist). Instead, at each width
    // independently, tabs must not move when transport state changes. The
    // song stays fixed per width (Friction, longest per quoted DB evidence)
    // so only transport changes can move the tabs.
    const { errors } = collectConsoleErrors(page);
    for (const [width, height] of [
      [DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height],
      [1024, 800],
      [767, 700],
      [390, 700],
    ] as const) {
      await page.setViewportSize({ width, height });
      await gotoReady(page, "/");
      if (width < 768) {
        await page.locator("header").getByRole("button", { name: "Songs", exact: true }).click();
        await expect(page.getByRole("dialog", { name: "Songs" })).toBeVisible();
      }
      await page.getByRole("navigation", { name: "Songs" }).getByRole("link", { name: /Friction/ }).click();
      // Navigation race guards: the old song's toolbar also shows Play +
      // empty-loop text, so prove the new song arrived (URL + its own
      // toolbar mount) before measuring. Below md, close the drawer first --
      // the open modal makes the background inert and poisons measurement.
      await expect(page).toHaveURL(/\?song=/);
      if (width < 768) {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog", { name: "Songs" })).toBeHidden();
      }
      await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
      await expect(page.getByText("Loop: not selected", { exact: true })).toBeVisible();
      await expect(page.getByRole("tablist", { name: "Tab display mode" })).toBeVisible();

      const tabsY = async () =>
        (await page.getByRole("tablist", { name: "Tab display mode" }).boundingBox())!.y;
      const y0 = await tabsY();

      // Widest pill state change: unset span -> set-range button -> unset.
      await dragLoopOnFirstStaff(page);
      const y1 = await tabsY();
      await page.getByRole("button", { name: /Loop: steps/ }).click();
      await expect(page.getByText("Loop: not selected", { exact: true })).toBeVisible();
      const y2 = await tabsY();

      // Play/Pause label swap + a control hover.
      await page.getByRole("button", { name: "Play" }).click();
      await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
      const y3 = await tabsY();
      await page.getByRole("button", { name: /Flip strings/ }).hover();
      const y4 = await tabsY();

      for (const y of [y1, y2, y3, y4]) expect(y, `tabs y stable at ${width}`).toBe(y0);
    }
    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});
