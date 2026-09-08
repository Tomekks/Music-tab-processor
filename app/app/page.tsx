import Link from "next/link";
import { db } from "@/db/client";
import { songs } from "@/db/schema";

export const dynamic = "force-dynamic"; // always show the latest published songs, no caching

export default async function HomePage() {
  const allSongs = await db.select().from(songs);

  return (
    <main className="max-w-2xl mx-auto py-16 px-6">
      <h1 className="text-2xl font-semibold mb-8">Guitar Practice Tabs</h1>
      {allSongs.length === 0 ? (
        <p className="text-zinc-500">No songs published yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {allSongs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/songs/${song.id}`}
                className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium">{song.title}</span>
                <span className="text-zinc-500 text-sm ml-2">{song.tempoBpm.toFixed(0)} bpm</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
