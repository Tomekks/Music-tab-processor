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
    <div className="flex items-center gap-4">
      <button
        onClick={onReset}
        aria-label="Reset to start"
        title="Reset to start"
        className="inline-flex items-center gap-1.5 rounded-md border border-surface bg-surface px-3 py-1.5 text-sm font-semibold text-surface-text hover:bg-surface-hover hover:border-surface-hover"
      >
        ⏮
      </button>

      <button
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="inline-flex items-center gap-1.5 rounded-md border border-surface bg-surface px-3 py-1.5 text-sm font-semibold text-surface-text hover:bg-surface-hover hover:border-surface-hover"
      >
        {isPlaying ? "⏸ Pause" : "▶ Play"}
      </button>

      <label className="flex items-center gap-2 text-sm text-surface-text">
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
          className="w-16 rounded border border-surface bg-surface px-2 py-1 text-sm text-surface-text"
        />
        bpm
      </label>

      <button
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        title="Play the real pitch of each note while the metronome runs (beta)"
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold ${
          soundEnabled
            ? "border-surface-active bg-surface-active text-surface-active-text"
            : "border-surface bg-surface text-surface-text hover:bg-surface-hover hover:border-surface-hover"
        }`}
      >
        MIDI sound
      </button>
    </div>
  );
}
