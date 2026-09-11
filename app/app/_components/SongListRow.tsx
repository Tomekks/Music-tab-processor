import Link from "next/link";
import { cn } from "@/lib/cn";
import type { songs } from "@/db/schema";

export type SongListItem = Pick<typeof songs.$inferSelect, "id" | "title" | "artist" | "tempoBpm"> & {
  // Real Spotify cover art, same lookup as the selected song's header -- see
  // app/page.tsx and app/lib/spotify.ts. Undefined/empty both mean "no art
  // found," same degrade-gracefully rule as everywhere else Spotify data is used.
  coverArtUrl?: string;
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
          "flex items-center gap-3 px-4 py-3 transition-colors",
          isSelected ? "bg-accent/10" : "hover:bg-foreground/[0.04]"
        )}
      >
        {song.coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.coverArtUrl} alt="" className="w-10 h-10 shrink-0 object-cover rounded-[var(--radius)]" />
        ) : (
          <div className="w-10 h-10 shrink-0 bg-foreground/10 rounded-[var(--radius)]" aria-hidden="true" />
        )}
        <div className="min-w-0 flex flex-col">
          {/* Always rendered, even with no artist data -- reserves the same
              two-line row height for every song rather than some rows being
              taller than others depending on what's in the DB. */}
          <span className="text-xs text-foreground/60 truncate">{song.artist || " "}</span>
          <span className="text-sm font-medium truncate">{song.title}</span>
        </div>
      </Link>
    </li>
  );
}
