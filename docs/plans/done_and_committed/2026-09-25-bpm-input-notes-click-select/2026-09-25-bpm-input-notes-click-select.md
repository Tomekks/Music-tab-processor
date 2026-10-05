# BPM Input Hardening, Sheet String-Label Sizing, Click-to-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the BPM field against non-numeric/overlong input, enlarge the Sheet view's string-name labels, and let a plain click on a Sheet note jump playback to that step (replacing the old "plain click only clears the loop" behavior).

**Architecture:** Task 1 converts `TempoField`'s `<input>` from `type="number"` to `type="text" inputMode="numeric"` with an explicit digit-filter/truncate `onChange`, and manually reimplements the ArrowUp/ArrowDown stepping the native number-input spinner used to provide (lost when leaving `type="number"`). Task 2 is a one-line formula tweak in `SheetDiagram.tsx`. Task 3 adds a new absolute-jump function to `useMetronome`, threads a new `onSelectStep` callback down through `DiagramViewport` → `SheetDiagram` → `System` (Sheet-only, mirroring how `onSelectRange`/`onClearLoop` are already threaded), and fires it from the existing plain-click branch of `System`'s pointer-up handler alongside the existing `onClearLoop()` call.

**Tech Stack:** Next.js/React/TypeScript, Playwright e2e (`app/e2e/critique-fixes.spec.ts`), no new dependencies.

**Spec:** This plan implements the design agreed in a grilling-skill interview session dated 2026-09-25 (no separate spec file; consolidated decisions restated in each task below). Two items from the originating six-item request are explicitly **not** tasks here: the BPM field's left/right padding asymmetry was withdrawn by the user ("leave it be" — the current padding is intentionally sized to fit a 4th digit), and the "keyboard shortcuts stop working on page load" report was confirmed already fixed by an earlier commit (`b1c7988`) during this same investigation — the user was testing a stale tab.

## Global Constraints

- BPM field: digit-only input, hard 3-character max, ArrowUp/ArrowDown stepping preserved (step size `BPM_STEP` from `app/components/MetronomeControls.tsx`, already `5`), existing blur/Enter commit-and-clamp behavior (`MIN_BPM`=20, `MAX_BPM`=500) unchanged.
- Sheet string labels: `x="12"`, `font-size="16"`, kept as a **derived formula** (not literal constants) per explicit instruction, adjusted so the formula evaluates to those values at today's `PAD_LEFT`.
- Click-to-select-step: **Sheet view only**, not Fretboard. Clicking a step always clears any active loop (unconditional, matching today's existing unconditional `onClearLoop()` call), and always jumps `currentStep` to the clicked step using the same pause/hasStarted/clamp semantics as arrow-key stepping (`stepBy`), just parameterized as an absolute index instead of a relative delta.
- Every task's own test command (and `npm run typecheck`) must pass before committing. Check `lsof -i :3000` is free before any `npx playwright test` run (a stale dev server on that port causes `reuseExistingServer` to silently test against stale output — see the project's own postmortem on this from earlier in the branch).

---

### Task 1: BPM input — digit-only, 3-digit max

**Files:**
- Modify: `app/components/MetronomeControls.tsx` (`TempoField`)
- Modify: `app/e2e/critique-fixes.spec.ts` (role selectors + one new test)

**Interfaces:**
- Consumes: `MIN_BPM`, `MAX_BPM`, `BPM_STEP` (existing exported constants, unchanged).
- Produces: no external prop-shape change — `TempoField({ bpm, onBpmChange })` keeps the same signature; only its internal `<input>` implementation changes.

- [ ] **Step 1: Write the failing tests first**

Add to the `"spec 8a tempo honesty"` describe block in `app/e2e/critique-fixes.spec.ts` (near the existing `"bpm range is 20-500..."` test):

