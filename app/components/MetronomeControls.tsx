"use client";

import { useEffect, useRef, useState } from "react";
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

  // Tempo draft-state (spec 8a): THIS INPUT never calls onBpmChange from
  // onChange -- typing/clearing/spinning edit local draft text only. Commits
  // happen on blur/Enter through commit(): empty/non-finite/<=0 reverts to the
  // last committed bpm without calling onBpmChange; positive values round, then
  // clamp to 20..300. Enter keeps focus and arms a one-shot blur guard so
  // Enter-then-focus-loss commits exactly once -- load-bearing on the invalid
  // path, where the guard is what keeps the following blur from committing the
  // reverted value. Input-level guarantee only: useMetronome's setBpm still has
  // no runtime guard of its own.
  const [draft, setDraft] = useState(String(bpm));
  // Resync when the committed prop changes while mounted. Typing never changes
  // bpm pre-commit, so this cannot clobber an in-progress draft; song switches
  // remount (key={song.id}), so this covers same-mount prop changes only.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prop->draft mirror (spec 8a §3 prescribes this effect; same suppression as useThemeMode.ts's mount correction). The render-time adjustment alternative would change the prescribed mechanism.
    setDraft(String(bpm));
  }, [bpm]);
  // The draft an Enter commit left behind: the next blur of this exact draft
  // is a no-op (no double commit, no revert-flicker on Enter-then-click-away).
  const enterCommittedRef = useRef<string | null>(null);
  const commit = (source: "blur" | "enter") => {
    if (source === "blur" && enterCommittedRef.current !== null && draft === enterCommittedRef.current) {
      enterCommittedRef.current = null;
      return;
    }
    enterCommittedRef.current = null;
    const raw = draft.trim();
    const next = raw === "" ? NaN : Number(raw);
    if (!Number.isFinite(next) || next <= 0) {
      // REVERT: -5, 0, empty, whitespace-only, NaN, Infinity -> last good bpm;
      // onBpmChange is NOT called on this path.
      setDraft(String(bpm));
      if (source === "enter") enterCommittedRef.current = String(bpm);
      return;
    }
    // COMMIT: round, then clamp -- 5..19 -> 20; 999 -> 300; 90.5 -> 91.
    const clamped = Math.min(300, Math.max(20, Math.round(next)));
    onBpmChange(clamped);
    setDraft(String(clamped));
    if (source === "enter") enterCommittedRef.current = String(clamped);
  };
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onReset}
        aria-label="Reset to start"
        title="Reset to start"
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 min-h-[44px] min-w-[44px] justify-center text-sm font-semibold"
        style={{
          background: "var(--component-button-secondary-background)",
          color: "var(--component-button-secondary-text)",
          borderColor: "var(--component-button-secondary-border)",
        }}
      >
        ⏮ Reset
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
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit("blur")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit("enter");
            }
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
