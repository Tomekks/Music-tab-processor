# Home critique fixes (`/` route)

**Status page:** `docs/__PLANS/2026-09-21-home-critique-fixes-status.html` (snapshot; data in the sibling `.data.js`, updated per checkpoint commit).
**Worktree:** `.worktrees/impeccable-critique/` (branch `experiment/impeccable-critique`, from `docs/design-system-iteration-2-plan` @ `273f610`). Revert = delete the worktree.

## Goal

Raise the `/` critique trend from **11/40** by fixing the 6 priority issues + 6 small wins from the impeccable critique, with every color design-system-owned and the sidebar independently iterable — proven by a closing re-critique, not by assertion.

## Baseline (locked, not re-litigated)

* Critique run #1 (dual-agent, 11/40 Critical): `.impeccable/critique/2026-09-21T17-20-48Z__app-app-page-tsx.md`.
* Critique run #2 (+ Playwright browser evidence, 11/40): `.impeccable/critique/2026-09-21T17-43-15Z__app-app-page-tsx.md`.
* Evidence script + 6 screenshots + `evidence.json`: out-of-repo evidence dir (reused for the closing run).
* Target is `/` — `app/studio/page.tsx` is a `redirect("/")`; retired `/songs/[id]` redirects too. All fixes land in shared components.
* Detector baseline: ~60 findings, all but 1 (`overused-font`, `globals.css:7`) from `app/public/archytechy/index.html` (static docs page, out of scope).

## Shared contract (copied into specs 1+4, 2, 3, 7)

* `StudioTabs` owns: active tab, global orientation (`localStorage "tabbytab:orientation"`), transport state, loopRange, shortcut opt-out (`localStorage "tabbytab:shortcuts"`).
* `DetailToolbar` renders: tabs, transport, loop pill, orientation control, `<kbd>` hints. Never owns state.
* `DiagramViewport` projects state into Sheet/Fretboard/Ascii; receives `loopRange`, forwards to **both** diagrams.
* Colors: spec-0 semantic tokens only. No raw values, no new `color-mix()` in components; the two existing ad-hoc loop mixes (`SheetDiagram:254`, `DetailToolbar:47`) die in specs 2/3. (`FretboardDiagram:218` is the out-of-scope card border, not a loop mix.)

## Decisions (grill-me rounds 1–3, locked)

Merges: 1+4 one spec (no seam); Fretboard color language in 3, pill logic in 2; H separate Trivial spec after 0 (detector-only, no staging); standalone interface spec dissolved (contract lives here). Orientation global (no songId plumbing). Shortcuts: container scope + hints + opt-out. Tempo: draft-then-commit, clamp 20–300. Loop shading restyled on both views in the new token language. Ascii banner `role="status"`, informational. Drawer: Escape/backdrop close, focus return, selection keeps it open, no scroll-lock (shell contract covers it). Desktop check via DOM/layout assertions, not screenshot goldens. Empty-state CTA is static copy (no publish write path — backlogged feature, security implications).

## Tracks & sequencing

Specs are written and executed strictly in this order; each spec holds its own detail (user story → scope → interface → allowlist → acceptance). A spec reads the landed diffs of its predecessors, never the plan's paraphrase of them.

