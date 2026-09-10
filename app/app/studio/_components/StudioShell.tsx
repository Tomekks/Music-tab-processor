import type { ReactNode } from "react";

// The whole app is a fixed-viewport shell: outer overflow-hidden is what guarantees
// zero page-level scroll no matter what any descendant does. The sidebar and (later)
// the tab-diagram region are the only two scrolling containers -- see
// app/app/studio/STATUS.md for the full layout mechanism this implements.
export function StudioShell({ sidebar, detail }: { sidebar: ReactNode; detail: ReactNode }) {
  return (
    <div className="h-dvh w-full overflow-hidden flex bg-white text-zinc-900">
      <nav
        className="shrink-0 h-full overflow-y-auto border-r border-zinc-200"
        style={{ width: "var(--sidebar-width, 280px)" }}
        aria-label="Songs"
      >
        {sidebar}
      </nav>
      <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col min-h-0">{detail}</div>
    </div>
  );
}
