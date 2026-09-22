# Fix-spec 8d-wrap — xl responsive contract for the transport rows

Tier: Bounded — amends spec 8d's responsive contract only. Narrow by design:
no new behavior, no control restyle, no touch-target change.

**Supersession (documentation correction): the §3/§4 contract in this
fix-spec supersedes the retired bullets in the parent spec
`home-controls-consolidation.md:102` — the "1280 — tabs + complete single
transport row" and "1024 — shared row holds" lines no longer hold. The
replacement contract is: tabs own the first row at every width; at xl the
collapsed wrappers form one complete transport row below the tabs; below
xl the wrappers are full-width boxes in explicit order
primary → flip → midi → tempo. Two pre-existing e2e tests encoded the
retired contract and are amended under this fix-spec's authority (third
amendment exception, granted): spec 1+4's 1280px toolbar assertion and spec
2's desktop layout-rerun assertion, both rewritten to the fallback
contract with no other coverage weakened or deleted.**

## 0. Problem (measured, headless Chromium, best case)

Spec 8d §7's 1280 bullet ("tabs + complete single transport row") cannot hold
under the prescribed `lg:contents` mechanism. Measured boxes at 1280:

```text
tabs x272 w278 | pill x574 w146 | reset x731 w82 | play x826 w71
tempo x908 w151 | midi x1072 w101 | flip WRAPPED to y326
detail-column width 1040; toolbar content ends at x1248
```

One shared row needs x574→1285 (flip 101px + 12px gap after midi ending at
1172). Available ends at 1248. **~38px short.** The `lg:contents` collapse
itself works (5 controls do share one flex row) — there is no room for the
6th beside 278px of tabs. Headless emoji fonts are the narrow best case; real
browsers render ⏮/▶ wider. The 1024 "shared row" bullet is worse (720px
content vs 712px transport alone). Status when written: implementation
complete, `verify` green, e2e 40/41 with only the 1280 block red. No commit
was made; the blocked tree is preserved and this spec builds on it.

## 1. Scope

Exact files (subset of spec 8d §6 — everything else in 8d is frozen):

* `app/app/_components/DetailToolbar.tsx` — wrappers `lg:contents` →
  `xl:contents` (`lg:basis-auto` → `xl:basis-auto`); tabs/transport parent
  `md:flex-row` → `xl:flex-row` (with `md:items-center md:justify-between`
  moving to `xl:` alongside); xl-only compact spacing (below); `shrink-0`
  on the wrapper boxes and row-primary children (all in this file).
* `app/components/MetronomeControls.tsx` — `shrink-0` on ResetButton,
  PlayButton, TempoField label, MidiButton. `StringOrientationToggle.tsx`
  is NOT touched (out of 8d allowlist): Flip keeps content width via its
  full-width wrapper box below xl and via measured slack at xl.
* `app/e2e/critique-fixes.spec.ts` — rewrite the wrap test only, per §3.

## 2. Non-goals

No label/control/touch-target narrowing. No gap/padding change except the
xl-only compact set below. No breakpoint change for the drawer (`md`), tabs,
or header. No tempo/playback/pill/empty-state/shortcut changes. No stage, no
commit (this fix is verified by e2e only; checkpoint stays with spec 8d).

## 3. Interface (amended responsive contract)

* **xl and above: tabs row + complete transport row (FALLBACK TAKEN).**
  The final `xl:px-3` adjustment still measured **slack 0.0px** (single
  merged row ending flush at the content edge — certain overflow on wider
  real-browser emoji), so per §5 the shared-row requirement is relaxed:
  tabs always own the first row (parent stays column at every width) and
  the wrappers collapse via `xl:contents` into one complete transport row
  below them. All xl-only compact spacing (`xl:px-3`, `xl:gap-4`,
  `xl:gap-2`) is reverted with the fallback — the toolbar keeps `px-8`
  and `gap-3` everywhere, since the two-row layout has ~260px of headroom
  and needs no shaving. Source order preserved throughout.
* **Below xl: tabs get their own row; transport flows.** Parent stays
  column; transport wrappers are content-width flow items (never
  basis-full — forcing each box full-width stacked Flip/MIDI/Tempo into a
  solo column instead of letting them fill the second row one by one,
  reported as a live bug with screenshot) in explicit order primary →
  flip → midi → tempo → pill. Measured rows: 1024 = tabs + full 6-control
  row; 767 = tabs + 5-control row + pill; 390 = tabs + 3-control row +
  2-control row + pill. The loop pill sits in its own wrapper last per the
  follow-up bug report, so the xl row reads Reset, Play, Flip, MIDI,
  Tempo, Loop. Reset, Play, MIDI, and Flip share `min-h-[44px]` (MIDI in
  `MetronomeControls.tsx`; Flip in `StringOrientationToggle.tsx`, a first
  touch outside all prior allowlists under direct bug-report instruction)
  so no button renders larger.
* **Below lg: unchanged** — the same explicit transport rows (they already
  hold at every sub-xl width by the same mechanism).
* **xl-only compact spacing** (nothing below xl moves a pixel): toolbar
  `px-8` gains `xl:px-3` — this is the FINAL permitted spacing adjustment;
  tabs/transport parent `md:gap-6` gains `xl:gap-4`; transport container and
  row-primary inner `gap-3` gain `xl:gap-2`.
  Budget: +40 +8 +16 +8 = +72px against the measured 38px gap. The shared
  row counts as proven only with
  **≥8px measured slack** (last control's right edge vs toolbar content
  right edge) — platform margin for wider real-browser emoji, and the bar
  is kept, never removed. If slack remains below 8px, STOP: the correct
  fallback is to relax the 1280 shared-row requirement (allow a two-row
  1280 layout), never to shave further, and never to accept zero slack.
* **shrink-0:** all six transport controls keep content width (Flip via its
  wrapper box); the e2e content-fit assertions stay green.

## 4. Acceptance criteria

* `npm run verify` green (unchanged bar).
* Plain `npm run test:e2e`: the wrap coverage is rewritten as **independent
  per-width tests** (1280: tabs row + complete transport row, slack reported
  with a ≥0 no-overflow bar instead of the retired ≥8 bar; 1024 / 767 / 390
  stacked rows) so a 1280 failure can never again hide the other widths'
  evidence. Row clustering stays center-y (items-center aligns centers)
  with stable names, never DOM order. The old cross-width
  "tabs-y-identical" assertion is REPLACED (it was invalid: the song header
  legitimately wraps at 390, +52.5px measured, outside every allowlist): at
  each width independently, tabs must hold their row across transport-state
  changes (loop set/unset via the spec-2 drag helper on a fixed song,
  Play/Pause toggle, control hover) — no cross-width equality anywhere.
  All other 8d blocks and every earlier spec stay green.
* `git diff --stat` stays within spec 8d §6 (this fix touches only its
  subset above). No checkpoint, no stage.

## 5. Stop-conditions

* Measured xl slack < 8px → stop, report, do not shave further.
* Any urge to narrow labels/controls/targets, restyle, or move breakpoints
  other than the prescribed md→xl parent flip → stop, out of scope.
* Anything ambiguous → ask.
