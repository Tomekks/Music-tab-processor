"""
pipeline/s04_tab — wrap tuttut to turn a run's notes.json into tab data
conforming to contracts/tab.schema.json (Contract B), plus a human-readable
ASCII rendering as the default display.

See docs/specs/pipeline-04-tab.md for the reasoning behind the timing
approximation used here -- flagged for review, not a contracts/ change.
"""
import argparse
import json
from pathlib import Path

import pretty_midi
from tuttut.logic.tab import Tab
from tuttut.logic.theory import Tuning

REPO_ROOT = Path(__file__).resolve().parents[2]

STRING_NAMES_THIN_FIRST = ["e", "B", "G", "D", "A", "E"]
DEFAULT_TEMPO_BPM = 120  # fallback if estimate_tempo() fails or returns something degenerate
FINAL_NOTE_DURATION_SEC = 0.5  # fallback for the very last step, which has no "next step" to measure to


def _notes_json_to_midi(notes_data):
    midi = pretty_midi.PrettyMIDI()
    instrument = pretty_midi.Instrument(program=25)  # nylon guitar-ish; irrelevant to tuttut's logic
    for note in notes_data["notes"]:
        instrument.notes.append(pretty_midi.Note(
            velocity=max(1, round(note.get("velocity", 0.7) * 127)),
            pitch=note["pitchMidi"],
            start=note["startTimeSec"],
            end=note["startTimeSec"] + note["durationSec"],
        ))
    midi.instruments.append(instrument)
    return midi


def _estimate_tempo(midi):
    try:
        tempo = float(midi.estimate_tempo())
        if 30 <= tempo <= 300:  # sanity bounds -- reject degenerate estimates
            return round(tempo, 2)
    except Exception:
        pass
    return DEFAULT_TEMPO_BPM


def _build_steps(tab):
    """Ordered list of (time, [(tuttut_string_idx, fret), ...]) -- same pattern as the Phase 0 script."""
    steps = []
    for measure in tab.tab["measures"]:
        for event in measure["events"]:
            if "notes" not in event or not event["notes"]:
                continue
            steps.append((event["time"], [(n["string"], n["fret"]) for n in event["notes"]]))
    return steps


def _render_ascii(steps, tuning_thin_first, steps_per_row=20):
    lines = [
        "Legend: numbers are frets. '0' = open string. '-' = nothing played on that string this step.",
        "No timing shown -- this is the human/metronome's job, not the tab's. String order: thin e on top.",
        "",
    ]
    for row_start in range(0, len(steps), steps_per_row):
        row_steps = steps[row_start:row_start + steps_per_row]
        cells = [[""] * len(row_steps) for _ in range(6)]
        for j, (_, notes) in enumerate(row_steps):
            by_string = dict(notes)
            for i in range(6):
                cells[i][j] = str(by_string[i]) if i in by_string else "-"
        col_widths = [max(len(cells[i][j]) for i in range(6)) for j in range(len(row_steps))]
        for i in range(6):
            row_text = STRING_NAMES_THIN_FIRST[i] + "|"
            for j in range(len(row_steps)):
                row_text += "-" + cells[i][j].rjust(col_widths[j], "-")
            row_text += "-|"
            lines.append(row_text)
        lines.append("")
    return "\n".join(lines)


def generate_tab(run_dir):
    """Generates contracts/tab.schema.json-conforming tab.json + a human-readable tab.txt.

    Args:
        run_dir (str or Path): a run directory with notes.json (from s03_transcribe).

    Returns:
        dict: the tab.json content, plus "runDir" (Path).

    Raises:
        FileNotFoundError: no notes.json in run_dir.
    """
    run_dir = Path(run_dir)
    notes_path = run_dir / "notes.json"
    if not notes_path.is_file():
        raise FileNotFoundError(f"No notes.json in {run_dir} -- run s03_transcribe first.")

    notes_data = json.load(open(notes_path))
    midi = _notes_json_to_midi(notes_data)

    tuning = Tuning()
    weights = {"b": 1, "height": 1, "length": 1, "n_changed_strings": 1}

    title = "untitled"
    metadata_path = run_dir / "metadata.json"
    if metadata_path.is_file():
        title = json.load(open(metadata_path)).get("title", title)

    tab = Tab(name=title, tuning=tuning, midi=midi, weights=weights)
    steps = _build_steps(tab)

    # contracts/tab.schema.json wants tuning low-string-first; tuttut's internal
    # convention is thin/high-string-first (index 0 = high e) -- reverse both the
    # tuning array and each note's string index to match the contract's direction.
    tuning_thin_first = [s.pitch for s in tuning.strings]
    tuning_schema = list(reversed(tuning_thin_first))
    n_strings = len(tuning_thin_first)

    schema_notes = []
    for i, (time, notes_at_step) in enumerate(steps):
        next_time = steps[i + 1][0] if i + 1 < len(steps) else time + FINAL_NOTE_DURATION_SEC
        duration = round(next_time - time, 6) or 0.001  # schema requires exclusiveMinimum 0
        for tuttut_string_idx, fret in notes_at_step:
            schema_notes.append({
                "string": n_strings - 1 - tuttut_string_idx,
                "fret": fret,
                "startTimeSec": round(time, 6),
                "durationSec": duration,
            })

    tab_data = {
        "schemaVersion": "1.0.0",
        "title": title,
        "sourceFile": str(notes_path.relative_to(run_dir)),
        "tuning": tuning_schema,
        "tempoBpm": _estimate_tempo(midi),
        "notes": schema_notes,
    }
    with open(run_dir / "tab.json", "w") as f:
        json.dump(tab_data, f, indent=2)

    ascii_tab = _render_ascii(steps, tuning_thin_first)
    with open(run_dir / "tab.txt", "w") as f:
        f.write(ascii_tab)

    return {**tab_data, "runDir": run_dir}


def main():
    parser = argparse.ArgumentParser(description="Generate a tab from a run's transcribed notes via tuttut.")
    parser.add_argument("run_dir", help="Path to a run directory set up by s01-s03")
    args = parser.parse_args()

    result = generate_tab(args.run_dir)
    print(f"Generated tab: {len(result['notes'])} notes -> {result['runDir'] / 'tab.json'} and tab.txt")


if __name__ == "__main__":
    main()
