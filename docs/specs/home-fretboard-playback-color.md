# Spec 3 — Fretboard playback-state color (+ Sheet loop in the same language)

Tier: Bounded — two-view rendering change + one prop pass-through, fully revertible UI (no user data, no deploy). Owns the segment color language; the loop pill logic waits for spec 2.

## 0. User story (approved)

As a player, I can see at a glance which step is sounding and which bars are looping — in colors my theme controls, with no layout jump when the highlight moves.

## 1. Scope

Exact files (also the allowlist — §8's diff-match must hold on first run):

* `app/components/FretboardDiagram.tsx` — active-segment restyle (inset ring only, §3), loop-range wash for in-range segments, new optional `loopRange` prop (default `null` — the retired `SongTabs` card keeps working unchanged), `aria-current`, auto-scroll; update the header composition comment where behavior changes.
* `app/app/_components/DiagramViewport.tsx` — pass-through only: forward the already-received `loopRange` to `FretboardDiagram` (data already flows `StudioTabs→Viewport`; no `StudioTabs` change in this spec).
* `app/components/SheetDiagram.tsx` — loop band restyle into the same token language (§3); nothing else (drag-select, playhead, pill-duplicate at `SheetControls:250` untouched — the pill duplicate question belongs to spec 2).
* `app/components/FretboardDiagram.RULES.md`, `app/components/SheetDiagram.RULES.md` — update the rendering rules that change (rule homes; stale rules fail the walk test — notably the "only SheetDiagram consumes currentStep" claim).
* `app/status/song-views.md` — update the Fretboard-playhead bullets to the new behavior (current-state file; this is where the next reader checks what's built).
* `app/STATUS.md` — one index-line correction to the hardcoded-palette bullet only (index stays an index: no new explanation).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + shared helper owned by spec 1+4; consume, don't restructure).

Token vars (from spec 0 — if spec 0 hasn't landed, stop; do not invent values):
active ring → `var(--color-playback-active)`; loop wash → `color-mix(in srgb, var(--color-loop-range) var(--state-loop-range-opacity), transparent)`; Sheet band → `fill="var(--color-loop-range)"` with `style={{ fillOpacity: "var(--state-loop-range-opacity)" }}` (presentation attribute can't take the token directly; the CSS property can).
Deliberately no fill token: active state is an inset ring only (mini-grid dots invert poorly; Sheet's inverted-note treatment stays as-is — "same language" means shared loop styling, not identical active rendering).

## 2. Non-goals

* No orientation changes (spec 7 owns the local `highOnTop` state).
* No loop pill logic, no metronome changes (spec 2).
* No `bordered` card restyle (the `color-mix(foreground 15%)` card border at FretboardDiagram:218 stays — out of scope).
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```tsx
// FretboardDiagram additions (all optional except active, which exists)
loopRange?: LoopRange | null; // default null; import type from "@/hooks/useMetronome"
```

Active segment (replaces `border-2 border-foreground` vs `border border-border`, which shifts layout 1px — the measured complaint):
constant `border` width both states; active adds `box-shadow: inset 0 0 0 2px var(--color-playback-active)` + `aria-current="true"` (inactive segments: no `aria-current` attribute at all, not `"false"`). No fill change — ring (edge) and loop-wash (background) compose without clashing by construction.
In-range (loop) segments: background wash per §1 pattern; active + in-range simultaneously shows both, no special-case styling.
Auto-scroll: scroll the active segment `scrollIntoView({ block: "nearest", inline: "nearest" })` (instant, not smooth — no motion side effects) both when `currentStep` changes **and** on initial mount when it is already non-null (tab-switch-while-playing mounts Fretboard mid-playback). Guard null refs; no-op when nothing is active.
Sheet band: same hue/opacity tokens as the Fretboard wash (D4=b: one loop visual across views); band geometry and drag-select untouched.
Reference correction (plan §23 was wrong): the only loop `color-mix()` literals are SheetDiagram:254 and DetailToolbar:47 — FretboardDiagram:218 is the card border, not a loop mix. Fretboard wash is new construction.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `loopRange` null | No wash anywhere; active ring still works (independent states) |
| `currentStep` null / out of range | No `aria-current`, no scroll call, no crash |
| `steps` empty | No segments, no scroll target lookup |
| Retired `SongTabs` card (no `loopRange` passed) | Default `null` keeps it rendering exactly as today |
| Reduced motion | Instant scrolling only — nothing to gate |

## 5. Forbidden patterns

No border-width swaps for state (the 1px shift is the bug); no new color literals or ad-hoc `color-mix` (token pattern only); no `smooth` scrolling; no touching drag-select, playhead, pill, orientation, or metronome.

## 6. Internal sequence

Pass-through prop → active ring + aria → loop wash (both views) → auto-scroll (change + mount) → RULES.md + status updates → e2e blocks. Styling never precedes the prop it depends on.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* e2e blocks appended to `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e` (single-project config). Live Turso DB — determinism rules (no seeding; seeding creates ownership/cleanup problems out of proportion to this hobby project):
  * deterministically select the longest available song (sidebar order is newest-first and stable; quote song ID/title, song count, and rendered step count in output as evidence);
  * use a short viewport height + narrow width to maximize scroll overflow;
  * always run: exactly-one `aria-current="true"` during playback (others carry no such attribute); same-index segment rect equality across a step advance (different segments legitimately differ in width under the FIXED_CELLS exception — never compare across indices); loop drag across two Sheet steps → Fretboard in-range wash;
  * color assertions via off-screen probe, never literal matching: browsers serialize computed `color-mix()` to resolved `rgb()/color()`, so render a hidden probe element with the same token expression and assert computed-value equality against the segment; SVG band opacity asserted numerically (`fillOpacity` resolves to a number — expect `0.18`), never as `var(...)`;
  * scroll assertion runs only if the song overflows vertically; otherwise mark **only** that assertion skipped with the explicit reason, and the execution report must call out scroll behavior as unproven in that run (a silent skip reads as verified — forbidden).
* No manual one-liner duplicating runner output.
* Human checkbox (sitting A pool, `npm run stage`, route `/` — `/studio` redirects): active step glanceable mid-playback; loop wash readable on both views without obscuring fret dots; dark theme equally legible.

## 8. Definition of done

`verify` green + e2e blocks green (or explicitly-skipped-scroll with callout) + `diff --stat` matches §1 (including RULES.md, status files, e2e) + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Spec 0 tokens absent (vars unresolvable) → stop, don't invent values.
* Any urge to restyle the pill, the card border, orientation, or drag behavior → stop, those belong to specs 2/7/Sheet.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Forward obligation (for spec 2's draft — pinned, not emergent)

Spec 2 renders the loop pill on every tab, which can re-break the no-overflow layout guarantee from spec 1+4: spec 2's acceptance **must** re-run spec 1+4's layout block against the every-tab pill. (Carried forward from spec 1+4 §10 — repeated here because this is the spec whose wash shares the pill's row.)

## 11. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts; longest-song ID/title/count/steps quoted as evidence; scroll assertion `PASS` or explicitly skipped-with-reason — a silent skip reads as verified and is forbidden) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §1, including RULES.md, status files, e2e).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting A pool):
  * [ ] Active step glanceable mid-playback, route `/`.
  * [ ] Loop wash readable on both views without obscuring fret dots.
  * [ ] Dark theme equally legible.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check (including an unproven scroll without the explicit callout) with Failure Details filled.
