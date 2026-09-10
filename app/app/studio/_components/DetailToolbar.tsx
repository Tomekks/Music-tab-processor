import { TabSelector } from "./TabSelector";
import type { Tab } from "./StudioTabs";
import { TABS } from "./StudioTabs";

// M3: just the tab selector. M4 adds MetronomeControls here as a permanent sibling
// (not nested inside a tab branch -- that's the bug this route exists to fix, see
// app/app/studio/STATUS.md).
export function DetailToolbar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div className="border-t border-zinc-200 px-8 py-4">
      <TabSelector tabs={TABS} active={active} onSelect={onSelect} />
    </div>
  );
}
