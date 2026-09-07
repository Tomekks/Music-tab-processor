# 01_ingest

**Status:** done. Validates a local audio file and sets up its per-run working directory. See `docs/specs/pipeline-01-ingest.md` for the full task spec.

**Reads:** a local audio file path (any format `ffmpeg`/`ffprobe` can read). No `contracts/` schema applies — this stage is internal to the "audio processing" module (see `AGENTS.md`); only 03_transcribe's output has to match a contract.

**Writes:** `pipeline_runs/<run-id>/` (repo root, gitignored — contains a copy of source audio, never published):
- `source.<ext>` — a copy of the input file (never the original — copy, not move).
- `metadata.json` — `{"runId", "title", "sourceFile", "durationSec", "sampleRate", "channels", "ingestedAt"}`.

**Files:** `ingest.py` (the module + CLI), `test_ingest.py` (pytest, uses a synthetic sine-tone fixture — never real/copyrighted audio).

**Run it:** `.venv/bin/python pipeline/01_ingest/ingest.py <path> [--title "..."]`
**Test it:** `.venv/bin/pytest pipeline/01_ingest/test_ingest.py`

**Note for a later stage that wants to reuse this module:** `01_ingest` isn't a valid Python package name (identifiers can't start with a digit) — load `ingest.py` via `importlib.util.spec_from_file_location`, not a normal `import` statement. See `test_ingest.py` for the pattern.
