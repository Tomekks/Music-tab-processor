import { Suspense } from "react";
import { getSongList } from "@/lib/songs";
import { StudioShell } from "./_components/StudioShell";
import { SongListSidebar } from "./_components/SongListSidebar";
import { SongDetail, SongDetailSkeleton } from "./_components/SongDetail";

// Dynamic per request (searchParams-based selection), but data comes from
// short-lived caches (docs/specs/song-list-cache.md,
// docs/specs/song-detail-streaming.md) -- not re-queried from Turso every time.
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
  // Cached (2026-09-19, docs/specs/song-list-cache.md): songs only change via
  // manual publish.py runs, so the list is cached 60s instead of re-queried
  // (~445ms Turso round-trip) on every navigation.
  const list = await getSongList();

  // ?song= is a soft UI preference, not a resource identifier -- an invalid or stale
  // id silently falls back to the most recent song instead of 404ing (deliberately
  // different from the retired v0.1 UI's hard notFound(), see archive/v0.1-web-ui/).
  const { song: raw } = await searchParams;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const selectedId = requested && list.some((s) => s.id === requested) ? requested : (list[0]?.id ?? null);

  // The sidebar resolves from the cached list immediately; the detail streams
  // in via Suspense (2026-09-19, docs/specs/song-detail-streaming.md) so a
  // slow detail query never freezes song-switching. Deliberately no
  // route-level loading.tsx -- that would blank the sidebar too.
  return (
    <StudioShell
      sidebar={<SongListSidebar songs={list.map((s) => ({ ...s, coverArtUrl: s.coverArtUrl ?? undefined, spotifyArtist: s.spotifyArtist ?? undefined }))} selectedId={selectedId} />}
      detail={
        <Suspense fallback={<SongDetailSkeleton />}>
          <SongDetail selectedId={selectedId} />
        </Suspense>
      }
    />
  );
}
