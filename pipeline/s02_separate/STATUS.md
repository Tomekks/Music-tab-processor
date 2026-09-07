# s02_separate

**Status:** done. Wraps `htdemucs` to separate a run's source audio into stems. See `docs/specs/pipeline-02-separate.md` for the full task spec.

**Reads:** `pipeline_runs/<run-id>/source.<ext>`, written by `s01_ingest`. No `contracts/` schema applies — internal to "audio processing".

**Writes:**
- `pipeline_runs/<run-id>/stems/{drums,bass,other,vocals}.wav`
- `pipeline_runs/<run-id>/separation.json` — `{"model", "stems": {name: relPath}, "separatedAt"}`

**Files:** `separate.py` (module + CLI), `test_separate.py` (pytest, synthetic sine-tone fixture, structural/golden-file style checks per `AGENTS.md`'s ML-stage testing guidance — not exact audio content).

**Run it:** `.venv/bin/python pipeline/s02_separate/separate.py <run-dir>`
**Test it:** `.venv/bin/pytest pipeline/s02_separate/test_separate.py`

**Gotcha found and fixed:** `demucs` is a `.venv`-local binary, not on the system `PATH` (unlike `ffmpeg`/`ffprobe`, which are global Homebrew installs) — a bare `subprocess.run(["demucs", ...])` fails with `FileNotFoundError` when this stage is invoked via its own script rather than an activated shell. Fixed by resolving the binary relative to `sys.executable`. Worth remembering for any future stage that shells out to a `.venv`-installed tool.

**Same importlib note as `s01_ingest`:** load via `importlib.util.spec_from_file_location` if reusing from another stage.
