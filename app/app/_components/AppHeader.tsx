import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

// Persistent top bar, above the sidebar/detail row -- the one fixed landmark
// regardless of which song is selected or what the URL happens to be. Just a
// home link today (no auth, no nav items yet); grows here if that changes.
export function AppHeader() {
  return (
    <header className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-semibold tracking-tight hover:opacity-70">
        TabbyTab
      </Link>
      <ThemeToggle />
    </header>
  );
}
