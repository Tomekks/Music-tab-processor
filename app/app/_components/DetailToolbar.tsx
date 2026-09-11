import { TabSelector } from "./TabSelector";
import { MetronomeControls } from "@/components/MetronomeControls";
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
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  metronome: { bpm: number; setBpm: (bpm: number) => void; isPlaying: boolean; toggle: () => void; reset: () => void };
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  return (
    <div className="border-t border-border px-8 py-4 flex items-center justify-between gap-6">
      <TabSelector tabs={TABS} active={active} onSelect={onSelect} />
      <MetronomeControls
        bpm={metronome.bpm}
        onBpmChange={metronome.setBpm}
        isPlaying={metronome.isPlaying}
        onToggle={metronome.toggle}
        onReset={metronome.reset}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
      />
    </div>
  );
}
