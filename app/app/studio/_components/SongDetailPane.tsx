import { pitchClassName } from "@/lib/tabNotation";
import type { songs } from "@/db/schema";

type Song = typeof songs.$inferSelect;

// M1: static header only, plus a temporary tall placeholder standing in for the real
// tab diagram (added in M3). The placeholder's only job is to prove the scroll
// containment works -- everything outside it must stay put while it scrolls
// internally. See app/app/studio/STATUS.md for the milestone this belongs to.
export function SongDetailPane({ song }: { song: Song | null }) {
  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        <p>Choose a song from the list</p>
      </div>
    );
  }

  const tuningLabel = song.tuning
    .map((midi, i) => (i === song.tuning.length - 1 ? pitchClassName(midi).toLowerCase() : pitchClassName(midi)))
    .join("-");

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 flex items-start gap-6 p-8 pb-6">
        <div className="w-32 h-32 shrink-0 rounded bg-zinc-200" aria-hidden="true" />
        <div className="flex flex-col gap-1 pt-1">
          {song.artist && <span className="text-sm text-zinc-500">{song.artist}</span>}
          <h1 className="text-3xl font-bold leading-tight">{song.title}</h1>
          <p className="text-sm text-zinc-500">
            tuning {tuningLabel} &bull; {Math.round(song.tempoBpm)} bpm
          </p>
        </div>
      </header>

      {/* Placeholder for M3's DiagramViewport -- deliberately tall to prove only this
          region scrolls, not the page. Replace wholesale in M3. */}
      <div className="flex-1 min-h-0 overflow-y-auto border-t border-zinc-200 px-8 py-6">
        <div style={{ height: 2000 }} className="rounded bg-zinc-50 border border-dashed border-zinc-300 p-4 text-sm text-zinc-400">
          Tab diagram placeholder (M1) -- tall on purpose to verify scroll containment.
          This region should scroll; the header above should not move.
        </div>
      </div>
    </div>
  );
}
