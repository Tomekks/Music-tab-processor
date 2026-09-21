"use client";

import { useEffect, useRef, useState } from "react";
import { SongListRow, type SongListItem } from "./SongListRow";

// Sidebar-owned chrome (spec 5): the desktop <nav> below carries the exact
// classes and width the app shell used to own (moved verbatim -- desktop
// geometry must not move a pixel), hidden below md where the drawer toggle
// takes over. The shell renders this component as a pure slot and never
// names sidebar geometry again.
//
// Mobile drawer: a native <dialog> owns focus containment -- no custom trap,
// no resize listeners, no scroll-lock code (the shell's overflow-hidden
// already prevents page scroll; the drawer list scrolls internally).
// Selecting a song keeps the drawer open (links navigate, state untouched).

const DRAWER_ID = "songs-drawer";

export function SongListSidebar({ songs, selectedId }: { songs: SongListItem[]; selectedId: string | null }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Sync state to the element, guarded both ways so StrictMode
  // double-effects never throw InvalidStateError. Close order is fixed:
  // dialog.close() first, THEN restore focus (focusing while modal breaks
  // the return). Open moves focus to the selected link, else the first
  // link; with no links at all, to the dialog itself (tabIndex -1 below).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const selected = dialog.querySelector('a[aria-current="true"]');
      const first = dialog.querySelector("a");
      ((selected ?? first ?? dialog) as HTMLElement).focus();
    } else if (!open && dialog.open) {
      dialog.close();
      toggleRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      <nav
        aria-label="Songs"
        className="shrink-0 h-full overflow-y-auto border-r border-border hidden md:block"
        style={{ width: "var(--sidebar-width, 240px)" }}
      >
        <SidebarList songs={songs} selectedId={selectedId} />
      </nav>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={DRAWER_ID}
        className="fixed left-4 top-16 z-30 md:hidden inline-flex h-11 min-w-11 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-surface-text"
      >
        <span aria-hidden="true">☰</span> Songs
      </button>
      <dialog
        ref={dialogRef}
        id={DRAWER_ID}
        tabIndex={-1}
        aria-label="Songs"
        onCancel={(e) => {
          // Prevent the native close so the sync effect below performs the
          // close + toggle-focus return deterministically (spec §3).
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] z-50 bg-background p-0 text-foreground backdrop:bg-foreground/40 md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Songs</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold"
            >
              Close songs
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <nav aria-label="Songs">
              <SidebarList songs={songs} selectedId={selectedId} />
            </nav>
          </div>
        </div>
      </dialog>
    </>
  );
}

function SidebarList({ songs, selectedId }: { songs: SongListItem[]; selectedId: string | null }) {
  if (songs.length === 0) {
    return <p className="p-4 text-sm text-foreground/60">No songs published yet. Publish a tab to see it here.</p>;
  }

  return (
    <ul className="flex flex-col">
      {songs.map((song) => (
        <SongListRow key={song.id} song={song} isSelected={song.id === selectedId} />
      ))}
    </ul>
  );
}
