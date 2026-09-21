# Task spec: Dark/light theme switcher (Task 4)

**Tier: S** — real end-user-visible UI, no real user data, fully revertible via `git checkout`.
Rewritten after review caught two real bugs in the first draft (see git history for the finding).
Written fresh against `app/app/_components/StudioShell.tsx` (25 lines), `AppHeader.tsx` (14
lines), `app/app/layout.tsx` (32 lines), `app/app/design-system/page.tsx`, and
`editor.tsx:788-816` — if any has changed, stop and re-read before implementing.

## 0. User story

You open the app. It's always dark, regardless of your OS preference. With this task, a toggle in
the header switches light/dark, persists across reloads, defaults to your system preference on
first visit, and themes every route — including `/design-system`, which never renders the header
at all.

## 1. Context

- **Two real bugs in this spec's first draft, both confirmed by review:** (1) `ThemeToggle` and
  `StudioShell` each calling `useThemeMode()` independently creates two disconnected `useState`
  instances — clicking the toggle would never change what's actually themed. (2) calling
  `localStorage.setItem` inside a `setMode` updater callback is an impurity React's updaters must
  avoid. Both are fixed by the design below, not patched in place.
- **`/design-system` (`page.tsx`) never renders `AppHeader`/`StudioShell`** — confirmed by
  reading it; it returns `<Editor .../>` directly. A toggle mounted only inside `AppHeader`
  literally cannot theme that route. The mount point has to be above both trees —
  `app/layout.tsx` (`RootLayout`) is the only thing that wraps every route.
- **Bare `:root` already resolves to the light palette** — confirmed by reading
  `build-tokens.mjs`'s generator: `:root` gets `base.color` (the light values) directly, only
  `[data-theme="dark"]` overrides the varying keys. So a route with no `data-theme` attribute set
  yet (first paint, before any client JS runs) isn't broken or unstyled — it's light by default.
  This is why StudioShell's `data-theme="dark"` literal exists today (to force dark before this
  task) and why removing it is safe, not a regression.
- `editor.tsx:788-791`'s comment ("`/design-system` renders outside StudioShell's data-theme
  div") and its `:808-816` neighbor ("the running app renders the dark theme only") both become
  false the moment this ships — both need updating, not left to rot.
- Verified separately, not a risk this task needs to plan around: `FretboardDiagram.tsx` is
  already fully token-driven (`var(--foreground)`/`var(--background)` throughout, confirmed by
  reading the component) — `STATUS.md`/`BACKLOG.md` claiming otherwise are stale docs, not
  current fact.

## 2. Scope

### `app/hooks/useThemeMode.ts` (new) — the single owner

```tsx
"use client";
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";
const STORAGE_KEY = "guitar-tabs-theme";

function systemPreference(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemeMode(): { mode: ThemeMode; toggle: () => void } {
  // Seeded "dark" so server and first client render agree (no hydration
  // mismatch) -- corrected to the real stored/system value client-only,
  // immediately after mount. One unavoidable flash on first paint for a
  // light-mode user; accepted, no SSR cookie plumbing for this hobby project.
  const [mode, setMode] = useState<ThemeMode>("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setMode(stored === "light" || stored === "dark" ? stored : systemPreference());
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);
  const toggle = () => setMode((prev) => (prev === "dark" ? "light" : "dark")); // pure updater
  return { mode, toggle };
}
```

### `app/app/_components/ThemeProvider.tsx` (new)

```tsx
"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useThemeMode, type ThemeMode } from "../../hooks/useThemeMode";

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeMode(); // the ONE call site — every consumer reads this, never its own instance
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

### `app/app/layout.tsx`

Wrap `{children}` in `<ThemeProvider>`, inside `<PostHogProvider>` (order doesn't matter between
these two, no interaction):

```tsx
<body className="min-h-full flex flex-col">
  <PostHogProvider>
    <ThemeProvider>{children}</ThemeProvider>
  </PostHogProvider>
</body>
```

This is what makes `/design-system` themed correctly with **no toggle button of its own** —
`ThemeProvider`'s effects apply the attribute on every route since `RootLayout` wraps all of them;
only `AppHeader`'s toggle changes it, but every route reads the same DOM attribute regardless.

### `app/app/_components/ThemeToggle.tsx` (new)

```tsx
"use client";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      className="text-sm text-foreground/70 hover:text-foreground"
    >
      {mode === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
```

### `AppHeader.tsx`

Import and render `<ThemeToggle />` alongside the existing `TabbyTab` link, `justify-between` on
the header. `AppHeader` stays a server component — `ThemeToggle` is the client leaf, same pattern
as any other client component imported into a server one.

### `StudioShell.tsx`

Delete `data-theme="dark"` from the outer `<div>` — nothing else changes. `StudioShell` needs no
`"use client"` conversion, no new props; theming is fully handled above it now.

### `editor.tsx`

Update both stale comments (§1): the `:788-791` note about `/design-system` rendering outside any
theme scope no longer applies — delete it or replace with a one-line note that it's themed via
`ThemeProvider` like everything else. The `:808-816` "running app renders dark theme only" line
becomes simply false — rewrite or delete per what actually reads best once both themes are live
(implementer's call, not a design decision worth specifying further here).

## 3. Non-goals

- No token/build changes.
- No SSR cookie-based first-paint theme — the one-flash tradeoff is accepted.
- No toggle button on `/design-system` itself — it inherits whatever was last chosen elsewhere,
  by design (§2).
- No `FretboardDiagram`/`STATUS.md`/`BACKLOG.md` fixes — already correct/out of scope respectively
  (§1).

## 4. File allowlist

- `app/hooks/useThemeMode.ts` (new)
- `app/app/_components/ThemeProvider.tsx` (new)
- `app/app/_components/ThemeToggle.tsx` (new)
- `app/app/_components/AppHeader.tsx`
- `app/app/_components/StudioShell.tsx`
- `app/app/layout.tsx`
- `app/app/design-system/editor.tsx` (comment updates only, §2)
- `app/e2e/theme-toggle.spec.ts` (new — see §5)

## 5. Acceptance criteria

- `npm run verify` passes.
- **Required, scripted half (per `docs/WEB_APP_WORKFLOW.md` §3): `app/e2e/theme-toggle.spec.ts`**,
  run via the existing prod-build Playwright config (`npm run test:e2e` — this is app-wide
  behavior on real routes, not a `/design-system`-only dev-mode concern, so it belongs in the
  existing config, not the design-system one). Cover: default page load with no stored preference
  respects `prefers-color-scheme`; clicking the toggle flips `document.documentElement`'s
  `data-theme` attribute; a reload after toggling preserves the choice (localStorage round-trip).
- **Human checkbox, visual judgment only** (not folded into the scripted spec, per the accepted
  split): open the app in both modes, confirm Sheet/Fretboard/ASCII/the song list/`/design-system`
  all read correctly — first time light mode is observable live, doubles as informal QA of every
  generated light value from Tasks 1/1b onward.
- `git diff --stat` matches the allowlist.
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- Checkpoint commit (not pushed).

## 6. Stop-conditions

- If any allowlisted file's current shape has drifted from what §2 quotes, stop and confirm.
- If `ThemeProvider`'s mount in `layout.tsx` produces a hydration warning beyond the single
  accepted first-paint flash (§2's comment), stop and ask — that would mean the SSR-seed
  assumption doesn't hold the way this spec expects.
