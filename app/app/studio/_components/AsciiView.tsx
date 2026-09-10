// Thin wrapper around a pre-rendered ascii string -- deliberately not rewritten to
// support a currentStep playhead (renderTab.ts returns one opaque joined string, not
// per-step structure; see app/app/studio/STATUS.md's scope cuts). Extracted verbatim
// from app/components/SongTabs.tsx's inline <pre> block.
export function AsciiView({ asciiTab }: { asciiTab: string }) {
  return (
    <pre className="bg-zinc-950 text-zinc-100 text-sm rounded-lg p-6 overflow-x-auto font-mono leading-relaxed">
      {asciiTab}
    </pre>
  );
}
