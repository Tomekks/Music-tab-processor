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

import { useState } from "react";
import { getStepWindow } from "@/lib/fretboard";
import { getDisplayRow, groupNotesByStep, pitchClassName, stringThickness, type TimedNote } from "@/lib/tabNotation";

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
  // Tight-fit window, no fixed width -- see FretboardDiagram.RULES.md rule 1.
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
    <div className={`shrink-0 rounded-md bg-white p-1.5 ${active ? "border-2 border-zinc-900" : "border border-zinc-200"}`}>
      <svg width={width} height={height}>
        {/* nut, only when this window actually touches the top of the neck */}
        {start === 1 && (
          <line x1={nutX} x2={nutX} y1={PAD_TOP} y2={PAD_TOP + (nStrings - 1) * STRING_GAP} stroke="#27272a" strokeWidth={2.5} />
        )}

        {/* fret lines */}
        {Array.from({ length: cellCount + 1 }, (_, i) => (
          <line
            key={i}
            x1={nutX + i * FRET_WIDTH}
            x2={nutX + i * FRET_WIDTH}
            y1={PAD_TOP}
            y2={PAD_TOP + (nStrings - 1) * STRING_GAP}
            stroke="#e4e4e7"
            strokeWidth={1}
          />
        ))}

        {/* fret number labels */}
        {Array.from({ length: cellCount }, (_, i) => start + i).map((f) => (
          <text key={f} x={xForFret(f)} y={PAD_TOP - 6} textAnchor="middle" fontSize={8} fill="#a1a1aa">
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
            stroke="#a1a1aa"
            strokeWidth={stringThickness(i, nStrings)}
          />
        ))}

        {/* string labels -- lowercase only the highest string, matching renderAsciiTab.ts */}
        {tuning.map((midi, i) => {
          const name = pitchClassName(midi);
          return (
            <text key={i} x={PAD_LEFT - 5} y={yForString(i) + 3} textAnchor="end" fontSize={9} fontFamily="monospace" fill="#71717a">
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
            <circle key={i} cx={nutX - OPEN_GAP / 2 - 1} cy={yForString(string)} r={4.5} fill="white" stroke="#18181b" strokeWidth={1.6} />
          ) : (
            <circle key={i} cx={xForFret(fret)} cy={yForString(string)} r={5.5} fill="#18181b" />
          )
        )}
      </svg>
    </div>
  );
}

export function FretboardDiagram({
  notes,
  tuning,
  currentStep = null,
}: {
  notes: TimedNote[];
  tuning: number[];
  currentStep?: number | null;
}) {
  const [highOnTop, setHighOnTop] = useState(true); // thin e on top, matches renderAsciiTab's default

  const nStrings = tuning.length;
  const steps = groupNotesByStep(notes);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-700">Fretboard, in order</h2>
        <button
          onClick={() => setHighOnTop((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Flip to {highOnTop ? "thick E" : "thin e"} on top
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {steps.map((step, i) => (
            <Segment key={i} notes={step} nStrings={nStrings} tuning={tuning} highOnTop={highOnTop} active={i === currentStep} />
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400 mt-3">
        One segment per step, left to right in playback order — same order as the tab above. A segment with more than
        one dot is a chord (played together, not in sequence).
      </p>
    </div>
  );
}
