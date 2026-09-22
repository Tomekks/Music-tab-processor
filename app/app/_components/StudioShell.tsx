import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { DrawerProvider } from "./DrawerContext";

// The whole app is a fixed-viewport shell: outer overflow-hidden is what guarantees
// zero page-level scroll no matter what any descendant does. AppHeader is a shrink-0
// row on top; below it a flex-1 row with two slots -- the sidebar (owns its own nav
// chrome, width, scroll container, and mobile drawer; see SongListSidebar.tsx) and
// the tab-diagram region (the only other scrolling container). The shell never names
// sidebar geometry -- see app/app/studio/STATUS.md for the full layout mechanism
// this implements.
//
// Drawer state (spec 8d): exactly one DrawerProvider wraps the existing slots.
// The shell stays a server component -- the provider is the client boundary,
// and the header/sidebar render their client islands inside it.
export function StudioShell({ sidebar, detail }: { sidebar: ReactNode; detail: ReactNode }) {
  return (
    <DrawerProvider>
      <div className="h-dvh w-full overflow-hidden flex flex-col bg-background text-foreground">
        <AppHeader />
        <div className="flex-1 min-h-0 w-full overflow-hidden flex">
          {sidebar}
          <div data-testid="detail-column" className="flex-1 h-full min-w-0 overflow-hidden flex flex-col min-h-0">{detail}</div>
        </div>
      </div>
    </DrawerProvider>
  );
}
