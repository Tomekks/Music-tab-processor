"use client";

// "Sheet": a Songsterr-style tab staff -- 6 lines (one per string), notes as
// round shapes with the fret number inside, positioned on the correct line,
// left to right in playback order, wrapping to a new system when a line
// fills up. Chords (simultaneous notes) land at the same horizontal
// position across different string-lines, which is what actually shows
// "play these together" -- no separate stacking logic needed, it falls out
// of one note per string, same step.
//
// Line-wrapping is responsive: steps-per-line is measured from the actual
// available width (ResizeObserver), not a fixed constant -- a narrower
// window shows fewer notes per line and a taller page, not clipped content.
//
// Optionally takes a currentStep (from useMetronome, owned by the parent --
// this component has no timing logic of its own) and draws a playhead at
// that step, across whichever system it currently falls in.
//
// Deliberately notes only, no rhythm notation (no stems/beaming/rests) --
// see SheetDiagram.RULES.md for why, and what's logged as a real future
// idea rather than built here.
//
// Independent of FretboardDiagram.tsx (shares only the generic step/naming
// helpers in tabNotation.ts, not fretboard-specific logic), and styled
// through the real design-system tokens (--background/--foreground from
// app/app/globals.css) rather than hardcoded colors, so it actually adapts
// to dark mode -- a known gap in FretboardDiagram, not repeated here.

import { useEffect, useRef, useState } from "react";
import {
  chunk,
  computeStepsPerLine,
  getDisplayRow,
  groupNotesByStep,
  intersectLoopRangeWithSystem,
  pitchClassName,
  stepIndexForX,
  stringThickness,
  type TimedNote,
} from "@/lib/tabNotation";
import type { LoopRange } from "@/hooks/useMetronome";
import { StringOrientationToggle } from "./StringOrientationToggle";

const DEFAULT_STEPS_PER_LINE = 16;
const STEP_WIDTH = 38;
const LINE_GAP = 20;
const PAD_LEFT = 26;
const PAD_RIGHT = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const NOTE_RADIUS = 9;

