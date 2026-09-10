import { redirect } from "next/navigation";

// /songs/[id] was the v0.1 UI's per-song page -- retired and archived (see
// archive/v0.1-web-ui/README.md). The single-page workspace at "/" now selects a
// song via ?song=<id> on itself, so this forwards there rather than 404ing, for
// anyone with an old link.
export default async function SongRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/?song=${encodeURIComponent(id)}`);
}
