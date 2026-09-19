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
