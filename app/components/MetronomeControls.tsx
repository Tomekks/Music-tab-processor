"use client";

import { TRANSPORT_SHORTCUTS } from "@/lib/keyboardShortcuts";

// Presentational only -- takes bpm/isPlaying/onToggle/onBpmChange as props
// rather than owning the useMetronome hook itself, so this stays swappable
// independently of the timing logic (same "one interface, swappable
// implementation" principle as the rest of this app). Bpm defaults to the
// song's own tempo (set by the caller), editable here.
//
// Tiers (spec 1+4): Play is the primary action (component.button primary
// tokens); Reset + sound rest on the secondary (ghost) tier via the
// component.button secondary tokens -- token vars only, no color literals.
// The sound button's pressed state keeps its surface-active treatment: that
// is on/off feedback, not tier chrome.

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
  // aria-keyshortcuts derives from the map (spec 1+4) -- no re-listed keys.
  const playShortcut = TRANSPORT_SHORTCUTS.find((s) => s.action === "toggle-play");
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onReset}
        aria-label="Reset to start"
        title="Reset to start"
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold"
        style={{
          background: "var(--component-button-secondary-background)",
          color: "var(--component-button-secondary-text)",
          borderColor: "var(--component-button-secondary-border)",
        }}
      >
        ⏮
      </button>

      <button
        onClick={onToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        aria-keyshortcuts={playShortcut?.kbd.join(" ")}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold"
        style={{
          background: "var(--component-button-primary-background)",
          color: "var(--component-button-primary-text)",
          borderColor: "transparent",
        }}
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
          className="w-16 rounded border border-border bg-surface px-2 py-1 text-sm text-surface-text"
        />
        bpm
      </label>

      <button
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        title="Play the real pitch of each note while the metronome runs (beta)"
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold ${
          soundEnabled ? "border-surface-active bg-surface-active text-surface-active-text" : ""
        }`}
        style={
          soundEnabled
            ? undefined
            : {
                background: "var(--component-button-secondary-background)",
                color: "var(--component-button-secondary-text)",
                borderColor: "var(--component-button-secondary-border)",
              }
        }
      >
        MIDI sound
      </button>
    </div>
  );
}
