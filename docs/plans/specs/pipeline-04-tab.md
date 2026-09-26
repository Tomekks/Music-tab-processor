# Task spec: pipeline/s04_tab

## Goal
Wrap `tuttut` to turn a run's transcribed notes into tab data conforming to `contracts/tab.schema.json` (Contract B: guitar logic → UI/database), plus a human-readable ASCII rendering as the default display (per `DECISIONS.md`'s "display modes are layered, ASCII is the default" decision).

## Reads
- `pipeline_runs/<run-id>/notes.json`, written by `s03_transcribe` (Contract A).

## Writes
- `pipeline_runs/<run-id>/tab.json` — conforms to `contracts/tab.schema.json`: `{"schemaVersion", "title", "sourceFile", "tuning", "tempoBpm", "notes": [{"string", "fret", "startTimeSec", "durationSec"}]}`.
- `pipeline_runs/<run-id>/tab.txt` — ASCII tab (standard left-to-right-per-string layout, chords stacked, `e` on top by default — see `research/00_spike/tuttut_clean_tab.py`), rendered from the same underlying data, with no timing shown.

## A decision made while implementing this, flagged for review, not a contract change
The earlier flagged tension — Phase 0 concluded per-note timing isn't useful for *reading* a tab, but `contracts/tab.schema.json` requires exact `startTimeSec`/`durationSec` — turned out to have a clean resolution once actually building this stage: `tuttut`'s fingering-assignment step still has access to each note's real transcribed start time before it picks a string/fret (it's just not shown in the ASCII rendering). So:
- `startTimeSec` in `tab.json` is the note's **real** transcribed onset time — not a placeholder.
- `durationSec` is **approximated as "time until the next step"** (the next note or chord), since `tuttut`'s fingering algorithm doesn't track individual note-off times the way the original transcription did, and precisely recovering it would mean fragile pitch/time matching back against `notes.json` for a level of precision this project doesn't need (per "recognizable, not accurate"). The last note in a piece gets a fixed fallback duration. This is a real approximation, not exact — worth knowing if a future playback feature is built directly on this field.
- **No `contracts/tab.schema.json` change was made.** This resolves the tension without one — flagging the approach for review rather than treating it as decided, since it wasn't reached via the usual back-and-forth.
- `tempoBpm` (required by the schema) is estimated via `pretty_midi`'s `estimate_tempo()` — a heuristic based on note-onset patterns, not authoritative. Worth knowing it's a best-effort value, not a measured one.
- String-index and tuning-array direction: `tuttut`'s internal convention is thin-string-first (index 0 = high e); the schema's is low-string-first (index 0 = low E, per its own description). This stage converts between them — worth double-checking if this ever looks backwards.

## Constraints
- No new dependency — `tuttut` already installed (with its `--no-deps` workaround from Phase 0) and validated.
- Output must actually validate against `contracts/tab.schema.json` (checked in tests via `jsonschema`, same as `s03_transcribe`), not just look similar to it.

## Done when
- [x] `pipeline/s04_tab/tab_generate.py` exists with a callable `generate_tab(run_dir)` function plus a CLI entry point.
- [x] Running it against the Mister Sandman run directory produces a `tab.json` that validates against `contracts/tab.schema.json` (confirmed with `jsonschema.validate`), and a readable `tab.txt`. Tuning came out `[40, 45, 50, 55, 59, 64]` — an exact match for the schema's own documented standard-tuning example, confirming the direction conversion is correct. 1017 notes.
- [x] A test exists (`pipeline/s04_tab/test_tab_generate.py`, pytest) checking: output validates against the real schema file, and a known A4 (MIDI 69) note round-trips correctly through the assigned string/fret and returned tuning array. 3/3 pass.
- [x] `pipeline/s04_tab/STATUS.md` updated, including the timing-approximation and tempo-estimation notes above.
