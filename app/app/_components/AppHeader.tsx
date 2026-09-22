import Link from "next/link";
import { HeaderSongsButton } from "./DrawerContext";
import { ThemeToggle } from "./ThemeToggle";
import { Kbd } from "@/components/Kbd";
import { TRANSPORT_SHORTCUTS, type ShortcutAction, type ShortcutDef } from "@/lib/keyboardShortcuts";

// Persistent top bar, above the sidebar/detail row -- the one fixed landmark
// regardless of which song is selected or what the URL happens to be. Stays a
// server component: the drawer toggle and theme switch render as client
// islands inside it (spec 8d). Left group is the Songs island + title; right
// group is the static shortcut hint (hidden below md) + theme toggle. DOM
// order: Songs -> title -> hint -> toggle.

// Fail-fast lookup: TRANSPORT_SHORTCUTS pins these actions, so a missing entry
// is a code bug, not a render-time option.
function shortcutFor(action: ShortcutAction): ShortcutDef {
  const found = TRANSPORT_SHORTCUTS.find((s) => s.action === action);
  if (!found) throw new Error(`TRANSPORT_SHORTCUTS is missing action: ${action}`);
  return found;
}

const togglePlayHint = shortcutFor("toggle-play");
const stepBackHint = shortcutFor("step-back");
const stepForwardHint = shortcutFor("step-forward");

export function AppHeader() {
  return (
    <header className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <HeaderSongsButton />
        <Link href="/" className="text-xl font-semibold tracking-tight hover:opacity-70">
          TabbyTab
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <p className="hidden md:block text-xs text-foreground/60">
          <Kbd>{togglePlayHint.kbd[0]}</Kbd> {togglePlayHint.label} <span aria-hidden="true">·</span>{" "}
          <Kbd>
            {stepBackHint.kbd[0]}/{stepForwardHint.kbd[0]}
          </Kbd>{" "}
          {stepBackHint.label}
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
}
