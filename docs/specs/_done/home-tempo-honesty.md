# Spec 8a — Tempo input honesty

Tier: Bounded — input-state change in one component + appended e2e, fully revertible UI (no user data, no deploy). Fixes the confirmed clear-to-type freeze: the tempo field stops committing every keystroke into the playback clock.

## 0. User story (approved)

As a player, clearing the tempo field to type a new value never freezes playback — instead of the song going silent the moment the box hits empty.

In plain terms: today the tempo `<input>` (`MetronomeControls.tsx:49-59`) commits every keystroke straight into the hook — clearing the box sends `Number("") = 0`, and `useMetronome.ts:64` computes `songTempoBpm / 0 = Infinity`, so the next step waits forever and playback silently stalls (confirmed by reading, not assumed). Typing a new value digit-by-digit is equally broken (each intermediate value becomes the live tempo). After this spec the field holds a **draft** while typing, commits only on blur/Enter, clamps valid input to 20–300, reverts invalid input to the last good tempo, and this input never calls `onBpmChange` with `≤0`/non-finite — playback keeps its last good tempo until a valid value lands.

## 1. Scope

Exact files (also the allowlist):

* `app/components/MetronomeControls.tsx` — tempo input becomes draft-state (§3): `onChange` updates local text only (never calls `onBpmChange`); commit on blur/Enter with round-then-clamp and revert semantics (§3); Enter keeps focus with an Enter/blur suppression guard (no double commit); resync draft when the controlled `bpm` prop changes while mounted. No other control in this file changes (Play/Reset/sound wiring untouched — spec 1+4 owns their tiers).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + helper owned by spec 1+4; consume, don't restructure; prerequisite check in §7 — the file is absent in the current checkout, so handoff requires the execution branch to contain landed spec 1+4 + helper).

Explicitly excluded: `app/hooks/useMetronome.ts` (control-only fix is the smallest reversible change — the single `setBpm` caller is this input via `DetailToolbar`; the hook's ratio math is correct for all `bpm > 0`. Claim narrowed deliberately: this spec guarantees *this input* never calls `onBpmChange` with invalid values, not a hook-level invariant — the hook's public `setBpm` still has no runtime guard. A one-line contract comment at the call site is permitted; timing logic is not); toolbar layout, pill, shortcuts, tokens. `app/status/song-views.md` deliberately excluded: its "editable bpm (defaults to the song's own tempo)" entry (`:13`) remains true after this change — interaction detail lives in the component per the three-homes rule, so no status edit is required.

## 2. Non-goals

