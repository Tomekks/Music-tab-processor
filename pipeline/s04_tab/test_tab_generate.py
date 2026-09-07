"""
Tests for pipeline/s04_tab/tab_generate.py.

Uses a synthetic notes.json (a single known-pitch note, matching the
contracts/notes.schema.json shape s03_transcribe produces) as the fixture --
no real/copyrighted audio or MIDI involved at all for this stage.

Run with: .venv/bin/pytest pipeline/s04_tab/test_tab_generate.py
"""
import importlib.util
import json
from pathlib import Path

import jsonschema
import pytest

_spec = importlib.util.spec_from_file_location("tab_generate", Path(__file__).parent / "tab_generate.py")
tab_generate_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tab_generate_module)
generate_tab = tab_generate_module.generate_tab
REPO_ROOT = tab_generate_module.REPO_ROOT

A4_MIDI_PITCH = 69


@pytest.fixture
def run_dir_with_notes(tmp_path):
    """A fake run directory with a single-note notes.json (A4, matching Contract A's shape)."""
    run_dir = tmp_path / "test-run"
    run_dir.mkdir()

    notes_data = {
        "schemaVersion": "1.0.0",
        "sourceFile": "stems/other.wav",
        "notes": [
            {"pitchMidi": A4_MIDI_PITCH, "startTimeSec": 0.0, "durationSec": 1.0, "velocity": 0.8},
        ],
    }
    with open(run_dir / "notes.json", "w") as f:
        json.dump(notes_data, f)

    with open(run_dir / "metadata.json", "w") as f:
        json.dump({"title": "Test Tab"}, f)

    return run_dir


def test_generate_tab_output_matches_real_contract_schema(run_dir_with_notes):
    result = generate_tab(run_dir_with_notes)
    schema = json.load(open(REPO_ROOT / "contracts" / "tab.schema.json"))

    tab_data = {k: v for k, v in result.items() if k != "runDir"}
    jsonschema.validate(tab_data, schema)  # raises if invalid

    assert (run_dir_with_notes / "tab.json").is_file()
    assert (run_dir_with_notes / "tab.txt").is_file()


def test_generate_tab_string_fret_direction_is_correct(run_dir_with_notes):
    """The known A4 note's assigned string/fret must round-trip to A4 via the returned tuning."""
    result = generate_tab(run_dir_with_notes)

    assert len(result["notes"]) == 1
    note = result["notes"][0]
    reconstructed_pitch = result["tuning"][note["string"]] + note["fret"]
    assert reconstructed_pitch == A4_MIDI_PITCH


def test_generate_tab_missing_notes_json_raises(tmp_path):
    empty_run_dir = tmp_path / "empty-run"
    empty_run_dir.mkdir()
    with pytest.raises(FileNotFoundError):
        generate_tab(empty_run_dir)
