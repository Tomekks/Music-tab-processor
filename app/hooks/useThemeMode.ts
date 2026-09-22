"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "guitar-tabs-theme";

function systemPreference(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemeMode(): { mode: ThemeMode; toggle: () => void } {
  // Seeded "dark" so server and first client render agree (no hydration
  // mismatch) -- corrected to the real stored/system value client-only,
  // immediately after mount. One unavoidable flash on first paint for a
  // light-mode user; accepted, no SSR cookie plumbing for this hobby project.
  const [mode, setMode] = useState<ThemeMode>("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Mount-correction, not derived state: the "dark" seed keeps SSR and first
    // client render identical (no hydration mismatch); this corrects to the real
    // stored/system value immediately after mount. The only alternative (reading
    // window in the useState initializer) renders different HTML on the client
    // than the server sent — strictly worse. Accepted one-time flash, same as spec.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(stored === "light" || stored === "dark" ? stored : systemPreference());
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);
  const toggle = () => setMode((prev) => (prev === "dark" ? "light" : "dark")); // pure updater
  return { mode, toggle };
}
