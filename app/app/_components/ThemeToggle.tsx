"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const ACTIVE = "font-semibold text-foreground";
  const INACTIVE = "text-foreground/50 hover:text-foreground";
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={() => mode !== "light" && toggle()}
        aria-current={mode === "light" ? "true" : undefined}
        className={mode === "light" ? ACTIVE : INACTIVE}
      >
        Light mode
      </button>
      <span className="text-foreground/30" aria-hidden>
        /
      </span>
      <button
        type="button"
        onClick={() => mode !== "dark" && toggle()}
        aria-current={mode === "dark" ? "true" : undefined}
        className={mode === "dark" ? ACTIVE : INACTIVE}
      >
        Dark mode
      </button>
    </div>
  );
}
