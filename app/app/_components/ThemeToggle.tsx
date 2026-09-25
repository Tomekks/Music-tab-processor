"use client";

import { useTheme } from "./ThemeProvider";
import { trackEvent } from "@/lib/analytics";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const ACTIVE = "font-semibold text-foreground";
  const INACTIVE = "text-foreground/50 hover:text-foreground";
  // 44px touch targets (spec 8c): size utilities only -- text, aria-current,
  // separator and row arrangement unchanged.
  const TARGET = "inline-flex items-center justify-center min-h-[44px] min-w-[44px]";
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={() => {
          if (mode === "light") return;
          toggle();
          trackEvent("theme-light");
        }}
        aria-current={mode === "light" ? "true" : undefined}
        className={`${TARGET} ${mode === "light" ? ACTIVE : INACTIVE}`}
      >
        Light mode
      </button>
      <span className="text-foreground/30" aria-hidden>
        /
      </span>
      <button
        type="button"
        onClick={() => {
          if (mode === "dark") return;
          toggle();
          trackEvent("theme-dark");
        }}
        aria-current={mode === "dark" ? "true" : undefined}
        className={`${TARGET} ${mode === "dark" ? ACTIVE : INACTIVE}`}
      >
        Dark mode
      </button>
    </div>
  );
}
