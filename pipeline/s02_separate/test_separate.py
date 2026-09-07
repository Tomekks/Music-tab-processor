"""
Tests for pipeline/s02_separate/separate.py.

Per AGENTS.md's reliability toolkit, an ML stage's test is structural (shape
of the output), not exact-content comparison -- real model output can vary
slightly across library versions/hardware. Uses a synthetically generated
sine tone (never real/copyrighted audio) as the fixture.

Run with: .venv/bin/pytest pipeline/s02_separate/test_separate.py
"""
import importlib.util
import json
import math
import struct
import subprocess
import wave
from pathlib import Path

import pytest

_spec = importlib.util.spec_from_file_location("separate", Path(__file__).parent / "separate.py")
separate_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(separate_module)
separate = separate_module.separate


def _probe(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=sample_rate",
         "-of", "json", str(path)],
        capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"]), int(data["streams"][0]["sample_rate"])


@pytest.fixture
def run_dir_with_source(tmp_path):
    """A fake run directory containing a short synthetic sine-tone source.wav."""
    run_dir = tmp_path / "test-run"
    run_dir.mkdir()
    source = run_dir / "source.wav"

    sample_rate = 44100
    duration_sec = 2.0  # short, but long enough for htdemucs's internal chunking to behave normally
    n_samples = int(sample_rate * duration_sec)
    with wave.open(str(source), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = b"".join(
            struct.pack("<hh", *(int(3000 * math.sin(2 * math.pi * 440 * i / sample_rate)),) * 2)
            for i in range(n_samples)
        )
        wf.writeframes(frames)

    return run_dir


def test_separate_produces_all_four_stems(run_dir_with_source):
    source_duration, source_rate = _probe(run_dir_with_source / "source.wav")

    result = separate(run_dir_with_source)

    assert result["model"] == "htdemucs"
    assert set(result["stems"].keys()) == {"drums", "bass", "other", "vocals"}

    for stem_name, rel_path in result["stems"].items():
        stem_path = run_dir_with_source / rel_path
        assert stem_path.is_file(), f"{stem_name} stem missing"
        assert stem_path.stat().st_size > 0, f"{stem_name} stem is empty"

        stem_duration, stem_rate = _probe(stem_path)
        assert stem_rate == source_rate
        assert stem_duration == pytest.approx(source_duration, abs=0.2)

    assert (run_dir_with_source / "separation.json").is_file()
    assert not (run_dir_with_source / "_demucs_raw").exists(), "temp demucs output should be cleaned up"


def test_separate_missing_source_raises(tmp_path):
    empty_run_dir = tmp_path / "empty-run"
    empty_run_dir.mkdir()
    with pytest.raises(FileNotFoundError):
        separate(empty_run_dir)
