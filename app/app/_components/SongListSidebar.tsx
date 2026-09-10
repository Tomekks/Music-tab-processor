import { SongListRow, type SongListItem } from "./SongListRow";

export function SongListSidebar({ songs, selectedId }: { songs: SongListItem[]; selectedId: string | null }) {
  if (songs.length === 0) {
    return <p className="p-4 text-sm text-zinc-500">No songs published yet.</p>;
  }

  return (
    <ul className="flex flex-col">
      {songs.map((song) => (
        <SongListRow key={song.id} song={song} isSelected={song.id === selectedId} />
      ))}
    </ul>
  );
}
