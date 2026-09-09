# Backlog

The single place to dump, triage, and prioritize ideas for this project — before something here is actually decided and scheduled, it's just a candidate. This is a fourth kind of doc, distinct from the "three homes" in `docs/DOCUMENTATION_PRINCIPLES.md` (why / current-status / rendering-rules): this file holds *proposals not yet acted on*, not settled facts.

**Standing rule, binding on every session or model working from this file:** never add a new item to this backlog without first showing the user the exact proposed entry in chat and getting explicit confirmation. Editing or re-prioritizing an existing item doesn't need this — only adding a new one.

This file is generated from `docs/backlog-board/index.html` (Export → Markdown). Edit items there, not by hand here, so the board and this file don't drift apart.

Status values: `Idea` → `Considered` → `Selected` → `In progress` → `Done` / `Rejected` (archived below, never deleted). Priority is set per item (`Unranked`/`Low`/`Medium`/`High`); order within each section reflects drag-order in the board.

---

## Process & reliability

### 1. Pin and commit Python pipeline dependencies
**Status:** Considered · **Priority:** Unranked · **Effort:** S

No requirements.txt or pyproject.toml is committed to git for the pipeline side — checked directly, there isn't one. Versions only exist in the live .venv on this Mac (confirmed via pip freeze).

- **Pros:** Reproducible setup on a fresh machine or session; catches silent version drift; matches the reliability philosophy already applied on the app side (TypeScript, tests, CI) — docs/decisions/stack-and-tooling.md.
- **Cons:** tuttut's own pinned dependencies are already known to fail to build as-is (docs/audio-tools/tab-generation.md — installed with --no-deps against modern versions instead). A naive pip freeze wouldn't reproduce cleanly elsewhere without documenting that workaround too.
- **Related:** `docs/decisions/stack-and-tooling.md`, `docs/audio-tools/tab-generation.md`

### 2. Audit the existing test suite
**Status:** Considered · **Priority:** Unranked · **Effort:** S–M

Review what the 12 pipeline tests and the app's node --test suite actually catch versus what they cost to maintain, and close the one acknowledged gap: pipeline/s05_publish/publish.py has no test at all.

- **Pros:** Closes a real, already-documented gap; "golden file" tests are worth checking for staleness since ML output can drift run to run; cheap relative to the trust it buys.
- **Cons:** Nothing is currently broken or blocked by the missing test, so it's not urgent; risk of padding coverage with low-value tests if not scoped tightly.
- **Related:** `pipeline/VERIFY.md`, `pipeline/s05_publish/STATUS.md`

### 3. Living tech-spec-per-feature convention
**Status:** Considered · **Priority:** Unranked · **Effort:** M (ongoing)

docs/specs/ currently holds one-off mechanical specs written before pipeline-stage work, not maintained after. This proposes the same for app features, kept updated as behavior changes.

- **Pros:** A precise "how this is supposed to behave" reference a memoryless agent could read instead of reverse-engineering it from source.
- **Cons:** Real overlap risk — component RULES.md already covers "how it renders", STATUS.md already covers "what's true now". A third parallel living doc per feature is close to what the "three homes" rule exists to prevent.
- **Related:** `docs/DOCUMENTATION_PRINCIPLES.md`, `docs/specs/_TEMPLATE.md`

### 4. "Strategist + cheap executor" AI workflow, as a reusable tool
**Status:** Idea · **Priority:** Unranked · **Effort:** L

Package the pattern — a strong model plans/specs, a free/cheap model executes, checked against the existing reliability toolkit (types, tests, contracts) — as something invokable on demand. Already roughly how the project gets built in practice (docs/decisions/stack-and-tooling.md).