* **Track A — foundation & transport (staging sitting A after #2):** 0 → H → 1+4 → 3 → 2.
* **Track B — shell & honesty (staging sitting B after #8c):** 5 → 6 → 7 → 8a → 8b → 8c.
* **Close-out:** C (re-critique) after 8c.

### Spec 0 — Foundation: tokens + theme font (`docs/specs/home-foundation-tokens.md`, Tier Bounded)

### Spec H — Detector hygiene (`docs/specs/detector-hygiene.md`, Tier Trivial, lands after 0, no staging)

*User story: as a player I see the theme typeface everywhere and loop/active colors follow my light/dark theme; as a maintainer `detect` shows signal only, so its end-of-task runs mean something.*
New semantic tokens (`semantic.color.playbackActive`, `semantic.color.loopRange`, `semantic.state.loopRangeOpacity`) through the editor flow keeping `brands/default/tokens.json` + `tokens.default.json` in sync; `globals.css` Arial → theme font chain; `detector.ignoreFiles: app/public/**` lives in spec H, not here. Revert = checkout token files + `npm run tokens:build` (§3 revert-and-rebuild).

### Spec 1+4 — Toolbar split + shortcut discovery

*User story: as a player the transport row never overlaps the music on my narrow laptop, and I can discover that Space/arrows drive playback and turn them off if they fight my screen reader.*
Two-row toolbar under `md`, Play promoted to primary accent, Reset/sound/flip ghosted; keys scoped to the detail container + visible `<kbd>` hints with `aria-keyshortcuts` + persisted opt-out.

### Spec 3 — Fretboard playback-state color

*User story: as a player I can see at a glance which step is sounding and which bars are looping, in colors my theme controls.*
Active fill via inset ring (fixed width, no layout shift) + loop-range shading, both in spec-0 tokens; `aria-current`; scroll-into-view; `Viewport→Fretboard` loopRange pass-through; Sheet loop rendering restyled into the same language.

### Spec 2 — Loop pill logic

*User story: as a player a loop I set on Sheet stays visible and clearable when I switch to Fretboard or Ascii, instead of playing invisibly.*
Pill + Clear in `DetailToolbar` whenever a loop is set, on every tab; metronome wiring untouched (shading owned by spec 3).

### Spec 5 — Sidebar independence + mobile drawer

*User story: as a phone player I get full-width music with the song list one tap away; as a maintainer I can restyle the sidebar without touching the shell.*
Move `<nav>` shell (width var, border, scroll) from `StudioShell` into sidebar-owned chrome (shell keeps pure slots; desktop DOM assertions prove byte-equivalent geometry); collapsible drawer under `md` with the D6 semantics.

### Spec 6 — Ascii playback banner

*User story: as a player on the Ascii tab mid-song I know playback is continuing on the other views instead of wondering if it broke.*
Static `<pre>` stays; `role="status"` banner, announced once, silent during playback.

### Spec 7 — Single orientation control

*User story: as a player the flip means the same thing on Sheet and Fretboard, and my choice survives reloads.*
Lift Fretboard's local toggle into `StudioTabs` shared state; one control; global `localStorage` persistence.

### Spec 8a — Tempo input honesty

*User story: as a player clearing the tempo field to type a new value never freezes playback.*
Draft-state input, commit on blur/Enter, clamp 20–300; hook never receives ≤0/NaN (fixes the confirmed `songTempoBpm/0` = Infinity freeze).

### Spec 8b — Empty and sidebar states

*User story: as a newcomer with no songs published I know the next action; as a player the list doesn't jump as art loads.*
Static guidance copy (no write path); art/placeholder size match.

### Spec 8c — Control polish

*User story: as a player every control is thumb-tappable and says what it does; the header metadata scans at a glance.*
Theme toggles ≥44px; visible Reset text label; length/tuning/bpm split into anchored items.

### Step C — Closing re-critique

*User story: as the owner I see `11 → ?` with a fixed-vs-excluded ledger, not a claim.* Re-run dual-agent critique + `detect` + evidence script; new snapshot; ledger distinguishes fixed findings from `app/public/**` exclusions.

## Verification shape (every spec)

`npm run verify` + named block(s) in the single `app/e2e/critique-fixes.spec.ts` (+ shared helper) run via `npm run test:e2e` + `npm run stage` build per spec; human eyeball batched in sittings A/B. Checkpoint commit + `docs/specs/` archive per spec.

## Reporting rule (every spec, no exceptions)

On completion **or** on early stop, the executor files the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md` — it is the verifier's evidence packet, not a diary. Each spec's §10 pre-fills its checks rows and human-review checkboxes; the executor fills values, never invents them (`NOT RUN` + `BLOCKED`/`AUTOMATED_GREEN_HUMAN_PENDING` where true). No green status while any required check is pending. Relay packets point at the spec; the spec points at the requirement file — the template itself lives in exactly one place.

Non-goals in every spec: `contracts/`, Turso schema, `.env`, prod CSP, publish write path, drawer/tooltip abstractions, screenshot-golden infra. STATUS/RULES.md updates where behavior changes. Final gate once: push? / push & deploy (repo root)? / skip?

## Success

Zero P1 findings open, no new a11y/responsive regressions (`detect` signal-only + Playwright green), trend improved with ledger. Known residues carried openly: physical-device touch, live screen-reader pass, synthetic loop-drag feel (no hardware/SR in harness) — stop-conditions in the relevant specs, not claimed verifications.
