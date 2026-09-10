import { pitchClassName, formatSongLength } from "@/lib/tabNotation";
import { renderAsciiTab } from "@/lib/renderTab";
import { StudioTabs } from "./StudioTabs";
import type { songs } from "@/db/schema";

type Song = typeof songs.$inferSelect;

export function SongDetailPane({ song, coverArtUrl }: { song: Song | null; coverArtUrl?: string }) {
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
      <header className="shrink-0 flex items-end gap-6 p-8 pb-6">
        {/* Real cover art when Spotify metadata is available (app/lib/spotify.ts),
            the placeholder otherwise -- no Spotify credentials are configured
            today, so this is always the placeholder for now. Plain <img>, not
            next/image: an external CDN host would need next.config.ts's remote
            image allowlist, not worth it for this optional, not-yet-active path. */}
        {coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverArtUrl} alt="" className="w-32 h-32 shrink-0 object-cover rounded-[var(--radius)]" />
        ) : (
          <div className="w-32 h-32 shrink-0 bg-foreground/10 rounded-[var(--radius)]" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-1">
          {/* Always rendered, even with no artist data -- see SongListRow.tsx's
              identical treatment for why. */}
          <span className="text-sm text-foreground/60">{song.artist || " "}</span>
          <h1 className="text-3xl font-bold leading-tight">{song.title}</h1>
          <p className="text-sm text-foreground/60">
            {formatSongLength(song.notes)} &bull; tuning {tuningLabel} &bull; {Math.round(song.tempoBpm)} bpm
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
