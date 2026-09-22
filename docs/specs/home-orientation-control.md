# Spec 7 — Single orientation control

Tier: Bounded — state lift + one control move + persistence + button rename, fully revertible UI (no user data, no deploy). Fixes the two-toggles-pretending-to-be-one P2: one control, both diagrams follow, choice survives reloads.

## 0. User story (approved)

As a player, the flip means the same thing on Sheet and Fretboard, and my choice survives reloads — instead of flipping one view and finding the other showing the opposite.

In plain terms: today Sheet's toggle (in the toolbar, `DetailToolbar.tsx:62`, Sheet-gated) and Fretboard's toggle (inside its own header, `FretboardDiagram.tsx:207,225`, local `useState`) are two independent states that disagree with each other. After this spec there is exactly one control — always mounted in the toolbar on every tab — and both diagrams follow it. The choice persists globally across reloads (one `localStorage` key for all songs, default thin-e-on-top). The button's visible label is exactly `Flip strings` (approved rename; state is conveyed via `aria-pressed` + title, §3). Ascii is unaffected (orientation is meaningless there; the control just stays put).

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/StudioTabs.tsx` — `highOnTop` (`:38`, today plain `useState(true)`) becomes persisted global state under `localStorage "tabbytab:orientation"` (§3); SSR-safe under the shortcuts contract (spec 1+4 §4): server and initial client markup default to thin-e-on-top; `localStorage` is read only after hydration or through `useSyncExternalStore` (or equivalent external-store implementation); guarded access, failures never throw; no `window`/`localStorage` at module scope. A lazy `useState` initializer that reads the stored value is forbidden (hydration mismatch on stored `"0"`); passes to both toolbar + viewport (props already flow, values change only).
* `app/app/_components/DetailToolbar.tsx` — drop the `active === "Sheet"` gate on the toggle (`:62`); render unconditionally on all tabs; update the Sheet-only header comment (`:29-31`, now false).
* `app/app/_components/DiagramViewport.tsx` — forward `highOnTop`/`onToggleHighOnTop` to `FretboardDiagram` (Sheet already receives them at `:51-52`; Fretboard at `:56` receives neither today).
* `app/components/FretboardDiagram.tsx` — accept optional `highOnTop?: boolean; onToggleHighOnTop?: () => void` (default `undefined` → local-state fallback, so the retired `SongTabs` card keeps working unchanged); when controlled (`highOnTop !== undefined`) the internal `FretboardControls` toggle is suppressed — the toolbar owns the single control (mirrors `SheetDiagram.tsx:313-315` `isOrientationControlled` pattern; no new `showOrientationToggle` prop, controlled-ness is the switch).
* `app/components/StringOrientationToggle.tsx` — visible label change to exactly `Flip strings` (today `Flip to {thick E / thin e} on top`, `:14`); add `aria-pressed` + dynamic `title`/`aria-label` preserving state announcement (§3). Judgment call, named: visible text carries no state (per approved rename); state lives in AT + hover text only.
* `app/components/FretboardDiagram.RULES.md` — update orientation-ownership claims (rule home; stale rules fail the walk test).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + helper owned by spec 1+4; consume, don't restructure; if absent, STOP per §9).

No `StudioTabs` export changes beyond state values; no `AsciiView` change; no token/color changes (spec 3 owns segments — untouched here).

## 2. Non-goals

* No per-song persistence (plan-locked global; critique's per-song suggestion explicitly declined).
* No copy beyond the approved `Flip strings` rename (no further plain-language pass in this spec).
* No segment restyle, no loop pill/drag changes, no shortcut/metronome/sound changes.
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```ts
// StudioTabs — persisted global (shortcuts contract, spec 1+4 §4)
localStorage key "tabbytab:orientation": "1" = high on top (default), "0" = low on top.
// Server and initial client markup default to thin-e-on-top; storage is read only
// after hydration or through useSyncExternalStore (or equivalent); guarded
// read/write (try/catch, default true, never throw). A lazy useState initializer
// reading the stored value is forbidden (hydration mismatch on stored "0").
```

```tsx
// FretboardDiagram additions (optional, fallback preserves retired card)
highOnTop?: boolean; onToggleHighOnTop?: () => void;
// const isOrientationControlled = highOnTopProp !== undefined;
// controlled → use props + suppress internal toggle; uncontrolled → local useState(true).
```

```tsx
// StringOrientationToggle — exact visible label, state via AT + hover
<button aria-pressed={highOnTop} title={`Flip strings (currently ${highOnTop ? "thin e" : "thick E"} on top)`}
  aria-label={`Flip strings (currently ${highOnTop ? "thin e" : "thick E"} on top)`}>Flip strings</button>
