import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

// The whole app is a fixed-viewport shell: outer overflow-hidden is what guarantees
// zero page-level scroll no matter what any descendant does. AppHeader is a shrink-0
// row on top; the sidebar and the tab-diagram region are the only two scrolling
// containers, in the flex-1 row below it -- see app/app/studio/STATUS.md for the
// full layout mechanism this implements.
export function StudioShell({ sidebar, detail }: { sidebar: ReactNode; detail: ReactNode }) {
  return (
    <div data-theme="light" className="h-dvh w-full overflow-hidden flex flex-col bg-background text-foreground">
      <AppHeader />
      <div className="flex-1 min-h-0 w-full overflow-hidden flex">
        <nav
          className="shrink-0 h-full overflow-y-auto border-r border-border"
          style={{ width: "var(--sidebar-width, 280px)" }}
          aria-label="Songs"
        >
          {sidebar}
        </nav>
        <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col min-h-0">{detail}</div>
      </div>
    </div>
  );
}
