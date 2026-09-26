# Spec 8c — Control polish

Tier: Bounded — touch-target growth on two buttons + one text label + metadata span split + appended e2e, fully revertible UI (no user data, no deploy). Every control is thumb-tappable and says what it does; header metadata scans at a glance. No visual redesign.

## 0. User story (approved)

As a player every control is thumb-tappable and says what it does; the header metadata scans at a glance.

In plain terms: the theme toggles grow to 44px targets (today bare text buttons, `ThemeToggle.tsx:11-29`); Reset gains a visible text label (today icon-only `⏮`, `MetronomeControls.tsx:30-37`); and the header's single `length • tuning • bpm` run-on (`SongDetailPane.tsx:70-72`) splits into separately-labelled items with the visible text byte-identical (labels are accessible-only).

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/ThemeToggle.tsx` — both buttons (`Light mode`, `Dark mode`) reach ≥44×44px targets (padding/min-size utilities; exact technique executor's choice, proven by measurement not classes). Text, `aria-current` semantics, separator, and layout otherwise unchanged. Starts after 8b's checkpoint (shared-file discipline; reads 8b's diff first although regions don't overlap).
* `app/components/MetronomeControls.tsx` — Reset button only: visible label `Reset` beside the existing `⏮` glyph (exact: `⏮ Reset`); `aria-label="Reset to start"` and `title="Reset to start"` unchanged (accessible name stays `Reset to start` since `aria-label` overrides content — assert by that name). Starts only after 8a's checkpoint — same file as the tempo input; if 8a is unlanded, STOP. No tempo-input logic touched.
* `app/app/_components/SongDetailPane.tsx` — header metadata only: the single `<p>` (`{formatSongLength} • tuning {label} • {bpm} bpm`) becomes three `<span>` items, each with an accessible label (`Song length`, `Tuning`, `Tempo`), visible text and `•` separators byte-identical. Separators wrapped `aria-hidden="true"` (decorative — named judgment call so SR hears three labelled items, not bullet noise). `!song` branch (8b's) untouched.
* `app/e2e/critique-fixes.spec.ts` — append named blocks (file + helper owned by spec 1+4; consume, don't restructure; if absent, STOP per §9). Blocks are self-contained: reset theme to a known state via the UI (click `Light mode`) at block start, reset any touched `localStorage` keys, never depend on test order, never assume 8b's fixtures or selectors.

Label decisions (locked): visible Reset label is `Reset` (not `Reset to start`); metadata labels are accessible-only (no visible captions).

Explicitly excluded: Play/sound/pill/orientation/tab sizing (out of scope unless measured failing — then STOP + ask, never silent expansion); any metadata restyle; tempo input; status files.

## 2. Non-goals

* No visual redesign (sizes and one label only; theme toggle look, header typography, separators all preserved).
* No new controls, no behavior changes (toggle/reset/metadata actions identical).
* Deferred work tracked elsewhere, not dropped: spec H, spec 3, and the plan-status catch-up ride with this checkpoint; the closing re-critique C is gated on an explicit defer-or-owe call for H/3. This spec neither owns nor blocks them.
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```tsx
// ThemeToggle — 44px targets, everything else identical
<button type="button" className="... min-h-[44px] min-w-[44px] ...">Light mode</button>
// (technique illustrative — acceptance is measured box, §7, not class names)
// MetronomeControls Reset — exact visible content, accessible name preserved
<button onClick={onReset} aria-label="Reset to start" title="Reset to start" className="...">
  ⏮ Reset
</button>
// SongDetailPane header — accessible-only split, visuals byte-identical
<p className="text-sm text-foreground/60">
  <span aria-label="Song length">{formatSongLength(song.notes)}</span>
  <span aria-hidden="true"> &bull; </span>
  <span aria-label="Tuning">tuning {tuningLabel}</span>
  <span aria-hidden="true"> &bull; </span>
  <span aria-label="Tempo">{Math.round(song.tempoBpm)} bpm</span>
</p>
```

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Touch measurement | `getBoundingBox()` (or equivalent real box): width ≥ 44 AND height ≥ 44, each theme button independently + Reset by accessible name `Reset to start`. Class/padding inspection is not evidence. |
| Theme state across blocks | Each block normalizes via UI (`Light mode` click) first; no `localStorage` assumptions about theme storage |
| Screen reader | Reset announces `Reset to start`; metadata announces three labelled items without bullet noise; toggle `aria-current` unchanged |
| Narrow viewport | Larger toggle targets wrap per existing flex (no overlap fixes smuggled in — if overlap appears, STOP + ask) |

## 5. Forbidden patterns

No restyling beyond target sizes + Reset label; no touching tempo input, playback, tabs, drawer, or empty branches; no visible metadata captions; no assuming 8b's selectors/fixtures; no restructuring the shared e2e helper; no credentials.

## 6. File allowlist

`app/app/_components/ThemeToggle.tsx`, `app/components/MetronomeControls.tsx` (Reset button only), `app/app/_components/SongDetailPane.tsx` (header metadata only), `app/e2e/critique-fixes.spec.ts`. §8's diff-match must hold on first run.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* Prerequisites (all, else STOP): 8b checkpoint SHA quoted (this executor receives it after 8b lands); tracked worktree clean; shared e2e file/helper present on the execution branch.
* e2e blocks appended via plain `npm run test:e2e` (self-contained per §1 — theme normalized via UI, no order dependence, no 8b selectors):
  * theme targets: `Light mode` and `Dark mode` buttons each measure ≥44×44 via `getBoundingBox()`;
  * Reset: `getByRole("button", { name: "Reset to start" })` shows visible text `Reset`, measures ≥44×44, still resets (existing behavior — assert step returns to loop-start/song-start without asserting new semantics);
  * metadata: exactly three labelled spans (`Song length`, `Tuning`, `Tempo`); concatenated visible text matches the old single-string pattern (`length • tuning … • … bpm` — separators present, values unchanged).
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/`): toggles feel tappable without looking chunky; `Reset` label reads naturally beside `⏮`; header scans identically to before.

## 8. Definition of done

`verify` green + e2e blocks green + `diff --stat` matches §6 + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit (this commit also carries the deferred-admin note: H/3 status and plan-status catch-up explicitly listed as still-open, not silent).

## 9. Stop-conditions

* 8a/8b SHAs missing, worktree dirty, or 8b's commit contains non-8b hunks → stop, untangle first.
* Shared e2e file/helper absent → stop, don't create it.
* Overlap with 8a's tempo input or 8b's `!song` branch, or any urge to restyle/resize beyond the named items → stop, out of scope.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts; 8b SHA quoted; measured box values quoted per button) | Staging/build (this spec's own `stage` run — per-task build evidence is required even though human eyeballing batches into sitting B) | Diff check (`git diff --stat` vs §6).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] Theme toggles tappable without looking chunky, route `/`.
  * [ ] `Reset` label natural; header scans identically to before.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.

---
**Landed:** commit `b505ed7/aa4a934`; deployed to production via PR #23/#24 (2026-09-22).
