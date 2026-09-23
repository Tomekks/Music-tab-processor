# Spec 8d — Controls consolidation (toolbar + header)

Tier: Architectural — persisted-preference deletion, predicate-contract removal, cross-boundary state move, new shared context, focus-ownership change, and shell recomposition. One spec per owner decision; the seams below carry Architectural ceremony (prescribed mechanisms, quoted amendments, explicit stops).

## 0. User story (approved)

As a player, the toolbar holds together at every width (loop pill inline, tabs unmoved, overflow wrapping Flip → MIDI → Tempo), every button is thumb-tappable with visible hover, Reset says what it is, and the header holds Songs, the shortcut hint, and the theme toggle in one stable row.

In plain terms: six items in one task. (a) The keyboard-shortcut opt-out is removed — shortcuts always on, header shows static `Space play/pause · ←/→ step` info left of the theme toggle, the toolbar hint row dies. (b) Reset matches Play's height (8c gave Reset alone `min-h-[44px]` — `MetronomeControls.tsx:87` vs `:101`). (c) Play/Reset/MIDI gain visible hover like Flip strings has. (d–e) Narrow-width wrapping follows an explicit row plan with the pill inline and tabs frozen. (f) The Songs drawer toggle moves into the header (icon-only, mobile-only) via lifted drawer state. No visual redesign beyond the named items.

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/StudioShell.tsx` — wrap existing slots in the provider only (stays server):
  `<DrawerProvider><AppHeader /><div>{sidebar}{detail}</div></DrawerProvider>`. No other change.
* `app/app/_components/DrawerContext.tsx` — NEW client file: context + provider + `HeaderSongsButton` island (co-located, no choice of home). Owns `open` (default `false`) + `toggleRef`; exports `DRAWER_ID`.
* `app/app/_components/SongListSidebar.tsx` — delete old mobile toggle (`:52-61`); consume `open`/`closeDrawer`/`toggleRef` from context; import `DRAWER_ID` (its local `:17` constant is deleted — one shared constant, never duplicated); dialog ref + sync effect + close ordering untouched.
* `app/app/_components/AppHeader.tsx` — render islands only (stays server): left group `[HeaderSongsButton (md:hidden) + Title]`, right group `[ShortcutHint (hidden below md) + ThemeToggle]`.
* `app/components/Kbd.tsx` — NEW shared component (the two static `<kbd>` elements; `DetailToolbar`'s private `Kbd` (`:37-39`) is deleted, both consumers import this).
* `app/app/_components/DetailToolbar.tsx` — owns the `TransportLayout` rows (§3); deletes switch/hints row (`:106-149`); deletes `shortcutsEnabled`/`onToggleShortcuts` props (`:50-51, :72-73`).
* `app/components/MetronomeControls.tsx` — split into exported pieces in the SAME file (sole consumer is `DetailToolbar` — verified, no retired-card usage): `ResetButton`, `PlayButton`, `TempoField` (keeps the 8a draft logic verbatim), `MidiButton`. Reset gains shared height + visible `⏮ Reset` (aria-label/title stay `Reset to start`). No tempo-logic change.
* `app/app/_components/StudioTabs.tsx` — delete shortcut state: `SHORTCUTS_KEY` (`:18`), store/toggle (`:119-125`), `shouldHandleKey` opts at (`:136`) + dep (`:148`), props (`:173-174`). Listener dispatches from the map unconditionally (in-scope + editable checks remain).
* `app/lib/keyboardShortcuts.ts` — `opts` shrinks to `{ inScope: boolean }`; line-60 `shortcutsEnabled` check deleted. Map/match/`isEditableTarget` untouched.
* `app/lib/keyboardShortcuts.test.ts` — `enabledInScope` (`:70`) drops the flag; `:88-92` rewritten (out-of-scope case kept, disabled case deleted); all other tests unchanged.
* `app/e2e/critique-fixes.spec.ts` — append blocks + TWO named amendments (exception to append-only, quoted in report): DELETE `:135-174` (`spec 1+4 shortcut opt-out`); amend spec-5 focus blocks to the header-button target. Helper itself untouched; if file/helper absent, STOP.

## 2. Non-goals

* No publish write path; no empty-state, tempo, pill, playback, or token changes.
* No per-song shortcut semantics (retired with the opt-out — not preserved, not re-argued).
* Orphaned stored `"tabbytab:shortcuts"` values are ignored, never migrated (stated openly; proven inert in e2e).
* Deferred work tracked elsewhere, not dropped: spec H, spec 3, and the plan-status catch-up ride with this checkpoint; the closing re-critique C is gated on an explicit defer-or-owe call for H/3.
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```ts
// DrawerContext.tsx — minimum API (exact)
type DrawerContextValue = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
};
export const DRAWER_ID = "songs-drawer"; // single source; sidebar + island import it
```

Focus contract (corrected wording, locked): focus-return behavior and close ordering remain unchanged; only the toggle ref source moves to `DrawerContext`. Invariants: one provider instance at shell level; the header button is the only mobile open control; the sidebar renders no toggle.

```tsx
// TransportLayout — prescribed structure (option A, locked; no slot-inversion without asking)
// DetailToolbar renders explicit row wrappers composing pieces from MetronomeControls.tsx:
TransportLayout
  row-primary: loop pill, ResetButton, PlayButton
  row-tempo:   TempoField
  row-midi:    MidiButton
  row-flip:    Flip strings (StringOrientationToggle, untouched)
