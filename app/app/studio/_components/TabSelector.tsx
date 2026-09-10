import { cn } from "@/lib/cn";

// Purely navigational: reports which tab is active and lets the caller change it.
// Deliberately generic (no import of notes/tuning/metronome types) -- this component
// has zero knowledge that a metronome or a diagram even exists.
export function TabSelector<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly T[];
  active: T;
  onSelect: (tab: T) => void;
}) {
  return (
    <div role="tablist" aria-label="Tab display mode" className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onSelect(tab)}
          className={cn(
            "px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
            active === tab ? "border-accent text-accent" : "border-transparent text-foreground/40 hover:text-foreground/70"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
