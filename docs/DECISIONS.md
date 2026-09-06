# Decisions

Condensed log of locked-in choices. See the planning notes for the full reasoning and alternatives considered.

- **Personal tool, also a portfolio piece.** No auth, no monetization, no export. GitHub from day one.
- **Local-first.** Processing pipeline runs only on the developer's Mac. A web app may be hosted publicly later (Vercel/Netlify free tier), reading from a shared database — the Mac is never made reachable from the internet to achieve this.
- **Database from day one** (local SQLite for now) — doubles as tab history, and is the mechanism that lets a later hosted app and the local pipeline "talk" without exposing anything.
- **Stack:** Next.js + TypeScript (frontend/app), Python (processing pipeline). Chosen partly because their popularity means small/free coding-agent models produce more reliable output in them.
- **Riff identification:** manual for v1 (mark the section yourself) — deliberate, to learn the process, not to automate it away.
- **Backlog, not in scope yet:** difficulty grading, Spotify metadata lookup, "check if tabs exist online," YouTube-link ingestion (`yt-dlp`).
- **Playback:** synthesized version of the transcribed notes, with an adjustable metronome — not the original recording.
- **Component choices for Phase 0:** separation = `htdemucs` (compare `mlx-demucs` for speed once running); transcription = Basic Pitch (MT3 as a documented swap-in); tab generation = `tuttut` (`open-fret` as a documented swap-in once it matures). Each swap point sits behind a clean interface so adding an alternative later is a small, isolated task — implemented one at a time, only when there's a real reason, each preceded by a fresh research pass on that specific alternative.
- **Reliability toolkit for cheap/free coding-agent models:** the two `contracts/` schemas checked as real files (not just described in comments), a test written alongside every task, lint + a CI check on every commit, small scoped commits, explicit "done when" criteria per task spec, and periodic "walk tests."
