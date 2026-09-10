# Home page (`/`) — build status

Part of `app/status/` — see `app/STATUS.md` for the index. This file was
`app/app/studio/STATUS.md` while this was still a separate `/studio` route being
built and compared against the original UI; it was promoted to be the site's home
page (`/`) once that comparison was done (see `archive/v0.1-web-ui/README.md` for
what it replaced, and git tag `v0.1` for that version's exact final state). Content
below is unchanged from the build itself — only this note and the file's location
are new.

Full plan: see the approved plan this build follows (component signatures, layout
mechanism, data-fetching plan, per-milestone verification steps). If that plan file is
no longer available, this checklist plus the milestone commit messages below are enough
to know what's done — read the actual diffs (`git log --oneline`, `git show <sha>`) for
the "how", not memory.

- [x] M1 — static shell + data (no interactivity)
- [x] M2 — song selection via ?song=
- [x] M3 — tab switching (Sheet/Fretboard/Ascii, no metronome)
- [x] M4 — metronome wiring + FretboardDiagram currentStep
- [x] M5 — design tokens + restyle

**Round 1 (M1-M5) complete.** `/studio` is a working, live, restyled route.

## Round 2 -- content fixes, per-view cleanup, Claude theme, Spotify plan

Full plan: /Users/tomsvarpins/.claude/plans/smooth-prancing-babbage.md (round 2
section). If that plan file is gone, this checklist + commit messages are enough.

- [x] M6 -- song list & header content (artist, derived length, bottom-left alignment)
  Verified: header now shows a real derived length ("2:14" for the one dev-DB song),
  title sits bottom-aligned against the cover art placeholder. Added
  `formatSongLength` to tabNotation.ts + 3 new tests (22 total, all pass).
  tsc/eslint clean.
- [x] M7 -- Sheet view decluttering (optional bordered/showHeader/showCaption props)
  Verified: /studio Sheet tab has no border/"Sheet" label/tempo readout/caption;
  /songs/[id]'s Sheet tab re-screenshotted and confirmed pixel-identical to before
  (border, label, tempo, caption all still there). tsc/eslint clean.
- [x] M8 -- Fretboard: wrap instead of horizontal-scroll (touches both routes, flagged)
  Verified in-browser on both /studio and /songs/[id]: segments now wrap onto
  multiple rows and scroll vertically with the page/panel, instead of requiring
  horizontal scroll. tsc/eslint clean.
- [x] M9 -- Ascii: invert colors to match the other tabs (studio-only file)
  Verified in-browser: white background, dark monospace text, consistent with
  Sheet/Fretboard either side of it. tsc/eslint clean.
- [x] M10 -- Claude theme (child theme in design_system/index.html + applied to /studio)
  `npx getdesign@latest add claude --out docs/studio-theme/DESIGN.md` ran cleanly
  (real values, not guessed -- see that file for the full extracted design system).
  design_system/index.html got a THEMES map + resolveTheme() merge (Claude theme
  stores only bg/fg/accent/border/radius overrides, space inherits DEFAULTS
  unchanged since DESIGN.md's own base unit is already 4px) plus a Default/Claude
  theme selector extending the existing light/dark segmented-control pattern --
  verified in-browser (opened the file directly, no dev server): selecting Claude
  theme loads #faf9f5/#141413/#cc785c/#e6dfd8 (light) and #181715/#faf9f5/#cc785c/
  #252320 (dark), live preview updates, Copy CSS emits the right block, Reset
  correctly reverts to Default. Applied those light-mode values into globals.css's
  `[data-theme="light"]` block and the `:root` --color-accent/--color-border/--radius
  (12px, was 8px). Verified /studio now shows the warm cream/coral Claude palette;
  `/` re-checked and still renders dark under OS dark preference (unaffected --
  these are new token names / the light-mode override only ever matches /studio's
  root). tsc/eslint clean.
- [x] M11 -- Spotify Web API: plan + non-blocking stub (no token yet, explicitly last)
  app/lib/spotify.ts: real Client Credentials flow (token fetch + cache, track
  search), but every path short-circuits to null with no
  SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET set (documented in .env.example) --
  never throws, no network call at all when unconfigured. Wired into
  page.tsx -> SongDetailPane's cover art (optional coverArtUrl prop, falls
  back to the placeholder div when absent). Verified in-browser: /studio is
  visually and functionally unchanged from before this milestone (today's
  actual state: no credentials configured) -- no console errors, no added
  latency. tsc/eslint/test all clean (22 tests, unaffected).

**All 11 milestones (M1-M11) complete.**

## Round 3 -- Spotify credentials added, integration is live

User supplied real Spotify Client ID/Secret (app "guitar-tab-processor") in chat.
Added to `app/.env.local` (confirmed gitignored via `.env*`, never committed --
also added to `app/.env.example` as blank placeholders in M11 already). Restarted
the dev server to pick them up and verified end-to-end with the real API, not just
"doesn't crash with no token" (M11's original test):

- Real cover art now loads for "Mister Sandman" (The Chordettes' "Mister Sandman's
  Best" single art) -- confirmed visually, no broken image, no console errors.
- Extended `spotifyArtist` as a fallback in `SongDetailPane.tsx` (`song.artist ||
  spotifyArtist || " "`) -- DB artist still wins when present, Spotify only
  backfills when it's null. This closes the original M6 "artist missing" gap for
  real, using the now-live integration: header now shows "The Chordettes" instead
  of a blank line. `SongListRow.tsx` (the sidebar) deliberately still doesn't do
  this -- backfilling every row would mean N Spotify calls per list render; only
  the one selected song's full data is ever fetched.
- Re-verified clean in a fresh browser tab (avoided a false-positive: a stale tab
  briefly showed leftover HMR-websocket console noise from the dev-server restart,
  same non-issue pattern as M4's -- confirmed clean in a new tab instead).
- tsc/eslint/`npm test` (22 tests) all still clean.

Credentials live only in `app/.env.local` (gitignored) -- nothing above is a git
change beyond the two small source edits (`SongDetailPane.tsx`, `page.tsx`).

Currently mid-milestone: none.
Last verified working state: M1 (2026-09-10) -- /studio renders the real sidebar (1
song in the DB today: "Mister Sandman") + static header from real DB data; page itself
does not scroll (confirmed via scrollHeight === innerHeight), the placeholder tab-diagram
region scrolls independently while the header stays pinned (confirmed via a direct
scrollTop test against the header's bounding rect). tsc/eslint clean. Not yet tested with two real songs in the DB (only one exists today: "Mister Sandman") --
but M2's selection logic was verified directly: a valid `?song=<id>` highlights the
matching sidebar row (`aria-current="true"`) and SSRs that song; an invalid
`?song=does-not-exist` falls back silently to the most-recent song, no crash, no error
page. Worth a real click-through between two distinct songs once the DB has more than
one, but the logic itself is confirmed correct.
M3: clicked through Sheet -> Fretboard -> Ascii in-browser -- each renders correctly,
only the diagram region's content changes, header/toolbar never move, no console
errors. FretboardDiagram is mounted with no currentStep (its existing default) since
that prop doesn't exist on it yet -- M4 adds it.
M4: FretboardDiagram.tsx got the currentStep/active prop exactly per
docs/specs/ui-fretboard-playhead.md. Verified in a fresh browser tab (a stale tab
carried an unrelated leftover console error from before a server restart -- confirmed
it wasn't real by reproducing it on the untouched `/` route too, then re-checked clean
in a new tab): Play advances Sheet's dashed playhead; switching to Fretboard mid-
playback shows the correct segment with a bold border, staying in sync as it advances;
switching to Ascii keeps the metronome bar visible/functional with no highlight
(expected no-op); switching tabs repeatedly never stopped playback (state lives in
StudioTabs, which doesn't unmount on tab switch); no console errors. NOT yet tested:
switching to a *different song* mid-playback to confirm the `key={song.id}` reset
(only one song exists in the dev DB) -- this is standard React remount semantics, low
risk, but worth a real check once there's a second song.

M5: added --color-accent/--color-border/--radius/--space-*/--sidebar-width to
globals.css, plus a `[data-theme="light"]` rule that re-pins --background/--foreground
to fixed light values. **Real bug caught and fixed here:** the first pass used the
Tailwind `bg-background`/`text-foreground` utilities directly, which -- because they
resolve to the SAME shared --background/--foreground tokens the old routes' dark-mode
media query flips -- rendered /studio dark under a dark OS/browser preference, exactly
contradicting the "light by default" requirement. Fixed by adding `data-theme="light"`
to StudioShell's root div plus a `[data-theme="light"] { --background: ...; --foreground: ...; }`
rule in globals.css (same pattern design_system/index.html already uses) -- CSS custom
properties cascade normally, so this re-pins the value for every descendant (including
SheetDiagram.tsx, which already reads these same vars) without touching :root or the
existing dark-media-query block at all. Verified: /studio now renders light regardless
of OS dark-mode setting; `/` and `/songs/[id]` were re-checked in the same dark-OS
browser session and still correctly render dark (confirms zero regression). Also ran
the full-plan final verification: `tsc --noEmit` clean, `eslint` clean, `npm run build`
succeeds (/studio registered as a dynamic route alongside the untouched ones),
`npm test` -- all 19 pure-logic tests still pass, and
`git diff --stat master...feature/studio-ui -- app/app/page.tsx app/app/songs app/components/SongTabs.tsx`
is empty (the frozen routes are byte-for-byte untouched).
`--sidebar-width` retuning wasn't live-toggled but is guaranteed correct by
construction (StudioShell reads `var(--sidebar-width, 280px)` directly, nothing else
hardcodes the width).

## Follow-ups, not part of this build (see plan's "deliberate scope cuts")

- AsciiView has no per-step structure / currentStep support (thin wrapper only).
- FretboardDiagram's hardcoded color palette (SVG stroke/fill hex values) is untouched.
- No loading/error UI.
- Only one song exists in the dev DB -- several M2/M4 checks should be re-run with a
  second song once one exists, to see real song-switching (not just same-song
  round-trips).
- The `agent/ui-fretboard-playhead` worktree/branch is now redundant (this build
  reimplemented its diff fresh in `app/components/FretboardDiagram.tsx`) -- worth
  discarding or comparing, at the user's discretion, not done here.

## Locked decisions (don't re-litigate if resuming cold)

- Old routes (`app/app/page.tsx`, `app/app/songs/[id]/page.tsx`,
  `app/components/SongTabs.tsx`) are never touched by this build.
- New components live in `app/app/studio/_components/` only.
- No new npm dependencies — see `app/lib/cn.ts` instead of clsx/cva.
- `/studio` is a new, additional route — it does not replace anything.
- Sidebar query is column-projected (no notes/tuning blobs); ordered by
  `desc(songs.createdAt)`; default selection = most recent; `?song=` invalid/stale
  falls back silently (no notFound()).
- Ascii tab gets no metronome sync, by design — not a bug.
- `<StudioTabs key={song.id} .../>` is deliberate (resets tab + metronome per song).
