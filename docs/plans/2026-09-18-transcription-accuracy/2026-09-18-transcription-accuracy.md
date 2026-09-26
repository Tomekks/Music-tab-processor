# Transcription Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pipeline/s03_transcribe` transcribe the `other`+`bass` separated stems mixed together (instead of `other` alone), with Basic Pitch thresholds tuned to a validated, less-noisy setting — fixing the "too many notes, can't recognize the song" problem reported for Seven Nation Army and Shame, without touching Mister Sandman's already-working transcription.

**Architecture:** `transcribe.py` gains one small ffmpeg-based helper that mixes `stems/other.wav` + `stems/bass.wav` into a temp file, and the Basic Pitch CLI invocation gets four new flags (`--onset-threshold 0.55 --frame-threshold 0.35 --minimum-frequency 65 --maximum-frequency 1500`) whose values were empirically tuned by ear this session (see the spike history below) — not guessed, not the tool's defaults. Everything downstream (`notes.json`'s shape, `contracts/notes.schema.json`, `s04_tab` onward) is unaffected — this only changes what goes *into* Basic Pitch, not the shape of what comes out.

**Spike history (why these exact values, not a placeholder):** tested on Seven Nation Army's real separated stems, by ear, this session:
- Baseline (`other.wav` alone, Basic Pitch defaults: onset 0.5, frame 0.3, no frequency bounds): 741 notes, unrecognizable — too dense.
- `other.wav` alone, stricter thresholds (onset 0.7, frame 0.5, min-length 100ms): 247 notes, still unrecognizable — thresholds alone don't fix which notes get *detected*, only how many.
- Full mix (original unseparated audio, Basic Pitch defaults): 1065 notes, **judged more recognizable** than either `other.wav` version — confirms `research/00_spike/RESULTS.md` Checkpoint 2's earlier finding that separation was removing useful signal, not just interference.
- Full mix + the same strict thresholds as above: 321 notes, **too aggressive** — judged as missing real notes.
- Full mix + lighter thresholds (onset 0.6, frame 0.4, min-length 60ms): 819 notes, **still missing a little**.
- Full mix + onset 0.55/frame 0.35 only (default min-length): 758 notes, **judged "alright."**
- `other.wav` + `bass.wav` mixed (not full mix — leaves vocals out) + onset 0.55/frame 0.35 + frequency range 65-1500Hz: 670 notes, **judged "slightly better"** than the full-mix version above, small acceptable tradeoff (a few notes possibly missing). **This is the combination this plan implements.**

