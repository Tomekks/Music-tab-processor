# Task spec: pipeline/s02_separate

## Goal
Take a run directory set up by `s01_ingest` and separate its source audio into stems using `htdemucs` (the tool settled on in Phase 0 — see `docs/AUDIOPROCESSINGTOOLS.md`), writing the stems back into that same run directory for `s03_transcribe` to read.

## Reads
- `pipeline_runs/<run-id>/source.<ext>` and `metadata.json`, both written by `s01_ingest`. This stage's whole interface is the run directory — it doesn't take a raw file path, it takes a run-id/run-dir. No `contracts/` schema applies (internal to "audio processing").

## Writes
- `pipeline_runs/<run-id>/stems/{drums,bass,other,vocals}.wav` — `htdemucs`'s standard 4 stems. All 4 are written (the model produces them together regardless), even though only `other.wav` is what `s03_transcribe` actually needs right now.
- `pipeline_runs/<run-id>/separation.json` — `{"model": "htdemucs", "stems": {...paths...}, "separatedAt"}`. A separate file, not appended into `s01_ingest`'s `metadata.json` — keeps each stage owning only what it writes.

## Constraints
- No new dependency — `demucs` is already installed and validated in `.venv` from Phase 0.
- **Network flag, same as Phase 0:** if the model weights aren't already cached (a different machine, or a cleared cache), this triggers a ~89MB download from Hugging Face Hub on first run — already documented behavior, not new, but worth restating since it's a real network request.
- `demucs`'s own CLI writes to `<output_dir>/htdemucs/<track_name>/*.wav` (`track_name` derived from the input filename, i.e. "source" since that's what `s01_ingest` names it) — this stage moves those files into our own `stems/` convention afterward, it doesn't try to make `demucs` write there directly.
- **On testing an ML stage:** per `AGENTS.md`'s reliability toolkit, an ML pipeline stage's test is a structural/golden-file check, not exact-output comparison — real model output can vary slightly across library versions/hardware, so the test verifies *shape* (4 stem files exist, non-empty, correct sample rate, duration matches input) rather than byte-exact audio content.

## Done when
- [ ] `pipeline/s02_separate/separate.py` exists with a callable `separate(run_dir)` function (loadable via `importlib`, same pattern as `s01_ingest` — "s02_separate" has the same digit-first naming issue) plus a CLI entry point.
- [ ] Running it against the Mister Sandman run directory (from `s01_ingest`) produces correct `stems/*.wav` files and a correct `separation.json`.
- [ ] Running it against a run directory with no `source.*` file fails clearly.
- [ ] A test exists (`pipeline/s02_separate/test_separate.py`, pytest) using a short synthetic audio fixture, checking the 4 stem files exist/are non-empty/have matching sample rate and duration. Test passes.
- [ ] `pipeline/s02_separate/STATUS.md` updated.
