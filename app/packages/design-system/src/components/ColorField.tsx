"use client";

export interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
const DISABLED = "disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed";
const MUTED_TEXT =
  "text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-opacity),transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_var(--state-muted-text-hover-opacity),transparent)]";

export function ColorField({ value, onChange, onReset, label, disabled, className }: ColorFieldProps) {
  const control = (
    <>
      <span
        aria-hidden
        className="h-[var(--component-color-field-swatch-size)] w-[var(--component-color-field-swatch-size)] rounded-[var(--component-color-field-radius)] border border-[var(--component-color-field-border)]"
        style={{ backgroundColor: value }}
      />
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        inputMode="text"
        aria-label={label ? undefined : "Hex color value"}
        className={`px-2 py-1 text-sm [font-family:var(--component-color-field-font-family)] bg-[var(--component-color-field-background)] text-[var(--component-color-field-text)] border border-[var(--component-color-field-border)] rounded-[var(--component-color-field-radius)] ${FOCUS_RING} ${DISABLED}`}
      />
    </>
  );

  return (
    <div className={["flex items-center gap-2", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="flex items-center gap-2">
          {label}
          {control}
        </label>
      ) : (
        control
      )}
      {onReset && (
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          aria-label="Reset to default"
          className={`text-xs ${MUTED_TEXT} ${FOCUS_RING} ${DISABLED}`}
        >
          Reset
        </button>
      )}
    </div>
  );
}
