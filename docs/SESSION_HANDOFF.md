# Session checkpoint & handoff procedure

Two modes: **Quick checkpoint** (light, for casual pauses) and **Full handoff** (for actually ending a session or switching to a different AI model/tool). Either way, point whichever AI you're working with at this file — plain language works: *"let's do a session checkpoint"* or *"I'm switching sessions, run the handoff."* No special command needed, and nothing here depends on Claude Code specifically — that's deliberate, since the whole point is being able to hand this off to any AI.

## Quick checkpoint (a few minutes, low cost)

1. Run the test suite (`.venv/bin/pytest pipeline/ -q`, plus `app/`'s test command once it has one). All green?
2. `git status --short` — working tree clean? Anything worth committing now?
3. `git log --oneline -1` vs `git log --oneline origin/master -1` — local matches remote?
4. `vercel ls` from inside `app/` (no `--logs`) — does the latest Production deployment show `Ready` and correspond to the current commit? Cheap, read-only, a few lines of output — same spirit as the git-sync check above, not a build audit.
5. Skim `docs/PENDING_ACTIONS.md` — anything urgent overdue?

That's it — this is just "is the repo in a safe, working, saved state right now," not a full audit.

## Full handoff (switching sessions/models, or after a large chunk of work)

This is a **docs/drift maintenance pass** — it never touches real audio, never triggers a new deployment, and never pulls full build logs on its own. Those three are each individually expensive or state-changing (minutes of real compute, a production side effect, or a lot of output to read) and are each their own explicit ask, not a default step — see the end of this section.

Do the Quick checkpoint above first, then:

1. Run `docs/DRIFT_CHECK.md`'s full 7-item procedure.
2. **Re-read this session's own conversation** for anything decided, clarified, or promised that isn't yet reflected in `docs/DECISIONS.md`, a spec, or a `STATUS.md`. This is usually where things actually get missed — not in the code, in the untranscribed reasoning.
3. Check every major piece has an accurate status file — create one if something new doesn't have one yet. As of 2026-09-08 that's: each pipeline stage (`pipeline/s01_ingest` … `s05_publish`), `app/` (including the Turso database it reads — schema lives in `app/db/schema.ts`), and the Vercel deployment/GitHub-integration config itself (project settings like Root Directory are real, undocumented-by-default state that can drift silently — see the incident recorded in `app/STATUS.md`, 2026-09-08).
4. Update `pipeline/VERIFY.md` (the living "current state + the one next step" doc) so nobody re-derives the plan from scratch.
5. Update `docs/PENDING_ACTIONS.md` — add anything newly discovered, check off anything resolved.
6. Note any environment-specific quirks that won't carry over to a different session, tool, or machine, so the next one isn't confused by something that doesn't apply to them.
7. Record the result in `docs/DRIFT_LOG.md`.
8. Commit and push everything.
9. Give a plain-language summary: what changed, what's flagged, what's the one next step.

**Three things to explicitly ask about, never assume:**
- **Full real-audio pipeline walkthrough** (`pipeline/VERIFY.md`'s manual walkthrough, `s01`→`s05` on a real song) — only worth it if pipeline *code* changed since the last time it was actually run this way. Default: skip, and just note the date/commit of the last real verification instead of re-running it.
- **Pulling full Vercel build `--logs`** — only useful when the quick check above found something off (not `Ready`, or doesn't match the current commit). Don't pull them just to look.
- **Triggering a new Vercel deployment** (`vercel deploy`/`vercel redeploy`) — a real production action with a real side effect, same category as a git push. Only do it if there's an actual reason to (a fix to verify, `app/` code changed since the last deploy) — never as a routine part of a handoff.

## A caveat worth repeating every time

Every check run this way is done by the *same session* doing the work, never a genuinely independent one — `docs/DRIFT_CHECK.md` itself recommends independence for exactly this reason. Don't let a clean checkpoint result read as more certain than it is; a real fresh-session check is still worth doing periodically, not just assumed unnecessary because the last self-check came back clean.
