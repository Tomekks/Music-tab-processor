"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@guitar-tabs/design-system";
import { useTheme } from "./ThemeProvider";
import { trackEvent } from "@/lib/analytics";

// Single icon button (2026-09-25 IconButton redesign, replacing the old
// two-button "Light mode / Dark mode" text toggle): shows only the mode
// you'd switch TO -- Sun while dark is active (click to go light), Moon
// while light is active (click to go dark) -- same "one control, icon
// reflects the action" principle as Play/Pause and Volume. Umami event
// names (theme-light/theme-dark) are unchanged from the old two-button
// version, still fired by the resulting mode.
export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const goingTo = mode === "dark" ? "light" : "dark";
  return (
    <IconButton
      icon={mode === "dark" ? Sun : Moon}
      variant="ghost"
      onClick={() => {
        toggle();
        trackEvent(goingTo === "light" ? "theme-light" : "theme-dark");
      }}
      aria-label={`Switch to ${goingTo} mode`}
    />
  );
}