// The source wrapper order is the existing wide-screen order. ≥lg the wrappers
// collapse via `lg:contents` into one shared flex row in source order:
// pill, Reset, Play, Tempo, MIDI, Flip.
// Below lg the wrapper boxes remain flex items and use explicit responsive order:
// primary → flip → midi → tempo. Do not rely on emergent flex-wrap order.
```

Rationale (so the prescription isn't cargo-cult): the source order preserves the
existing desktop toolbar. At narrow widths, wrapper-level responsive ordering
places the last desktop controls into the requested deliberate rows; parent-level
`order` utilities alone cannot place last-in-DOM Flip first-below when all controls
remain in one flex item.

Exact copy: header hint `Space play/pause · ←/→ step` (shared `Kbd` elements, static text, no switch, no off-state); Reset visible `⏮ Reset`.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Stored `"tabbytab:shortcuts": "0"` (stale) | Ignored: shortcuts work, no off-UI, key left untouched (migration declined — e2e proves all three) |
| SSR/hydration | Provider `open` defaults `false` (server markup drawer-closed); no storage read for drawer anywhere; no `window` at module scope |
| Drawer empty list | Container-focus path unchanged (only ref source moved) |
| Songs present, desktop | Header button hidden (`md:hidden`); sidebar nav byte-identical behavior |
| Screen reader | Header button named `Songs` (`aria-label`, icon `aria-hidden`); `aria-expanded`/`aria-controls=DRAWER_ID` preserved; Reset announces `Reset to start` |

## 5. Forbidden patterns

No second provider instance; no `open` default `true`; no drawer storage reads; no preserving per-song shortcut semantics; no slot-inversion of TransportLayout; no duplicated `DRAWER_ID`; no touching tempo draft logic, playback, pill, or empty branches; no new color literals; no helper restructure; no credentials.

## 6. File allowlist

`app/app/_components/StudioShell.tsx` (provider wrap only), `DrawerContext.tsx` (new), `SongListSidebar.tsx`, `AppHeader.tsx` (islands only), `app/components/Kbd.tsx` (new), `DetailToolbar.tsx`, `MetronomeControls.tsx` (split + Reset label/height only), `StudioTabs.tsx` (shortcut removal only), `keyboardShortcuts.ts` + `.test.ts` (flag removal only), `critique-fixes.spec.ts` (append + two named amendments). §8's diff-match must hold on first run.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail (includes rewritten predicate unit tests).
* Prerequisites (all, else STOP): 8c checkpoint SHA quoted; tracked worktree clean with 8c's commit holding only the 8c allowlist; shared e2e file/helper present.
* e2e via plain `npm run test:e2e` (self-contained blocks — theme/normalization via UI, no order dependence, no cross-spec selectors):
  * stale key: `addInitScript` seeds `"tabbytab:shortcuts"="0"` → reload → (1) Space/arrows work in scope (Play/Pause-label pattern), (2) key still `"0"`, (3) no `Keyboard shortcuts off` text anywhere, (4) Tempo field keeps native arrows (editable-target rule survives the predicate change);
  * header layout at 1280/767/390: Songs button hidden on desktop / visible icon-only before title on mobile; hint exact text on md+, hidden below; DOM order Songs → title → hint → toggle;
  * drawer: open via header button; Escape + backdrop close; focus returns to the header button every path; empty-list container-focus path;
  * hover: Play/Reset/MIDI idle `filter:none` → hovered non-`none` → unhovered `none`; Flip strings idle vs hovered `background-color` change + return (all four buttons asserted, each by its own mechanism — never class names);
  * heights: Reset and Play `getBoundingBox()` heights equal;
  * wrap rows by bounding-box y-grouping under stable names (never DOM order): 1280 — tabs + complete single transport row; 1024 — shared row holds; 767 + 390 — tabs row alone, then `pill+Reset+Play` / `Flip strings` / `MIDI sound` / `Tempo` in that order; tabs' y numerically identical at all four widths; zero horizontal overflow; no control narrower than its content.
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/`): narrow widths read as deliberate rows (not breakage); hover states feel uniform; header row calm on mobile and desktop.

## 8. Definition of done

`verify` green + e2e green + `diff --stat` matches §6 + both amendments quoted + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Provider placed anywhere but shell level, or a second instance → stop.
* Drawer `open` default `true`, or any drawer storage read → stop (hydration).
* Focus landing anywhere but the header button on any close path → stop.
* Any urge to preserve per-song shortcut semantics, migrate the stale key, or invert TransportLayout → stop, out of scope.
* Wrap mechanism unable to produce the exact §7 rows → stop, ask.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail, incl. rewritten predicate tests) | E2E (block names + counts; deleted `:135-174` + amended spec-5 blocks quoted; measured hover/filter values and row membership quoted) | Staging/build (this spec's own `stage` run — per-task evidence; sitting-B eyeball batches separately) | Diff check (`git diff --stat` vs §6).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] Narrow widths read as deliberate rows, route `/`.
  * [ ] Hover states uniform; header row calm on mobile and desktop.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.

---
**Landed:** commit `54dd73f/6633159`; deployed to production via PR #23/#24 (2026-09-22).
