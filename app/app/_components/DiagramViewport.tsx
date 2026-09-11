import { SheetDiagram } from "@/components/SheetDiagram";
import { FretboardDiagram } from "@/components/FretboardDiagram";
import { AsciiView } from "./AsciiView";
import type { TimedNote } from "@/lib/tabNotation";
import type { LoopRange } from "@/hooks/useMetronome";
import type { Tab } from "./StudioTabs";

// The only scrolling region in the detail pane besides the sidebar -- everything else
// in the detail pane (header, toolbar) is shrink-0 and stays put. See
// app/app/studio/STATUS.md for the full layout mechanism.
export function DiagramViewport({
  active,
  notes,
  tuning,
  tempoBpm,
  asciiTab,
  currentStep,
  loopRange,
  onSetLoopRange,
}: {
  active: Tab;
  notes: TimedNote[];
  tuning: number[];
  tempoBpm: number;
  asciiTab: string;
  currentStep: number | null;
  // Loop-range drag-select (2026-09-10) is Sheet-only for now, same as the
  // playhead -- see SheetDiagram.RULES.md rule 10.
  loopRange: LoopRange | null;
  onSetLoopRange: (range: LoopRange | null) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
      {active === "Sheet" && (
        <SheetDiagram
          notes={notes}
          tuning={tuning}
          tempoBpm={tempoBpm}
          currentStep={currentStep}
          loopRange={loopRange}
          onSetLoopRange={onSetLoopRange}
          bordered={false}
          showHeader={false}
          showCaption={false}
        />
      )}
      {active === "Fretboard" && (
        <FretboardDiagram notes={notes} tuning={tuning} currentStep={currentStep} bordered={false} showHeader={false} showCaption={false} />
      )}
      {active === "Ascii" && <AsciiView asciiTab={asciiTab} />}
    </div>
  );
}
