import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { songs } from "@/db/schema";
import { StudioShell } from "./_components/StudioShell";
import { SongListSidebar } from "./_components/SongListSidebar";
import { SongDetailPane } from "./_components/SongDetailPane";

// Always show the latest published songs, no caching.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Column-projected: the sidebar only ever needs enough to render a row, never the
  // full notes/tuning JSON blobs -- those are fetched once, below, for just the
  // selected song. Ordered newest-first so "first in the list" is a stable, meaningful
  // default. coverArtUrl/spotifyArtist are read straight from the DB now (2026-09-18)
  // -- populated once at publish time (pipeline/s05_publish/publish.py), not fetched
  // live here on every request. This is what fixed slow song-switching: the old
  // version made a live Spotify API call per song in this list, on every navigation.
  const list = await db
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

  // ?song= is a soft UI preference, not a resource identifier -- an invalid or stale
  // id silently falls back to the most recent song instead of 404ing (deliberately
  // different from the retired v0.1 UI's hard notFound(), see archive/v0.1-web-ui/).
  const { song: raw } = await searchParams;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const selectedId = requested && list.some((s) => s.id === requested) ? requested : (list[0]?.id ?? null);

  const [fullSong] = selectedId ? await db.select().from(songs).where(eq(songs.id, selectedId)) : [];

  return (
    <StudioShell
      sidebar={<SongListSidebar songs={list.map((s) => ({ ...s, coverArtUrl: s.coverArtUrl ?? undefined, spotifyArtist: s.spotifyArtist ?? undefined }))} selectedId={selectedId} />}
      detail={
        <SongDetailPane
          song={fullSong ?? null}
          coverArtUrl={fullSong?.coverArtUrl ?? undefined}
          spotifyArtist={fullSong?.spotifyArtist ?? undefined}
          spotifyUrl={fullSong?.spotifyUrl ?? null}
        />
      }
    />
  );
}
