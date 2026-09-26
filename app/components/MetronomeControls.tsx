"use client";

import { useEffect, useRef, useState } from "react";
import { Metronome, Minus, Pause, Play as PlayIcon, Plus, SkipBack, Volume2, VolumeX } from "lucide-react";
import { IconButton } from "@guitar-tabs/design-system";
import { TRANSPORT_SHORTCUTS } from "@/lib/keyboardShortcuts";

// Transport pieces, composed by DetailToolbar's TransportLayout (spec 8d) --
// split out of the old single MetronomeControls composite (sole consumer was
// DetailToolbar -- verified, no retired-card usage) so each row owns its
// controls. Presentational only: takes values/callbacks as props rather than
// owning the useMetronome hook itself, so this stays swappable independently
// of the timing logic (same "one interface, swappable implementation"
// principle as the rest of this app). Bpm defaults to the song's own tempo
// (set by the caller), editable in TempoField.
//
// IconButton migration (2026-09-25): every button here is now an icon-only
// IconButton (component.iconButton tokens). Play is the only permanently
// "primary" (accent-filled) control -- its fill never changes with state,
// only its icon (Play/Pause) does. Everything else (Reset, Volume) is
// "secondary" (gray-filled), with only the icon swapping for Volume's
// on/off state -- no more surface-active color inversion for "pressed".

// aria-keyshortcuts derives from the map (spec 1+4) -- no re-listed keys.
const playShortcut = TRANSPORT_SHORTCUTS.find((s) => s.action === "toggle-play");

// Shared by TempoField's commit() clamp and the +/- step buttons below --
// one source of truth for the range so they can never drift apart.
export const MIN_BPM = 20;
export const MAX_BPM = 500;
export const BPM_STEP = 5;

export function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <IconButton
      icon={SkipBack}
      variant="secondary"
      onClick={onReset}
      data-umami-event="reset"
      aria-label="Reset to start"
      title="Reset to start"
    />
  );
}

export function PlayButton({ isPlaying, onToggle }: { isPlaying: boolean; onToggle: () => void }) {
  return (
    <IconButton
      icon={isPlaying ? Pause : PlayIcon}
      variant="primary"
      onClick={onToggle}
      data-umami-event={isPlaying ? "pause" : "play"}
      aria-label={isPlaying ? "Pause" : "Play"}
      aria-keyshortcuts={playShortcut?.kbd.join(" ")}
    />
  );
}

export function TempoField({ bpm, onBpmChange }: { bpm: number; onBpmChange: (bpm: number) => void }) {
  // Tempo draft-state (spec 8a): THIS INPUT never calls onBpmChange from
  // onChange -- typing/clearing/spinning edit local draft text only. Commits
  // happen on blur/Enter through commit(): empty/non-finite/<=0 reverts to the
  // last committed bpm without calling onBpmChange; positive values round, then
  // clamp to MIN_BPM..MAX_BPM (20..500). Enter keeps focus and arms a one-shot blur guard so
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
    // COMMIT: round, then clamp -- 5..19 -> 20; 999 -> 500; 90.5 -> 91.
    const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(next)));
    onBpmChange(clamped);
    setDraft(String(clamped));
    if (source === "enter") enterCommittedRef.current = String(clamped);
  };
  return (
    // No visible "Tempo"/"BPM" text at all (2026-09-25 IconButton redesign):
    // one bordered/rounded 44px-tall pill, a decorative leading Metronome
    // icon standing in for the label, and the bare number field -- aria-label
    // carries the accessible name since there's no text anywhere to derive
    // it from.
    <div className="flex items-center gap-2.5 h-[var(--component-icon-button-size)] rounded-[var(--component-icon-button-radius)] border border-border bg-surface px-2.5 shrink-0">
      <Metronome aria-hidden="true" size={20} className="text-[var(--component-icon-button-secondary-icon)] shrink-0" />
      <input
        type="number"
        min={MIN_BPM}
        max={MAX_BPM}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit("blur")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit("enter");
          }
        }}
        aria-label="Tempo in beats per minute"
        // Native spinner UI hidden (dedicated -/+ IconButtons cover stepping
        // already) -- both engines need their own rule: [appearance:textfield]
        // for Firefox, the two ::-webkit-*-spin-button selectors for
        // Chrome/Safari/Edge. Keyboard ArrowUp/ArrowDown stepping (ArrowUp
        // spinner test) is a separate native behavior, unaffected by hiding
        // these rendered buttons.
        className="w-16 bg-transparent text-xl text-surface-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}

function clampBpm(value: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, value));
}

export function BpmDecrementButton({ bpm, onBpmChange }: { bpm: number; onBpmChange: (bpm: number) => void }) {
  const next = clampBpm(bpm - BPM_STEP);
  return (
    <IconButton
      icon={Minus}
      variant="secondary"
      onClick={() => onBpmChange(next)}
      data-umami-event="bpm-decrement"
      data-umami-event-bpm={String(next)}
      aria-label="Decrease tempo"
    />
  );
}

export function BpmIncrementButton({ bpm, onBpmChange }: { bpm: number; onBpmChange: (bpm: number) => void }) {
  const next = clampBpm(bpm + BPM_STEP);
  return (
    <IconButton
      icon={Plus}
      variant="secondary"
      onClick={() => onBpmChange(next)}
      data-umami-event="bpm-increment"
      data-umami-event-bpm={String(next)}
      aria-label="Increase tempo"
    />
  );
}

export function VolumeButton({
  soundEnabled,
  onToggleSound,
}: {
  // Note-accurate playback sound (2026-09-10, beta) -- off by default since
  // it's new; see hooks/useNoteSound.ts for what it actually plays. Renamed
  // from "MIDI sound" to "Volume" (2026-09-25, label/icon only -- still the
  // same binary mute toggle, nothing new added).
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  return (
    <IconButton
      icon={soundEnabled ? Volume2 : VolumeX}
      variant="secondary"
      onClick={onToggleSound}
      data-umami-event="toggle-volume"
      data-umami-event-enabled={String(!soundEnabled)}
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? "Mute volume" : "Unmute volume"}
      title="Play the real pitch of each note while the metronome runs (beta)"
    />
  );
}
