import { HeaderSongsButton } from "./DrawerContext";
import { TrackedLink } from "./TrackedLink";
import { ThemeToggle } from "./ThemeToggle";
import { KeyboardShortcutsHint } from "./KeyboardShortcutsHint";
import { TRANSPORT_SHORTCUTS, type ShortcutAction, type ShortcutDef } from "@/lib/keyboardShortcuts";

// Persistent top bar, above the sidebar/detail row -- the one fixed landmark
// regardless of which song is selected or what the URL happens to be. Stays a
// server component: the drawer toggle, keyboard-shortcuts hint, and theme
// switch render as client islands inside it (spec 8d). Left group is the
// Songs island + title; right group is the shortcuts hint (hidden below md)
// + theme toggle. DOM order: Songs -> title -> hint -> toggle.
//
// Shortcuts hint (2026-09-25 IconButton redesign): moved to its own client
// component, KeyboardShortcutsHint.tsx -- this file (a server component)
// can't pass the Keyboard icon itself as a prop across the server/client
// boundary (lucide-react icons aren't plain serializable objects), only the
// plain shortcut data below.

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
        <TrackedLink
          href="/"
          event="nav-home"
          className="text-xl font-semibold tracking-tight hover:opacity-70"
        >
          TabbyTab
        </TrackedLink>
      </div>
      <div className="flex items-center gap-2">
        <KeyboardShortcutsHint
          togglePlayHint={togglePlayHint}
          stepBackHint={stepBackHint}
          stepForwardHint={stepForwardHint}
        />
        <ThemeToggle />
      </div>
    </header>
  );
}
