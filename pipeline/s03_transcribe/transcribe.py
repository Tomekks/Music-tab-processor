"""
pipeline/s03_transcribe — wrap Basic Pitch to transcribe a run's `other`
stem into notes conforming to contracts/notes.schema.json (Contract A).

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


def transcribe(run_dir):
    """Transcribes a run's stems/other.wav into contracts/notes.schema.json-shaped notes.json.

    Args:
        run_dir (str or Path): a run directory with stems/other.wav (from s02_separate).

    Returns:
        dict: the notes.json content, plus "runDir" (Path).

    Raises:
        FileNotFoundError: no stems/other.wav in run_dir.
        RuntimeError: basic-pitch itself failed.
    """
    run_dir = Path(run_dir)
    other_stem = run_dir / "stems" / "other.wav"
    if not other_stem.is_file():
        raise FileNotFoundError(
            f"No stems/other.wav in {run_dir} -- run s02_separate first."
        )

    raw_output_dir = run_dir / "_basic_pitch_raw"
    raw_output_dir.mkdir(exist_ok=True)  # unlike demucs, basic-pitch doesn't create its own output dir
    result = subprocess.run(
        [BASIC_PITCH_BIN, str(raw_output_dir), str(other_stem)],
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
        "sourceFile": str(other_stem.relative_to(run_dir)),
        "notes": notes,
    }
    with open(run_dir / "notes.json", "w") as f:
        json.dump(notes_data, f, indent=2)

    shutil.copy2(midi_files[0], run_dir / "transcription.mid")
    shutil.rmtree(raw_output_dir)

    return {**notes_data, "runDir": run_dir}


def main():
    parser = argparse.ArgumentParser(description="Transcribe a run's other stem into notes via Basic Pitch.")
    parser.add_argument("run_dir", help="Path to a run directory set up by s01_ingest/s02_separate")
    args = parser.parse_args()

    result = transcribe(args.run_dir)
    print(f"Transcribed {len(result['notes'])} notes to {result['runDir'] / 'notes.json'}")


if __name__ == "__main__":
    main()
