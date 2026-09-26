"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode, type RefObject } from "react";
import { PanelLeft } from "lucide-react";
import { IconButton } from "@guitar-tabs/design-system";

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
// up where the desktop nav takes over. Named "Songs" via aria-label; the
// PanelLeft icon is aria-hidden inside IconButton. aria-expanded/aria-controls
// mirror the dialog state. Rendered in AppHeader; every drawer close path
// restores focus to this button via the shared toggleRef (see
// SongListSidebar.tsx's sync effect) -- IconButton forwards its ref for
// exactly this reason.
//
// ghost variant (2026-09-25 IconButton migration): no fill, icon only --
// distinct from the transport bar's secondary (gray-filled) tier, since this
// sits in the header rather than a toolbar row.
export function HeaderSongsButton() {
  const { open, openDrawer, toggleRef } = useDrawer();
  return (
    <IconButton
      ref={toggleRef}
      icon={PanelLeft}
      variant="ghost"
      onClick={openDrawer}
      aria-expanded={open}
      aria-controls={DRAWER_ID}
      aria-label="Songs"
      data-umami-event="open-songs-drawer"
      className="md:hidden"
    />
  );
}
