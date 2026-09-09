"use client";

// Presentational only -- takes bpm/isPlaying/onToggle/onBpmChange as props
// rather than owning the useMetronome hook itself, so this stays swappable
// independently of the timing logic (same "one interface, swappable
// implementation" principle as the rest of this app). Bpm defaults to the
// song's own tempo (set by the caller), editable here.

export function MetronomeControls({
  bpm,
  onBpmChange,
  isPlaying,
  onToggle,
}: {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {isPlaying ? "⏸ Pause" : "▶ Play"}
      </button>

      <label className="flex items-center gap-2 text-sm text-zinc-600">
        Tempo
        <input
          type="number"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onBpmChange(next);
          }}
          className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        bpm
      </label>
    </div>
  );
}