* No playback-speed semantics change (the `songTempoBpm/bpm` ratio, `MIN_STEP_MS`, fallback gap all untouched).
* No tempo-range redesign (20–300 is the existing `min`/`max` on the input, now enforced programmatically since attributes don't block typing).
* No Escape-key handling (left at native default — out of scope, not claimed).
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```tsx
// MetronomeControls — draft-state tempo (local state, no prop changes)
const [draft, setDraft] = useState(String(bpm));
// Resync only when the committed prop changes while mounted:
useEffect(() => setDraft(String(bpm)), [bpm]);
// Typing never changes bpm pre-commit, so this effect cannot clobber mid-typing.
// (Song switches remount via key={song.id} in SongDetailPane.tsx:80, so this
// effect covers same-mount prop changes only — not song navigation.)
<input value={draft} onChange={(e) => setDraft(e.target.value)}
  onBlur={() => commit("blur")}
  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit("enter"); } }} />
```

`commit(source)` — single idempotent path (exact semantics, no paraphrase):

```ts
// const raw = draft.trim();
// const next = raw === "" ? NaN : Number(raw);
// if (!Number.isFinite(next) || next <= 0) { setDraft(String(bpm)); return; }
//   // REVERT: -5, 0, "", whitespace-only, NaN, Infinity → back to last good;
//   // onBpmChange is NOT called on this path.
// const clamped = Math.min(300, Math.max(20, Math.round(next)));
// onBpmChange(clamped); setDraft(String(clamped));
//   // COMMIT: round, then clamp — positive 5..19 → 20; 999 → 300; 90.5 → 91.
// Enter keeps focus AND arms a suppression guard consumed by the ensuing blur,
// so Enter-followed-by-focus-loss commits exactly once. The guard is required,
// not optional: without it the invalid path could call onBpmChange on the
// second (blur) commit and violate the revert guarantee above.
```

Clearing the field never triggers a commit — the empty draft persists (and playback continues) until blur/Enter. Spinner steps flow through the same draft+commit path (no separate handler; ArrowUp/ArrowDown then blur commits the stepped value). `NaN`/`Infinity`/whitespace-only are defensive implementation behavior only — native `type="number"` inputs cannot realistically produce them, so no e2e coverage is claimed for them.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Clear field mid-playback | Draft empties and stays empty; playback continues at last good tempo (the regression under test) |
| Partial value (`"1"` of `"120"`) | Draft only; live tempo unchanged until commit |
| `0`, `-5`, empty, whitespace-only, non-finite on commit | Revert to `String(bpm)`; `onBpmChange` not called |
| Positive out-of-range / decimals on commit | Round, then clamp: `5`→`20`, `19`→`20`, `999`→`300`, `90.5`→`91` |
| Enter then focus loss | Exactly one commit (suppression guard); Enter keeps focus |
| `bpm` prop changes while mounted | Draft resyncs; uncommitted typing discarded (acceptable, stated) |
| Song switch | Full remount (`key={song.id}`) — no resync path to test; no e2e claimed |
| `localStorage`/SSR | N/A — no persistence in this spec; client component, no storage access |

## 5. Forbidden patterns

No touching `useMetronome.ts` timing (ratio, scheduling, loop, step nav); no immediate-commit `onChange` (that handler is the bug); no Enter path without `preventDefault` + blur suppression (double commit); no hook-level guarantee claims (input-level only, §1); no new color literals/tokens; no toolbar-layout changes; no restructuring the shared e2e helper; no credentials.

## 6. File allowlist

`app/components/MetronomeControls.tsx`, `app/e2e/critique-fixes.spec.ts`. §8's diff-match must hold on first run (a one-line contract comment at the call site counts inside `MetronomeControls.tsx`).

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* Prerequisite (verified 2026-09-21: `app/e2e/` in this checkout holds only `design-system/`, `home.spec.ts`, `theme-toggle.spec.ts` — the shared file/helper live on the `experiment/impeccable-critique` worktree). Confirm the execution branch contains landed spec 1+4 (`critique-fixes.spec.ts` + `critique-helpers.ts`) before handing off — else STOP, do not create them.
* e2e blocks appended to `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e`, reusing spec 6's helpers directly (`sheetPlayhead`: `svg line[stroke-dasharray="3 2"]`, first; `waitPlayheadAdvance` polling the `x1` attribute — no new selector, no new file):
  * freeze regression: clear the field mid-playback → two playhead advances observed, asserting `tempoInput.inputValue() === ""` at **each** advance (an advance observed before the clear or after a re-render proves nothing);
  * valid Enter commit: establish a song, type `90` + Enter → input shows `90`, playback continues, focus stays in the field, exactly one `onBpmChange` (observable: committed value stable, no revert flicker);
  * valid blur commit: type `100` + blur → input shows `100`;
  * clamps, each in a fresh setup (tempo changes playback speed — reload or reset/play per value, never chained): `5` + Enter → `20`; `999` + Enter → `300`;
  * clear-and-blur reversion: establish `90` via the UI, clear, blur → field returns to `90`, playback uninterrupted (proves the invalid path never committed);
  * spinner: focus, ArrowUp, blur → stepped value committed (e.g. from `90` → `91`).
  * No resync e2e (no deterministic same-mount prop-change path exists — remount per `key={song.id}`); the resync effect is implementation-only.
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/`): clear-type-commit feels normal; invalid input visibly reverts; spinner feels normal.

## 8. Definition of done

`verify` green + e2e blocks green + `diff --stat` matches §6 + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Shared e2e file/helper absent on the execution branch → stop, don't create it.
* Any urge to change speed semantics, hook timing, tempo range, or toolbar layout → stop, out of scope.
* Any urge to skip the Enter/blur suppression guard ("same value, harmless") → stop, the invalid path makes it load-bearing.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts; execution branch quoted as evidence the helper existed) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §6).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] Clear-type-commit feels normal, route `/`.
  * [ ] Invalid input visibly reverts; spinner feels normal.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.

---
**Landed:** commit `fc724f5`; deployed to production via PR #23/#24 (2026-09-22).
