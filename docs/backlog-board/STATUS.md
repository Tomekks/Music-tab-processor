# Backlog board

Part of `docs/backlog-board/` — see `docs/GUIDE.md`'s map for how this fits into the rest of the docs.

**Status:** done, working, verified in-browser (drag/reorder, add/edit, import/export, seed-merge, filter-safe reordering). Local-only tool — a single self-contained `index.html`, no build step, no server, no dependencies beyond a Google Fonts stylesheet link (degrades gracefully offline — see "Known trade-offs" below). Generates `docs/BACKLOG.md`.

**Reads:** its own embedded `SEED` array (the backlog items as of 2026-09-09) merged, on load, with whatever's already saved in the opening browser's `localStorage` (key `guitarAppBacklog.v1`) — any `SEED` item not already present gets appended without touching existing saved items or their order. This merge is what makes editing `SEED` in a future session actually show up for a browser that's already used the tool.

**Writes:** `localStorage` only, automatically, in that same browser — the tool never writes to any file on disk directly. `docs/BACKLOG.md` is synced manually and deliberately: open the tool, drag/edit as needed, then either "Export → Markdown" (downloads a file) or "Copy Markdown" (clipboard), and hand the result to an AI session (or paste it yourself) to actually update `docs/BACKLOG.md` — this keeps the tracked file a deliberate save point, not a live mirror of in-progress dragging.

**Adding or editing one item is cheap — don't regenerate the whole file for it.** Edit the `SEED` array in `index.html` and the matching section in `docs/BACKLOG.md` directly, by hand, as two small targeted edits. Don't open the browser or call `buildMarkdown()` for this — that round-trip reads the entire generated document back as a tool result and then writes the entire thing again, for a one-item change. It's only actually needed once, after a real drag-and-drop reorder happens in the board's UI, since that's the one case where the resulting order isn't already known from the edit itself. Using it for routine single-item additions wastes real tokens for no benefit (found 2026-09-09, after doing exactly that repeatedly).

**Files:**
- `index.html` — the tool itself.
- `DESIGN.md` — the Light-mode palette/typography source, pulled via `npx getdesign@latest add claude` (Anthropic's own cream-canvas/coral editorial design language). Dark mode is a separate, hand-picked palette in `index.html`, untouched by this file. Originally landed at the repo root when the command ran (it always targets the project root, regardless of cwd) — moved here on 2026-09-09 since it's only used by this tool, not the whole project.

**Known, deliberate trade-offs — not bugs:**
- `localStorage` (and the clipboard, for "Copy Markdown") may not persist/work reliably in Safari for `file://` pages, which are stricter about local-file origins than Chrome/Firefox. Untested in real Safari as of this writing — recommend Chrome or Firefox if edits don't seem to be sticking.
- Dragging a card while a category filter is active places any filtered-out card in that status column *before* the visible ones, rather than perfectly interleaved with them — cosmetic only, never data loss or a wrong column. See the comment above `syncOrderFromDOM` in `index.html`.
- Any cross-reference between items (`Dependencies`, `Related`) must name the other item's title, never a positional number (`#N`) — item order changes by design (that's the whole point of the board), so a positional reference silently goes stale the moment anything is added or reordered. This actually happened once already (2026-09-09, inserting the CodeScene item shifted three existing numeric references) — see `docs/DRIFT_LOG.md`'s entry that day for the fix.

**Decided (2026-09-09):** yes, this tool + `DESIGN.md` are public on GitHub. See `docs/PENDING_ACTIONS.md`.

**Known disconnect, not yet resolved:** this tool's Light-mode design (`DESIGN.md`, pulled via `npx getdesign@latest add claude` — Anthropic's own cream/coral editorial system) is a completely separate design source from `app/`'s own, in-progress design-system playground (`app/design_system/`, gitignored, tuning its own token set for the actual product). The two don't share a single palette today. The intent going forward is for the web app, this backlog board, and the eventual local processing UI to all draw from *one* design system — `app/design_system/`'s playground is that intended single source, explicitly still a proof of concept, not this tool's `DESIGN.md`. See the "Unify the design system across surfaces" item in `docs/BACKLOG.md`.