function System({
  steps,
  nStrings,
  tuning,
  highlightIndex,
  highOnTop,
  startIdx,
  loopLocalRange,
  onSelectRange,
  onClearLoop,
}: {
  steps: { string: number; fret: number }[][];
  nStrings: number;
  tuning: number[];
  highlightIndex: number | null;
  highOnTop: boolean;
  // Loop drag-select (2026-09-10) -- see SheetDiagram.RULES.md rule 10. A
  // drag is scoped to one system/line at a time (not built: dragging across
  // a line wrap), which covers the common case of looping a short section.
  startIdx: number;
  loopLocalRange: { start: number; end: number } | null;
  onSelectRange: (globalStart: number, globalEnd: number) => void;
  onClearLoop: () => void;
}) {
  const width = PAD_LEFT + steps.length * STEP_WIDTH + PAD_RIGHT;
  const height = PAD_TOP + (nStrings - 1) * LINE_GAP + PAD_BOTTOM;

  const yFor = (stringIndex: number) => PAD_TOP + getDisplayRow(stringIndex, nStrings, highOnTop) * LINE_GAP;
  const xForIndex = (i: number) => PAD_LEFT + i * STEP_WIDTH + STEP_WIDTH / 2;

  // In-progress drag preview, local to this system -- committed to the real
  // (global) loopRange only on pointer-up, so dragging doesn't churn parent
  // state (and re-render every system) on every pixel of mouse movement.
  const [dragLocal, setDragLocal] = useState<{ start: number; end: number } | null>(null);
  const dragStartRef = useRef<number | null>(null);

  const localIndexForClientX = (clientX: number, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    return stepIndexForX(clientX - rect.left, STEP_WIDTH, PAD_LEFT, steps.length);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const idx = localIndexForClientX(e.clientX, e.currentTarget);
    dragStartRef.current = idx;
    setDragLocal({ start: idx, end: idx });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragStartRef.current === null) return;
    const idx = localIndexForClientX(e.clientX, e.currentTarget);
    setDragLocal({ start: Math.min(dragStartRef.current, idx), end: Math.max(dragStartRef.current, idx) });
  };
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const down = dragStartRef.current;
    if (down === null) return;
    const up = localIndexForClientX(e.clientX, e.currentTarget);
    dragStartRef.current = null;
    setDragLocal(null);
    if (down === up) onClearLoop(); // a plain click (no movement) clears any existing loop
    else onSelectRange(startIdx + Math.min(down, up), startIdx + Math.max(down, up));
  };

  const band = dragLocal ?? loopLocalRange;

  return (
    <svg
      width={width}
      height={height}
      className="block cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Loop selection band -- drawn first so strings/notes paint over it.
          Same accent color as the rest of the app's interactive highlights. */}
      {band && (
        <rect
          x={xForIndex(band.start) - STEP_WIDTH / 2}
          y={PAD_TOP - 6}
          width={(band.end - band.start + 1) * STEP_WIDTH}
          height={height - PAD_TOP - PAD_BOTTOM + 12}
          fill="var(--color-accent)"
          fillOpacity={0.15}
        />
      )}

      {/* strings -- e/B/G tied at the thinnest, D/A/E stepping up, like a real set */}
      {Array.from({ length: nStrings }, (_, i) => (
        <line
          key={i}
          x1={PAD_LEFT - 8}
          x2={width - PAD_RIGHT + 8}
          y1={yFor(i)}
          y2={yFor(i)}
          stroke="var(--foreground)"
          strokeOpacity={0.22}
          strokeWidth={stringThickness(i, nStrings)}
        />
      ))}

      {tuning.map((midi, i) => {
        const name = pitchClassName(midi);
        return (
          <text key={i} x={PAD_LEFT - 12} y={yFor(i) + 3.5} textAnchor="end" fontSize={10} fontFamily="monospace" fill="var(--foreground)" fillOpacity={0.55}>
            {i === nStrings - 1 ? name.toLowerCase() : name}
          </text>
        );
      })}

      {highlightIndex !== null && (
        <line
          x1={xForIndex(highlightIndex)}
          x2={xForIndex(highlightIndex)}
          y1={PAD_TOP - 6}
          y2={height - PAD_BOTTOM + 6}
          stroke="var(--foreground)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      )}

      {steps.map((step, i) => {
        const x = xForIndex(i);
        const active = i === highlightIndex;
        return step.map((note, j) => (
          <g key={i + ":" + j}>
            <circle
              cx={x}
              cy={yFor(note.string)}
              r={NOTE_RADIUS}
              fill={active ? "var(--background)" : "var(--foreground)"}
              stroke="var(--foreground)"
              strokeWidth={active ? 2 : 0}
            />
            <text x={x} y={yFor(note.string) + 3.5} textAnchor="middle" fontSize={9.5} fontFamily="monospace" fill={active ? "var(--foreground)" : "var(--background)"}>
              {note.fret}
            </text>
          </g>
        ));
      })}
    </svg>
  );
}

// Extracted from SheetDiagram itself so that component's own complexity stays
// under the lint ceiling -- this row's two independent conditionals (header
// visibility, toggle label) belong together but don't need to live inline.
// The flip toggle is independent of showHeader -- callers that hide the
// "Sheet"/tempo header (their own song header already shows tempo, see
// SheetDiagram's showHeader doc comment) still get this control, just
// without the rest of the row.
function SheetControls({
  showHeader,
  tempoBpm,
  highOnTop,
  onToggleHighOnTop,
  loopRange,
  onClearLoop,
}: {
  showHeader: boolean;
  tempoBpm: number;
  highOnTop: boolean;
  onToggleHighOnTop: () => void;
  loopRange: LoopRange | null;
  onClearLoop: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      {showHeader ? (
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium" style={{ opacity: 0.8 }}>Sheet</h2>
          <span className="text-xs font-mono" style={{ opacity: 0.55 }}>♩ = {Math.round(tempoBpm)}</span>
        </div>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        {loopRange && (
          <button
            onClick={onClearLoop}
            className="text-xs font-mono px-2 py-1 rounded-full"
            style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
            title="Clear loop"
          >
            Loop: steps {loopRange.start + 1}–{loopRange.end + 1} ✕
          </button>
        )}
        <StringOrientationToggle highOnTop={highOnTop} onToggle={onToggleHighOnTop} />
      </div>
    </div>
  );
}

export function SheetDiagram({
  notes,
  tuning,
  tempoBpm,
  currentStep = null,
  loopRange = null,
  onSetLoopRange,
  bordered = true,
  showHeader = true,
  showCaption = true,
}: {
  notes: TimedNote[];
  tuning: number[];
  tempoBpm: number;
  currentStep?: number | null;
  // Drag-to-select loop range (2026-09-10) -- see SheetDiagram.RULES.md rule
  // 10. Owned by useMetronome (a timing concern), read/written here.
  loopRange?: LoopRange | null;
  onSetLoopRange?: (range: LoopRange | null) => void;
  // The three below default to this component's original look (a bordered
  // card with its own "Sheet"/tempo header and a caption) so every existing
  // caller (SongTabs.tsx) is pixel-unchanged. /studio's DiagramViewport.tsx
  // opts out of all three -- its own song header already shows the tempo,
  // and the outer card/label is redundant once this is the only thing in
  // the tab's scroll region.
  bordered?: boolean;
  showHeader?: boolean;
  showCaption?: boolean;
}) {
  const nStrings = tuning.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [stepsPerLine, setStepsPerLine] = useState(DEFAULT_STEPS_PER_LINE);
  // Thin e on top by default, matching FretboardDiagram's own default -- see
  // SheetDiagram.RULES.md rule 4 (now a real toggle, not a fixed convention).
  const [highOnTop, setHighOnTop] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setStepsPerLine(computeStepsPerLine(width, STEP_WIDTH, PAD_LEFT, PAD_RIGHT));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const systems = chunk(groupNotesByStep(notes), stepsPerLine);

  return (
    <div
      className={bordered ? "rounded-lg border p-5" : ""}
      style={
        bordered
          ? {
              borderColor: "color-mix(in srgb, var(--foreground) 15%, transparent)",
              background: "var(--background)",
              color: "var(--foreground)",
            }
          : { color: "var(--foreground)" }
      }
    >
      <SheetControls
        showHeader={showHeader}
        tempoBpm={tempoBpm}
        highOnTop={highOnTop}
        onToggleHighOnTop={() => setHighOnTop((v) => !v)}
        loopRange={loopRange}
        onClearLoop={() => onSetLoopRange?.(null)}
      />

      <div ref={containerRef} className="overflow-x-auto">
        <div className="flex flex-col gap-5">
          {systems.map((sys, sysIdx) => {
            const startIdx = sysIdx * stepsPerLine;
            const localHighlight =
              currentStep !== null && currentStep >= startIdx && currentStep < startIdx + sys.length ? currentStep - startIdx : null;
            return (
              <System
                key={sysIdx}
                steps={sys}
                nStrings={nStrings}
                tuning={tuning}
                highlightIndex={localHighlight}
                highOnTop={highOnTop}
                startIdx={startIdx}
                loopLocalRange={intersectLoopRangeWithSystem(loopRange, startIdx, sys.length)}
                onSelectRange={(s, e) => onSetLoopRange?.({ start: s, end: e })}
                onClearLoop={() => onSetLoopRange?.(null)}
              />
            );
          })}
        </div>
      </div>

      {showCaption && (
        <p className="text-xs mt-4" style={{ opacity: 0.45 }}>
          Notes only, in playback order — no rhythm or timing shown yet. See SheetDiagram.RULES.md for what&apos;s not
          built.
        </p>
      )}
    </div>
  );
}
