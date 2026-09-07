"""
Phase 0 spike script — not real pipeline code.

Reuses tuttut's own string/fret assignment logic (the Tab object's Viterbi-
optimized fingering choices) but ignores timing entirely — this project's
goal is a correct sequence of notes/chords a human plays along to a
metronome, not an exact rhythm transcription. Outputs two things:

1. A human-readable ASCII tab: standard 6-line layout, chords shown as
   numbers stacked in the same column, single notes alone. Orientation
   (thin e on top = tab convention, or thick E on top = matches how the
   neck actually sits when you look down at it) is a flag, not a fixed
   choice.
2. A machine-readable JSON list of ordered steps (each step = a chord or a
   single note, as a list of {string, fret} pairs), no timing fields —
   deliberately does NOT conform to contracts/tab.schema.json, which
   requires exact timing. That contract's fit for this project's actual
   needs is an open question flagged separately, not decided here.

Usage: python tuttut_clean_tab.py <path-to-midi> <output-basename> [--natural-order]
"""
import sys
import json
import pretty_midi
from tuttut.logic.tab import Tab
from tuttut.logic.theory import Tuning

# tuttut's internal string index: 0 = thinnest/highest (high e) ... 5 = thickest/lowest (low E)
STRING_NAMES_THIN_FIRST = ["e", "B", "G", "D", "A", "E"]
STEPS_PER_ROW = 20  # how many chord/note steps per printed row, so lines stay readable


def build_steps(midi_path):
    """Returns an ordered list of steps; each step is a list of (string_index, fret)."""
    midi = pretty_midi.PrettyMIDI(midi_path)
    weights = {"b": 1, "height": 1, "length": 1, "n_changed_strings": 1}
    tab = Tab(name="clean", tuning=Tuning(), midi=midi, weights=weights)

    steps = []
    for measure in tab.tab["measures"]:
        for event in measure["events"]:
            if "notes" not in event or not event["notes"]:
                continue
            steps.append([(n["string"], n["fret"]) for n in event["notes"]])
    return steps


def render_ascii(steps, natural_order):
    """Renders steps as a standard 6-line ASCII tab, wrapped into readable rows."""
    order = list(range(6)) if not natural_order else list(reversed(range(6)))
    names = [STRING_NAMES_THIN_FIRST[i] for i in order]

    legend = [
        "Legend: numbers are frets. '0' = open string. '-' = nothing played on that string this step.",
        "No 'muted string' marker (x) is used -- this pipeline has no way to detect deliberate muting.",
        f"String order: {'thick E on top (natural/neck-down view)' if natural_order else 'thin e on top (standard tab convention)'}",
        "",
    ]

    lines = []
    for row_start in range(0, len(steps), STEPS_PER_ROW):
        row_steps = steps[row_start:row_start + STEPS_PER_ROW]
        # cell text per string per step in this row, so columns can be aligned by width
        cells = [[""] * len(row_steps) for _ in range(6)]
        for j, step in enumerate(row_steps):
            by_string = {s: f for s, f in step}
            for i, string_idx in enumerate(order):
                cells[i][j] = str(by_string[string_idx]) if string_idx in by_string else "-"

        col_widths = [max(len(cells[i][j]) for i in range(6)) for j in range(len(row_steps))]

        row_lines = []
        for i in range(6):
            row_text = names[i] + "|"
            for j in range(len(row_steps)):
                row_text += "-" + cells[i][j].rjust(col_widths[j], "-")
            row_text += "-|"
            row_lines.append(row_text)
        lines.extend(row_lines)
        lines.append("")

    return "\n".join(legend + lines)


def main():
    midi_path, out_base = sys.argv[1], sys.argv[2]
    natural_order = "--natural-order" in sys.argv

    steps = build_steps(midi_path)

    with open(out_base + ".txt", "w") as f:
        f.write(render_ascii(steps, natural_order))

    json_steps = [[{"string": s + 1, "fret": fr} for s, fr in step] for step in steps]
    with open(out_base + ".json", "w") as f:
        json.dump({"orderedSteps": json_steps, "note": "string 1 = thin/high e ... 6 = thick/low E, no timing"}, f, indent=2)

    print(f"Wrote {len(steps)} steps to {out_base}.txt and {out_base}.json")


if __name__ == "__main__":
    main()
