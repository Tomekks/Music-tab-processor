# Spec 5 — Sidebar independence + mobile drawer

Tier: Bounded — shell composition change + new mobile nav behavior, fully revertible UI (no user data, no deploy). Makes the sidebar freely iterable without touching the shell ever again.

## 0. User story (approved)

As a player using a mobile phone, I see music fill the width with the song list hidden behind a toggle (hamburger/drawer), while desktop stays exactly as today. As a maintainer, the sidebar becomes a component I can restyle freely without touching the app shell.

In plain terms: at phone widths the fixed 240px sidebar (which today crushes the detail into a sliver — proven in `mobile-idle.png`) gives way to full-width music with the list one tap away. On desktop, nothing moves. And the sidebar's chrome — width, border, scroll container, now the drawer — lives in sidebar-owned code; `StudioShell` keeps two pure slots and never names sidebar geometry again.

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/SongListSidebar.tsx` — becomes client (`"use client"`); owns all sidebar chrome: desktop `<nav>` (today's classes moved verbatim), mobile floating toggle, native `<dialog>` drawer + backdrop; drawer state, close paths, focus management; selection keeps the drawer open. Empty state (`No songs published yet`) preserved as-is (its CTA belongs to spec 8b).
* `app/app/_components/StudioShell.tsx` — nav wrapper deleted; renders `{sidebar}` slot directly into the flex row. Shell keeps `h-dvh overflow-hidden`, `AppHeader`, and the detail column untouched, except one allowed additive test hook: `data-testid="detail-column"` may be added to the detail slot. It must not change layout, behavior, semantics, or styling. Header composition comment updated (it currently documents the nav it will no longer contain).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + helper owned by spec 1+4; consume, don't restructure; if the file/helper hasn't landed, STOP — do not create or restructure it).

Explicitly excluded: `AppHeader.tsx` (stays server, untouched), `SongListRow.tsx` (rows identical inside the drawer), `page.tsx` (same props), transport, detail pane, tokens. `app/status/home-page.md` is historical build evidence — excluded; behavior lives in the components' header comments.

## 2. Non-goals

* No desktop restyle (geometry-equivalent, asserted in e2e — see §7, not eyeballed).
* No selection-behavior change (same `?song=` links, same `aria-current`).
* No scroll-lock machinery (shell `overflow-hidden` already prevents page scroll; drawer scrolls internally).
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

Desktop (`md` and up): `<nav aria-label="Songs">` with today's exact classes (`shrink-0 h-full overflow-y-auto border-r border-border`) and `width: var(--sidebar-width, 240px)`, hidden below `md` (`hidden md:block`). The `<ul>` (or empty-state `<p>`) renders inside unchanged.

Mobile (below `md`): floating toggle (`fixed left-4 top-16 z-30 md:hidden`, ≥44px target, hamburger + "Songs" text, `aria-expanded`, `aria-controls="<dialog-id>"`) — fixed position clears the server-rendered header without touching it. Drawer is a native `<dialog>` (`aria-label="Songs"`, full-height left panel `w-72 max-w-[85vw]`, `z-50`); backdrop styled via `::backdrop` (z-40 equivalent layering). The dialog contains a nested `<nav aria-label="Songs">` wrapping the same list (preserves landmark semantics — `role="dialog"` alone doesn't) plus a labeled `Close songs` button (touch/SR discoverability — Escape and backdrop alone are insufficient).

Open/close mechanics (locked — implement exactly this, no alternatives without asking):
* Open state in React; sync to the element in an effect guarded both ways (call `showModal()` only when not already open, `close()` only when open — StrictMode double-effects must not throw).
* Native Escape flows through the dialog `cancel` event → set state closed; the sync effect then closes the element. Never call state-set + `close()` redundantly in the cancel path (reopen loop).
* Backdrop clicks handled explicitly (a `click` listener comparing `e.target` to the dialog element — `::backdrop` is styling only, not a DOM target).
* Close order is fixed: `dialog.close()` first, **then** restore focus to the toggle (focusing while modal breaks the return).
* Open: focus moves to the selected song link, else the first link; empty sidebar (only a non-focusable `<p>`): give the dialog container `tabIndex={-1}` and focus that instead.
* Close (any path): focus returns to the toggle. Selecting a song keeps the drawer open.
* Resize: no listeners — CSS gates visibility, React state preserved; returning below `md` finds the prior state intact.
* Mounting: the dialog stays mounted while closed (so `aria-controls` always references a real element) with zero tab stops and no AT exposure when closed (native `close()` state handles this — verify, don't assume).

Root layout contract: the component returns a fragment whose only layout-affecting child is the desktop `<nav>`; toggle, dialog, and backdrop are all fixed/absolute (out-of-flow). The root must not consume flex width — otherwise the detail pane can't go full-width on mobile.

State preservation rule: no resize listener, no media-query hook, no scroll-lock code. CSS + the shell's existing `overflow-hidden` cover all of it.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `songs` empty | Drawer opens on the `tabIndex={-1}` container focus path; empty text unchanged |
| SSR | Drawer closed by default (`useState(false)`); no `window`/`localStorage` anywhere in this spec |
| Escape with drawer closed | No-op; no global key handler that could double-fire with spec 1+4's transport keys |
| StrictMode double-effect | Guarded `showModal()`/`close()` never throw `InvalidStateError` |
| Backdrop click | Closes via the explicit target comparison; focus returns to toggle |
| Resize across `md` while open | CSS hides the mobile tree; state preserved; tested both directions (§7) |

## 5. Forbidden patterns

No `window` resize listeners; no scroll-lock code; no custom focus-trap (native dialog owns containment); no changing row markup, selection links, or `aria-current` semantics; no touching AppHeader/transport/detail (except the §1 `data-testid` hook); no new color literals; no restructuring the shared e2e helper.

## 6. Internal sequence

Nav-shell move (desktop geometry asserted before adding anything) → toggle + dialog + backdrop → open/close/focus mechanics → header-comment rewrite → e2e blocks. Desktop equivalence precedes mobile construction.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* Prerequisite: `app/e2e/critique-fixes.spec.ts` + helper exist (spec 1+4 landed). If absent, STOP — do not create them.
* e2e blocks appended to `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e`:
  * desktop (1280px): exactly one visible navigation landmark; nav `x=0`, top at header bottom, height equals content-row height, right edge at 240px; detail starts at 240px with right edge at viewport width; zero horizontal overflow; toggle hidden. Root `--sidebar-width` resolves to `240px` AND the nav declaration uses `var(--sidebar-width, 240px)` (a literal `240px` passes the first, not the second).
  * mobile (390px): nav hidden; detail full width; toggle visible ≥44px; open → dialog visible with nested nav + Close button; internal scroll asserted (`scrollHeight > clientHeight` on a long list — fail, don't skip, if the fixture list is too short, and quote song count as evidence);
  * focus: open → focus inside dialog; Tab/Shift+Tab cycle within it both directions; Escape → closed + focus on toggle; backdrop click → closed + focus on toggle; empty-DB variant → container focus path;
  * resize: open on mobile → resize to desktop (dialog/backdrop/toggle inaccessible, desktop nav visible) → resize back (drawer state intact, native dialog behavior verified after restoration);
  * selection: pick a song → assert after URL/detail navigation settles → drawer still open, selected row keeps `aria-current="true"`, all link assertions scoped via `dialog.getByRole`, never global selectors;
  * sidebar evidence quoted: song count, selected ID/title, whether DB was empty, nav result. No longest-song logic (sidebar query omits notes — belongs to spec 3, not here).
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/`): drawer feels native (backdrop, motion, toggle reach); desktop indistinguishable from today side-by-side.

## 8. Definition of done

`verify` green + e2e blocks green + `diff --stat` matches §1 + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Shared e2e file/helper absent → stop, don't create it.
* Desktop geometry assertions failing → stop, the move wasn't verbatim.
* Any urge toward rows/selection/header/transport/detail/resize-listeners/scroll-lock → stop, out of scope.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts; song count, selected ID/title, empty?, nav result quoted) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §1).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] Drawer feels native at 390px (backdrop, motion, toggle reach), route `/`.
  * [ ] Desktop indistinguishable from today side-by-side.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.

---
**Landed:** commit `05bb18b`; deployed to production via PR #23/#24 (2026-09-22).
