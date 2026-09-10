import { pitchClassName } from "@/lib/tabNotation";
import { renderAsciiTab } from "@/lib/renderTab";
import { StudioTabs } from "./StudioTabs";
import type { songs } from "@/db/schema";

type Song = typeof songs.$inferSelect;

export function SongDetailPane({ song }: { song: Song | null }) {
  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground/40">
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
        <div className="w-32 h-32 shrink-0 bg-foreground/10 rounded-[var(--radius)]" aria-hidden="true" />
        <div className="flex flex-col gap-1 pt-1">
          {song.artist && <span className="text-sm text-foreground/60">{song.artist}</span>}
          <h1 className="text-3xl font-bold leading-tight">{song.title}</h1>
          <p className="text-sm text-foreground/60">
            tuning {tuningLabel} &bull; {Math.round(song.tempoBpm)} bpm
          </p>
        </div>
      </header>

      {/* key={song.id} is deliberate: forces a fresh StudioTabs mount on every song
          switch, so tab selection and (from M4) metronome playback/bpm reset per-song
          instead of leaking across songs. See app/app/studio/STATUS.md. */}
      <StudioTabs
        key={song.id}
        notes={song.notes}
        tuning={song.tuning}
        tempoBpm={song.tempoBpm}
        asciiTab={renderAsciiTab(song.notes)}
      />
    </div>
  );
}
