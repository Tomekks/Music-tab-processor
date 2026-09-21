// Thin wrapper around a pre-rendered ascii string -- deliberately not rewritten to
// support a currentStep playhead (renderTab.ts returns one opaque joined string, not
// per-step structure; see app/app/studio/STATUS.md's scope cuts). The banner below
// is the answer to that cut: Ascii stays a static reference printout, and the banner
// says playback continues on Sheet or Fretboard -- announced once via role="status",
// never updated per step. Structurally
// extracted from app/components/SongTabs.tsx's inline <pre> block, but recolored to
// bg-background/text-foreground (light, matching the rest of /studio) instead of that
// block's dark bg-zinc-950/text-zinc-100 -- this file is studio-only, not shared, so
// safe to restyle outright.
export function AsciiView({ asciiTab }: { asciiTab: string }) {
  return (
    <>
      <div role="status" className="text-sm text-foreground/60">
        Ascii is a static reference — follow playback on Sheet or Fretboard.
      </div>
      <pre className="bg-background text-foreground text-sm rounded-lg p-6 overflow-x-auto font-mono leading-relaxed">
        {asciiTab}
      </pre>
    </>
  );
}
