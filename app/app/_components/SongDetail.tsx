import { SongDetailPane } from "./SongDetailPane";
import { getSongById } from "@/lib/songs";

// Async server component (2026-09-19, docs/specs/song-detail-streaming.md):
// page.tsx renders the sidebar immediately and streams this inside Suspense,
// so song-switching updates the selection instantly while the detail fills in.
// Not an error boundary addition -- a detail-query failure behaves exactly as
// the old inline version did (same failure mode, deliberately unchanged).
export async function SongDetail({ selectedId }: { selectedId: string | null }) {
  const fullSong = selectedId ? await getSongById(selectedId) : undefined;

  return (
    <SongDetailPane
      song={fullSong ?? null}
      coverArtUrl={fullSong?.coverArtUrl ?? undefined}
      spotifyArtist={fullSong?.spotifyArtist ?? undefined}
      spotifyUrl={fullSong?.spotifyUrl ?? null}
    />
  );
}

// Skeleton matching the detail header shape (art block + two text lines).
// Pure presentational, no props -- renders without errors for the e2e
// zero-console-error assertion even while detail data is still streaming.
export function SongDetailSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0" aria-hidden="true">
      <header className="shrink-0 flex items-end gap-6 p-8 pb-6">
        <div className="w-32 h-32 shrink-0 bg-foreground/10 rounded-[var(--radius)]" />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-foreground/60"> </span>
          <div className="h-9 w-64 bg-foreground/10 rounded-[var(--radius)]" />
        </div>
      </header>
    </div>
  );
}
