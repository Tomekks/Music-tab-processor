"use client";

// Sequenced fretboard strip: one small mini-fretboard per playback step
// (a single note, or a whole chord if several strings ring at once),
// chained left to right in the order they're actually played. Replaces an
// earlier single-diagram "everywhere this song touches the neck" overview,
// which turned out not to be useful on its own -- knowing *where* a note is
// isn't enough without knowing *when* it comes, which the ASCII tab already
// shows but not visually on the neck. This is the ASCII tab's order, drawn.
//
// See DECISIONS.md's "Display modes are layered" section for the fuller
// reasoning, including why simultaneous notes (chords) are one step, not
// split into several.
//
// Styled through the real design-system tokens (2026-09-10, matching
// SheetDiagram/AsciiView) rather than hardcoded zinc/white -- this used to be
// the one view that didn't adapt to dark mode or match the other two tabs'
// look. bordered/showHeader/showCaption mirror SheetDiagram's own props for
// the same reason: a caller embedding this inside its own chrome (today,
// DiagramViewport) can opt out of the redundant card/label exactly like it
// already does for Sheet.

import { useState } from "react";
import { getStepWindow } from "@/lib/fretboard";
import { getDisplayRow, groupNotesByStep, pitchClassName, stringThickness, type TimedNote } from "@/lib/tabNotation";
import { StringOrientationToggle } from "./StringOrientationToggle";

const FRET_WIDTH = 26;
const STRING_GAP = 13;
const PAD_LEFT = 14;
const OPEN_GAP = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 6;

