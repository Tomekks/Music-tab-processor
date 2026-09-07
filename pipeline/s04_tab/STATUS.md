# s04_tab

**Status:** done, with one decision flagged for review (not a silent choice — see `docs/specs/pipeline-04-tab.md`). Wraps `tuttut` to turn a run's `notes.json` into tab data conforming to `contracts/tab.schema.json`. This is the final stage of the audio-processing → guitar-logic pipeline; nothing downstream exists yet (database, app).

**Reads:** `pipeline_runs/<run-id>/notes.json` (Contract A), written by `s03_transcribe`.

**Writes:**
- `pipeline_runs/<run-id>/tab.json` — **contract-bound**, matches `contracts/tab.schema.json` exactly (validated against the real schema file in tests).
- `pipeline_runs/<run-id>/tab.txt` — human-readable ASCII tab (standard layout, `e` on top, no timing shown), the default display per `DECISIONS.md`.

**⚠️ Flagged for your review, not a `contracts/` change:** the contract requires `startTimeSec`/`durationSec` per note. `startTimeSec` is the real transcribed onset time. `durationSec` is **approximated as "time until the next note/chord"** — `tuttut`'s fingering algorithm doesn't track true note-off timing the way the original transcription did, and exact recovery would need fragile pitch/time matching for precision this project doesn't need. `tempoBpm` is estimated via `pretty_midi.estimate_tempo()` — a rough heuristic (214.51 bpm came out for Mister Sandman's real ~100–120 bpm on the actual run — clearly not reliable yet, flagging honestly rather than hiding it). Full reasoning in the spec file.

**Files:** `tab_generate.py` (module + CLI), `test_tab_generate.py` (pytest — validates against the real contract schema, and checks the tuttut→schema string-index/tuning-direction conversion round-trips a known pitch correctly).

**Run it:** `.venv/bin/python pipeline/s04_tab/tab_generate.py <run-dir>`
**Test it:** `.venv/bin/pytest pipeline/s04_tab/test_tab_generate.py`

**Direction conversion, worth remembering:** `tuttut`'s internal convention is thin-string-first (index 0 = high e); the schema's is low-string-first (index 0 = low E, per the schema's own description). This stage reverses both the tuning array and each note's string index. Verified correct on the real Mister Sandman run: tuning came out `[40, 45, 50, 55, 59, 64]`, an exact match for the schema's own documented example (standard tuning E2 A2 D3 G3 B3 E4).

**Same importlib note as prior stages** if reusing this module elsewhere.
