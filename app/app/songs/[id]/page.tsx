import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { songs } from "@/db/schema";
import { renderAsciiTab } from "@/lib/renderTab";
import { FretboardDiagram } from "@/components/FretboardDiagram";

export const dynamic = "force-dynamic";

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [song] = await db.select().from(songs).where(eq(songs.id, id));

  if (!song) notFound();

  return (
    <main className="max-w-3xl mx-auto py-16 px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← All songs
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">{song.title}</h1>
      <p className="text-zinc-500 mb-8">
        {song.tempoBpm.toFixed(0)} bpm · tuning {song.tuning.join("-")}
      </p>
      <pre className="bg-zinc-950 text-zinc-100 text-sm rounded-lg p-6 overflow-x-auto font-mono leading-relaxed mb-6">
        {renderAsciiTab(song.notes)}
      </pre>
      <FretboardDiagram notes={song.notes} tuning={song.tuning} />
    </main>
  );
}
