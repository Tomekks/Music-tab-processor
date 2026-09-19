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
