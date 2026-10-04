# Task: design system workbench, preview page in the web app (slice 1, task 1c)

Status: active
Branch: feat/ds-workbench-preview
Next: owner approves the "What changes for you" block, then `bash scripts/check-brief.sh docs/work/feat-ds-workbench-preview.md`, then `delegate.sh`.
Written against: b3e0a1b

## What changes for you
The web app gets a new page at `/workbench-preview` that only exists on your machine in dev (it returns "not found" on the public site). It shows the five real Components (Button, Icon Button, Color Field, Segmented Control, Slider), each Variant in a row and each State (Default, Hover, Pressed, Disabled) in a column, with Hover and Pressed forced on so you can see them without a mouse. The page also accepts color changes sent from the workbench (only from `localhost:5174` / `127.0.0.1:5174`) and shows them live; the workbench does not send any yet (that is task 1e). Nothing else in the app changes.

## Scope
**Modify only:**
- `app/lib/workbenchPreview.ts`
- `app/lib/workbenchPreview.test.ts`
- `app/app/workbench-preview/page.tsx`
- `app/app/workbench-preview/Preview.tsx`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above
- `app/packages/design-system/` (read the Components, never edit them), `app/app/design-system/` (the old editor stays as is), `tools/`

## Size
Files touched: 4, all new. Expected diff: about 170 lines. New tests: 10.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): a new route in the public app (must be a 404 in production) and a `postMessage` listener (must accept only the workbench origins). No writes, no network calls. Review level: 1.

## Review
Level 1: reviewer checks (a) `page.tsx` calls `notFound()` when `NODE_ENV === "production"` before rendering anything, (b) the listener calls `readTokenMessage` and ignores everything it returns `null` for, (c) only CSS custom properties can be set, never other styles.

## Steps
- [ ] Read `app/packages/design-system/src/components/Button.tsx`, `IconButton.tsx`, `ColorField.tsx`, `SegmentedControl.tsx`, `Slider.tsx` (props only), `app/app/design-system/page.tsx` (the production-404 pattern, first 15 lines), `research/workbench-slice1-spike/spike-page.tsx.txt` (the technique; it is throwaway, rewrite it properly, do not copy it) and `research/workbench-slice1-spike/NOTES.md`.
- [ ] Write `workbenchPreview.test.ts` first (cases below); run `node --test app/lib/workbenchPreview.test.ts` and see it fail.
- [ ] Write `workbenchPreview.ts` with two pure functions:
  - `readTokenMessage(origin: string, data: unknown): Record<string, string> | null` returns the vars only if `origin` is exactly `http://localhost:5174` or `http://127.0.0.1:5174`, `data` is an object with `type === "tokens"` and `vars` an object, and EVERY key matches `/^--[a-z0-9-]+$/` and every value is a string without `;`, `{`, `}`, `<` or newline and at most 100 characters. Otherwise `null` (all or nothing).
  - `forcedStateSelector(selector: string): string | null`: for a selector containing `:hover` returns `.force-hover ` + the selector with `:hover` removed; for `:active` the same with `.force-active` and `:active` removed; `null` if it has neither, or a selector list (contains a comma).
- [ ] Write `Preview.tsx` (`"use client"`): a `useEffect` that (1) copies every style rule whose `selectorText` gives a non-null `forcedStateSelector`, inserting the copy right after the original in the same parent (so rule order is kept), walking into nested rules like `@media` and `@supports`, skipping stylesheets that throw; (2) adds a `<style>` with `*{transition:none!important}`; (3) listens for `message` events, calls `readTokenMessage(event.origin, event.data)` and, if not null, sets each var with `document.documentElement.style.setProperty`; removes the listener on cleanup. Render a table: rows are Variants, columns Default / Hover / Pressed / Disabled. Hover cells wrap the Component in `className="force-hover"`, Pressed in `force-active`, Disabled passes `disabled`. Rows: Button primary, secondary; IconButton primary, secondary, ghost (icon `Play` from `lucide-react`, `aria-label="Play"`); ColorField (value `#6d28d9`); SegmentedControl (two options, `ariaLabel`); Slider (min 0, max 100, step 1). Handlers are no-ops. Use design-system CSS variables or Tailwind token classes already used elsewhere for the page's own layout; no hard-coded colors.
- [ ] Write `page.tsx`: server component, `if (process.env.NODE_ENV === "production") notFound();` first, then `return <Preview />`.
- [ ] Break each rule once (see below), see the matching test fail, restore.
- [ ] Run `bash scripts/verify-task.sh`, fill `## Report`, run `bash scripts/finish.sh docs/work/feat-ds-workbench-preview.md`.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Put anything else in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: PASS footer.
- Tests in `workbenchPreview.test.ts`, each fails if its rule is broken: (1) `http://localhost:5174` with a valid message returns the vars; (2) `http://127.0.0.1:5174` too; (3) origin `http://evil.example` returns `null`; (4) origin `http://localhost:3000` returns `null`; (5) `type` other than `"tokens"` returns `null`; (6) one bad key (`color`, `--A`, `--x;y`) among good ones returns `null`; (7) a value containing `;` or `}` or over 100 characters returns `null`; (8) `forcedStateSelector(".a:hover")` returns `.force-hover .a`; (9) `.a:active` gives `.force-active .a`, and `.a` and `.a:hover, .b:hover` give `null`; (10) non-object `data` (`null`, string, array) returns `null`.

## Owner checklist
- [ ] Check the port: `lsof -i :3000`, then `npm --prefix app run dev` and open http://127.0.0.1:3000/workbench-preview → five Components with Default, Hover, Pressed, Disabled columns; Hover and Pressed cells look different from Default
- [ ] Production check: Claude runs `npm --prefix app run stage` and opens http://127.0.0.1:3001/workbench-preview → 404 (Claude does this, not the builder)
- [ ] Stop the server (Ctrl+C), `lsof -i :3000` → prints nothing

## Questions
(none open)

## Report
<Filled by the builder when done.>
