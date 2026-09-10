import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { songs } from "@/db/schema";
import { renderAsciiTab } from "@/lib/renderTab";
import { pitchClassName } from "@/lib/tabNotation";
import { SongTabs } from "@/components/SongTabs";

export const dynamic = "force-dynamic";

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [song] = await db.select().from(songs).where(eq(songs.id, id));

  if (!song) notFound();

  // Standard tuning display (e.g. "E-A-D-G-B-e"), not raw MIDI numbers --
  // lowercase only the highest string, same convention as the ASCII tab
  // and the fretboard/sheet diagrams.
  const tuningLabel = song.tuning
    .map((midi, i) => (i === song.tuning.length - 1 ? pitchClassName(midi).toLowerCase() : pitchClassName(midi)))
    .join("-");

  return (
    // Fixed max width (not shrink-to-fit) so switching between Sheet,
    // Fretboard, and Ascii -- each a different natural content width --
    // doesn't change the page's own width and cause everything to jump.
    <main className="w-full max-w-[1200px] mx-auto py-16 px-6">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← All songs
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">{song.title}</h1>
      {/* Tempo now lives in the metronome controls (SongTabs -> Sheet), not
          duplicated here -- it's the one place bpm is both shown and set. */}
      <p className="text-zinc-500 mb-8">tuning {tuningLabel}</p>
      <SongTabs notes={song.notes} tuning={song.tuning} tempoBpm={song.tempoBpm} asciiTab={renderAsciiTab(song.notes)} />
    </main>
  );
}
