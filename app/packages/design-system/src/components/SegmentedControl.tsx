"use client";

import { useRef } from "react";

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
const DISABLED = "disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed";
const MUTED_TEXT =
  "text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-opacity),transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-hover-opacity),transparent)]";

// Tablist structure generalizes app/app/_components/TabSelector.tsx (same
// role="tablist"/aria-selected approach). Arrow-key navigation here is new:
// TabSelector doesn't have it, and stays as-is per the permanent-coexistence
// decision — this comment marks that as deliberate, not an oversight.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  className,
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAt = (index: number) => {
    if (options.length === 0) return;
    const wrapped = ((index % options.length) + options.length) % options.length;
    const next = options[wrapped];
    if (!next) return;
    onChange(next.value);
    buttonRefs.current[wrapped]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        const current = options.findIndex((o) => o.value === value);
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusAt(current + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusAt(current - 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          focusAt(0);
        } else if (e.key === "End") {
          e.preventDefault();
          focusAt(options.length - 1);
        }
      }}
      className={[
        "flex gap-[var(--component-segmented-control-gap)] border-b border-[var(--component-segmented-control-border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-base font-semibold transition-colors",
              active ? "border-accent text-accent" : `border-transparent ${MUTED_TEXT}`,
              FOCUS_RING,
              DISABLED,
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
