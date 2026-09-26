"use client";

import { Keyboard } from "lucide-react";
import { IconButton } from "@guitar-tabs/design-system";
import { Kbd } from "@/components/Kbd";
import type { ShortcutDef } from "@/lib/keyboardShortcuts";

// Client island (2026-09-25 IconButton redesign): AppHeader.tsx is a server
// component, so the Keyboard icon component reference can't be passed to it
// as a prop across the server/client boundary (lucide-react icons aren't
// plain serializable objects) -- this file imports the icon itself, the same
// pattern ThemeToggle.tsx and HeaderSongsButton already use. Only the plain
// shortcut data (strings/arrays) crosses the boundary as props.
//
// Replaces the old always-visible text line with a Keyboard icon (ghost
// IconButton, same 44px/ghost treatment as ThemeToggle/HeaderSongsButton)
// whose shortcut text shows as a tooltip on hover AND keyboard focus
// (group-hover/group-focus-within -- hover-only would be invisible to
// keyboard/screen-reader users). Opens leftward (right-full) since the icon
// sits near the header's right edge.
export function KeyboardShortcutsHint({
  togglePlayHint,
  stepBackHint,
  stepForwardHint,
}: {
  togglePlayHint: ShortcutDef;
  stepBackHint: ShortcutDef;
  stepForwardHint: ShortcutDef;
}) {
  return (
    <div className="group relative hidden md:block">
      <IconButton icon={Keyboard} variant="ghost" aria-label="Keyboard shortcuts" />
      <div
        role="tooltip"
        className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1.5 text-xs text-foreground/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <Kbd>{togglePlayHint.kbd[0]}</Kbd> {togglePlayHint.label} <span aria-hidden="true">·</span>{" "}
        <Kbd>
          {stepBackHint.kbd[0]}/{stepForwardHint.kbd[0]}
        </Kbd>{" "}
        {stepBackHint.label}
      </div>
    </div>
  );
}
