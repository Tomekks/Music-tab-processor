import type { ReactNode } from "react";

// Shared static <kbd> treatment (spec 8d): DetailToolbar's private copy is
// deleted; the header shortcut hint imports this for both of its glyphs. No
// interactivity -- static text styling only.
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-surface px-1 font-mono">{children}</kbd>;
}
