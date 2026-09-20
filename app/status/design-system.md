# Design system

Part of `app/status/` — see `app/STATUS.md` for the index.

**In progress, local-only by design.** `app/design_system/index.html` is a standalone, gitignored playground for tuning color/radius/spacing tokens against mocked-up versions of the real components (song row, tab block), with a live CSS-output panel shaped to paste straight into `globals.css`'s `@theme` block. It's a plain static HTML file — open it directly in a browser, no dev server needed. Deliberately never pushed to GitHub (see `app/.gitignore`) since it's a personal tuning tool, not part of the shipped app; this note exists so a future session isn't confused by a folder it can't see on GitHub.

**Shipped instead of the bridge:** the package (`app/packages/design-system/`, see its README)
plus an in-app editor at `/design-system` (`app/app/design-system/`) now do what the planned
"bridge" mode was for — live token tuning against the real rendered app. Because the editor runs
inside the actual Next.js dev server and writes straight to `tokens.json`, Next's own HMR pushes
every change into the live page automatically; no iframe/`postMessage` bridge was needed. The
standalone playground above stays useful for quick mockup-only sketches, but it's no longer the
only way to preview a token change against real components.

**Current state:** the whole app runs on the generated token stylesheet now (Task 3's cutover),
not just `SheetDiagram.tsx` — see `app/packages/design-system/README.md` for what the package
contains and `docs/superpowers/specs/2026-09-19-design-system-design.md` for the full design.

**Three named theme presets now, not two.** Added 2026-09-11: `patchbay`, a child theme (same "only the keys that differ" structure as `claude`) matching the interactive diagrams at `app/public/archytechy/index.html` exactly (formerly `docs/patch-bay/`, removed 2026-09-20 as a duplicate) — select it here to preview that palette against the app's real mocked components.
