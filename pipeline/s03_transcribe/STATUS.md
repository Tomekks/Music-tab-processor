# s03_transcribe

**Status:** done. Wraps Basic Pitch to transcribe `stems/other.wav` into notes conforming to `contracts/notes.schema.json`. All 3 tests pass. See `docs/specs/pipeline-03-transcribe.md`.

**Correction (2026-09-08):** a same-day entry here previously claimed this stage was "blocked" — that Basic Pitch 0.4.0 requires `--save-midi` to write a MIDI file, and that the implementation's omission of that flag failed 2 tests. That was a misdiagnosis, never actually confirmed by re-running the suite. Re-verified the same day: `.venv/bin/pytest pipeline/s03_transcribe/` passes 3/3, `.venv/bin/pytest pipeline/` passes 12/12, and manually invoking `basic-pitch` without `--save-midi` does create a `.mid` file on this install. A fresh end-to-end run on the real "Mister Sandman" file (not just the synthetic test fixture) produced 1018 notes with the same first-three-note pitches/timings as two independently-verified 2026-09-07 runs (1017 and 1022 notes) — consistent with normal run-to-run variance, not a regression. `transcribe.py` was never modified; nothing needed fixing. Leaving this note here rather than deleting the incident, so the correction is visible.

**Reads:** `pipeline_runs/<run-id>/stems/other.wav`, written by `s02_separate`.

**Writes:**
- `pipeline_runs/<run-id>/notes.json` — **contract-bound**, matches `contracts/notes.schema.json` exactly (validated in tests against the real schema file, not an assumed copy of its shape).
- `pipeline_runs/<run-id>/transcription.mid` — the raw MIDI, kept for listening/debugging. Not part of any contract.

**Files:** `transcribe.py` (module + CLI), `test_transcribe.py` (pytest — a clean 440Hz sine tone fixture, which correctly transcribes to exactly one MIDI-69/A4 note; also validates against the real contract schema, not a hand-copied shape).

**Run it:** `.venv/bin/python pipeline/s03_transcribe/transcribe.py <run-dir>`
**Test it:** `.venv/bin/pytest pipeline/s03_transcribe/test_transcribe.py`

**New dependency:** `jsonschema` (small, standard) — added specifically so tests validate against the actual `contracts/*.schema.json` files rather than an assumed shape, per `AGENTS.md`'s reliability toolkit.

**Two gotchas found and fixed:**
- Same as `s02_separate`: `basic-pitch` is a `.venv`-local binary, resolved relative to `sys.executable`.
- Unlike `demucs`, `basic-pitch`'s CLI does **not** create its own output directory — it must already exist, or it errors. `mkdir(exist_ok=True)` before invoking it.

**Same importlib note as prior stages** if reusing this module elsewhere.
