"use client";

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  showValue?: boolean;
}

const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
const DISABLED = "disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed";

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  disabled,
  className,
  showValue = true,
}: SliderProps) {
  const input = (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label ? undefined : "Numeric value"}
      className={`w-full accent-accent ${FOCUS_RING} ${DISABLED}`}
    />
  );
  // Numeric readout in tabular mono so Task 6 call sites don't duplicate it.
  // Reuses the colorField mono token; no dedicated slider font exists.
  const readout = showValue ? (
    <span className="text-sm [font-family:var(--component-color-field-font-family)]">{value}</span>
  ) : null;
  const inner = (
    <>
      {input}
      {readout}
    </>
  );

  return (
    <div className={["flex items-center gap-2", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="flex w-full items-center gap-2">
          {label}
          {inner}
        </label>
      ) : (
        inner
      )}
    </div>
  );
}
