# Tools registry

A running catalog of tools found for each pipeline stage, whether we've tried them, and what we thought. Purpose: **don't re-research what's already been found.** Before starting a research pass on a stage, check the matching file in `docs/audio-tools/` first. Per `AGENTS.md`, still do a fresh pass before actually adopting anything — "not tried" or an old date there is the signal that the pass hasn't been done *yet*, not a substitute for doing it.

**This file is an index, not the catalog itself** — the actual tool-by-tool tables live in `docs/audio-tools/`. **This file must stay an index.** New tool entries or re-assessments go into the matching stage file — not appended here.

Status values used throughout: **tried** (ran it, have an assessment) · **found** (identified, not run) · **backlog** (deliberately deferred, see `docs/DECISIONS.md`).

## Stage index

**Source separation** (audio → stems) — `htdemucs` is the settled default; `htdemucs_6s` and `mlx-demucs` were both tried and came out no better. *Open if researching or swapping the separation stage.* → `docs/audio-tools/separation.md`

**Transcription** (audio/stems → notes) — Basic Pitch is the current stage, only env-sanity-tested so far; MT3/MR-MT3 are known heavier fallbacks. *Open if researching or swapping the transcription stage.* → `docs/audio-tools/transcription.md`

**Tab generation** (notes → fret/string assignment) — `tuttut` is tried and working; `open-fret` is a documented future swap-in. *Open if researching or swapping the tab-generation stage.* → `docs/audio-tools/tab-generation.md`

**Ingestion** — `yt-dlp`, backlogged. *Open if picking up YouTube-link ingestion.* → `docs/audio-tools/ingestion.md`

## Maintaining this file and `docs/audio-tools/`

Update the relevant stage file — not just `research/00_spike/RESULTS.md` — whenever a tool is newly found, tried, or re-assessed. `RESULTS.md` records what happened in a specific checkpoint run; `docs/audio-tools/` is the standing "what do we know about our options" reference so the next research pass starts from there instead of from zero.
