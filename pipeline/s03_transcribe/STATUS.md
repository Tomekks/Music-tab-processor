# s03_transcribe

**Status:** done. Wraps Basic Pitch to transcribe `stems/other.wav` + `stems/bass.wav` (mixed together) into notes conforming to `contracts/notes.schema.json`. All tests pass. See `docs/plans/2026-09-18-transcription-accuracy/pipeline-03-transcribe.md` for the original build spec (still describes `other.wav` alone -- see the 2026-09-18 update below for what changed since).

**Correction (2026-09-08):** a same-day entry here previously claimed this stage was "blocked" — that Basic Pitch 0.4.0 requires `--save-midi` to write a MIDI file, and that the implementation's omission of that flag failed 2 tests. That was a misdiagnosis, never actually confirmed by re-running the suite. Re-verified the same day: `.venv/bin/pytest pipeline/s03_transcribe/` passes 3/3, `.venv/bin/pytest pipeline/` passes 12/12, and manually invoking `basic-pitch` without `--save-midi` does create a `.mid` file on this install. A fresh end-to-end run on the real "Mister Sandman" file (not just the synthetic test fixture) produced 1018 notes with the same first-three-note pitches/timings as two independently-verified 2026-09-07 runs (1017 and 1022 notes) — consistent with normal run-to-run variance, not a regression. `transcribe.py` was never modified; nothing needed fixing. Leaving this note here rather than deleting the incident, so the correction is visible.

**Update (2026-09-18): other+bass stem mix, tuned thresholds.** Full-band songs (Seven Nation Army, Shame) transcribed on `other.wav` alone at Basic Pitch's defaults, reported directly as "too many notes, can't recognize the song" (741 notes for Seven Nation Army). Root-caused via a same-session spike, by ear, against Seven Nation Army's real stems (full history: `docs/plans/2026-09-18-transcription-accuracy/2026-09-18-transcription-accuracy.md`) — raising thresholds alone doesn't fix *which* notes get detected, only how many; the real fix was mixing in the `bass` stem (recovers guitar-reinforcing signal Demucs's separation otherwise strips) and a validated, less-strict-than-you'd-guess threshold/frequency combination. This is a global default now (`ONSET_THRESHOLD`/`FRAME_THRESHOLD`/`MINIMUM_FREQUENCY_HZ`/`MAXIMUM_FREQUENCY_HZ` constants in `transcribe.py`), not per-song-tuned — Mister Sandman (simple acoustic solo guitar) already transcribed well before this change and wasn't part of the tuning, so re-verify it still sounds right if these constants are ever revisited.

**Reads:**
- `pipeline_runs/<run-id>/stems/other.wav`, written by `s02_separate`.
- `pipeline_runs/<run-id>/stems/bass.wav`, written by `s02_separate` (new as of 2026-09-18 — previously unused by this stage).

**Writes:**
- `pipeline_runs/<run-id>/notes.json` — **contract-bound**, matches `contracts/notes.schema.json` exactly (validated in tests against the real schema file, not an assumed copy of its shape). `sourceFile` is now a descriptive identifier ("stems/other.wav + stems/bass.wav (mixed)"), not a literal path — the schema documents this field as "path or identifier," and the actual mixed input file is a cleaned-up temp file, not something that persists.
- `pipeline_runs/<run-id>/transcription.mid` — the raw MIDI, kept for listening/debugging. Not part of any contract.

**Files:** `transcribe.py` (module + CLI), `test_transcribe.py` (pytest — a clean 440Hz sine tone + silent bass fixture; also validates against the real contract schema, not a hand-copied shape).

**Run it:** `.venv/bin/python pipeline/s03_transcribe/transcribe.py <run-dir>`
**Test it:** `.venv/bin/pytest pipeline/s03_transcribe/test_transcribe.py`

**New dependency (2026-09-08):** `jsonschema` (small, standard) — added specifically so tests validate against the actual `contracts/*.schema.json` files rather than an assumed shape, per `AGENTS.md`'s reliability toolkit. No new dependency as of the 2026-09-18 update -- `ffmpeg` was already a required system tool (`s01_ingest` already shells out to `ffprobe` from the same install).

**Gotchas found and fixed:**
- Same as `s02_separate`: `basic-pitch` is a `.venv`-local binary, resolved relative to `sys.executable`.
- Unlike `demucs`, `basic-pitch`'s CLI does **not** create its own output directory — it must already exist, or it errors. `mkdir(exist_ok=True)` before invoking it.
- (2026-09-18) The temp mixed-input file and Basic Pitch's raw output dir are now cleaned up in a `finally` block, not unconditionally at the end — a failed `basic-pitch` run no longer leaves `_transcribe_input.wav` behind.

**Same importlib note as prior stages** if reusing this module elsewhere.
