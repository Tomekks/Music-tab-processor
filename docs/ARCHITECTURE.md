# Architecture

**This file only describes what has actually been built and tested.** See "Target design" below for what's planned but not yet real — nothing there should be read as already running. For the reasoning behind any of this, see `docs/DECISIONS.md`.

A non-Claude-specific version of the pipeline diagram is inline below (Mermaid, renders natively on GitHub). A live, interactive version also exists — **Signal Path** — https://claude.ai/code/artifact/cc33502d-4b23-442b-81c1-0afd1a0d12b5 — but that's a Claude-specific hosted page, not guaranteed readable by every AI or every session; treat it as a bonus visual, not the source of truth. This file is.

## Validated so far

**The full pipeline was verified end-to-end, from a local audio file to a real tab shown on a real (if basic) web page, reading from a real hosted database.** This is genuinely real code now — not spike scripts or a plan. The current Basic Pitch CLI invocation has a known regression recorded below and in `pipeline/s03_transcribe/STATUS.md`; it must be fixed before claiming the current checkout passes its full pipeline test suite.

- **`pipeline/s01_ingest` → `s05_publish`**: five real Python stages. Ingest validates a local audio file; `s02_separate` runs `htdemucs` (settled choice — `htdemucs_6s` and `mlx-demucs` were both tried and came out no better, see `docs/AUDIOPROCESSINGTOOLS.md`); `s03_transcribe` runs Basic Pitch, writing `contracts/notes.schema.json`-conforming output; `s04_tab` runs `tuttut`, writing `contracts/tab.schema.json`-conforming output plus a human-readable ASCII tab; `s05_publish` writes the finished tab into the hosted database. As of 2026-09-08, 10 pipeline tests pass and 2 `s03_transcribe` tests fail because the current Basic Pitch CLI invocation omits `--save-midi`; `s05_publish` also still lacks a test. Full manual walkthrough: `pipeline/VERIFY.md`.
- **Tempo is now real beat-tracking (`librosa`), not a note-pattern guess.** Confirmed against two known songs: Seven Nation Army (well-known ~124bpm, got 123.05) and Mister Sandman (artist's actual ~112-113bpm, got 112.35). The original approach (guessing from sparse transcribed notes) produced 214.51bpm on the same song — badly wrong. Per-note `durationSec` is still an approximation ("until the next note") — deliberately, since exact note-off timing isn't something a human practicing by ear needs (see `DECISIONS.md`).
- **Database — Turso** (hosted, libSQL/SQLite-compatible), accessed via **Drizzle ORM** for portability (swapping the underlying database later is a config change, not a rewrite — same "swappable components" principle as the audio pipeline). One table (`songs`): title, tempo, tuning, and the tab's notes as JSON. Never audio, stems, or MIDI — same copyright reasoning as everywhere else.
- **App — Next.js** (`app/`, TypeScript, Tailwind, App Router): a homepage listing published songs and a per-song page rendering the ASCII tab, reading live from Turso. **Deployed and live** at https://app-six-psi-70.vercel.app (2026-09-08) — confirmed rendering real data from the database on the actual public URL, not just locally.
- **Not yet built:** the local web UI for triggering pipeline runs (still file-path-based CLI commands), playback/metronome/visual note-highlighting, difficulty grading, `yt-dlp` ingestion. The first security review of the public app is complete; a fresh review is required if its externally reachable shape changes (see `docs/PENDING_ACTIONS.md`).

```mermaid
flowchart TD
    A[Audio file] -->|tested| B["s02_separate: htdemucs\n(drums/bass/other/vocals)"]
    B -->|tested| C["s03_transcribe: Basic Pitch\n(notes.schema.json)"]
    C -->|tested| D["s04_tab: tuttut\n(tab.schema.json)"]
    D -->|tested| E["s05_publish -> Turso DB"]
    E -->|tested| F["Next.js app\n(reads DB, renders tab)"]
    F -->|deployed| G[Vercel hosting]

    classDef tested fill:#2e7d32,stroke:#1b5e20,color:#fff
    classDef untested fill:#616161,stroke:#424242,color:#fff,stroke-dasharray: 4 3
    class A,B,C,D,E,F,G tested
```

## Target design (what's still planned)

- **A local web UI for triggering pipeline runs** (pick a file, click a button) instead of the current 5 manual CLI commands — backlogged, resources gathered (see `DECISIONS.md`).
- **Playback, metronome, visual note-highlighting during practice** — backlogged, real tempo data now exists to build this on top of.
- **Difficulty grading, `yt-dlp` ingestion, Spotify metadata lookup** — all explicitly backlogged, see `DECISIONS.md` for why each one specifically.

**Why two contracts, not one:** audio processing produces plain musical notes (`contracts/notes.schema.json`) — no guitar concept at all, just pitch/time/duration. Guitar logic turns that into string/fret choices (`contracts/tab.schema.json`). Splitting it this way is what makes "audio processing / guitar logic / UI stay separate" actually true instead of just stated: the audio module never needs to know a guitar exists. Both contracts are real, committed schemas and are read/written by the implemented stages.
