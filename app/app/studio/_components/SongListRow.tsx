import Link from "next/link";
import { cn } from "@/lib/cn";
import type { songs } from "@/db/schema";

export type SongListItem = Pick<typeof songs.$inferSelect, "id" | "title" | "artist" | "tempoBpm">;

export function SongListRow({ song, isSelected }: { song: SongListItem; isSelected: boolean }) {
  return (
    <li>
      <Link
        href={{ pathname: "/studio", query: { song: song.id } }}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-3 transition-colors",
          isSelected ? "bg-zinc-100" : "bg-white hover:bg-zinc-50"
        )}
      >
        <div className="w-10 h-10 shrink-0 rounded bg-zinc-200" aria-hidden="true" />
        <div className="min-w-0 flex flex-col">
          {song.artist && <span className="text-xs text-zinc-500 truncate">{song.artist}</span>}
          <span className="text-sm font-medium text-zinc-900 truncate">{song.title}</span>
        </div>
      </Link>
    </li>
  );
}