- **Pros:** Could meaningfully cut cost on future execution-heavy tasks; reuses infrastructure already justified and in place; an interesting second angle for the project's "demonstrating AI-direction ability" purpose.
- **Cons:** Meta-work — building a tool to build the project, not the project itself; real yak-shaving risk; "100% accuracy" from a free model isn't a promise any tooling can make.
- **Dependencies:** Backup current project structure first (safety step, not a tracked item)
- **Related:** `docs/decisions/stack-and-tooling.md`

### 5. Low-token layout/wireframe exploration method
**Status:** Idea · **Priority:** Unranked · **Effort:** S–M

A fast, cheap way to iterate on layout ideas before real implementation — ASCII wireframes vs. a minimal low-token HTML render — plus Tailwind components vs. hand-rolled markup for throwaway explorations.

- **Pros:** Cheaper, faster iteration before spending real tokens on full component code; plugs into things already planned rather than being standalone.
- **Cons:** Another process to maintain instead of just building the UI; ASCII wireframes lose real layout fidelity a low-token HTML render wouldn't; only pays off if a real UI push happens soon.
- **Dependencies:** "Local web UI for triggering pipeline runs" (for payoff, not strictly blocking)
- **Related:** `docs/decisions/backlog-and-scope.md`, `app/status/design-system.md`

### 6. Integrate CodeScene MCP server
**Status:** Idea · **Priority:** High · **Effort:** S–M

Add codescene-oss/codescene-mcp-server so Claude (and other agents) can query CodeScene's Code Health analysis directly — hotspot identification, complexity/maintainability scoring, code ownership tracking, delta reviews for refactoring validation, and technical-debt business-case calculations. Runs locally; no source code leaves the machine. Free standalone tier available; a CodeScene subscription/CS_ACCESS_TOKEN unlocks more.

- **Pros:** Directly extends the project's existing reliability toolkit (types, tests, contracts, CI) with an automated code-health signal instead of relying on manual review alone; delta reviews specifically catch newly-introduced technical debt before it's merged — relevant given how much of this codebase is AI-executed; local-only execution matches the project's own "never internet-reachable, careful about outbound requests" safety stance.
- **Cons:** Another tool to install and keep current; value is unproven until actually run against this specific codebase — a project this size may not yet have enough history/hotspots for the analysis to be very informative; some features are gated behind a CodeScene subscription, not fully free.
- **Related:** `https://github.com/codescene-oss/codescene-mcp-server`

### 7. Set up CI (GitHub Actions)
**Status:** Idea · **Priority:** Unranked · **Effort:** S–M

Run pipeline tests + app lint/tests automatically on every commit. The one still-missing piece of the project's own reliability toolkit.

