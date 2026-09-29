export const PREVIEW_SECONDS = 30;
export interface TabStep { index: number; startTimeSec: number; notes: { string: number; fret: number }[] }
export interface TabPreviewData { tempoBpm: number | null; tuning: number[]; steps: TabStep[] }

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// Note name of an open string's MIDI pitch, e.g. 40 -> "E" (same table as app/lib/tabNotation.ts pitchClassName).
export function pitchClassName(midi: number): string {
  return PITCH_CLASSES[((midi % 12) + 12) % 12];
}

// null when the JSON is not a usable tab. Steps = notes with startTimeSec < limitSec, grouped by
// EXACT equal startTimeSec (same rule as app/lib/tabNotation.ts groupNotesByStep), sorted by time,
// within a step in file order; index counts from 0 in that order.
export function buildTabPreview(raw: unknown, limitSec: number = PREVIEW_SECONDS): TabPreviewData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { tuning, tempoBpm, notes } = raw as { tuning?: unknown; tempoBpm?: unknown; notes?: unknown };
  if (!Array.isArray(tuning) || tuning.length === 0 || !Array.isArray(notes)) return null;
  const byTime = new Map<number, { string: number; fret: number }[]>();
  for (const n of notes) {
    if (typeof n !== "object" || n === null) return null;
    const { string, fret, startTimeSec } = n as { string?: unknown; fret?: unknown; startTimeSec?: unknown };
    if (!Number.isInteger(string) || (string as number) < 0 || (string as number) >= tuning.length) return null;
    if (typeof startTimeSec !== "number" || !Number.isFinite(startTimeSec) || startTimeSec < 0) return null;
    if (startTimeSec >= limitSec) continue;
    const group = byTime.get(startTimeSec) ?? [];
    group.push({ string: string as number, fret: Number(fret) });
    byTime.set(startTimeSec, group);
  }
  const steps = [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([startTimeSec, ns], index) => ({ index, startTimeSec, notes: ns }));
  return { tempoBpm: typeof tempoBpm === "number" ? tempoBpm : null, tuning: tuning as number[], steps };
}
