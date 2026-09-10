# /studio build status

Full plan: see the approved plan this build follows (component signatures, layout
mechanism, data-fetching plan, per-milestone verification steps). If that plan file is
no longer available, this checklist plus the milestone commit messages below are enough
to know what's done — read the actual diffs (`git log --oneline`, `git show <sha>`) for
the "how", not memory.

- [x] M1 — static shell + data (no interactivity)
- [x] M2 — song selection via ?song=
- [x] M3 — tab switching (Sheet/Fretboard/Ascii, no metronome)
- [x] M4 — metronome wiring + FretboardDiagram currentStep
- [ ] M5 — design tokens + restyle

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
