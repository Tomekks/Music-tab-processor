"use client";

import type { ReactNode } from "react";

export interface ButtonProps {
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
const DISABLED = "disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed";
// Derived from state.hoverOpacity per DESIGN.md (re-derives live if a brand
// edits the token), not a hardcoded 92%/8%.
const PRIMARY_HOVER =
  "hover:[background-color:color-mix(in_srgb,var(--color-accent)_calc(100%_-_var(--state-hover-opacity)),var(--color-on-accent)_var(--state-hover-opacity))]";

export function Button({ onClick, variant = "secondary", disabled, className, children }: ButtonProps) {
  const variantClasses =
    variant === "primary"
      ? `border-transparent bg-[var(--component-button-primary-background)] text-[var(--component-button-primary-text)] ${PRIMARY_HOVER} disabled:hover:bg-[var(--component-button-primary-background)]`
      : // No hover border change: the border stays secondaryBorder through hover
        // so it remains visible against surfaceHover (the §4.4a fix, applied to
        // the canonical component as well as MetronomeControls).
        `border-[var(--component-button-secondary-border)] bg-[var(--component-button-secondary-background)] text-[var(--component-button-secondary-text)] hover:bg-surface-hover`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex cursor-pointer items-center justify-center gap-1.5 border text-sm font-semibold transition-colors",
        "rounded-[var(--component-button-radius)] px-[var(--component-button-padding-x)] py-[var(--component-button-padding-y)]",
        "[font-family:var(--component-button-font-family)]",
        FOCUS_RING,
        DISABLED,
        variantClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
