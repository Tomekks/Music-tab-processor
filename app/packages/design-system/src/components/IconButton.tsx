"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { stateOverlayClassName } from "./state-overlay.mjs";

// Icon-only counterpart to Button.tsx: same token-driven variant approach
// (component.iconButton.* mirrors component.button.*), but square/44px and a
// third "ghost" (transparent) variant since the mobile drawer toggle needs
// no fill at all, unlike anything Button.tsx's two variants cover.
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "ghost";
  "aria-label": string;
  // data-* attributes (e.g. data-umami-event, data-umami-event-enabled) are
  // not covered by ButtonHTMLAttributes' declared props on a custom
  // component (unlike a raw <button>, which TypeScript special-cases) --
  // this index signature lets every data-umami-event-* call site work.
  [dataAttr: `data-${string}`]: string | boolean | undefined;
}

const FOCUS_RING =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--focus-ring-color)] focus-visible:[outline-offset:var(--focus-ring-offset)]";
const DISABLED = "disabled:opacity-[var(--state-disabled-opacity)] disabled:cursor-not-allowed";
// Deliberately the exact same call Button.tsx makes (default base/overlay
// color args, i.e. --color-accent/--color-on-accent) rather than passing
// --component-icon-button-primary-background/-primary-icon explicitly:
// component.iconButton.primaryBackground/primaryIcon already resolve to
// those same accent/onAccent tokens, and Tailwind's build only ever
// generates CSS for the literal argument combinations it can find verbatim
// in source -- passing new literal args here produced a rule that never
// compiled (confirmed missing from the built CSS; Play's hover silently did
// nothing). Matching Button.tsx's own already-proven-compiling call avoids
// relying on an untested code path for the exact same visual result.
const PRIMARY_HOVER = stateOverlayClassName("hover", "--state-hover-opacity");
const PRIMARY_PRESSED = stateOverlayClassName("active", "--state-pressed-opacity");

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, variant = "secondary", disabled, className, ...rest },
  ref,
) {
  const variantClasses =
    variant === "primary"
      ? `border-transparent bg-[var(--component-icon-button-primary-background)] text-[var(--component-icon-button-primary-icon)] ${PRIMARY_HOVER} ${PRIMARY_PRESSED} disabled:hover:bg-[var(--component-icon-button-primary-background)] disabled:active:bg-[var(--component-icon-button-primary-background)]`
      : variant === "secondary"
        ? "border-[var(--component-icon-button-secondary-border)] bg-[var(--component-icon-button-secondary-background)] text-[var(--component-icon-button-secondary-icon)] hover:bg-surface-hover"
        : "border-transparent bg-transparent text-[var(--component-icon-button-ghost-icon)] hover:bg-surface-hover";

  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      className={[
        "inline-flex cursor-pointer items-center justify-center border shrink-0 transition-colors",
        "h-[var(--component-icon-button-size)] w-[var(--component-icon-button-size)]",
        "rounded-[var(--component-icon-button-radius)]",
        FOCUS_RING,
        DISABLED,
        variantClasses,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {/* Icon-level strokeWidth is set via inline `style`, not the `strokeWidth`
          prop: lucide sets `strokeWidth` as an SVG attribute, but a CSS
          `stroke-width` property (which `style` produces) always wins over the
          attribute -- so this stays token-driven from
          --component-icon-button-stroke-width without needing a React
          re-render on brand switch, the same "var(), never a literal" rule
          Button.tsx and state-overlay.mjs already follow. */}
      <Icon aria-hidden="true" size={20} style={{ strokeWidth: "var(--component-icon-button-stroke-width)" }} />
    </button>
  );
});
