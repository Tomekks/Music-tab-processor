import { SheetDiagram } from "@/components/SheetDiagram";
import { FretboardDiagram } from "@/components/FretboardDiagram";
import { AsciiView } from "./AsciiView";
import type { TimedNote } from "@/lib/tabNotation";
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
}: {
  active: Tab;
  notes: TimedNote[];
  tuning: number[];
  tempoBpm: number;
  asciiTab: string;
  currentStep: number | null;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
      {active === "Sheet" && (
        <SheetDiagram notes={notes} tuning={tuning} tempoBpm={tempoBpm} currentStep={currentStep} />
      )}
      {/* FretboardDiagram doesn't accept currentStep yet -- that prop is added to it in
          M4 (docs/specs/ui-fretboard-playhead.md's spec), which will also update this
          line to pass currentStep through. Passing `notes`/`tuning` only for now keeps
          M3 buildable without touching that file. */}
      {active === "Fretboard" && <FretboardDiagram notes={notes} tuning={tuning} />}
      {active === "Ascii" && <AsciiView asciiTab={asciiTab} />}
    </div>
  );
}