```

Copy is exact: visible text `Flip strings` always (no dynamic suffix — approved rename). The `title`/`aria-label` direction words reuse the existing `thin e`/`thick E` vocabulary (no new jargon introduced, no old visible copy retained).

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `localStorage` unavailable/blocked | `try/catch` on read/write; default `true`; never throw |
| SSR | Server + initial client markup default thin-e-on-top; storage read after hydration or via `useSyncExternalStore`; failures default `true`, never throw |
| Retired `SongTabs` card (no orientation props) | Local `useState(true)` fallback renders exactly as today, own toggle intact |
| Ascii tab | Single control visible; diagrams unaffected (orientation meaningless there) |
| Narrow viewport | Control wraps with transport row per spec 1+4's `flex-wrap` — never overlaps diagrams |
| Screen reader | `aria-pressed` + `aria-label` announce current orientation; visible label stays `Flip strings` |

## 5. Forbidden patterns

No per-song keys or `songId` plumbing; no second toggle anywhere (internal Fretboard toggle dies when controlled); no dynamic visible copy beyond `Flip strings`; no touching segments, pill, drag-select, playhead, shortcuts, metronome, or sound; no new color literals/tokens; no restructuring the shared e2e helper; no credentials.

## 6. File allowlist

`app/app/_components/StudioTabs.tsx`, `app/app/_components/DetailToolbar.tsx`, `app/app/_components/DiagramViewport.tsx`, `app/components/FretboardDiagram.tsx`, `app/components/StringOrientationToggle.tsx`, `app/components/FretboardDiagram.RULES.md`, `app/e2e/critique-fixes.spec.ts`. §8's diff-match must hold on first run.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* e2e blocks appended to `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e` (prerequisite: file + helper exist — else STOP, do not create them):
  * single control: exactly one `Flip strings` button visible on each of Sheet, Fretboard, Ascii (same toolbar resident, not per-view copies);
  * isolation: each orientation block clears the key before asserting default state — `page.evaluate(() => localStorage.removeItem("tabbytab:orientation"))` or equivalent setup — then reloads/asserts the thin-e-on-top default. Do not rely on test order; a prior block or retry may have left `"0"`;
  * sync both directions: flip on Sheet → Fretboard reflects (assert via string-label order / `getDisplayRow` DOM order, not screenshots); flip on Fretboard tab → Sheet reflects; assert `aria-pressed`, the dynamic accessible name, and `title` in these blocks;
  * persistence (separate block): set orientation through the UI (click `Flip strings`), reload, then assert both the stored value (`"1"`/`"0"`, quoted) and the rendered orientation agree. Default-state and persistence assertions never share one setup;
  * retired fallback unbroken (existing `verify` suite covers; if it doesn't render the uncontrolled card, state the gap openly rather than claiming coverage).
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/`): one control reads calm on all three tabs, doesn't crowd the toolbar; flip reads instantly on both diagrams; `Flip strings` label unambiguous next to transport.

## 8. Definition of done

`verify` green + e2e blocks green + `diff --stat` matches §6 + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Shared e2e file/helper absent → stop, don't create it.
* Any urge toward per-song persistence, further copy changes, segment restyle, or pill/shortcut/metronome touches → stop, out of scope.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts; orientation key value quoted) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §6).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] One `Flip strings` control reads calm on all three tabs, route `/`.
  * [ ] Flip reads instantly on both diagrams; reload preserves choice.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.
