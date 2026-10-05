# Task spec: pipeline/s03_transcribe

## Goal
Wrap Basic Pitch to transcribe a run's `other` stem into notes, writing output that conforms to `contracts/notes.schema.json` (Contract A: audio processing → guitar logic) — the first stage in this pipeline whose output is bound by an actual contract.

## Reads
- `pipeline_runs/<run-id>/stems/other.wav`, written by `s02_separate`.

## Writes
- `pipeline_runs/<run-id>/notes.json`, conforming exactly to `contracts/notes.schema.json`: `{"schemaVersion": "1.0.0", "sourceFile", "notes": [{"pitchMidi", "startTimeSec", "durationSec", "velocity"}]}`. This is the first real, contract-conforming pipeline output — worth double-checking it validates against the actual schema file, not just eyeballing the shape.
- `pipeline_runs/<run-id>/transcription.mid` — the raw MIDI Basic Pitch produces, kept alongside the JSON for listening/debugging (Phase 0 found this genuinely useful for judging quality by ear). Not part of any contract, just a convenience artifact.

## Constraints
- No new dependency — `basic-pitch` already installed and validated from Phase 0 (including its known environment fixes: `setuptools<81`, `jaraco.text`).
- Same gotcha as `s02_separate`: `basic-pitch` is a `.venv`-local binary, not on `PATH` — resolve relative to `sys.executable`, same pattern.
- This stage's output is genuinely contract-bound, unlike `s01`/`s02` — the JSON must actually match `contracts/notes.schema.json`, not just look similar to it.
- Per Phase 0's Checkpoint 2 finding: transcription quality varies a lot by song complexity (works well on simple acoustic material, struggles on dense full-band songs). This stage doesn't need to solve that — it just needs to correctly wrap whatever Basic Pitch produces into the contract shape. Quality judgment stays a human/ear task, same as Phase 0.

## Done when
- [x] `pipeline/s03_transcribe/transcribe.py` exists with a callable `transcribe(run_dir)` function plus a CLI entry point.
- [x] Running it against the Mister Sandman run directory produces a `notes.json` that validates against `contracts/notes.schema.json` (confirmed with `jsonschema.validate`, not eyeballed) and a `transcription.mid`. 1022 notes detected.
- [x] A test exists (`pipeline/s03_transcribe/test_transcribe.py`, pytest) using a synthetic audio fixture, checking: output validates against the actual schema file, `notes` is non-empty and correct (a clean 440Hz tone correctly transcribes to exactly one MIDI-69/A4 note). 3/3 pass.
- [x] `pipeline/s03_transcribe/STATUS.md` updated.

**Two gotchas found during implementation:** `basic-pitch` is a `.venv`-local binary (same fix as `s02_separate`'s `demucs` issue); unlike `demucs`, `basic-pitch`'s CLI does not create its own output directory and errors if it doesn't already exist.
