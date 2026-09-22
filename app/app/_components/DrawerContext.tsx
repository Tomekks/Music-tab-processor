"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode, type RefObject } from "react";

// Drawer state, lifted to the shell (spec 8d) so the mobile open control can
// live in the header while the dialog itself stays in the sidebar. One
// provider instance at shell level (see StudioShell.tsx); no storage reads
// anywhere (open defaults false -- server markup is drawer-closed, no
// hydration read); no window at module scope.
type DrawerContextValue = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
};

// Single source for the dialog id; the sidebar and this island import it,
// never duplicate it.
export const DRAWER_ID = "songs-drawer";

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  return (
    <DrawerContext.Provider value={{ open, openDrawer, closeDrawer, toggleRef }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue {
  const value = useContext(DrawerContext);
  if (!value) throw new Error("useDrawer must be used inside DrawerProvider");
  return value;
}

// The only mobile drawer-open control (spec 8d): icon-only, hidden at md and
// up where the desktop nav takes over. Named "Songs" via aria-label (icon is
// aria-hidden); aria-expanded/aria-controls mirror the dialog state. Rendered
// in AppHeader; every drawer close path restores focus to this button via the
// shared toggleRef (see SongListSidebar.tsx's sync effect).
export function HeaderSongsButton() {
  const { open, openDrawer, toggleRef } = useDrawer();
  return (
    <button
      ref={toggleRef}
      type="button"
      onClick={openDrawer}
      aria-expanded={open}
      aria-controls={DRAWER_ID}
      aria-label="Songs"
      className="md:hidden inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface px-3 text-sm font-semibold text-surface-text"
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}
