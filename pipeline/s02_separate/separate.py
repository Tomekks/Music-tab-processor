"""
pipeline/s02_separate — wrap htdemucs to separate a run's source audio into
stems, writing them back into the same run directory for s03_transcribe.

No contracts/ schema applies (internal to "audio processing", see AGENTS.md).

Note on the folder name: same digit-first issue as s01_ingest solved --
"s02_separate" itself is fine (starts with a letter), but load this module
via importlib.util.spec_from_file_location if reusing it from another
stage, for consistency with s01_ingest's pattern.
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

STEMS = ["drums", "bass", "other", "vocals"]

# demucs is installed in .venv, not on the system PATH -- resolve it relative
# to whichever Python interpreter is running this (mirrors how the venv finds
# its own console-script binaries).
DEMUCS_BIN = str(Path(sys.executable).parent / "demucs")


def _find_source(run_dir):
    matches = list(Path(run_dir).glob("source.*"))
    if not matches:
        raise FileNotFoundError(f"No source.* file found in {run_dir} -- run s01_ingest first.")
    return matches[0]


def separate(run_dir):
    """Runs htdemucs on a run directory's source audio, writing stems/ + separation.json.

    Args:
        run_dir (str or Path): a run directory set up by s01_ingest.

    Returns:
        dict: the metadata written to separation.json, plus "stemsDir" (Path).

    Raises:
        FileNotFoundError: no source.* file in run_dir.
        RuntimeError: demucs itself failed.
    """
    run_dir = Path(run_dir)
    source = _find_source(run_dir)

    raw_output_dir = run_dir / "_demucs_raw"
    result = subprocess.run(
        [DEMUCS_BIN, "-o", str(raw_output_dir), str(source)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"demucs failed:\n{result.stderr}")

    track_name = source.stem  # "source" -- demucs names output dirs after the input filename stem
    demucs_track_dir = raw_output_dir / "htdemucs" / track_name

    stems_dir = run_dir / "stems"
    stems_dir.mkdir(exist_ok=True)
    stem_paths = {}
    for stem in STEMS:
        src = demucs_track_dir / f"{stem}.wav"
        dst = stems_dir / f"{stem}.wav"
        shutil.move(str(src), str(dst))
        stem_paths[stem] = str(dst.relative_to(run_dir))

    shutil.rmtree(raw_output_dir)

    metadata = {
        "model": "htdemucs",
        "stems": stem_paths,
        "separatedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    with open(run_dir / "separation.json", "w") as f:
        json.dump(metadata, f, indent=2)

    return {**metadata, "stemsDir": stems_dir}


def main():
    parser = argparse.ArgumentParser(description="Separate a run's source audio into stems via htdemucs.")
    parser.add_argument("run_dir", help="Path to a run directory set up by s01_ingest")
    args = parser.parse_args()

    result = separate(args.run_dir)
    print(f"Separated: {result['stemsDir']}")
    print(json.dumps({k: v for k, v in result.items() if k != "stemsDir"}, indent=2))


if __name__ == "__main__":
    main()
