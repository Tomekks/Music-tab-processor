import Link from "next/link";
import { cn } from "@/lib/cn";
import type { songs } from "@/db/schema";

export type SongListItem = Pick<typeof songs.$inferSelect, "id" | "title" | "artist" | "tempoBpm"> & {
  // Real Spotify cover art, fetched once at publish time (2026-09-18) and
  // stored on the song row -- see pipeline/s05_publish/publish.py. Undefined/
  // empty both mean "no art found," same degrade-gracefully rule as before.
  coverArtUrl?: string;
  // Fallback only -- the DB's own artist column wins when it has one, same
  // rule as SongDetailPane's displayArtist. Backfills the "missing artist"
  // gap from M6 for songs ingested without it (see SongDetailPane.tsx).
  spotifyArtist?: string;
};

export function SongListRow({ song, isSelected }: { song: SongListItem; isSelected: boolean }) {
  return (
    <li>
      <Link
        // Direct to "/" with the song as a query param -- not "/studio" (that's
        // now just a redirect stub for old links, see app/studio/page.tsx). Two
        // real bugs this fixes at once: (1) the extra client-side hop through
        // /studio's bare, unthemed redirect page briefly showed the root dark-
        // mode background before bouncing back to "/", visible as a jarring
        // dark flash on a slow connection; (2) the address bar now genuinely
        // reflects the selected song instead of round-tripping through /studio.
        href={{ pathname: "/", query: { song: song.id } }}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-4 transition-colors",
          isSelected ? "bg-accent/10" : "hover:bg-foreground/[0.04]"
        )}
      >
        {song.coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.coverArtUrl} alt="" className="w-12 h-12 shrink-0 object-cover rounded-[var(--radius)]" />
        ) : (
          <div className="w-10 h-10 shrink-0 bg-foreground/10 rounded-[var(--radius)]" aria-hidden="true" />
        )}
        <div className="min-w-0 flex flex-col">
          {/* Always rendered, even with no artist data -- reserves the same
              two-line row height for every song rather than some rows being
              taller than others depending on what's in the DB. */}
          <span className="text-xs text-foreground/60 truncate">{song.artist || song.spotifyArtist || " "}</span>
          <span className="text-sm font-semibold truncate">{song.title}</span>
        </div>
      </Link>
    </li>
  );
}