function Segment({
  notes,
  nStrings,
  tuning,
  highOnTop,
  active,
}: {
  notes: { string: number; fret: number }[];
  nStrings: number;
  tuning: number[];
  highOnTop: boolean;
  active: boolean;
}) {
  // Uniform fixed-width window -- see FretboardDiagram.RULES.md rule 1.
  const { start, end } = getStepWindow(notes.map((n) => n.fret));
  const cellCount = end - start + 1;

  const nutX = PAD_LEFT + OPEN_GAP;
  const gridWidth = cellCount * FRET_WIDTH;
  const width = nutX + gridWidth + 10;
  const height = PAD_TOP + (nStrings - 1) * STRING_GAP + PAD_BOTTOM;

  const yForString = (stringIndex: number) => PAD_TOP + getDisplayRow(stringIndex, nStrings, highOnTop) * STRING_GAP;
  // fret f (>= start) maps to cell index (f - start); the nut itself is only
  // drawn if the window actually starts at fret 1 (i.e. includes the neck's edge).
  const xForFret = (fret: number) => nutX + (fret - start + 0.5) * FRET_WIDTH;

  return (
    <div className={`shrink-0 rounded-md bg-background p-1.5 ${active ? "border-2 border-foreground" : "border border-border"}`}>
      <svg width={width} height={height}>
        {/* nut, only when this window actually touches the top of the neck */}
        {start === 1 && (
          <line
            x1={nutX}
            x2={nutX}
            y1={PAD_TOP}
            y2={PAD_TOP + (nStrings - 1) * STRING_GAP}
            stroke="var(--foreground)"
            strokeOpacity={0.7}
            strokeWidth={2.5}
          />
        )}

        {/* fret lines */}
        {Array.from({ length: cellCount + 1 }, (_, i) => (
          <line
            key={i}
            x1={nutX + i * FRET_WIDTH}
            x2={nutX + i * FRET_WIDTH}
            y1={PAD_TOP}
            y2={PAD_TOP + (nStrings - 1) * STRING_GAP}
            stroke="var(--foreground)"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}

        {/* fret number labels */}
        {Array.from({ length: cellCount }, (_, i) => start + i).map((f) => (
          <text
            key={f}
            x={xForFret(f)}
            y={PAD_TOP - 6}
            textAnchor="middle"
            fontSize={8}
            fill="var(--foreground)"
            fillOpacity={0.55}
          >
            {f}
          </text>
        ))}

        {/* strings -- e/B/G tied at the thinnest, D/A/E stepping up, like a real set */}
        {tuning.map((_, i) => (
          <line
            key={i}
            x1={nutX - OPEN_GAP + 6}
            x2={nutX + gridWidth}
            y1={yForString(i)}
            y2={yForString(i)}
            stroke="var(--foreground)"
            strokeOpacity={0.4}
            strokeWidth={stringThickness(i, nStrings)}
          />
        ))}

        {/* string labels -- lowercase only the highest string, matching renderAsciiTab.ts */}
        {tuning.map((midi, i) => {
          const name = pitchClassName(midi);
          return (
            <text
              key={i}
              x={PAD_LEFT - 5}
              y={yForString(i) + 3}
              textAnchor="end"
              fontSize={9}
              fontFamily="monospace"
              fill="var(--foreground)"
              fillOpacity={0.55}
            >
              {i === nStrings - 1 ? name.toLowerCase() : name}
            </text>
          );
        })}

        {/* the note(s) played in this step -- no fret number inside the dot,
            the column header above already says which fret this is
            (RULES.md rule 3); the dot's position within the segment is the
            only place that matters now that segments are tightly fit. */}
        {notes.map(({ string, fret }, i) =>
          fret === 0 ? (
            <circle
              key={i}
              cx={nutX - OPEN_GAP / 2 - 1}
              cy={yForString(string)}
              r={4.5}
              fill="var(--background)"
              stroke="var(--foreground)"
              strokeWidth={1.6}
            />
          ) : (
            <circle key={i} cx={xForFret(fret)} cy={yForString(string)} r={5.5} fill="var(--foreground)" />
          )
        )}
      </svg>
    </div>
  );
}

// Extracted the same way SheetDiagram's own controls row was, so this
// component's complexity stays low and the two views' header logic reads
// the same way side by side.
function FretboardControls({
  showHeader,
  highOnTop,
  onToggleHighOnTop,
}: {
  showHeader: boolean;
  highOnTop: boolean;
  onToggleHighOnTop: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      {showHeader ? (
        <h2 className="text-sm font-medium" style={{ opacity: 0.8 }}>
          Fretboard, in order
        </h2>
      ) : (
        <span />
      )}
      <StringOrientationToggle highOnTop={highOnTop} onToggle={onToggleHighOnTop} />
    </div>
  );
}

export function FretboardDiagram({
  notes,
  tuning,
  currentStep = null,
  bordered = true,
  showHeader = true,
  showCaption = true,
}: {
  notes: TimedNote[];
  tuning: number[];
  currentStep?: number | null;
  // Same meaning and same defaults as SheetDiagram's identical props -- see
  // its doc comment. DiagramViewport opts out of all three for both views.
  bordered?: boolean;
  showHeader?: boolean;
  showCaption?: boolean;
}) {
  const [highOnTop, setHighOnTop] = useState(true); // thin e on top, matches SheetDiagram's default

  const nStrings = tuning.length;
  const steps = groupNotesByStep(notes);

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
      <FretboardControls showHeader={showHeader} highOnTop={highOnTop} onToggleHighOnTop={() => setHighOnTop((v) => !v)} />

      {/* Wraps onto multiple rows instead of horizontally scrolling -- each
          Segment is FIXED_CELLS-wide for the common case (see lib/fretboard.ts),
          so a plain flex-wrap keeps rows tidy without needing SheetDiagram's
          chunk()/computeStepsPerLine() measurement. */}
      <div className="flex flex-wrap gap-2">
        {steps.map((step, i) => (
          <Segment key={i} notes={step} nStrings={nStrings} tuning={tuning} highOnTop={highOnTop} active={i === currentStep} />
        ))}
      </div>

      {showCaption && (
        <p className="text-xs mt-3" style={{ opacity: 0.45 }}>
          One segment per step, left to right in playback order — same order as the tab above. A segment with more
          than one dot is a chord (played together, not in sequence).
        </p>
      )}
    </div>
  );
}
