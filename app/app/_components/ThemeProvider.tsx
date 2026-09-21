"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useThemeMode, type ThemeMode } from "../../hooks/useThemeMode";

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeMode(); // the ONE call site — every consumer reads this, never its own instance
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
