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
import { chunk, computeStepsPerLine, getDisplayRow, groupNotesByStep, pitchClassName, stringThickness, type TimedNote } from "@/lib/tabNotation";

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
}: {
  steps: { string: number; fret: number }[][];
  nStrings: number;
  tuning: number[];
  highlightIndex: number | null;
}) {
  const width = PAD_LEFT + steps.length * STEP_WIDTH + PAD_RIGHT;
  const height = PAD_TOP + (nStrings - 1) * LINE_GAP + PAD_BOTTOM;

  // Sheet always reads thin-e-on-top -- the one universal convention for
  // this kind of notation, unlike a bare fretboard diagram where physical
  // orientation is a real preference. No toggle here, unlike
  // FretboardDiagram -- see RULES.md.
  const yFor = (stringIndex: number) => PAD_TOP + getDisplayRow(stringIndex, nStrings, true) * LINE_GAP;
  const xForIndex = (i: number) => PAD_LEFT + i * STEP_WIDTH + STEP_WIDTH / 2;

  return (
    <svg width={width} height={height} className="block">
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

export function SheetDiagram({
  notes,
  tuning,
  tempoBpm,
  currentStep = null,
  bordered = true,
  showHeader = true,
  showCaption = true,
}: {
  notes: TimedNote[];
  tuning: number[];
  tempoBpm: number;
  currentStep?: number | null;
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
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium" style={{ opacity: 0.8 }}>Sheet</h2>
          <span className="text-xs font-mono" style={{ opacity: 0.55 }}>♩ = {Math.round(tempoBpm)}</span>
        </div>
      )}

      <div ref={containerRef} className="overflow-x-auto">
        <div className="flex flex-col gap-5">
          {systems.map((sys, sysIdx) => {
            const startIdx = sysIdx * stepsPerLine;
            const localHighlight =
              currentStep !== null && currentStep >= startIdx && currentStep < startIdx + sys.length ? currentStep - startIdx : null;
            return <System key={sysIdx} steps={sys} nStrings={nStrings} tuning={tuning} highlightIndex={localHighlight} />;
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
