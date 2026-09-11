import Link from "next/link";

// Persistent top bar, above the sidebar/detail row -- the one fixed landmark
// regardless of which song is selected or what the URL happens to be. Just a
// home link today (no auth, no nav items yet); grows here if that changes.
export function AppHeader() {
  return (
    <header className="shrink-0 border-b border-border px-6 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight hover:opacity-70">
        Music Tab Processor
      </Link>
    </header>
  );
}
