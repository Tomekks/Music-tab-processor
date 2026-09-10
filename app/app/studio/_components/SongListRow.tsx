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
          isSelected ? "bg-accent/10" : "hover:bg-foreground/[0.04]"
        )}
      >
        <div className="w-10 h-10 shrink-0 bg-foreground/10 rounded-[var(--radius)]" aria-hidden="true" />
        <div className="min-w-0 flex flex-col">
          {song.artist && <span className="text-xs text-foreground/60 truncate">{song.artist}</span>}
          <span className="text-sm font-medium truncate">{song.title}</span>
        </div>
      </Link>
    </li>
  );
}
