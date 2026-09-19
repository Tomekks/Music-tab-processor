import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { songs } from "@/db/schema";

// Sidebar list shape: the same column-projected select page.tsx used inline
// before Spec A (docs/specs/song-list-cache.md) -- sidebar rows never need
// the full notes/tuning JSON blobs.
export type SongListEntry = {
  id: string;
  title: string;
  artist: string | null;
  tempoBpm: number;
  coverArtUrl: string | null;
  spotifyArtist: string | null;
};

// Cached: songs change only via manual pipeline/s05_publish/publish.py runs,
// so a 60s time-based revalidation is plenty fresh without depending on any
// unconfirmed assumptions about deploy-scoped cache lifetime. Tag reserved
// for future on-demand invalidation.
export const getSongList = unstable_cache(
  async (): Promise<SongListEntry[]> => {
    return db
      .select({
        id: songs.id,
        title: songs.title,
        artist: songs.artist,
        tempoBpm: songs.tempoBpm,
        coverArtUrl: songs.coverArtUrl,
        spotifyArtist: songs.spotifyArtist,
      })
      .from(songs)
      .orderBy(desc(songs.createdAt));
  },
  ["songs-list"],
  { revalidate: 60, tags: ["songs-list"] },
);

// Full song row for the detail pane (2026-09-19,
// docs/specs/song-detail-streaming.md). Same 60s time-based revalidation
// reasoning as getSongList above. Returns undefined for unknown ids --
// callers fall back exactly as the old inline query did.
export type FullSong = typeof songs.$inferSelect;

export const getSongById = unstable_cache(
  async (id: string): Promise<FullSong | undefined> => {
    const [row] = await db.select().from(songs).where(eq(songs.id, id));
    return row;
  },
  ["song-detail"],
  { revalidate: 60, tags: ["song-detail"] },
);