```ts
test("tempo field rejects non-digit characters and truncates to 3 digits", async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const { errors } = collectConsoleErrors(page);
  await gotoReady(page, "/");

  const tempo = tempoInput(page);
  await tempo.fill("");
  await tempo.pressSequentially("500d");
  await expect(tempo, "letter is stripped, not appended").toHaveValue("500");

  await tempo.fill("");
  await tempo.pressSequentially("1230");
  await expect(tempo, "4th digit is truncated, not appended").toHaveValue("123");

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
lsof -i :3000 | grep LISTEN || echo "port free"
cd app && npx playwright test e2e/critique-fixes.spec.ts -g "rejects non-digit characters"
```

Expected: FAIL (current `type="number"` input has no digit-filter or length-truncation logic; depending on the browser engine Playwright uses, `pressSequentially("500d")` may leave `"500"` already if the engine rejects the letter, but `"1230"` will NOT truncate to 3 digits — the 4-digit case is the one guaranteed to fail today).

- [ ] **Step 3: Convert the input to `type="text"` with digit filtering and manual arrow-stepping**

In `app/components/MetronomeControls.tsx`, replace the `<input>` element inside `TempoField` (currently `type="number"` with `min`/`max`, the native-spinner-hiding classes, and no `onKeyDown` arrow handling) with:

```tsx
<input
  type="text"
  inputMode="numeric"
  value={draft}
  onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
  onBlur={() => commit("blur")}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit("enter");
      return;
    }
    // type="number"'s native ArrowUp/ArrowDown spinner is gone now that
    // this is type="text" (needed to reliably block letters/symbols in
    // every browser -- Firefox lets "e"/"+"/"-"/"." through a number
    // input's own filtering). Re-implemented here so the existing
    // stepped-arrow behavior (and its e2e test) keeps working: edits the
    // draft only, doesn't commit -- matches every other keystroke path.
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const current = Number(draft) || bpm;
      const next = e.key === "ArrowUp" ? current + 1 : current - 1;
      setDraft(String(Math.max(0, Math.min(999, next))).slice(0, 3));
    }
  }}
  aria-label="Tempo in beats per minute"
  className="w-11 bg-transparent text-xl text-surface-text outline-none"
/>
```

Remove the now-unused native-spinner-hiding comment and Tailwind classes (`[appearance:textfield]`, the two `[&::-webkit-*-spin-button]:appearance-none` utilities, and the `min`/`max` attributes) — none of these apply to a `type="text"` input.

- [ ] **Step 4: Update every Playwright selector that assumed the ARIA `spinbutton` role**

`type="text"` inputs report role `textbox`, not `spinbutton`. Update all 8 occurrences in `app/e2e/critique-fixes.spec.ts` (verify the exact count with `grep -n 'getByRole("spinbutton"' app/e2e/critique-fixes.spec.ts` before editing, since earlier tasks in this branch may have changed the count) from:

```ts
page.getByRole("spinbutton", { name: "Tempo in beats per minute" })
```

to:

```ts
page.getByRole("textbox", { name: "Tempo in beats per minute" })
```

