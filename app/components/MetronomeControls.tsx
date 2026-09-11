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
  onReset,
  soundEnabled,
  onToggleSound,
}: {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
  onToggle: () => void;
  onReset: () => void;
  // Note-accurate playback sound (2026-09-10, beta) -- off by default since
  // it's new; see hooks/useNoteSound.ts for what it actually plays.
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onReset}
        aria-label="Reset to start"
        title="Reset to start"
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        ⏮
      </button>

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

      <button
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        title="Play the real pitch of each note while the metronome runs (beta)"
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
          soundEnabled ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        🔊 Note sound (beta)
      </button>
    </div>
  );
}
