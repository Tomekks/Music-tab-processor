"use client";

// Static "where does this song live on the neck" overview -- every unique
// string/fret position used anywhere in the song, drawn once on a fretboard
// diagram. A companion to the ASCII tab (app/lib/renderTab.ts), not a
// replacement: the ASCII tab shows *order*, this shows *position*, which is
// the piece that's easy to lose reading raw fret numbers. See DECISIONS.md's
// "Display modes are layered" section -- this is one of those opt-in layers,
// reading the same tab.schema.json note data, no pipeline changes needed.
//
// Not yet built (deliberately, see app/STATUS.md): a sequential/per-chord
// step-through. A single static overview like this one is fine to dedupe
// positions freely, but a stepped version will need to group simultaneous
// notes (chords, same startTimeSec) into one step rather than splitting them,
// or two notes that are only ever played together will misleadingly look
// like two separate steps.

import { useState } from "react";
import { getDisplayRow, getFretRange, getUniquePositions, pitchClassName } from "@/lib/fretboard";

type Note = { string: number; fret: number };

const PAD_LEFT = 30;
const OPEN_GAP = 22;
const FRET_WIDTH = 42;
const STRING_GAP = 24;
const PAD_TOP = 22;
const PAD_RIGHT = 16;
const PAD_BOTTOM = 14;
const INLAY_FRETS = [3, 5, 7, 9, 12];

export function FretboardDiagram({ notes, tuning }: { notes: Note[]; tuning: number[] }) {
  const [highOnTop, setHighOnTop] = useState(true); // thin e on top, matches renderAsciiTab's default

  const nStrings = tuning.length;
  const { maxFret } = getFretRange(notes);
  const positions = getUniquePositions(notes);

  const nutX = PAD_LEFT + OPEN_GAP;
  const gridWidth = maxFret * FRET_WIDTH;
  const width = nutX + gridWidth + PAD_RIGHT;
  const height = PAD_TOP + (nStrings - 1) * STRING_GAP + PAD_BOTTOM;
  const midY = PAD_TOP + ((nStrings - 1) * STRING_GAP) / 2;

  const yForString = (stringIndex: number) => PAD_TOP + getDisplayRow(stringIndex, nStrings, highOnTop) * STRING_GAP;
  const xForFret = (fret: number) => nutX + (fret - 0.5) * FRET_WIDTH;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-700">Fretboard overview</h2>
        <button
          onClick={() => setHighOnTop((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
        >
          Flip to {highOnTop ? "thick E" : "thin e"} on top
        </button>
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="Fretboard diagram showing every note position used in this song">
          {/* inlay dots, drawn first so notes/strings sit above them */}
          {INLAY_FRETS.filter((f) => f <= maxFret).map((f) =>
            f === 12 ? (
              <g key={f}>
                <circle cx={xForFret(f)} cy={midY - STRING_GAP * 0.9} r={2.5} fill="#d4d4d8" />
                <circle cx={xForFret(f)} cy={midY + STRING_GAP * 0.9} r={2.5} fill="#d4d4d8" />
              </g>
            ) : (
              <circle key={f} cx={xForFret(f)} cy={midY} r={2.5} fill="#d4d4d8" />
            )
          )}

          {/* fret lines: 0 = nut, thicker */}
          {Array.from({ length: maxFret + 1 }, (_, f) => (
            <line
              key={f}
              x1={nutX + f * FRET_WIDTH}
              x2={nutX + f * FRET_WIDTH}
              y1={PAD_TOP}
              y2={PAD_TOP + (nStrings - 1) * STRING_GAP}
              stroke={f === 0 ? "#27272a" : "#d4d4d8"}
              strokeWidth={f === 0 ? 3 : 1}
            />
          ))}

          {/* fret number labels */}
          {Array.from({ length: maxFret }, (_, i) => i + 1).map((f) => (
            <text key={f} x={xForFret(f)} y={PAD_TOP - 8} textAnchor="middle" fontSize={10} fill="#a1a1aa">
              {f}
            </text>
          ))}

          {/* strings, thickest = low E */}
          {tuning.map((_, i) => (
            <line
              key={i}
              x1={nutX - OPEN_GAP + 8}
              x2={nutX + gridWidth}
              y1={yForString(i)}
              y2={yForString(i)}
              stroke="#52525b"
              strokeWidth={Math.max(1.2, 3.2 - i * 0.4)}
            />
          ))}

          {/* string labels, note name of the open string. Lowercased only for
              the highest string (schema index nStrings-1), matching
              renderAsciiTab.ts's "thin e" convention -- otherwise the low and
              high E strings in standard tuning are indistinguishable text. */}
          {tuning.map((midi, i) => {
            const name = pitchClassName(midi);
            return (
              <text key={i} x={PAD_LEFT - 6} y={yForString(i) + 4} textAnchor="end" fontSize={12} fontFamily="monospace" fill="#3f3f46">
                {i === nStrings - 1 ? name.toLowerCase() : name}
              </text>
            );
          })}

          {/* note markers */}
          {positions.map(({ string, fret }) =>
            fret === 0 ? (
              <circle
                key={string + ":" + fret}
                cx={nutX - OPEN_GAP / 2 - 2}
                cy={yForString(string)}
                r={6}
                fill="white"
                stroke="#27272a"
                strokeWidth={2}
              />
            ) : (
              <g key={string + ":" + fret}>
                <circle cx={xForFret(fret)} cy={yForString(string)} r={8} fill="#18181b" />
                <text x={xForFret(fret)} y={yForString(string) + 3.5} textAnchor="middle" fontSize={9.5} fontFamily="monospace" fill="white">
                  {fret}
                </text>
              </g>
            )
          )}
        </svg>
      </div>

      <p className="text-xs text-zinc-400 mt-3">
        Every position used in this song, not the order they&apos;re played — see the tab above for that.{" "}
        {positions.some((p) => p.fret === 0) && "Open circles are open strings."}
      </p>
    </div>
  );
}
