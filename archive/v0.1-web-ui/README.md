# v0.1 web UI (archived, retired 2026-09-10)

This is the original two-page web UI — a song list at `/` linking to a per-song
detail page at `/songs/[id]` — that shipped first and ran live in production at
https://app-six-psi-70.vercel.app from 2026-09-09 until it was retired.

It was superseded by a redesigned single-page workspace (sidebar + detail pane,
built at `/studio`, then promoted to `/` itself — see `app/status/home-page.md`
for that build's full history). The two UIs were deliberately built side by side
for a while so they could be compared before committing to the new one; that
comparison phase is over.

**These files are historic reference only** — moved out of `app/`'s Next.js
project root (`git mv`, so their commit history is preserved via `git log
--follow`), no longer type-checked, linted, or built. They will not compile as-is
if copied back in without also restoring whatever shared code has since changed
underneath them.

**Full working state at retirement is tagged `v0.1`:** `git checkout v0.1` (or
`git show v0.1:app/app/page.tsx`, etc.) gets you the exact commit these files were
still live and building from, if you ever need to actually run this version again
rather than just read it.

## What's here

- `app/page.tsx` — the song list homepage.
- `app/songs/[id]/page.tsx` — the per-song detail page (Sheet/Fretboard/Ascii tabs
  via `app/components/SongTabs.tsx`, below).
- `app/components/SongTabs.tsx` — the tab switcher + metronome composition this
  version used. Everything *else* it depended on (`MetronomeControls.tsx`,
  `SheetDiagram.tsx`, `FretboardDiagram.tsx`, `useMetronome.ts`, `lib/tabNotation.ts`)
  is still live in `app/` — the new UI uses those same pieces directly, just
  composed differently, so they weren't archived.

Both `/songs/[id]` and the old `/studio` address now redirect to `/` rather than
404ing, for anyone who still has an old link.
