"""
Tests for pipeline/s01_ingest/ingest.py.

Uses synthetically generated audio (a plain sine tone via the stdlib `wave`
module) as fixtures -- never a real/copyrighted song, consistent with the
project's rule that no copyrighted audio belongs anywhere in the repo.

Run with: .venv/bin/pytest pipeline/s01_ingest/test_ingest.py
"""
import importlib.util
import math
import shutil
import struct
import wave
from pathlib import Path

import pytest

# "s01_ingest" isn't a valid Python package/module name (starts with a digit),
# so load ingest.py directly by file path rather than a normal import.
_spec = importlib.util.spec_from_file_location("ingest", Path(__file__).parent / "ingest.py")
ingest_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ingest_module)
ingest = ingest_module.ingest


@pytest.fixture
def synthetic_wav(tmp_path):
    """A tiny, silent-ish synthetic sine-tone WAV -- not copyrighted material."""
    path = tmp_path / "test_tone.wav"
    sample_rate = 44100
    duration_sec = 0.5
    n_samples = int(sample_rate * duration_sec)

    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = b"".join(
            struct.pack("<h", int(3000 * math.sin(2 * math.pi * 440 * i / sample_rate)))
            for i in range(n_samples)
        )
        wf.writeframes(frames)

    return path


@pytest.fixture(autouse=True)
def clean_runs_dir(monkeypatch, tmp_path):
    """Redirects RUNS_DIR to a temp location so tests never touch the real pipeline_runs/."""
    fake_runs_dir = tmp_path / "pipeline_runs"
    monkeypatch.setattr(ingest_module, "RUNS_DIR", fake_runs_dir)
    yield
    if fake_runs_dir.exists():
        shutil.rmtree(fake_runs_dir)


def test_ingest_valid_file_succeeds(synthetic_wav):
    result = ingest(str(synthetic_wav), title="Test Tone")

    assert result["title"] == "Test Tone"
    assert result["runId"].startswith("test-tone-")
    assert result["durationSec"] == pytest.approx(0.5, abs=0.05)
    assert result["sampleRate"] == 44100
    assert result["channels"] == 1

    run_dir = result["runDir"]
    assert (run_dir / "source.wav").is_file()
    assert (run_dir / "metadata.json").is_file()


def test_ingest_defaults_title_to_filename(synthetic_wav):
    result = ingest(str(synthetic_wav))
    assert result["title"] == "test_tone"


def test_ingest_missing_file_raises():
    with pytest.raises(FileNotFoundError):
        ingest("/nonexistent/path/does_not_exist.wav")


def test_ingest_non_audio_file_raises(tmp_path):
    fake_audio = tmp_path / "not_actually_audio.mp3"
    fake_audio.write_text("this is just plain text, not an audio file")

    with pytest.raises(ValueError):
        ingest(str(fake_audio))
