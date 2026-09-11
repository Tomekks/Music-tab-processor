# Patch Bay

Part of `docs/patch-bay/` — see `docs/GUIDE.md`'s map for how this fits into the rest of the docs.

**Status:** done, working, verified in-browser. A single self-contained `index.html` — open it directly, no server needed. Two diagrams (development workflow, pipeline architecture), each interactive: click a station for its real detail, or hit "Trace it →" for a guided walkthrough that visits every station in order, highlighting each and narrating it. An ambient signal dot loops continuously along the main path in both diagrams — a literal "signal path," matching the project it documents. All motion respects `prefers-reduced-motion` (disabled entirely, no exceptions).

**Palette is a real theme, not a one-off.** The four core colors (background/ink/accent/border) match the `Patch bay` entry in `app/design_system/`'s theme selector exactly — select it there to preview the same palette against the app's own real components. That tool's schema has no room for this page's extra tokens (`--surface-2`, the semantic `--ok`/`--warn`/`--blocked` status colors); if the four shared colors ever change, update both files by hand — same manual-sync convention already used between `docs/backlog-board/index.html` and `docs/BACKLOG.md`.

**Controls:** accent color, light/dark/system theme, node shape (sharp/rounded/pill), text density — all persist per-browser via `localStorage`.

**Content is factual, not illustrative.** Every station's detail text names a real file, command, or date from this project — see `docs/DEVELOPMENT_PROCESS.md` and `docs/ARCHITECTURE.md`, which this page visualizes rather than replaces. One planned-but-not-built item (a local pipeline-trigger UI) is marked honestly with a dashed box, not omitted.

**Not built:** a way to regenerate this page's SVG automatically from the source docs — it's hand-authored and updated by hand when either doc changes materially, the same tradeoff `docs/backlog-board` already makes for its own content.
