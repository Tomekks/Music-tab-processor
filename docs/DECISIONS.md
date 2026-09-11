# Decisions

The reasoning behind how this project is built, not just what was chosen. **This file is an index, not the full reasoning** — read this to get oriented and to know which topic file to open; the actual depth lives in `docs/decisions/`. Don't re-litigate anything here without a concrete new reason — these were arrived at deliberately, over several rounds of back-and-forth, not defaults.

**This file must stay an index.** When a new decision is made or an existing one revised, the reasoning goes into the matching file in `docs/decisions/` (or a new one, following `docs/DOCUMENTATION_PRINCIPLES.md`) — not appended here.

## Topic index

**Project purpose and scope** — the core reframe ("recognizable, not accurate," not a note-perfect transcription); the project's second purpose as a public AI-direction demonstration; what stays local-only and why (copyright); using published tabs to validate output, never as a pipeline input. *Open if your task touches: what "correct" output means, publishing/scope boundaries, or why something is local-only.* → `docs/decisions/project-purpose-and-scope.md`

**Hosting and deployment** — the Mac never gets exposed to the internet; the two sides (local pipeline, hosted app) meet only through the database; Turso/Drizzle was chosen because the app genuinely needs a hosted database, not a local file; Vercel auto-deploy-on-push is off, staging/versioning/live are three separate, explicitly-asked-about gates. *Open if your task touches: deployment, the database, Vercel settings, or anything about what's public vs. local-only.* → `docs/decisions/hosting-and-deployment.md`

**Pipeline tool choices** — every pipeline stage (separation, transcription, tab generation) picked with a real alternative in mind and an explicit "swap it later for a concrete reason" design; vocal separation quality is out of scope on purpose; song complexity, not audio quality, is the real transcription bottleneck; the priority is a complete end-to-end MVP before polishing the weakest stage. *Open if your task touches: which tool a pipeline stage uses, or whether to swap one.* → `docs/decisions/pipeline-tool-choices.md`

**Backlog and scope** — riff identification stays manual on purpose; difficulty grading, Spotify lookup, and `yt-dlp` are each backlogged for their own specific reason, not just "later"; a local pipeline-trigger UI is planned but not built. *Open if your task touches: any of these specific backlogged features, or whether one should get un-backlogged.* → `docs/decisions/backlog-and-scope.md`

**Display modes** — ASCII is the real default, not a placeholder; the fretboard diagram's two real lessons from using it (order matters more than position, fixed-size layouts waste the common case); why Songsterr is inspiration but full rhythm notation isn't being built; the metronome is deliberately not synced to real note timing. *Open if your task touches: Sheet, Fretboard, the ASCII tab, the metronome, or any new way of showing a tab.* → `docs/decisions/display-modes.md`

**Stack and tooling** — why Next.js/TypeScript specifically (small/cheap coding models know it well), and the full reliability toolkit (types, tests, lint, CI, small commits, spec checklists, walk tests) built in because those models aren't fully trusted unsupervised. *Open if your task touches: choosing a library/framework, or the general "why do we have this safeguard" question.* → `docs/decisions/stack-and-tooling.md`

**Structure and methodology** — why `icm-architect`'s structure was adopted selectively (numbered folders, `STATUS.md` files, contracts, the walk test) rather than wholesale, and the one deliberate deviation from its own spec (`s01_` not `01_`, a Python syntax constraint). *Open if your task touches: repo layout conventions, or "why does this project look the way it does."* → `docs/decisions/structure-and-methodology.md`

**Safety principles** — the reasoning behind `AGENTS.md`'s hard rules (minimal scoped changes, never internet-reachable, explain outbound requests, prefer additive/reversible changes, scoped deletion permission). *Open if your task touches: anything `AGENTS.md`'s safety section covers, or you need the "why," not just the rule.* → `docs/decisions/safety-principles.md`

**Agent workflow tooling** — the Superpowers Claude Code plugin (installed 2026-09-10, user-wide) is now the process driver for planning, TDD, debugging, code review, and verification, superseding this project's own ad hoc versions of those in `AGENTS.md`; this repo's safety rules and structural specifics (contracts, STATUS.md, the app/ deploy gate) stay untouched and take precedence over any skill. *Open if your task touches: how planning/testing/debugging/review actually happen now, or why `AGENTS.md` points at skill names instead of spelling out process.* → `docs/decisions/agent-workflow-tooling.md`

See also: `docs/AUDIOPROCESSINGTOOLS.md` (the living tool-research catalog, separate from the *decisions* made from it), `app/STATUS.md` (what's actually true right now, not why), and `docs/DOCUMENTATION_PRINCIPLES.md` (the standing rules this whole structure follows).
