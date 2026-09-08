# Session checkpoint & handoff procedure

Two modes: **Quick checkpoint** (light, for casual pauses) and **Full handoff** (for actually ending a session or switching to a different AI model/tool). Either way, point whichever AI you're working with at this file — plain language works: *"let's do a session checkpoint"* or *"I'm switching sessions, run the handoff."* No special command needed, and nothing here depends on Claude Code specifically — that's deliberate, since the whole point is being able to hand this off to any AI.

## Quick checkpoint (a few minutes, low cost)

1. Run the test suite (`.venv/bin/pytest pipeline/ -q`, plus `app/`'s test command once it has one). All green?
2. `git status --short` — working tree clean? Anything worth committing now?
3. `git log --oneline -1` vs `git log --oneline origin/master -1` — local matches remote?
4. Skim `docs/PENDING_ACTIONS.md` — anything urgent overdue?

That's it — this is just "is the repo in a safe, working, saved state right now," not a full audit.

## Full handoff (switching sessions/models, or after a large chunk of work)

Do the Quick checkpoint above first, then:

1. Run `docs/DRIFT_CHECK.md`'s full 7-item procedure.
2. **Re-read this session's own conversation** for anything decided, clarified, or promised that isn't yet reflected in `docs/DECISIONS.md`, a spec, or a `STATUS.md`. This is usually where things actually get missed — not in the code, in the untranscribed reasoning.
3. Check every major piece (each pipeline stage, `app/`, any other top-level component) has an accurate status file — create one if something new doesn't have one yet.
4. Update `pipeline/VERIFY.md` (the living "current state + the one next step" doc) so nobody re-derives the plan from scratch.
5. Update `docs/PENDING_ACTIONS.md` — add anything newly discovered, check off anything resolved.
6. Note any environment-specific quirks that won't carry over to a different session, tool, or machine, so the next one isn't confused by something that doesn't apply to them.
7. Record the result in `docs/DRIFT_LOG.md`.
8. Commit and push everything.
9. Give a plain-language summary: what changed, what's flagged, what's the one next step.

## A caveat worth repeating every time

Every check run this way is done by the *same session* doing the work, never a genuinely independent one — `docs/DRIFT_CHECK.md` itself recommends independence for exactly this reason. Don't let a clean checkpoint result read as more certain than it is; a real fresh-session check is still worth doing periodically, not just assumed unnecessary because the last self-check came back clean.
