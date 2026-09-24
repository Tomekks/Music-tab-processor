import { cn } from "@/lib/cn";

// Canonical wire form per $type — the client always sends the full string the
// API validator expects ("12px", "8%"), never a bare number. Keyed by $type,
// never parsed out of the display string.
export const UNIT: Record<string, string> = { dimension: "px", percentage: "%" };

// Client-side mirror of token-writes.mjs's SEED_COLOR_RE — gating only, the
// server still validates. Not a second source of truth.
export const SEED_RE = /^#[0-9a-fA-F]{6}$/;

export const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
export const MUTED_ACTION = cn(
  "text-xs",
  "text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-opacity),transparent)]",
  "hover:text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-hover-opacity),transparent)]",
  FOCUS_RING,
  "disabled:opacity-[var(--state-disabled-opacity)]",
  "disabled:cursor-not-allowed",
);
export const CAPTION = "text-xs text-surface-text/60";
