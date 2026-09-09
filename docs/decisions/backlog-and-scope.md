# Backlog and scope

Part of `docs/decisions/` — see `docs/DECISIONS.md` for the index and the reading policy. Everything here is intentionally not built yet, each for its own specific reason — not a blanket "later."

## Manual riff identification

Identifying "where the main riff happens in a song" automatically is a genuinely hard, partly-unsolved music-structure-segmentation problem. Rather than attempt to automate it for v1, the developer marks the riff section manually in a simple player — this was a deliberate choice, not a fallback: understanding the process firsthand was explicitly preferred over automating it away immediately. Auto-detection remains a possible later upgrade, not a blocked one.

## Everything else backlogged, and why each specifically

**Difficulty grading** (Original/Medium/Easy/Baby) is backlogged because it needs its own real design work (what makes a tab objectively easier — note density, fret span, position changes, technique complexity) that hasn't been done yet, and doing it prematurely risks building on a pipeline that might still change shape.

**Spotify metadata lookup** and **"check if tabs exist online"** are backlogged because they're quality-of-life additions for a tool that, by design, serves one user who already knows what they uploaded — not worth the complexity yet.

**`yt-dlp` (YouTube-link ingestion)** is backlogged because file upload alone is enough to validate the core pipeline, and adding a second ingestion path before the first is proven just adds a dependency and a failure mode (YouTube's page structure changing) for no immediate benefit — it's sequenced explicitly *after* Phase 0 succeeds, not abandoned. When it is eventually built, it's for the developer's own internal exploration of a wider range of songs — **never for demos or anything published.** Source-audio licensing is a separate, real concern that doesn't go away by choosing `yt-dlp` over a local file — stream-ripping copyrighted audio doesn't have a clean legal answer regardless of source, and for a *public* demo specifically, the answer is to use royalty-free/Creative-Commons-licensed audio instead (e.g. YouTube Audio Library, ccMixter, Free Music Archive), sidestepping the question entirely rather than trying to resolve it.

**Local web UI for triggering pipeline runs** (backlogged, 2026-09-07). Rather than a pure CLI, the local pipeline will eventually get a simple local-only web UI — click a button, pick an audio file, kick off processing. Worth planning for even though it's not being built yet: it doubles as the natural entry point for `yt-dlp` ingestion later (paste a link instead of picking a file), and removes the need to touch a terminal for day-to-day use. Resources gathered for when this gets built: [Lucide](https://lucide.dev/icons/) for icons, the `anthropics/claude-code` [frontend-design plugin](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) guidelines, and Paul Bakaus's [`impeccable`](https://github.com/pbakaus/impeccable) design-quality guidance. A real design system (swappable colors/shapes/spacing/etc., not hardcoded values) is wanted from the start once this is built. Open question, not decided yet: same Next.js app as the hosted read-only practice view (different route) vs. a separate local-only tool.
