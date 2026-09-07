"""
pipeline/01_ingest — validate a local audio file and set up a per-run
working directory for the rest of the pipeline (02_separate onward).

No contracts/ schema applies to this stage's output: ingest -> separate ->
transcribe are all internal to the "audio processing" module (see
AGENTS.md); only 03_transcribe's final output has to match
contracts/notes.schema.json.

Note on the folder name: "01_ingest" isn't a valid Python package name
(identifiers can't start with a digit), so this file is run directly
(`python pipeline/01_ingest/ingest.py ...`) rather than imported as
`pipeline.01_ingest.ingest`. A later stage that needs to reuse this
module should load it via importlib.util.spec_from_file_location, not
a normal import statement.
"""
import argparse
import json
import re
import shutil
import subprocess
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = REPO_ROOT / "pipeline_runs"


def _slugify(text):
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "untitled"


def _probe_audio(path):
    """Runs ffprobe on `path`. Raises ValueError if it's not readable audio."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration:stream=sample_rate,channels,codec_type",
                "-of", "json", str(path),
            ],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        raise RuntimeError("ffprobe not found -- is ffmpeg installed (e.g. via Homebrew)?")

    if result.returncode != 0:
        raise ValueError(f"Not a readable audio file (ffprobe failed): {path}")

    probe = json.loads(result.stdout)
    audio_streams = [s for s in probe.get("streams", []) if s.get("codec_type") == "audio"]
    if not audio_streams:
        raise ValueError(f"No audio stream found in: {path}")

    duration = float(probe.get("format", {}).get("duration", 0))
    if duration <= 0:
        raise ValueError(f"Audio file has zero duration: {path}")

    stream = audio_streams[0]
    return {
        "durationSec": duration,
        "sampleRate": int(stream.get("sample_rate", 0)),
        "channels": int(stream.get("channels", 0)),
    }


def ingest(source_path, title=None):
    """Validates `source_path` as audio and sets up its pipeline_runs/ working directory.

    Args:
        source_path (str): path to a local audio file.
        title (str, optional): display title. Defaults to the filename stem.

    Returns:
        dict: the metadata written to metadata.json, plus "runDir" (Path).

    Raises:
        FileNotFoundError: source_path doesn't exist.
        ValueError: source_path isn't readable audio (per ffprobe).
    """
    source = Path(source_path)
    if not source.is_file():
        raise FileNotFoundError(f"No such file: {source_path}")

    audio_info = _probe_audio(source)

    title = title or source.stem
    run_id = f"{_slugify(title)}-{time.strftime('%Y%m%d-%H%M%S')}"
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=False)

    dest = run_dir / f"source{source.suffix}"
    shutil.copy2(source, dest)

    metadata = {
        "runId": run_id,
        "title": title,
        "sourceFile": str(source.resolve()),
        "ingestedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        **audio_info,
    }
    with open(run_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    return {**metadata, "runDir": run_dir}


def main():
    parser = argparse.ArgumentParser(description="Ingest a local audio file for pipeline processing.")
    parser.add_argument("source", help="Path to the audio file")
    parser.add_argument("--title", default=None, help="Display title (defaults to filename)")
    args = parser.parse_args()

    result = ingest(args.source, args.title)
    print(f"Ingested: {result['runDir']}")
    print(json.dumps({k: v for k, v in result.items() if k != "runDir"}, indent=2))


if __name__ == "__main__":
    main()
