import { TabSelector } from "./TabSelector";
import {
  ResetButton,
  PlayButton,
  TempoField,
  VolumeButton,
  BpmDecrementButton,
  BpmIncrementButton,
} from "@/components/MetronomeControls";
import { StringOrientationToggle } from "@/components/StringOrientationToggle";
import type { LoopRange } from "@/hooks/useMetronome";
import type { Tab } from "./StudioTabs";
import { TABS } from "./StudioTabs";

// TabSelector and the transport rows are permanent siblings here, both always
// mounted regardless of which tab is active -- this is the fix for the bug
// SongTabs.tsx has today, where the metronome only mounts inside the Sheet
// tab's branch. Neither component knows the other exists; this file is the
// only place that puts them next to each other.
//
// Row 1 (spec 1+4): under md, TabSelector owns row 1 and the transport group
// wraps below it (flex-wrap -- the loop pill never overlaps the diagrams).
// Shortcut state is gone (spec 8d removed the opt-out -- always on, hint
// lives in the header now); this file only renders controls.
//
// TransportLayout (spec 8d, option A; responsive contract amended by the
// 8d-wrap fix-spec and live bug reports): explicit row wrappers composing
// the MetronomeControls pieces. Tabs always own the first row; at xl and
// above the wrappers collapse via xl:contents into one complete transport
// row below the tabs (Reset, Play, Flip, Volume, BPM -/Tempo/+, Loop -- the
// shared-row-with-tabs plan proved ~38px short even after the final
// permitted xl spacing adjustment, measured slack 0.0px, so the fix-spec
// relaxed 1280 to this two-row layout rather than shaving further; the
// 2026-09-25 IconButton migration narrowed every control, which may or may
// not close that 38px gap -- unverified, left as this same two-row layout
// until it's actually re-measured). Below
// xl the wrappers are content-width flow items (never basis-full: forcing
// each box full-width stacked Flip/MIDI/Tempo into a solo column instead of
// letting them fill the second row one by one, reported as a live bug with
// screenshot) with explicit order: primary -> flip -> midi -> tempo -> pill
// (parent-level order is what lets Flip lead below xl while all controls
// share one flex container). The loop pill sits in its own wrapper last per
// the bug report. All controls keep shrink-0 content widths; Flip (whose
// own file is out of the allowlist) is protected by its wrapper box. Reset,
// Play, Volume, and Flip are all IconButton (2026-09-25 migration) and share
// its fixed --component-icon-button-size (44px) so no button renders larger.
//
// Pill (spec 2): always mounted in exactly one of two states -- set-range
// clear-button or empty-state status text -- so the toolbar never reflows
// between loop states. Wash styling belongs to spec 3; position/behavior here.
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
  // Spec 7: the single orientation control -- always mounted on every tab
  // (Sheet, Fretboard, Ascii), owned by StudioTabs as persisted global state.
  // SheetDiagram and FretboardDiagram both follow it and suppress their own
  // in-view toggles when controlled -- see StudioTabs.tsx and
  // DiagramViewport.tsx.
  highOnTop: boolean;
  onToggleHighOnTop: () => void;
  // Loop range creation is Sheet-only (2026-09-10 drag-to-select, see
  // SheetDiagram.RULES.md rule 10) -- but the pill itself renders on every
  // tab (spec 2): a set loop must stay visible and clearable outside Sheet,
  // and the empty state doubles as loop-feature discovery.
  loopRange: LoopRange | null;
  onClearLoop: () => void;
}) {
  return (
    <div className="border-t border-border px-8 py-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:gap-6">
        <TabSelector tabs={TABS} active={active} onSelect={onSelect} />
        <TransportLayout
          loopRange={loopRange}
          onClearLoop={onClearLoop}
          metronome={metronome}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          highOnTop={highOnTop}
          onToggleHighOnTop={onToggleHighOnTop}
        />
      </div>
    </div>
  );
}

function TransportLayout({
  loopRange,
  onClearLoop,
  metronome,
  soundEnabled,
  onToggleSound,
  highOnTop,
  onToggleHighOnTop,
}: {
  loopRange: LoopRange | null;
  onClearLoop: () => void;
  metronome: { bpm: number; setBpm: (bpm: number) => void; isPlaying: boolean; toggle: () => void; reset: () => void };
  soundEnabled: boolean;
  onToggleSound: () => void;
  highOnTop: boolean;
  onToggleHighOnTop: () => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-3 order-1 xl:contents shrink-0">
        <ResetButton onReset={metronome.reset} />
        <PlayButton isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
      </div>
      <div className="order-2 xl:contents shrink-0">
        <StringOrientationToggle highOnTop={highOnTop} onToggle={onToggleHighOnTop} />
      </div>
      <div className="order-3 xl:contents shrink-0">
        <VolumeButton soundEnabled={soundEnabled} onToggleSound={onToggleSound} />
      </div>
      <div className="order-4 xl:contents shrink-0">
        <div className="flex items-center gap-1.5">
          <BpmDecrementButton bpm={metronome.bpm} onBpmChange={metronome.setBpm} />
          <TempoField bpm={metronome.bpm} onBpmChange={metronome.setBpm} />
          <BpmIncrementButton bpm={metronome.bpm} onBpmChange={metronome.setBpm} />
        </div>
      </div>
      <div className="order-5 xl:contents shrink-0">
        {loopRange ? (
          <button
            onClick={onClearLoop}
            data-umami-event="clear-loop"
            className="text-xs font-mono px-2 py-1 rounded-full shrink-0"
            style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
            title="Clear loop"
          >
            Loop: steps {loopRange.start + 1}–{loopRange.end + 1} ✕
          </button>
        ) : (
          <span aria-hidden={false} className="text-xs font-mono px-2 py-1 rounded-full text-foreground/60 shrink-0">
            Loop: none
          </span>
        )}
      </div>
    </div>
  );
}
