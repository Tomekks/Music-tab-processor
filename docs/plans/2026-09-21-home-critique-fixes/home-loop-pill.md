# Spec 2 — Loop pill on every tab, with empty state

Tier: Bounded — small behavior change in two files, fully revertible UI (no user data, no deploy). Owns pill position and logic; wash styling belongs to spec 3.

## 0. User story (approved, with empty-state change)

As a player, a loop I set is always visible and clearable no matter which view I'm on — instead of hearing my riff repeat on the Fretboard or Ascii tabs with no visible explanation. And before I've ever set a loop, the pill area tells me so: `Loop: not selected`.

In plain terms: the pill stops appearing and disappearing. It lives in the toolbar (always mounted) in one of two states — `Loop: steps 3–5 ✕` (a button; ✕ clears it everywhere) or `Loop: not selected` (status text, non-interactive). The empty state doubles as discovery: the loop feature is visible before first use. Pill colors come from spec 0's loop tokens via spec 3's wash pattern; this spec wires position and behavior only.

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/DetailToolbar.tsx` — render the pill unconditionally (drop the `active === "Sheet"` gate; keep the `loopRange` null-check to pick the state): with a range, the existing clear-button (`onClearLoop`); without, a non-interactive `span` reading `Loop: not selected` in the same pill shape (muted treatment, same `rounded-full` geometry so the toolbar doesn't reflow between states). Update the composition header comment (the "Sheet-only" note becomes false).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + helper owned by spec 1+4; consume, don't restructure).

No `StudioTabs` change (props already flow), no metronome change, no `SheetDiagram` change (drag-select untouched).

## 2. Non-goals

* No pill redesign beyond the approved copy and token colors.
* No loop creation changes (Sheet drag-select), no playback-wrap changes.
* The empty-state text is not a button and clears nothing — no dead-control affordance.
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```tsx
// DetailToolbar render logic (existing props, no signature change)
{loopRange ? (
  <button onClick={onClearLoop} ...>Loop: steps {start+1}–{end+1} ✕</button>
) : (
  <span aria-hidden={false}>Loop: not selected</span>  // status text, same pill geometry, muted
)}
```

Copy is exact: `Loop: steps {n}–{m} ✕` / `Loop: not selected` (approved wording — no paraphrase). Step numbers stay 1-based as today. Styling: existing pill classes; empty state uses the same shape with muted text color (human-checkbox judgment, sitting A).

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `loopRange` null on any tab | Empty-state text renders; toolbar width stable vs pill state (same geometry, no reflow) |
| Clear clicked | `onClearLoop` fires once; pill returns to empty state on all tabs |
| Narrow viewport | Pill (either state) wraps with the transport row per spec 1+4's `flex-wrap` — never overlaps diagrams |
| Screen reader | Clear button keeps an accessible name (`title` + content already announce "Clear loop"); empty text is plain content, not a control |

## 5. Forbidden patterns

No gating the pill on active tab (that gate is the bug); no making the empty state clickable; no new color literals (token pattern only); no touching drag-select, playhead, metronome, or orientation.

## 6. Internal sequence

Unconditional render (both states) → header-comment update → e2e blocks (both states + cross-tab) → re-run spec 1+4's layout block against the every-tab pill (the obligation pinned in specs 1+4 §10 and 3 §10 — this is where it gets discharged).

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* e2e blocks appended to `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e`:
  * fresh load (no loop): `Loop: not selected` visible on Sheet, Fretboard, and Ascii; it is not a button (no `button` role);
  * set loop via Sheet drag: pill flips to `Loop: steps {n}–{m} ✕` on all three tabs; ✕ clears everywhere (empty text returns on all tabs);
  * re-run of spec 1+4's layout block (both pill states, both breakpoints) — green, quoted separately as `layout-rerun`;
  * longest-song + quoted DB evidence per the adaptive rules (shared helper).
* No manual one-liner duplicating runner output.
* Human checkbox (sitting A pool, `npm run stage`, route `/`): pill/empty-state read as one stable toolbar resident; muted state doesn't look broken or disabled-confusing.

## 8. Definition of done

`verify` green + e2e blocks green (including `layout-rerun`) + `diff --stat` matches §1 + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Any urge to restyle the pill, change drag-select, or touch playback wrapping → stop, out of scope.
* Empty state rendering as a different width/shape that reflows the toolbar → stop, geometry must match.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts, **including** the `layout-rerun` of spec 1+4's layout block quoted separately) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §1).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting A pool):
  * [ ] Pill and empty state read as one stable toolbar resident, route `/`.
  * [ ] Muted empty state doesn't look broken or disabled-confusing.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.

---
**Landed:** commit `cbe24e3`; deployed to production via PR #23/#24 (2026-09-22).
