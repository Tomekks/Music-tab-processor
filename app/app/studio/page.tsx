import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { songs } from "@/db/schema";
import { StudioShell } from "./_components/StudioShell";
import { SongListSidebar } from "./_components/SongListSidebar";
import { SongDetailPane } from "./_components/SongDetailPane";

// Always show the latest published songs, no caching -- same posture as the two
// existing routes this page sits alongside (see app/app/page.tsx).
export const dynamic = "force-dynamic";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Column-projected: the sidebar only ever needs enough to render a row, never the
  // full notes/tuning JSON blobs -- those are fetched once, below, for just the
  // selected song. Ordered newest-first so "first in the list" is a stable, meaningful
  // default.
  const list = await db
    .select({ id: songs.id, title: songs.title, artist: songs.artist, tempoBpm: songs.tempoBpm })
    .from(songs)
    .orderBy(desc(songs.createdAt));

  // ?song= is a soft UI preference, not a resource identifier -- an invalid or stale
  // id silently falls back to the most recent song instead of 404ing (deliberately
  // different from /songs/[id]'s hard notFound()).
  const { song: raw } = await searchParams;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const selectedId = requested && list.some((s) => s.id === requested) ? requested : (list[0]?.id ?? null);

  const [fullSong] = selectedId ? await db.select().from(songs).where(eq(songs.id, selectedId)) : [];

  return (
    <StudioShell
      sidebar={<SongListSidebar songs={list} selectedId={selectedId} />}
      detail={<SongDetailPane song={fullSong ?? null} />}
    />
  );
}
