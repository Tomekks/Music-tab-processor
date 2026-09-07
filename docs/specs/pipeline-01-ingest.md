# Task spec: pipeline/01_ingest

## Goal
Accept a local audio file, validate it's real/readable audio, and set up a per-run working directory that the rest of the pipeline (02_separate → 03_transcribe → 04_tab) reads from and writes into.

## Reads
- A local audio file path (any format `ffmpeg` can read — mp3/wav/m4a/flac, consistent with what Phase 0 already validated). No `contracts/` schema applies here — ingest → separate → transcribe are all internal to the "audio processing" module (per `AGENTS.md`); only transcribe's final output has to match `contracts/notes.schema.json`.
- Optionally, a display title (defaults to the filename without extension if not given).

## Writes
- A new per-run working directory at `pipeline_runs/<run-id>/` (repo root, gitignored — contains a copy of source audio, same copyright reasoning as `research/00_spike/audio/`). `<run-id>` is a slug of the title + a short timestamp (e.g. `mister-sandman-20260907-143012`), human-readable rather than a bare UUID, since this doubles as the eventual tab-history identifier once a database exists.
- Inside that directory:
  - `source.<original-extension>` — a copy of the input file (copy, not move — never touch the user's original file).
  - `metadata.json` — `{"runId", "title", "sourceFile" (original path), "durationSec", "sampleRate", "channels", "ingestedAt"}`, read via `ffprobe`.

## Constraints
- New dependency needed: `pytest` (not yet installed) — for the required test below. Flagging per usual practice before installing.
- Copy the file, never move or modify the user's original (per `AGENTS.md`: prefer additive/reversible; also just good manners with someone's personal files).
- Validation must reject: a missing file, a file with no readable audio stream, and (basic sanity) zero duration. Doesn't need to reject exotic-but-valid formats — `ffprobe` is the source of truth, not a hardcoded extension allowlist.
- No network access at all in this stage — purely local file handling.

## Done when
- [x] `pipeline/01_ingest/ingest.py` exists with a small, callable function (not just a script) doing the above, importable by later stages.
- [x] A CLI entry point exists (`.venv/bin/python pipeline/01_ingest/ingest.py <path> [--title "..."]`) for manual/spec-driven runs. Correction from the original spec: `python -m pipeline.01_ingest.ingest` isn't valid Python — `01_ingest` can't be a package name (identifiers can't start with a digit). Run as a direct script instead; a later stage reusing this module should load it via `importlib.util.spec_from_file_location`.
- [x] Running it against Mister Sandman produces a correct `pipeline_runs/<run-id>/` directory with `source.wav` and a correct `metadata.json`. (Used the `.wav` source, not `.m4a` — same song, doesn't matter which format for this check.)
- [x] Running it against a missing file or a non-audio file fails clearly (a real error, not a silent bad output).
- [x] A test exists (`pipeline/01_ingest/test_ingest.py`, pytest) covering: valid file succeeds, missing file raises, non-audio file raises, default-title behavior. 4/4 pass.
- [x] `pipeline/01_ingest/STATUS.md` updated: what it does, what it reads/writes (no contract — internal), current status (done).
- [x] `pipeline_runs/` added to `.gitignore` with the same copyright reasoning as the other audio exclusions.
