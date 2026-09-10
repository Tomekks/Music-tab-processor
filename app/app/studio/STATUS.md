# /studio build status

Full plan: see the approved plan this build follows (component signatures, layout
mechanism, data-fetching plan, per-milestone verification steps). If that plan file is
no longer available, this checklist plus the milestone commit messages below are enough
to know what's done — read the actual diffs (`git log --oneline`, `git show <sha>`) for
the "how", not memory.

- [x] M1 — static shell + data (no interactivity)
- [ ] M2 — song selection via ?song=
- [ ] M3 — tab switching (Sheet/Fretboard/Ascii, no metronome)
- [ ] M4 — metronome wiring + FretboardDiagram currentStep
- [ ] M5 — design tokens + restyle

Currently mid-milestone: none.
Last verified working state: M1 (2026-09-10) -- /studio renders the real sidebar (1
song in the DB today: "Mister Sandman") + static header from real DB data; page itself
does not scroll (confirmed via scrollHeight === innerHeight), the placeholder tab-diagram
region scrolls independently while the header stays pinned (confirmed via a direct
scrollTop test against the header's bounding rect). tsc/eslint clean. Not yet tested:
actually clicking between two different songs (only one song exists in the dev DB right
now) -- covered structurally by M2's `?song=` resolution logic in page.tsx, but worth a
real click-through once there's more than one song, or trust M2's own verification pass.

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
