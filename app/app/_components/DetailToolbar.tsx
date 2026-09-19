import { TabSelector } from "./TabSelector";
import { MetronomeControls } from "@/components/MetronomeControls";
import { StringOrientationToggle } from "@/components/StringOrientationToggle";
import type { LoopRange } from "@/hooks/useMetronome";
import type { Tab } from "./StudioTabs";
import { TABS } from "./StudioTabs";

// TabSelector and MetronomeControls are permanent siblings here, both always mounted
// regardless of which tab is active -- this is the fix for the bug SongTabs.tsx has
// today, where the metronome only mounts inside the Sheet tab's branch. Neither
// component knows the other exists; this file is the only place that puts them next
// to each other.
export function DetailToolbar({
  active,
  onSelect,
  metronome,
  soundEnabled,
  onToggleSound,
  highOnTop,
  onToggleHighOnTop,
  loopRange,
  onClearLoop,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  metronome: { bpm: number; setBpm: (bpm: number) => void; isPlaying: boolean; toggle: () => void; reset: () => void };
  soundEnabled: boolean;
  onToggleSound: () => void;
  // Sheet-only (Fretboard owns its own separate orientation toggle, rendered
  // inside FretboardDiagram itself) -- see SheetDiagram.tsx and DiagramViewport.tsx.
  highOnTop: boolean;
  onToggleHighOnTop: () => void;
  // Also Sheet-only (2026-09-10 drag-to-select, see SheetDiagram.RULES.md rule
  // 10). Rendered here, before the Reset button, instead of inside the Sheet
  // view itself -- see SheetDiagram.tsx's showOrientationToggle prop doc comment.
  loopRange: LoopRange | null;
  onClearLoop: () => void;
}) {
  return (
    <div className="border-t border-border px-8 py-4 flex items-center justify-between gap-6">
      <TabSelector tabs={TABS} active={active} onSelect={onSelect} />
      <div className="flex items-center gap-3">
        {active === "Sheet" && loopRange && (
          <button
            onClick={onClearLoop}
            className="text-xs font-mono px-2 py-1 rounded-full"
            style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
            title="Clear loop"
          >
            Loop: steps {loopRange.start + 1}–{loopRange.end + 1} ✕
          </button>
        )}
        <MetronomeControls
          bpm={metronome.bpm}
          onBpmChange={metronome.setBpm}
          isPlaying={metronome.isPlaying}
          onToggle={metronome.toggle}
          onReset={metronome.reset}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
        />
        {active === "Sheet" && <StringOrientationToggle highOnTop={highOnTop} onToggle={onToggleHighOnTop} />}
      </div>
    </div>
  );
}
