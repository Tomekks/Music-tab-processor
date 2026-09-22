# Spec 6 — Ascii playback banner

Tier: Bounded — one component, one banner, fully revertible UI (no user data, no deploy). Declares Ascii's staticness honestly instead of animating it.

## 0. User story (approved)

As a player on the Ascii tab mid-song, I see a clear note that playback continues on the other views — instead of a frozen wall of text that makes me wonder if playback broke.

In plain terms: Ascii stays a static reference printout (animating it was rejected — `renderTab.ts` returns one opaque string with no per-step structure). A small banner above the text states playback continues elsewhere: announced once to screen readers via `role="status"`, then silent. No animation, no live step updates, no behavior change anywhere.

## 1. Scope

Exact files (also the allowlist):

* `app/app/_components/AsciiView.tsx` — render a banner above the existing `<pre>` (banner first, `<pre>` class + JSX byte-identical — proven by diff review, not by snapshot: no stable fixture exists and none is introduced); update the header comment (it documents the no-playhead scope cut — the banner is the answer to it).
* `app/status/song-views.md` — update the Ascii-baseline / missing-playhead-scope claims to the new behavior (current-state file; header comment alone is insufficient under the three-homes rule).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + helper owned by spec 1+4; consume, don't restructure; if absent, STOP per §9).
* `app/e2e/critique-fixes.spec.ts` — append blocks (file + helper owned by spec 1+4; consume, don't restructure).

No prop changes (`asciiTab` only — the banner is unconditional, so no `isPlaying` plumbing through `DiagramViewport`/`StudioTabs`), no playback changes, no Sheet/Fretboard changes.

## 2. Non-goals

* No per-step highlight, no live region updates during playback (explicitly rejected — a chattering live region serves nobody).
* No `<pre>` restyle or content change.
* No `contracts/`, no Turso schema, no `.env`.

## 3. Interface

```tsx
// AsciiView — banner above the untouched <pre>
<div role="status" className="...">Ascii is a static reference — follow playback on Sheet or Fretboard.</div>
```

Copy is exact hardcoded product copy (approved wording — no paraphrase, no i18n abstraction at this scope). Styling: `text-sm text-foreground/60`, no accent fill (information, not a call to action) — existing token-backed utilities only, no new literals or tokens; exact visual calm is human-checkbox judgment, sitting B. `role="status"` makes the banner eligible for one polite announcement on insertion. Honest scope statement: automation proves mount-once + zero playback-driven mutations (§7); actual screen-reader speech is unverified residual risk (no SR in harness — carried openly, not claimed).

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| Empty `asciiTab` | Banner still renders above the empty `<pre>` (honesty doesn't depend on content) — covered by explicit human checkbox (§7), not automation (no jsdom render harness in repo) |
| Mount identity (three distinct cases) | Playback rerender: same banner node, zero mutations. Switch away and back: `DiagramViewport:58` conditionally unmounts `AsciiView`, so return is a new mount with one new eligible announcement. Song change: keyed `StudioTabs` remounts the tree — new mount, one new eligible announcement. All three correct by construction; none is per-step chatter |
| Screen reader not running | Banner is plain visible text — sighted users get the same message |

## 5. Forbidden patterns

No `aria-live` explicit values beyond the implicit `role="status"` (no `assertive`, no per-step updates); no making the banner a button/link (it's information, not navigation — tab names inside are plain text, not controls); no touching playback, tabs, or the `<pre>`.

## 6. Internal sequence

Banner markup → header-comment update → e2e blocks. Single component, no ordering risk beyond that.

## 7. Acceptance criteria

* `npm run verify` from `app/` — quote the tail.
* e2e blocks appended to `app/e2e/critique-fixes.spec.ts` via plain `npm run test:e2e` (prerequisite: file + helper exist — else STOP, do not create them):
  * Ascii tab shows the banner with the exact copy above the `<pre>`; `<pre>` class + JSX unchanged (diff review — §1);
  * banner carries `role="status"`; start playback on Sheet, prove two step advances deterministically (poll the Sheet playhead line's position attribute until it changes twice — no arbitrary sleeps; if the helper cannot observe advances, STOP), switch to Ascii, then assert the banner DOM node is stable across the advances (same node, `textContent` unchanged) — this proves mount-once + zero playback-driven mutations, NOT actual SR speech (unverified residual, §3);
  * Play state survives the tab switch (transport still playing — regression guard).
* No manual one-liner duplicating runner output.
* Human checkbox (sitting B pool, `npm run stage`, route `/`): banner reads as calm information, not an error or a CTA; doesn't crowd the tab; empty-`asciiTab` renders banner above empty `<pre>` (explicit — no automated coverage).

## 8. Definition of done

`verify` green + e2e blocks green + `diff --stat` matches §1 (including `song-views.md`) + human checkbox recorded + self-check (claims beside commands/outputs) + checkpoint commit.

## 9. Stop-conditions

* Any urge to highlight steps, add live updates, linkify tab names, or restyle the `<pre>` → stop, out of scope.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (`npm run verify` tail) | E2E (block names + counts) | Staging/build (`npm run stage` build) | Diff check (`git diff --stat` vs §1).
* Runtime Evidence section required (staged server used): URL, PID + stop, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting B pool):
  * [ ] Banner reads as calm information (not error/CTA), route `/`.
  * [ ] `<pre>` rendering unchanged.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.
