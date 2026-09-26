# Home page (`/`) — current state

Part of `app/status/` — see `app/STATUS.md` for the index.

Single-page UI: song-list sidebar + detail pane (Sheet/Fretboard/Ascii tabs, a
metronome mounted across all three, Spotify-backed cover art/artist that
degrades gracefully when a song has no match). Replaced an earlier two-page UI
(`/`, `/songs/[id]`) on 2026-09-10 — archived at `archive/v0.1-web-ui/` (git tag
`v0.1`); both old addresses now redirect to `/`. Full milestone-by-milestone
build history lives in git (`git log --oneline -- app/app/page.tsx
app/app/_components`), not here.

## Current architecture (locked, don't re-litigate without a new reason)

- No new npm dependencies for this UI — see `app/lib/cn.ts` instead of clsx/cva.
- Sidebar query is column-projected (no notes/tuning blobs); ordered by
  `desc(songs.createdAt)`; default selection = most recent; `?song=`
  invalid/stale falls back silently (no `notFound()`).
- Ascii tab gets no metronome sync, by design — not a bug.
- Tab/metronome state resets per song by design (key on song id).
- Spotify lookup happens once, at publish time (`pipeline/s05_publish`), not
  live in the browser — `app/lib/spotify.ts` (the old live-lookup client) is
  deleted; `spotifyArtist`/`spotifyUrl` are plain DB columns
  (`app/db/schema.ts`) read like any other song field. DB artist always wins
  over Spotify's when present. See
  `docs/plans/2026-09-18-spotify-lookup-at-publish-time/2026-09-18-spotify-lookup-at-publish-time.md`
  for why.

## Known follow-ups (not yet done)

- AsciiView has no per-step structure / currentStep support (thin wrapper
  only).
- FretboardDiagram's hardcoded color palette (SVG stroke/fill hex values) is
  untouched.
- No loading/error UI.
