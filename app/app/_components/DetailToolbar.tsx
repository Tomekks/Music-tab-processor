import type { ReactNode } from "react";
import { TabSelector } from "./TabSelector";
import { MetronomeControls } from "@/components/MetronomeControls";
import { StringOrientationToggle } from "@/components/StringOrientationToggle";
import type { LoopRange } from "@/hooks/useMetronome";
import type { Tab } from "./StudioTabs";
import { TABS } from "./StudioTabs";
import { TRANSPORT_SHORTCUTS, type ShortcutAction, type ShortcutDef } from "@/lib/keyboardShortcuts";

// TabSelector and MetronomeControls are permanent siblings here, both always mounted
// regardless of which tab is active -- this is the fix for the bug SongTabs.tsx has
// today, where the metronome only mounts inside the Sheet tab's branch. Neither
// component knows the other exists; this file is the only place that puts them next
// to each other.
//
// Row 2 (spec 1+4): under md, TabSelector owns row 1 and the transport group wraps
// row 2 (flex-wrap -- the loop pill never overlaps the diagrams); the hint line +
// opt-out switch below always render. Shortcut state lives in StudioTabs (props),
// never here -- this file only renders what the map says.

// Fail-fast lookup: TRANSPORT_SHORTCUTS pins these actions, so a missing entry
// is a code bug, not a render-time option.
function shortcutFor(action: ShortcutAction): ShortcutDef {
  const found = TRANSPORT_SHORTCUTS.find((s) => s.action === action);
  if (!found) throw new Error(`TRANSPORT_SHORTCUTS is missing action: ${action}`);
  return found;
}

const togglePlayHint = shortcutFor("toggle-play");
const stepBackHint = shortcutFor("step-back");
const stepForwardHint = shortcutFor("step-forward");

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-surface px-1 font-mono">{children}</kbd>;
}
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
  shortcutsEnabled,
  onToggleShortcuts,
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
  // Spec 1+4: owned by StudioTabs (opt-out state + persistence), rendered here.
  shortcutsEnabled: boolean;
  onToggleShortcuts: () => void;
}) {
  return (
    <div className="border-t border-border px-8 py-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <TabSelector tabs={TABS} active={active} onSelect={onSelect} />
        <div className="flex items-center gap-3 flex-wrap">
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
      <div className="flex items-center gap-3 text-xs text-foreground/60">
        <button
          type="button"
          role="switch"
          aria-checked={shortcutsEnabled}
          onClick={onToggleShortcuts}
          className="inline-flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-9 items-center rounded-full border px-0.5"
            style={{
              justifyContent: shortcutsEnabled ? "flex-end" : "flex-start",
              background: shortcutsEnabled
                ? "var(--component-button-primary-background)"
                : "var(--component-button-secondary-background)",
              borderColor: shortcutsEnabled
                ? "var(--component-button-primary-background)"
                : "var(--component-button-secondary-border)",
            }}
          >
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{
                background: shortcutsEnabled
                  ? "var(--component-button-primary-text)"
                  : "var(--component-button-secondary-text)",
              }}
            />
          </span>
          Keyboard shortcuts
        </button>
        {shortcutsEnabled ? (
          <p>
            <Kbd>{togglePlayHint.kbd[0]}</Kbd> {togglePlayHint.label} <span aria-hidden="true">·</span>{" "}
            <Kbd>
              {stepBackHint.kbd[0]}/{stepForwardHint.kbd[0]}
            </Kbd>{" "}
            {stepBackHint.label}
          </p>
        ) : (
          <p>Keyboard shortcuts off</p>
        )}
      </div>
    </div>
  );
}
