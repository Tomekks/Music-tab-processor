# Spec 8b — Empty and sidebar states

Tier: Bounded — static copy in two branches + one size fix + appended e2e, fully revertible UI (no user data, no deploy). A newcomer with an empty database gets guidance instead of dead ends, and rows hold still as cover art loads.

## 0. User story (approved)

As a newcomer with no songs published, I know what to do next instead of staring at a dead end — and as a player, the song list doesn't jump as cover art loads.

In plain terms: the sidebar's bare `No songs published yet.` gains next-step guidance; the detail pane stops saying `Choose a song from the list` when there is no list to choose from; and the row art/placeholder size mismatch (`w-12` vs `w-10`) is unified. All static text — no publish button, link, or route (a write path is the backlogged feature with security implications, not this spec).

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/SongListSidebar.tsx` — `SidebarList` empty branch only (the single change point: the list is shared by desktop and drawer, so desktop/mobile copy is identical by construction). Exact copy: `No songs published yet. Publish a tab to see it here.` Token `text-foreground/60` (no raw literals). The `<p>` stays non-focusable with no wrapper/layout change — spec 5's empty-DB container-focus path (`tabIndex={-1}`) must keep working untouched.
* `app/app/_components/SongDetailPane.tsx` — `!song` branch only (`:26-32`). Exact copy: `No song is selected yet. Publish a tab to start practicing.` (This branch means empty DB: `page.tsx:34` falls back to `list[0]`, so `selectedId` is null only when the list is empty.)
* `app/components/SongListRow.tsx` — placeholder `w-10 h-10` → `w-12 h-12` only (art size wins; loaded-row look unchanged).
* `app/e2e/critique-fixes.spec.ts` — append named blocks (file + helper owned by spec 1+4; consume, don't restructure; if absent, STOP per §9).

CTA definition (locked): the "CTA" is static text only — the `Publish a tab…` sentence inside each copy string. No button, no link, no route, no write path. It appears in both panes (sidebar via `SidebarList`, detail via the `!song` branch) because an empty DB shows both at once.

Explicitly excluded: drawer/focus mechanics (spec 5's), detail header (8c's), any publish UI, status files (no empty-state entry exists in `song-views.md`; behavior lives in the components per the three-homes rule).

## 2. Non-goals

* No publish write path (text guidance only — deliberate, see §1).
* No desktop/mobile divergence (shared `SidebarList` — identical by construction, asserted in e2e).
* No row restyle beyond the placeholder size match; detail header art pair already matched (excluded).
* Deferred work tracked elsewhere, not dropped: spec H, spec 3, and the plan-status catch-up ride with the 8c checkpoint; the closing re-critique C is gated on an explicit defer-or-owe call for H/3. This spec neither owns nor blocks them.
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```tsx
// SidebarList empty branch — exact strings, token utility, non-interactive
<p className="p-4 text-sm text-foreground/60">No songs published yet. Publish a tab to see it here.</p>
// SongDetailPane !song branch — exact string, existing wrapper untouched
<p>No song is selected yet. Publish a tab to start practicing.</p>
// SongListRow placeholder — size match only
<div className="w-12 h-12 shrink-0 bg-foreground/10 rounded-[var(--radius)]" aria-hidden="true" />
```

Copy is exact hardcoded product copy (approved wording — no paraphrase). No new tokens; no layout classes added or removed.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Empty DB, desktop | Sidebar guidance + detail guidance render together; no crash on null song |
| Empty DB, mobile drawer | Same `SidebarList` copy inside the drawer; drawer focus path (container focus, Escape/backdrop return) unchanged |
| Art slow/404 | Placeholder holds the identical box; rows never shift when art arrives |
| Songs present | Zero visual change (copy branches unreached, placeholder only where art missing) |
| Screen reader | Guidance is plain text (not a control — no false affordance); drawer semantics untouched |

## 5. Forbidden patterns

No button/link/route for publishing; no making the empty `<p>` focusable or interactive; no touching drawer mechanics, focus logic, row art, detail header, or playback; no new color literals; no restructuring the shared e2e helper; no credentials.

## 6. File allowlist

`app/app/_components/SongListSidebar.tsx`, `app/app/_components/SongDetailPane.tsx` (`!song` branch only), `app/components/SongListRow.tsx` (placeholder size only), `app/e2e/critique-fixes.spec.ts`. §8's diff-match must hold on first run.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* Prerequisites (all three, else STOP — do not create or untangle anything unsupervised):
  * spec 8a checkpoint commit exists (staging + human checks complete); quote its SHA — the 8b executor receives it and starts from it;
  * tracked worktree clean at handoff: the 8a commit contains ONLY the 8a allowlist (`MetronomeControls.tsx` + its e2e). The 8b hunks observed in the dirty tree (sidebar/row/pane copy+size) must be reverted from 8a's commit and re-applied under 8b — if 8a's checkpoint contains non-8a hunks, STOP and untangle first;
  * `app/e2e/critique-fixes.spec.ts` + helper exist on the execution branch.
* e2e blocks appended via plain `npm run test:e2e`, reusing spec 5's empty-DB variant strategy verbatim for copy assertions (if no reusable path exists, state the fallback openly — human checkbox + diff review — never claim unrun coverage):
  * empty copy: sidebar `SidebarList` shows the exact string on desktop; drawer shows the identical string on mobile (shared component — assert both, same string);
  * drawer + empty: open/Escape/backdrop focus behavior unchanged with the new copy (no new focus stops introduced — the `<p>` is not in tab order);
  * art stability (live list, no empty DB needed): for rows with and without art, assert art box and placeholder box measure equal (`w-12 h-12` both) — geometry via `getBoundingBox()`, not screenshots.
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/` + simulated-empty review): guidance reads calm and actionable (not an error, not a dead button); rows hold still as art loads.

## 8. Definition of done

`verify` green + e2e blocks green (or explicitly-fallback copy coverage with callout) + `diff --stat` matches §6 + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* 8a SHA missing, worktree dirty, or 8a's commit contains non-8a hunks → stop, untangle first.
* Shared e2e file/helper absent → stop, don't create it.
* Any urge toward a publish button/link, drawer changes, or row restyle → stop, out of scope.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts; 8a SHA quoted; copy-fallback status explicit) | Staging/build (this spec's own `stage` run — per-task build evidence is required even though human eyeballing batches into sitting B) | Diff check (`git diff --stat` vs §6).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] Empty guidance calm and actionable on desktop and in the drawer, route `/`.
  * [ ] Rows hold still as art loads.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.
