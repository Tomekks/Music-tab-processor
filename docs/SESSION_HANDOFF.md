# Session checkpoint

Point whichever AI you're working with at this file — plain language works:
*"let's do a session checkpoint."* No special command needed, and nothing here
depends on Claude Code specifically.

1. Run the test suite (`.venv/bin/pytest pipeline/ -q`, plus `cd app && npm test`). All green?
2. `git status --short` — working tree clean? Anything worth committing now?
3. `git log --oneline -1` vs `git log --oneline origin/master -1` — local matches remote?
4. `vercel ls` from inside `app/` (no `--logs`) — does the latest Production deployment show `Ready` and correspond to the current commit? Cheap, read-only, a few lines of output.
5. Skim `docs/PENDING_ACTIONS.md` — anything urgent overdue?

That's it — this is just "is the repo in a safe, working, saved state right now,"
not a full audit. For the deeper periodic check (drift across many small tasks,
stale docs, scope creep), run `docs/DRIFT_CHECK.md` directly — it's its own
procedure, not repeated here.