This includes the `tempoInput(page)` helper function itself (around line 832 as of this branch — re-locate it with `grep -n "function tempoInput"` since line numbers have shifted across this branch's earlier commits) and every inline `raw`/`transportHandles`/`expectControlsFitContent` object/array entry that references it.

- [ ] **Step 5: Run the new tests and the full existing tempo-honesty block**

```bash
lsof -i :3000 | grep LISTEN || echo "port free"
cd app && npx playwright test e2e/critique-fixes.spec.ts -g "spec 8a tempo honesty"
```

Expected: all pass, including `"spinner ArrowUp commits the stepped value on blur"` (now exercising the manually-reimplemented ArrowUp handler instead of the native one) and the two new digit-filtering assertions.

- [ ] **Step 6: Typecheck, then run the full suite**

```bash
cd app && npm run typecheck
lsof -i :3000 | grep LISTEN || echo "port free"
npx playwright test e2e/critique-fixes.spec.ts
```

Expected: `npm run typecheck` clean, all e2e tests pass (44+ — check the exact current count with the previous full run's output before this task, since Task 3 below adds more).

- [ ] **Step 7: Commit**

```bash
git add app/components/MetronomeControls.tsx app/e2e/critique-fixes.spec.ts
git commit -m "fix(metronome): BPM field rejects non-digits, hard 3-digit max

type=\"number\" still let some non-digit characters through depending on
browser engine (Firefox: e/+/-/., no cross-browser length limit either).
Switched to type=\"text\" inputMode=\"numeric\" with an explicit digit-only,
3-char-max onChange filter, and manually reimplemented the ArrowUp/ArrowDown
stepping the native number-input spinner used to provide."
```

---

### Task 2: Sheet view — enlarge string-name labels

**Files:**
- Modify: `app/components/SheetDiagram.tsx`
- Modify: `app/e2e/critique-fixes.spec.ts` (only if an existing test asserts the old `x`/`fontSize` values — check first, see Step 1)

**Interfaces:**
- No prop/type changes — this is a pure rendering-constant tweak inside the `System` component.

- [ ] **Step 1: Check for any existing test pinned to the current values**

```bash
cd app && grep -n 'fontSize={10}\|PAD_LEFT - 12' e2e/critique-fixes.spec.ts components/SheetDiagram.tsx
```

If no e2e test references these values directly (expected — this plan's research found none), proceed without a test-update sub-step.

- [ ] **Step 2: Adjust the label's `x` offset formula and `fontSize`**

In `app/components/SheetDiagram.tsx`, inside the `System` component, find the string-name `<text>` element (currently):

```tsx
<text key={i} x={PAD_LEFT - 12} y={yFor(i) + 3.5} textAnchor="end" fontSize={10} fontFamily="monospace" fill="var(--foreground)" fillOpacity={0.55}>
```

Replace with:

```tsx
<text key={i} x={PAD_LEFT - 14} y={yFor(i) + 3.5} textAnchor="end" fontSize={16} fontFamily="monospace" fill="var(--foreground)" fillOpacity={0.55}>
```

(`PAD_LEFT` is `26` today, so `PAD_LEFT - 14` evaluates to `12`, matching the requested value while staying a formula derived from `PAD_LEFT` — per instruction, not a literal `12` — so future `PAD_LEFT` tuning keeps the label offset in sync. `fontSize` has no existing formula to preserve here (unlike `NOTE_FONT_SIZE`, which is deliberately derived from `NOTE_RADIUS` elsewhere in this same file) — it's simply updated to the literal `16`.)

- [ ] **Step 3: Typecheck and visually verify**

```bash
cd app && npm run typecheck
lsof -i :3000 | grep LISTEN || echo "port free"
```

Start the dev server (`preview_start` with the `guitar-app-dev` launch config), open the Sheet tab, and confirm the `E`/`A`/`D`/`G`/`B`/`e` labels on the left edge are visibly larger and still fully visible (not clipped against the diagram's left padding) at both desktop and the 767px/390px narrow widths already covered by this branch's layout tests. Stop the preview server when done.

- [ ] **Step 4: Run the full e2e suite**

```bash
lsof -i :3000 | grep LISTEN || echo "port free"
cd app && npx playwright test e2e/critique-fixes.spec.ts
```

Expected: all pass (no test asserts on these exact SVG attribute values per Step 1's check).

- [ ] **Step 5: Commit**

```bash
git add app/components/SheetDiagram.tsx
git commit -m "fix(sheet): enlarge string-name labels (x=12, font-size=16)

Kept as a PAD_LEFT-derived formula (PAD_LEFT - 14), not a literal 12, per
instruction -- future PAD_LEFT tuning keeps the label offset in sync.
fontSize has no existing formula to preserve (unlike NOTE_FONT_SIZE
elsewhere in this file) so it's a plain literal update to 16."
```

---

### Task 3: Click a Sheet note to jump playback there (replaces "click only clears loop")

**Files:**
- Modify: `app/hooks/useMetronome.ts` (new `jumpTo` function)
- Modify: `app/components/SheetDiagram.tsx` (`System`'s pointer-up handler, both components' prop signatures)
- Modify: `app/app/_components/DiagramViewport.tsx` (thread the new prop, Sheet-only)
- Modify: `app/app/_components/StudioTabs.tsx` (wire `metronome.jumpTo`)
- Modify: `app/e2e/critique-fixes.spec.ts` (new test)

**Interfaces:**
- Consumes: existing `useMetronome` internals (`stepCount`, `setCurrentStep`, `setIsPlaying`, `setHasStarted` — all already in scope in that file).
- Produces:
  ```ts
  // useMetronome's return object gains:
  jumpTo: (index: number) => void;
  ```
  ```ts
  // SheetDiagram's own prop type gains (optional, mirrors onSetLoopRange's optionality):
  onSelectStep?: (index: number) => void;
  ```
  ```ts
  // System's (internal, not exported) prop type gains (required, mirrors onSelectRange/onClearLoop):
  onSelectStep: (globalIndex: number) => void;
  ```
  ```ts
  // DiagramViewport's prop type gains:
  onSelectStep: (index: number) => void;
  ```

- [ ] **Step 1: Write the failing test first**

Add to the `"spec 2 loop pill"` describe block in `app/e2e/critique-fixes.spec.ts` (this block already has `dragLoopOnFirstStaff` and related helpers to build on):

```ts
test("clicking a Sheet note jumps playback there and clears any active loop", async ({ page }) => {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  const { errors } = collectConsoleErrors(page);
  await gotoReady(page, "/");

  // Establish a loop first, so this test also proves the click clears it.
  await dragLoopOnFirstStaff(page);
  await expect(page.getByRole("button", { name: /Loop: steps/ })).toBeVisible();

  const svg = page.locator('svg[data-testid="tab-diagram"]').first();
  const svgBox = await svg.boundingBox();
  expect(svgBox, "sheet svg laid out").not.toBeNull();
  const line = page.locator('svg[data-testid="tab-diagram"] line[stroke-dasharray="3 2"]').first();
  const x1Before = await line.getAttribute("x1");

  // Click well to the right of the playhead's current position, no drag --
  // a plain click, not the drag gesture dragLoopOnFirstStaff already used.
  await page.mouse.click(svgBox!.x + svgBox!.width - 40, svgBox!.y + 20);

  await expect.poll(async () => await line.getAttribute("x1")).not.toBe(x1Before);
  await expect(page.getByText("Loop: none", { exact: true })).toBeVisible();

  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
lsof -i :3000 | grep LISTEN || echo "port free"
cd app && npx playwright test e2e/critique-fixes.spec.ts -g "clicking a Sheet note jumps playback"
```

Expected: FAIL — today's plain click only clears the loop (that half will pass) but never moves the playhead (the `x1` assertion will fail/timeout).

- [ ] **Step 3: Add `jumpTo` to `useMetronome`**

In `app/hooks/useMetronome.ts`, add a new function alongside the existing `stepBy` (same file, right after it):

```ts
// Absolute counterpart to stepBy's relative delta -- same pause/hasStarted/
// clamp semantics (a click on a specific note is "go here now", the same
// intent as arrow-key stepping, just addressed by index instead of by
// direction), added for Sheet's click-to-select-step feature. Deliberately
// ignores loopRange like stepBy does, for the same reason: free navigation
// shouldn't be constrained by a loop the caller may be about to clear anyway.
const jumpTo = useCallback(
  (index: number) => {
    if (stepCount <= 0) return;
    setIsPlaying(false);
    setHasStarted(true);
    setCurrentStep(Math.min(stepCount - 1, Math.max(0, index)));
  },
  [stepCount],
);
```

Add `jumpTo,` to the hook's returned object (alongside the existing `stepBy,`).

- [ ] **Step 4: Thread `onSelectStep` through `SheetDiagram`'s `System` component**

In `app/components/SheetDiagram.tsx`, add `onSelectStep: (globalIndex: number) => void;` to `System`'s props type (alongside `onSelectRange`/`onClearLoop`) and to its destructured parameters.

Change `handlePointerUp`'s plain-click branch from:

```ts
if (down === up) onClearLoop(); // a plain click (no movement) clears any existing loop
```

to:

```ts
if (down === up) {
  // A plain click (no movement) now also jumps playback to that step
  // (2026-09-25) -- always clears any existing loop too (unconditional,
  // same as before this change), rather than tracking "was a loop active"
  // as a separate branch.
  onClearLoop();
  onSelectStep(startIdx + down);
}
```

- [ ] **Step 5: Thread `onSelectStep` through the outer `SheetDiagram` component**

Add `onSelectStep?: (index: number) => void;` to `SheetDiagram`'s own props type and destructuring (optional, defaulting to undefined — mirrors `onSetLoopRange?`'s optionality, since `SongTabs.tsx`'s other caller of `SheetDiagram` doesn't need this feature and shouldn't be forced to pass it).

In the `<System .../>` call inside the `systems.map(...)` loop, add:

```tsx
onSelectStep={(globalIdx) => onSelectStep?.(globalIdx)}
```

- [ ] **Step 6: Thread `onSelectStep` through `DiagramViewport`**

In `app/app/_components/DiagramViewport.tsx`, add `onSelectStep: (index: number) => void;` to the props type and destructuring, and pass it **only** to `<SheetDiagram .../>` (not `<FretboardDiagram .../>` — per this task's explicit Sheet-only scope):

```tsx
<SheetDiagram
  notes={notes}
  tuning={tuning}
  tempoBpm={tempoBpm}
  currentStep={currentStep}
  loopRange={loopRange}
  onSetLoopRange={onSetLoopRange}
  onSelectStep={onSelectStep}
  bordered={false}
  showHeader={false}
  showCaption={false}
  highOnTop={highOnTop}
  onToggleHighOnTop={onToggleHighOnTop}
/>
```

- [ ] **Step 7: Wire it up in `StudioTabs.tsx`**

In `app/app/_components/StudioTabs.tsx`, add `onSelectStep={metronome.jumpTo}` to the existing `<DiagramViewport .../>` call (alongside the existing `onSetLoopRange={metronome.setLoopRange}`).

- [ ] **Step 8: Run the new test**

```bash
lsof -i :3000 | grep LISTEN || echo "port free"
cd app && npx playwright test e2e/critique-fixes.spec.ts -g "clicking a Sheet note jumps playback"
```

Expected: PASS.

- [ ] **Step 9: Run the full loop-pill block and the full suite**

```bash
lsof -i :3000 | grep LISTEN || echo "port free"
cd app && npx playwright test e2e/critique-fixes.spec.ts -g "spec 2 loop pill"
npx playwright test e2e/critique-fixes.spec.ts
```

Expected: all pass. Pay particular attention to `"Sheet drag sets the loop on every tab; X clears everywhere"` and `"layout-rerun: every-tab pill preserves rows in both states"` — both exercise the same drag gesture this task's plain-click branch sits next to; a regression here would mean the click/drag distinction (`down === up` vs. not) broke, not this task's new code specifically.

- [ ] **Step 10: Typecheck**

```bash
cd app && npm run typecheck
```

- [ ] **Step 11: Commit**

```bash
git add app/hooks/useMetronome.ts app/components/SheetDiagram.tsx app/app/_components/DiagramViewport.tsx app/app/_components/StudioTabs.tsx app/e2e/critique-fixes.spec.ts
git commit -m "feat(sheet): click a note to jump playback there, replacing clear-only

A plain click on a Sheet step (no drag) used to only clear any active
loop. Now it also jumps currentStep to that exact step, reusing the same
pause/hasStarted/clamp semantics as arrow-key stepping (stepBy) via a new
absolute-index jumpTo function on useMetronome. Sheet-only per spec --
Fretboard's note markers are unchanged. Still unconditionally clears any
active loop, same as before this change."
```

---

## Post-plan verification

After all three tasks are committed, run once more end-to-end:

```bash
cd app && npm run typecheck && npm run lint && node --test packages/design-system/src/build-tokens.test.mjs
lsof -i :3000 | grep LISTEN || echo "port free"
npx playwright test e2e/critique-fixes.spec.ts
```

All must pass before considering this batch complete.
