# Spec 1+4 — Toolbar split + shortcut discovery

Tier: Bounded — multi-file behavior + a11y change, fully revertible UI (no user data, no deploy). Merged from two issues because the hint UI lives in the reshaped toolbar: no seam to split on.

## 0. User story (approved)

As a player, the transport row never overlaps the music on my narrow laptop, Play stands out as the primary action, and I can discover that Space and arrow keys drive playback — including turning them off if they fight my screen reader.

Visual target (approved ASCII): desktop keeps one row with Play as the only accent-filled button; under `md`, tabs own row 1, transport wraps row 2, a subtle `<kbd>` hint line + opt-out sits below; beta toggles drop to ghost tier everywhere.

## 1. Scope

Exact files (also the allowlist — §8's diff-match must hold on first run, so the created test files are listed):

* `app/app/_components/DetailToolbar.tsx` — two-row responsive structure; hint line + opt-out switch; Play/transport hierarchy; new props (§3); update the composition header comment where behavior changes.
* `app/components/MetronomeControls.tsx` — Play uses `component.button` primary tokens; **Reset + sound buttons only** move to the secondary (ghost) tier. Explicitly excluded: `StringOrientationToggle` (separate file, untouched) and the loop pill (restyle owned by spec 2; its `color-mix` at DetailToolbar:47 dies there, not here).
* `app/lib/keyboardShortcuts.ts` — add `TRANSPORT_SHORTCUTS` map + pure `shouldHandleKey` (§3); `isEditableTarget` untouched.
* `app/lib/keyboardShortcuts.test.ts` — unit tests for map + predicate (repo tests run under plain `node --test`, no jsdom — everything here stays DOM-free).
* `app/app/_components/StudioTabs.tsx` — wire: container `ref`, `shortcutsEnabled` state (`localStorage "tabbytab:shortcuts"`, guarded read — `useSyncExternalStore` or equivalent SSR-safe external-store implementation permitted, see §4; the `tabbytab:` prefix is introduced by this plan, not an existing convention), scope-gated listener dispatching from the map (§3).
* `app/e2e/critique-fixes.spec.ts` — **created** by this spec; later specs append named blocks.
* `app/e2e/critique-helpers.ts` — **created** by this spec: server-ready wait, console-error collector, desktop/narrow viewport presets. Owned here; later specs consume, none restructure without asking.

Token vars (exist today — verified in `brands/default/tokens.json` lines 72–82, emitted as `--component-button-*` per `css-var-naming.mjs`):
Play → `var(--component-button-primary-background)` / `var(--component-button-primary-text)`;
ghost tier → `var(--component-button-secondary-background)` / `-secondary-text` / `-secondary-border`.
No new tokens.

## 2. Non-goals

* No transport logic changes (metronome, loop, sound wiring untouched).
* No `TabSelector` restyle (tabs move rows, their look doesn't change).
* No per-song anything; opt-out is global.
* No `contracts/`, no Turso schema, no `.env`, no prod CSP.

## 3. Interface

```ts
// lib/keyboardShortcuts.ts — the single truth table. Pure, DOM-free.
export type ShortcutAction = "step-back" | "step-forward" | "toggle-play";
export interface ShortcutDef { key?: string; code?: string; action: ShortcutAction; kbd: string[]; label: string }
export const TRANSPORT_SHORTCUTS: ShortcutDef[] = [
  { key: "ArrowLeft",  action: "step-back",    kbd: ["←"],     label: "step" },
  { key: "ArrowRight", action: "step-forward", kbd: ["→"],     label: "step" },
  { code: "Space",     action: "toggle-play",  kbd: ["Space"], label: "play/pause" },
];
// Matching rule, spelled out: arrows match by e.key, Space matches by
// e.code === "Space" (code, not key — layout-independent). shiftKey is
// deliberately ignored (matches today's listener; editable targets are
// excluded anyway, so Shift+arrows in text fields stay native).
export function shouldHandleKey(
  e: { key: string; code: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey?: boolean },
  target: { tagName?: string; isContentEditable?: boolean } | null,
  opts: { shortcutsEnabled: boolean; inScope: boolean }
): boolean
```

Truth table: `false` on any meta/ctrl/alt, on `isEditableTarget(target)` (Tempo keeps native arrows), on `!shortcutsEnabled`, on `!inScope`; otherwise `true` iff the event matches a `TRANSPORT_SHORTCUTS` entry, `false` for all other keys. The `StudioTabs` listener dispatches action from the same map (no re-listed keys), and `aria-keyshortcuts` + the hint line render from it — map, predicate, dispatch, hints, and ARIA cannot drift by construction.

```tsx
// DetailToolbar additions (state stays in StudioTabs — contract honored)
shortcutsEnabled: boolean; onToggleShortcuts: () => void;
```

Opt-out control: `role="switch"`, `aria-checked`, visible label `Keyboard shortcuts` (switch, not checkbox: on/off persistence, no form). Hint line (always rendered, `text-xs`, subtle): on-state `Space play/pause · ←/→ step` with `<kbd>` elements; off-state persists as `Keyboard shortcuts off` beside the switch (never disappears — an accidental toggle must leave its own way back visible). Play button: `aria-keyshortcuts="Space"`.

Scope: `inScope = rootRef.current?.contains(e.target as Node) ?? false` on the `StudioTabs` root container — keys live only with focus inside the detail pane.

Known tradeoffs (surfaced, not hidden): (a) clicking a non-focusable diagram area parks focus on `body`, where keys stay dead until the user tabs/clicks a control — accepted, the Play button is one Tab away and already the mouse flow; (b) `tabIndex={-1}` + focus-on-mousedown was considered and declined — it would yank SR focus context on every diagram click to serve mouse users. Neither direction gets "fixed" later without revisiting this section.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `localStorage` unavailable/blocked | `try/catch` on read/write; default `true`; never throw |
| SSR | `"use client"` + SSR-safe preference state — either a lazy `useState` initializer or `useSyncExternalStore` (or equivalent external-store implementation), provided the observable contract holds: default enabled, guarded storage access, persisted `"0"` opt-out, hydration-safe markup; no `window`/`localStorage` at module scope |
| Opt-out on + key in scope | Handler returns before `preventDefault` — page keeps fully native behavior |
| Narrow viewport + long loop pill | Transport row wraps (`flex-wrap`); pill never overlaps diagrams (the 1280-spill in `walk-fretboard.png`) |
| `md` boundary (768px) | Stacked below `md`, single row at/above — assert both sides in e2e |

## 5. Forbidden patterns

No `window` listener without the scope gate; no new color literals (token vars only); no `aria-keyshortcuts`/hint copy hardcoding keys outside the map; no touching metronome/loop/sound logic; no credentials.

## 6. Internal sequence

Predicate + unit tests (red-green) → wiring (`StudioTabs` scope + opt-out state) → layout (two rows, tiers) → hints line + switch → e2e blocks. UI never precedes the logic it gates.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail (includes new predicate/map unit tests).
* e2e blocks in `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e` (exact command quoted; the config is single-project with `testIgnore` for design-system — no `--project` flag exists, and scoping to one would fail):
  * layout: 1280px tabs + transport share one row; 767px TabSelector bottom ≤ transport top, zero horizontal overflow;
  * Play primary (computed background resolves the accent token — assert resolution, not a hex);
  * scoping: sidebar-focused Space activates that control natively with transport unchanged (Play label still "Play", `isPlaying` false); Play-focused Space toggles; Tempo keeps native arrows;
  * opt-out: switch off → in-scope keys dead with native behavior intact → `localStorage "tabbytab:shortcuts"` reads `"0"` → reload → still off.
* No manual one-liner duplicating runner output.
* Human checkbox (sitting A pool, `npm run stage`, route `/` — `/studio` redirects): Play reads as primary, betas recede; hint line legible, not noisy; narrow rows breathe.

## 8. Definition of done

`verify` green + e2e blocks green + `diff --stat` matches §1 (including the two created test files) + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Any urge to change behavior to fit layout → stop, layout adapts to behavior.
* Anything derived from handled keys except through the map → stop, single source is `TRANSPORT_SHORTCUTS`.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Forward obligation (for spec 2's draft — pinned, not emergent)

Spec 2 renders the loop pill on every tab, which can re-break this spec's no-overflow guarantee: spec 2's acceptance **must** re-run this spec's layout block against the every-tab pill. Recorded here so it survives until then.

## 11. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail, incl. new predicate/map unit tests) | E2E (block names + counts from `critique-fixes.spec.ts`) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §1, including the two created test files).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting A pool):
  * [ ] Play reads as primary, betas recede, route `/`.
  * [ ] Hint line legible, not noisy.
  * [ ] Narrow rows breathe (767px).
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.
