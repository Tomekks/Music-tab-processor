# s05_publish

**Status:** done. **Note on process:** built directly without a `docs/specs/` file first, unlike `s01`-`s04` — momentum during a fast build session ("gotta get this thing up and running"). Small and low-risk enough that this is fine in retrospect, but flagging the process deviation honestly rather than pretending every stage followed the same discipline.

**What it does:** the literal "Mac writes a row" mechanism from `DECISIONS.md` — takes a finished run's `tab.json` + `metadata.json` and upserts it into the Turso database's `songs` table (schema owned by `app/db/schema.ts`, see `docs/DECISIONS.md`'s database section).

**Reads:** `pipeline_runs/<run-id>/tab.json` (Contract B) and `metadata.json`.

**Writes:** one row in the hosted Turso database's `songs` table (`id`, `title`, `artist` [not yet captured anywhere — always null], `tempo_bpm`, `tuning`, `notes` as JSON, `created_at`). Upserts on `id` (the run-id), so re-publishing an updated run overwrites cleanly.

**Files:** `publish.py` (module + CLI, no test yet — flagging as a gap, not an oversight to hide).

**Run it:** `.venv/bin/python pipeline/s05_publish/publish.py <run-dir>`

**Credentials:** reads `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` from the repo-root `.env.local` (a minimal hand-rolled parser, not `python-dotenv` — avoided a new dependency for two lines). Never commit `.env.local` — already gitignored.

**Gap, not yet addressed:** no test exists for this stage, unlike every other pipeline stage. Worth adding — e.g. publish to a throwaway row, read it back, assert it matches, delete it.
