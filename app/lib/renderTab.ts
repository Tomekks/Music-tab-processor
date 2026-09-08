// Renders a song's notes (contracts/tab.schema.json shape: string index 0 =
// lowest/thick E ... 5 = highest/thin e) as a standard ASCII tab -- same
// convention as pipeline/s04_tab's tab.txt output: thin e on top, chords
// (notes sharing the same startTimeSec) stacked in one column, no timing
// shown (order is what matters, per DECISIONS.md).

type Note = { string: number; fret: number; startTimeSec: number; durationSec: number };

const STRING_LABELS_HIGH_FIRST = ["e", "B", "G", "D", "A", "E"]; // display order: thin/high on top
const STEPS_PER_ROW = 20;

export function renderAsciiTab(notes: Note[], nStrings = 6): string {
  const byTime = new Map<number, Note[]>();
  for (const note of notes) {
    const group = byTime.get(note.startTimeSec) ?? [];
    group.push(note);
    byTime.set(note.startTimeSec, group);
  }
  const steps = [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group);

  const rows: string[] = [];
  for (let rowStart = 0; rowStart < steps.length; rowStart += STEPS_PER_ROW) {
    const rowSteps = steps.slice(rowStart, rowStart + STEPS_PER_ROW);
    const cells: string[][] = Array.from({ length: nStrings }, () => Array(rowSteps.length).fill("-"));

    rowSteps.forEach((step, j) => {
      for (const note of step) {
        const displayRow = nStrings - 1 - note.string; // schema index 0=low -> display row 5 (bottom)
        cells[displayRow][j] = String(note.fret);
      }
    });

    const colWidths = rowSteps.map((_, j) => Math.max(...cells.map((row) => row[j].length)));

    for (let i = 0; i < nStrings; i++) {
      let line = STRING_LABELS_HIGH_FIRST[i] + "|";
      for (let j = 0; j < rowSteps.length; j++) {
        line += "-" + cells[i][j].padStart(colWidths[j], "-");
      }
      line += "-|";
      rows.push(line);
    }
    rows.push("");
  }
  return rows.join("\n");
}
