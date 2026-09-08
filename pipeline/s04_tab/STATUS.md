# s04_tab

**Status:** done, with one decision flagged for review (not a silent choice — see `docs/specs/pipeline-04-tab.md`). Wraps `tuttut` to turn a run's `notes.json` into tab data conforming to `contracts/tab.schema.json`. This is the final stage of the audio-processing → guitar-logic pipeline; nothing downstream exists yet (database, app).

**Reads:** `pipeline_runs/<run-id>/notes.json` (Contract A), written by `s03_transcribe`.

**Writes:**
- `pipeline_runs/<run-id>/tab.json` — **contract-bound**, matches `contracts/tab.schema.json` exactly (validated against the real schema file in tests).
- `pipeline_runs/<run-id>/tab.txt` — human-readable ASCII tab (standard layout, `e` on top, no timing shown), the default display per `DECISIONS.md`.

**⚠️ Flagged for your review, not a `contracts/` change:** the contract requires `startTimeSec`/`durationSec` per note. `startTimeSec` is the real transcribed onset time. `durationSec` is **approximated as "time until the next note/chord"** — `tuttut`'s fingering algorithm doesn't track true note-off timing the way the original transcription did, and exact recovery would need fragile pitch/time matching for precision this project doesn't need (confirmed acceptable: tempo/rhythm is the human's job when practicing, not the tab's — see `DECISIONS.md`). This part is still an open approximation, not fixed.

**`tempoBpm` — fixed (2026-09-08).** Originally estimated via `pretty_midi.estimate_tempo()` on the sparse transcribed notes — badly unreliable (214.51bpm on Mister Sandman's real ~112-113bpm). Replaced with real beat-tracking (`librosa.beat.beat_track`) on the run's actual source audio. Confirmed accurate against two known tempos: Seven Nation Army (~124bpm known, got 123.05) and Mister Sandman (~112-113bpm per the artist's own recording, got 112.35). `tempoBpm` now matters for real — it's what a future metronome feature will use, per explicit direction — so this needed to be genuinely reliable, not just "good enough to not block other work."

**Files:** `tab_generate.py` (module + CLI), `test_tab_generate.py` (pytest — validates against the real contract schema, and checks the tuttut→schema string-index/tuning-direction conversion round-trips a known pitch correctly).

**Run it:** `.venv/bin/python pipeline/s04_tab/tab_generate.py <run-dir>`
**Test it:** `.venv/bin/pytest pipeline/s04_tab/test_tab_generate.py`

**Direction conversion, worth remembering:** `tuttut`'s internal convention is thin-string-first (index 0 = high e); the schema's is low-string-first (index 0 = low E, per the schema's own description). This stage reverses both the tuning array and each note's string index. Verified correct on the real Mister Sandman run: tuning came out `[40, 45, 50, 55, 59, 64]`, an exact match for the schema's own documented example (standard tuning E2 A2 D3 G3 B3 E4).

**Same importlib note as prior stages** if reusing this module elsewhere.