**Tech Stack:** Python (existing pipeline stage), `ffmpeg` CLI (already a hard dependency of this pipeline per `pipeline/s01_ingest/ingest.py`'s own `ffprobe` use — no new dependency), `basic-pitch` CLI (already used, just new flags), `pytest` (existing test suite for this stage).

**Spec:** No separate spec file — classified as a **bounded** task (existing, well-scoped pipeline stage) during `superpowers:brainstorming`; the design was approved in-chat and is fully captured here.

## Global Constraints

- Only touch `pipeline/s03_transcribe/transcribe.py`, `pipeline/s03_transcribe/test_transcribe.py`, `pipeline/s03_transcribe/STATUS.md`. No other pipeline stage, no `contracts/*.schema.json` file, no `app/` code.
- `notes.json`'s output shape must keep validating against `contracts/notes.schema.json` exactly as before — this is a Contract A output, per `AGENTS.md`'s rule that contract changes are their own explicit task, which this isn't.
- No new Python dependencies. `ffmpeg` is already a required system tool for this project.
- `.venv/bin/pytest pipeline/ -v` must still pass 12/12 (or more, with the new tests added here) before this is done.

---

### Task 1: Mix `other`+`bass` stems and add tuned Basic Pitch thresholds

**Files:**
- Modify: `pipeline/s03_transcribe/transcribe.py` (whole-file rewrite — small file, clearer to review as one unit)
- Modify: `pipeline/s03_transcribe/test_transcribe.py`

**Interfaces:**
- Consumes: nothing new externally — still just a `run_dir` with `stems/other.wav` (from `s02_separate`), now also requires `stems/bass.wav` (which `s02_separate` already always produces — see its own `STATUS.md`, four stems: drums/bass/other/vocals).
- Produces: `transcribe(run_dir)` — same return shape as before (`{"schemaVersion", "sourceFile", "notes", "runDir"}`), same `notes.json`/`transcription.mid` files written. Only the internal input to Basic Pitch and the four threshold flags change; `s04_tab` (Task 3's caller) is unaffected and untouched.

- [ ] **Step 1: Write the failing tests first**

Replace the full contents of `pipeline/s03_transcribe/test_transcribe.py` with:

```python
"""
Tests for pipeline/s03_transcribe/transcribe.py.

Uses a synthetic 440Hz sine tone (never real/copyrighted audio) as the
fixture -- a clean, unambiguous test signal: it should transcribe to
exactly one note at MIDI pitch 69 (A4), which is what real runs confirm
Basic Pitch actually does. Also validates output against the real
contracts/notes.schema.json file, not an assumed copy of its shape.

bass.wav in the fixture is silent (all-zero samples) rather than another
tone -- mixed with the sine tone via amix, silence doesn't change the
detected pitch, so the existing pitch assertions stay meaningful while
still exercising the real other+bass mixing path (2026-09-18, see
STATUS.md for why this pipeline mixes the two stems now).

Run with: .venv/bin/pytest pipeline/s03_transcribe/test_transcribe.py
"""
import importlib.util
import json
import math
import struct
import wave
from pathlib import Path

import jsonschema
import pytest

_spec = importlib.util.spec_from_file_location("transcribe", Path(__file__).parent / "transcribe.py")
transcribe_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(transcribe_module)
transcribe = transcribe_module.transcribe
REPO_ROOT = transcribe_module.REPO_ROOT

A4_MIDI_PITCH = 69


def _write_wav(path, sample_rate, n_samples, sample_fn):
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = b"".join(struct.pack("<h", sample_fn(i)) for i in range(n_samples))
        wf.writeframes(frames)


@pytest.fixture
def run_dir_with_stems(tmp_path):
    """A fake run directory with a clean 440Hz (A4) sine tone as stems/other.wav
    and silence as stems/bass.wav -- both required now (see transcribe.py)."""
    run_dir = tmp_path / "test-run"
    (run_dir / "stems").mkdir(parents=True)

    sample_rate = 44100
    duration_sec = 2.0
    n_samples = int(sample_rate * duration_sec)
    _write_wav(
        run_dir / "stems" / "other.wav", sample_rate, n_samples,
        lambda i: int(10000 * math.sin(2 * math.pi * 440 * i / sample_rate)),
    )
    _write_wav(run_dir / "stems" / "bass.wav", sample_rate, n_samples, lambda i: 0)

    return run_dir


def test_transcribe_detects_correct_pitch(run_dir_with_stems):
    result = transcribe(run_dir_with_stems)

    assert len(result["notes"]) >= 1
    assert result["notes"][0]["pitchMidi"] == A4_MIDI_PITCH
    assert result["notes"][0]["durationSec"] > 1.0  # should span most of the 2s tone

    assert (run_dir_with_stems / "notes.json").is_file()
    assert (run_dir_with_stems / "transcription.mid").is_file()
    assert not (run_dir_with_stems / "_basic_pitch_raw").exists(), "temp output should be cleaned up"
    assert not (run_dir_with_stems / "_transcribe_input.wav").exists(), "temp mixed input should be cleaned up"


def test_transcribe_output_matches_real_contract_schema(run_dir_with_stems):
    result = transcribe(run_dir_with_stems)
    schema = json.load(open(REPO_ROOT / "contracts" / "notes.schema.json"))

    notes_data = {k: v for k, v in result.items() if k != "runDir"}
    jsonschema.validate(notes_data, schema)  # raises if invalid


def test_transcribe_missing_other_stem_raises(tmp_path):
    empty_run_dir = tmp_path / "empty-run"
    (empty_run_dir / "stems").mkdir(parents=True)
    with pytest.raises(FileNotFoundError):
        transcribe(empty_run_dir)


def test_transcribe_missing_bass_stem_raises(tmp_path):
    run_dir = tmp_path / "no-bass-run"
    (run_dir / "stems").mkdir(parents=True)
    sample_rate = 44100
    _write_wav(
        run_dir / "stems" / "other.wav", sample_rate, sample_rate,
        lambda i: int(10000 * math.sin(2 * math.pi * 440 * i / sample_rate)),
    )
    with pytest.raises(FileNotFoundError):
        transcribe(run_dir)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor && .venv/bin/pytest pipeline/s03_transcribe/test_transcribe.py -v`
Expected: FAIL — the fixture now writes `bass.wav`, but `transcribe.py` doesn't check for it yet, so `test_transcribe_missing_bass_stem_raises` fails (no error is raised when only `other.wav` exists, since current code never looks for `bass.wav`), and `test_transcribe_detects_correct_pitch`'s new assertion about `_transcribe_input.wav` not existing may pass vacuously (current code never creates that file) but the missing-bass-stem test is the real, meaningful failure to confirm here.

- [ ] **Step 3: Rewrite `transcribe.py`**

Replace the full contents of `pipeline/s03_transcribe/transcribe.py` with:

```python
"""
pipeline/s03_transcribe — wrap Basic Pitch to transcribe a run's `other`+
`bass` stems (mixed together) into notes conforming to
contracts/notes.schema.json (Contract A).

This is the first stage in the pipeline whose output is genuinely bound by
a contracts/ schema -- s01/s02's internal handoffs aren't.
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pretty_midi

REPO_ROOT = Path(__file__).resolve().parents[2]

# basic-pitch is a .venv-local binary, same gotcha as demucs in s02_separate.
BASIC_PITCH_BIN = str(Path(sys.executable).parent / "basic-pitch")

# Empirically tuned by ear (2026-09-18) against Seven Nation Army's real
# separated stems -- Basic Pitch's own defaults (onset 0.5, frame 0.3, no
# frequency bounds) on the `other` stem alone produced 741 notes and was
# unrecognizable as the song. These four values, combined with mixing in
# the `bass` stem (see _mix_other_and_bass below), were the best-sounding
# combination found this session: 670 notes, judged "slightly better" than
# every alternative tried. See docs/superpowers/plans/
# 2026-09-18-transcription-accuracy.md for the full spike history and
# pipeline/s03_transcribe/STATUS.md for the standing rationale. These are a
# global default, not per-song-tuned -- a song that still sounds too dense
# or too sparse may need its own retuning later, not a reason to revert
# this default.
ONSET_THRESHOLD = 0.55
FRAME_THRESHOLD = 0.35
MINIMUM_FREQUENCY_HZ = 65  # just below standard low E2 (~82Hz), some margin for drop tunings
MAXIMUM_FREQUENCY_HZ = 1500  # comfortably above a guitar's practical fretted range


def _mix_other_and_bass(other_stem, bass_stem, output_path):
    """Mixes the `other` and `bass` separated stems into one file for Basic
    Pitch to transcribe, instead of `other` alone. Validated by ear
    (2026-09-18): the bass stem reinforces guitar content that Demucs's
    separation otherwise loses, without reintroducing the vocal bleed a
    full unseparated mix would -- see the module docstring above and this
    stage's STATUS.md."""
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(other_stem),
                "-i", str(bass_stem),
                "-filter_complex", "amix=inputs=2:duration=longest:dropout_transition=0",
                str(output_path),
            ],
            capture_output=True, text=True,
        )
    except FileNotFoundError:
        raise RuntimeError("ffmpeg not found -- is ffmpeg installed (e.g. via Homebrew)?")
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg stem mix failed:\n{result.stderr}")


def transcribe(run_dir):
    """Transcribes a run's stems/other.wav + stems/bass.wav (mixed) into
    contracts/notes.schema.json-shaped notes.json.

    Args:
        run_dir (str or Path): a run directory with stems/other.wav and
            stems/bass.wav (from s02_separate).

    Returns:
        dict: the notes.json content, plus "runDir" (Path).

    Raises:
        FileNotFoundError: stems/other.wav or stems/bass.wav missing from run_dir.
        RuntimeError: ffmpeg (stem mixing) or basic-pitch itself failed.
    """
    run_dir = Path(run_dir)
    other_stem = run_dir / "stems" / "other.wav"
    bass_stem = run_dir / "stems" / "bass.wav"
    if not other_stem.is_file():
        raise FileNotFoundError(
            f"No stems/other.wav in {run_dir} -- run s02_separate first."
        )
    if not bass_stem.is_file():
        raise FileNotFoundError(
            f"No stems/bass.wav in {run_dir} -- run s02_separate first."
        )

    mixed_input = run_dir / "_transcribe_input.wav"
    raw_output_dir = run_dir / "_basic_pitch_raw"
    raw_output_dir.mkdir(exist_ok=True)  # unlike demucs, basic-pitch doesn't create its own output dir

    try:
        _mix_other_and_bass(other_stem, bass_stem, mixed_input)

        result = subprocess.run(
            [
                BASIC_PITCH_BIN, str(raw_output_dir), str(mixed_input),
                "--onset-threshold", str(ONSET_THRESHOLD),
                "--frame-threshold", str(FRAME_THRESHOLD),
                "--minimum-frequency", str(MINIMUM_FREQUENCY_HZ),
                "--maximum-frequency", str(MAXIMUM_FREQUENCY_HZ),
            ],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"basic-pitch failed:\n{result.stderr}")

        midi_files = list(raw_output_dir.glob("*.mid"))
        if not midi_files:
            raise RuntimeError(f"basic-pitch produced no .mid file in {raw_output_dir}")

        midi = pretty_midi.PrettyMIDI(str(midi_files[0]))
        notes = []
        for instrument in midi.instruments:
            if instrument.is_drum:
                continue
            for note in instrument.notes:
                notes.append({
                    "pitchMidi": note.pitch,
                    "startTimeSec": round(note.start, 6),
                    "durationSec": round(note.end - note.start, 6),
                    "velocity": round(note.velocity / 127, 4),
                })
        notes.sort(key=lambda n: n["startTimeSec"])

        notes_data = {
            "schemaVersion": "1.0.0",
            "sourceFile": "stems/other.wav + stems/bass.wav (mixed)",
            "notes": notes,
        }
        with open(run_dir / "notes.json", "w") as f:
            json.dump(notes_data, f, indent=2)

        shutil.copy2(midi_files[0], run_dir / "transcription.mid")
    finally:
        shutil.rmtree(raw_output_dir, ignore_errors=True)
        mixed_input.unlink(missing_ok=True)

    return {**notes_data, "runDir": run_dir}


def main():
    parser = argparse.ArgumentParser(description="Transcribe a run's other+bass stems (mixed) into notes via Basic Pitch.")
    parser.add_argument("run_dir", help="Path to a run directory set up by s01_ingest/s02_separate")
    args = parser.parse_args()

    result = transcribe(args.run_dir)
    print(f"Transcribed {len(result['notes'])} notes to {result['runDir'] / 'notes.json'}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor && .venv/bin/pytest pipeline/s03_transcribe/test_transcribe.py -v`
Expected: PASS — all 4 tests (`test_transcribe_detects_correct_pitch`, `test_transcribe_output_matches_real_contract_schema`, `test_transcribe_missing_other_stem_raises`, `test_transcribe_missing_bass_stem_raises`).

- [ ] **Step 5: Run the full pipeline test suite**

Run: `cd /Users/tomsvarpins/Projects/guitar_tab_processor && .venv/bin/pytest pipeline/ -v`
Expected: PASS, 13/13 (the original 12, plus the one new bass-stem test — `test_transcribe_missing_bass_stem_raises` is new; the previous single "missing stem" test was renamed to `test_transcribe_missing_other_stem_raises`, same count contribution).

- [ ] **Step 6: Commit**

```bash
git add pipeline/s03_transcribe/transcribe.py pipeline/s03_transcribe/test_transcribe.py
git commit -m "Mix other+bass stems and tune Basic Pitch thresholds for less noisy transcription"
```

---

### Task 2: Update `pipeline/s03_transcribe/STATUS.md`

**Files:**
- Modify: `pipeline/s03_transcribe/STATUS.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Update the Reads/Writes and add the tuning rationale**

Replace the full contents of `pipeline/s03_transcribe/STATUS.md` with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/s03_transcribe/STATUS.md
git commit -m "Update s03_transcribe STATUS.md for the other+bass mix / tuned thresholds change"
```

---

### Task 3: Reprocess Seven Nation Army and Shame with the updated transcription

**Files:** None modified — this task re-runs existing pipeline stages against existing run directories.

**Interfaces:** Uses `transcribe(run_dir)` from Task 1, `pipeline/s04_tab/tab_generate.py`'s existing `tab_generate` (unmodified), `pipeline/s05_publish/publish.py`'s existing `publish` (unmodified).

- [ ] **Step 1: Re-run transcription, tab generation, and publish for Seven Nation Army**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
RUN="pipeline_runs/seven-nation-army-20260918-183722"
.venv/bin/python pipeline/s03_transcribe/transcribe.py "$RUN"
.venv/bin/python pipeline/s04_tab/tab_generate.py "$RUN"
.venv/bin/python pipeline/s05_publish/publish.py "$RUN"
```

Expected: transcribe prints a note count around 670 (the validated spike number — exact count may vary slightly run-to-run, same normal variance noted in the 2026-09-08 STATUS.md correction above), tab_generate and publish both succeed with no errors.

- [ ] **Step 2: Re-run transcription, tab generation, and publish for Shame**

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
RUN="pipeline_runs/shame-20260918-183654"
.venv/bin/python pipeline/s03_transcribe/transcribe.py "$RUN"
.venv/bin/python pipeline/s04_tab/tab_generate.py "$RUN"
.venv/bin/python pipeline/s05_publish/publish.py "$RUN"
```

Expected: succeeds with no errors. Shame's note count wasn't part of this session's by-ear tuning (only Seven Nation Army was) — flag the resulting note count in the report so the user can judge whether it also improved, rather than assuming it did.

- [ ] **Step 3: Ask the user to listen in the app**

Report the before/after note counts for both songs, and ask the user to open the app (`http://localhost:3000`), select each song, and confirm by ear/by reading the tab whether this is a real improvement — the same judgment loop used to pick these threshold values in the first place. Do not mark this task done from note-count numbers alone.
