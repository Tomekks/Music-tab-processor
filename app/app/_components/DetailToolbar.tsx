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
// Shared row at xl (2026-09-25 re-measure): the outer wrapper switches to
// xl:flex-row/justify-between, putting TabSelector and TransportLayout side
// by side on one row -- the "shared-row-with-tabs" layout the 8d-wrap
// fix-spec previously abandoned as ~38px short at this same 1280 breakpoint.
// Re-measured after the IconButton migration narrowed every control from a
// text-labelled button to a fixed 44x44 icon square: natural combined width
// (tabs ~278px + transport ~575px + gap) is ~880px against a ~1040px
// available container at exactly 1280px viewport width -- real slack, not a
// guess -- so the shared row now fits. Below xl, TabSelector and
// TransportLayout stack (flex-col) same as before.
//
// TransportLayout (spec 8d, option A; responsive contract amended by the
// 8d-wrap fix-spec and live bug reports): explicit row wrappers composing
// the MetronomeControls pieces. At xl and above the wrappers collapse via
// xl:contents into TransportLayout's own single row (Reset, Play, Volume,
// Flip, Tempo/-/+, Loop). Below xl the wrappers are content-width flow items
// (never basis-full: forcing each box full-width stacked controls into a
// solo column instead of letting them fill a row one by one, reported as a
// live bug with screenshot) with explicit order: primary group (Reset,
// Play, Volume, Flip -- one wrapper, order-1) -> bpm group (order-4) -> pill
// (order-5). The loop pill sits in its own wrapper last per the bug report.
// All controls keep shrink-0 content widths. Reset, Play, Volume, and Flip
// are all IconButton (2026-09-25 migration) and share its fixed
// --component-icon-button-size (44px) so no button renders larger.
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
      <div className="flex flex-col gap-3 md:gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
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
        <VolumeButton soundEnabled={soundEnabled} onToggleSound={onToggleSound} />
        <StringOrientationToggle highOnTop={highOnTop} onToggle={onToggleHighOnTop} />
      </div>
      {/* xl:ml-3 (on top of the row's own gap-3): a wider visual gap between
          the transport cluster and the BPM cluster, matching the reference
          layout's grouped spacing -- xl-only so the below-xl wrap/flow rows
          (already measured/tested) keep their existing tighter spacing. */}
      <div className="order-4 xl:contents shrink-0">
        <div className="flex items-center gap-1.5 xl:ml-3">
          <TempoField bpm={metronome.bpm} onBpmChange={metronome.setBpm} />
          <BpmDecrementButton bpm={metronome.bpm} onBpmChange={metronome.setBpm} />
          <BpmIncrementButton bpm={metronome.bpm} onBpmChange={metronome.setBpm} />
        </div>
      </div>
      {/* min-w-[22ch] (font-mono, so 1ch is exact): reserves space for the
          longest realistic "Loop: steps 999-999 x" content up front, so
          switching between the short unset text and the longer set-range +
          close-button text never changes this box's width and never shoves
          every other control left when a loop gets selected. xl:ml-3: same
          grouped-spacing gap as the BPM cluster above. */}
      <div className="order-5 xl:contents shrink-0 min-w-[22ch]">
        {loopRange ? (
          <button
            onClick={onClearLoop}
            data-umami-event="clear-loop"
            className="text-xs font-mono px-2 py-1 rounded-full shrink-0 min-w-[22ch] xl:ml-3"
            style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
            title="Clear loop"
          >
            Loop: steps {loopRange.start + 1}–{loopRange.end + 1} ✕
          </button>
        ) : (
          <span
            aria-hidden={false}
            className="text-xs font-mono px-2 py-1 rounded-full text-foreground/60 shrink-0 min-w-[22ch] xl:ml-3 inline-block"
          >
            Loop: none
          </span>
        )}
      </div>
    </div>
  );
}