- **Pros:** An objective, always-on signal that doesn't require reading every diff by hand; low effort since the tests already exist.
- **Cons:** Needs the Python pipeline environment (.venv, model weights, tuttut's dependency workaround) reproduced in CI — much easier once dependencies are pinned.
- **Dependencies:** "Pin and commit Python pipeline dependencies" (recommended first)
- **Related:** `docs/decisions/stack-and-tooling.md`, `pipeline/VERIFY.md`

### 8. One-command pipeline orchestration
**Status:** Idea · **Priority:** Unranked · **Effort:** S

A run_pipeline.py (or similar) wrapping the current 5 manual CLI commands (s01_ingest → s05_publish) into one call per song.

- **Pros:** Removes real day-to-day friction; low risk since each stage already works standalone — this is just sequencing, not new logic.
- **Cons:** Slight overlap with "Local web UI for triggering pipeline runs" — worth deciding if this is a stepping stone toward that or ends up redundant.
- **Related:** `pipeline/VERIFY.md`

### 9. Audit docs/DOCUMENTATION_PRINCIPLES.md for gaps and improvements
**Status:** Idea · **Priority:** Unranked · **Effort:** S

Review the doc's own rules for gaps, inconsistencies, or things that no longer hold. Starting point: the "three homes" principle has no stated home for proposals under consideration — BACKLOG.md itself is a fourth kind of doc it doesn't account for.

- **Pros:** Cheap, and the docs structure is core to how this project stays legible to memoryless agents.
- **Cons:** Purely meta; no user-facing payoff.
- **Related:** `docs/DOCUMENTATION_PRINCIPLES.md`

## Audio pipeline

### 10. Re-audit transcription-stage accuracy and alternatives
**Status:** Considered · **Priority:** Unranked · **Effort:** M–L

Basic Pitch has only ever been "env-sanity" tested — real accuracy on polyphonic guitar/full-band audio has never been formally judged. Both Basic Pitch and tuttut are already polyphonic end-to-end; this is about detection accuracy, not a missing polyphony capability.

- **Pros:** Targets the project's own stated weak point directly; concrete alternatives already identified (MT3, MR-MT3).
- **Cons:** MT3/MR-MT3 are research-grade (TF/JAX), real setup effort for a possibly marginal gain; risks pulling against the project's own "recognizable, not accurate" reframe; needs a real benchmark methodology.
- **Dependencies:** "Phase 0 Checkpoints 4/5" (recommended first — cheaper signal on whether this is even needed)
- **Related:** `docs/audio-tools/transcription.md`, `docs/decisions/pipeline-tool-choices.md`, `research/00_spike/RESULTS.md`

### 11. Phase 0 Checkpoints 4/5 — run a harder, full-band song end-to-end
**Status:** Idea · **Priority:** Unranked · **Effort:** M

The real s01–s05 pipeline has only ever been run on Mister Sandman and a synthetic tone; a harder, full-band song has only gone through old Phase 0 spike scripts, never the real pipeline code.

- **Pros:** Cheap way to find real breakage before investing in the "Re-audit transcription-stage accuracy" item's tool research; directly answers whether the current stack holds up outside its one validated case.
- **Cons:** Needs a real royalty-free/CC-licensed full-band track to stay consistent with the project's copyright stance if this ever becomes a public demo.
- **Related:** `pipeline/VERIFY.md`

## App / UI features

### 12. Stylized "active note" effect synced to the metronome
**Status:** Considered · **Priority:** Unranked · **Effort:** M

A plainer version is already backlogged (a visual cue highlighting which note/chord is currently sounding), and Sheet already has a basic implementation (playhead + inverted colors). This is the stylized version (glow/flame/"burn" treatment) plus extending the highlight to Fretboard and Ascii.

- **Pros:** Builds on infrastructure deliberately built generic for this; genuinely fun and portfolio-worthy; low architectural risk.
- **Cons:** Purely decorative; needs restraint to not fight the "recognizable, not accurate" / tight-fit display lessons already learned; Fretboard animation performance untested.
- **Related:** `app/hooks/useMetronome.ts`, `docs/decisions/display-modes.md`, `app/status/song-views.md`

### 13. Local web UI for triggering pipeline runs
**Status:** Considered · **Priority:** Unranked · **Effort:** L

A simple local-only web UI — pick an audio file, click a button, kick off processing — instead of the current CLI-only workflow. Resources already gathered: Lucide icons, the frontend-design plugin, impeccable design guidance. Open question: same Next.js app (different route) vs. a separate local-only tool.

- **Pros:** Removes the terminal from day-to-day use; doubles as the natural entry point for yt-dlp ingestion later; resources already gathered, not a cold start.
- **Cons:** Real design/build effort; a write-capable local UI is new attack surface if ever exposed beyond localhost.
- **Related:** `docs/decisions/backlog-and-scope.md`

### 14. Apply design-system tokens to Fretboard and Ascii
**Status:** Idea · **Priority:** Unranked · **Effort:** S–M

FretboardDiagram.tsx's colors are still hardcoded, unlike SheetDiagram.tsx which is already wired to the real tokens.

- **Pros:** Sheet already proves the approach works; makes theming (e.g. dark mode) consistent across all three views instead of one.
- **Cons:** Needs the design-token playground's values to actually be settled first, or this risks being redone once tokens change.
- **Dependencies:** Design-system token playground reaching stable values
- **Related:** `app/status/song-views.md`, `app/status/design-system.md`

### 15. Synthesized audio playback of the tab
**Status:** Idea · **Priority:** Unranked · **Effort:** Unknown — scope and approach not decided

The stated need: a way to actually hear the transcribed notes/melody ring, to judge by ear whether the tab sounds like the song intends — as much a pipeline-QA tool as a practice feature. Distinct from the existing metronome, which is a silent step sequencer with no note/pitch knowledge — no actual note audio plays today.

- **Pros:** Real, immediate value as a verification tool during pipeline work; matches intent already on record (docs/decisions/display-modes.md), not a new direction.
- **Cons:** Genuinely open scope — in-browser synthesis (Web Audio API + soundfont) vs. rendering an audio file during the pipeline are very different builds; chords vs. monophonic playback and the approximated durationSec both need real decisions first.
- **Related:** `docs/decisions/display-modes.md`, `app/hooks/useMetronome.ts`, `docs/DECISIONS.md`
- **Note:** Scope, approach, and priority are explicitly not known yet — kept as Idea on purpose.

## Content / portfolio

### 16. Project blog
**Status:** Idea · **Priority:** Unranked · **Effort:** Unknown until scoped

A public write-up of the project, serving its explicit second purpose (a public demonstration of directing AI tools as a designer). Real material already exists: research/00_spike/RESULTS.md, docs/DRIFT_LOG.md, git history, gitignored case-study notes.

- **Pros:** Directly serves a purpose the project already states as core; real source material already exists.
- **Cons:** Writing/publishing time competes with build time; needs the same copyright discipline as the rest of the project applied to public writing too.
- **Related:** `docs/DECISIONS.md`, `docs/PENDING_ACTIONS.md`
- **Note:** "3 day case study, 6 month" — framing unclear, needs your input before this moves past Idea.

## Already-decided backlog (pointers only — full reasoning lives in `docs/decisions/backlog-and-scope.md`)

### 17. Manual riff identification → possible later automation
Marking which part of a song is "the riff" is done by hand on purpose (auto-detection is a hard, partly-unsolved segmentation problem). Automating it is a possible later upgrade, not blocked. → `docs/decisions/backlog-and-scope.md`

### 18. Difficulty grading (Original/Medium/Easy/Baby)
Needs real design work first (what actually makes a tab objectively easier) that hasn't been done, and doing it before the pipeline's shape is settled risks building on sand. → `docs/decisions/backlog-and-scope.md`

### 19. Spotify metadata lookup + "check if tabs exist online"
Quality-of-life additions for a tool that, by design, serves one user who already knows what they uploaded — not worth the complexity yet. → `docs/decisions/backlog-and-scope.md`

### 20. yt-dlp (YouTube-link) ingestion
Backlogged because file upload alone already validates the core pipeline; sequenced explicitly after Phase 0 succeeds. Real licensing constraint: for anything public, royalty-free/CC-licensed audio only, never stream-ripped copyrighted audio. → `docs/decisions/backlog-and-scope.md`

---

## Archive

*(nothing yet — done/rejected items move here, never deleted)*

---

## Current stack & versions, for reference

Not a backlog item — a snapshot. Authoritative sources: `app/package.json` (Node/JS) and the `.venv` (Python).

- **App:** Next.js 16.3.4, React 19.2.8, TypeScript ^5, Tailwind CSS ^4, Drizzle ORM ^0.45.2, `@libsql/client` ^0.18.0, PostHog JS ^1.428.7
- **Pipeline (Python 3.11.16):** `basic-pitch` 0.4.0, `demucs` 4.1.0, `librosa` 0.11.0, `tuttut` 0.0.6, `torch` 2.14.0, `torchaudio` 2.11.0
- **Database:** Turso (hosted libSQL/SQLite-compatible)
- **Hosting:** Vercel
