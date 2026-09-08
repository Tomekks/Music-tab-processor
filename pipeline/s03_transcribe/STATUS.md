# s03_transcribe

**Status:** blocked by a known test regression (2026-09-08). The stage wraps Basic Pitch to transcribe `stems/other.wav` into notes conforming to `contracts/notes.schema.json`, but Basic Pitch 0.4.0 now requires `--save-midi` for the CLI to create the MIDI this stage expects. The implementation does not pass that flag, so two tests fail even though Basic Pitch exits successfully. Fixing the invocation and re-running the suite is the next required task for this stage. See `docs/specs/pipeline-03-transcribe.md`.

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
