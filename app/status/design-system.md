# Design system

Part of `app/status/` — see `app/STATUS.md` for the index.

**In progress, local-only by design.** `app/design_system/index.html` is a standalone, gitignored playground for tuning color/radius/spacing tokens against mocked-up versions of the real components (song row, tab block), with a live CSS-output panel shaped to paste straight into `globals.css`'s `@theme` block. It's a plain static HTML file — open it directly in a browser, no dev server needed. Deliberately never pushed to GitHub (see `app/.gitignore`) since it's a personal tuning tool, not part of the shipped app; this note exists so a future session isn't confused by a folder it can't see on GitHub.

**Planned next (not built):** a live "bridge" mode — the tool embeds the real `npm run dev` server in an iframe and pushes token changes into it via `postMessage`, so tweaks preview against the actual rendered app (real Tailwind output, real components) instead of a hand-built mockup, without ever touching the live/deployed site. Needs a small dev-only listener in the app itself, gated to never run in production. Once real Tailwind components (e.g. shadcn/ui) exist, Storybook is the natural next step up from this tool — deliberately deferred until there's an actual component set worth isolating.

**Actual adoption so far:** `SheetDiagram.tsx` is the first (and only) component wired to the real tokens (`var(--background)`/`var(--foreground)`) instead of hardcoded colors — see `app/status/song-views.md`.
