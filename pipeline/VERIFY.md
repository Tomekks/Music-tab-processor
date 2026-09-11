# How to verify the pipeline end-to-end

Read `START_HERE.md` at the repo root first — this file assumes that's done.

## Current state (2026-09-09)

Verified live, end-to-end: `s01_ingest` → `s02_separate` → `s03_transcribe` → `s04_tab` → `s05_publish` → a real Turso database → the Next.js app (`app/`), **deployed and live at https://app-six-psi-70.vercel.app**, confirmed rendering real data on the actual public URL. Full reasoning: `docs/DECISIONS.md`. Architecture: `docs/ARCHITECTURE.md`.

`.venv/bin/pytest pipeline/ -v` passes **12/12**. No known blocker.

A security review is done (2026-09-08, no findings) — re-review if the app's shape changes (auth, forms, write paths, uploads); see `docs/PENDING_ACTIONS.md`.

No single mandated next step — pick from the backlog (`docs/BACKLOG.md`): local processing UI, CI, extending the metronome's playhead beyond Sheet, applying design tokens further, or Phase 0 Checkpoints 4/5.

## Environment notes

- Two `.env.local` files hold the *same* Turso credentials — repo root (read by `pipeline/s05_publish/publish.py`'s hand-rolled parser) and `app/` (read by Next.js). Both gitignored. Rotate both together.
- PostHog records page views on the deployed app (key in `app/.env.local` + Vercel prod); autocapture, session replay, identity profiles, and persistent storage are all deliberately disabled. See `app/STATUS.md`.
- **Rebuilding `.venv` from scratch:** use `pip install --no-deps -r requirements.freeze.txt`, not a plain `pip install -r`. A plain install re-triggers a real `tuttut`/`matplotlib` version conflict (`docs/audio-tools/tab-generation.md`), and a plain `pip freeze` silently drops `pip`/`setuptools`/`wheel`, which `basic-pitch` needs transitively. `requirements.freeze.txt` is a fully-resolved snapshot, so `--no-deps` is correct, not a workaround.

## Manual verification walkthrough

### 1. Sanity check first (30 seconds)
```bash
cd "/Users/tomsvarpins/Projects/guitar_tab_processor"
.venv/bin/pytest pipeline/ -v
```

### 2. Run the pipeline on a real file, one stage at a time
```bash
.venv/bin/python pipeline/s01_ingest/ingest.py "research/00_spike/audio/Chet Atkins - Mister Sandman.wav" --title "My Test Run"
```
Copy the printed run directory into a variable:
```bash
RUN_DIR="pipeline_runs/my-test-run-<paste-the-rest>"
.venv/bin/python pipeline/s02_separate/separate.py "$RUN_DIR"
.venv/bin/python pipeline/s03_transcribe/transcribe.py "$RUN_DIR"
.venv/bin/python pipeline/s04_tab/tab_generate.py "$RUN_DIR"
.venv/bin/python pipeline/s05_publish/publish.py "$RUN_DIR"
```
Then, to see it on the website:
```bash
cd app && npm run dev
```
Visit `http://localhost:3000` — the new song should appear in the list.

### 3. What to actually check at each stage

| Stage | File to look at | What you're checking |
|---|---|---|
| 1. Ingest | `$RUN_DIR/metadata.json` | Duration/sample rate look right? |
| 2. Separate | `$RUN_DIR/stems/other.wav` | **Listen.** Does guitar/melody come through recognizably? (Vocal bleed/haze on full-band songs is expected, documented, not new.) |
| 3. Transcribe | `$RUN_DIR/transcription.mid` | Note count sane for the song's length? |
| 4. Tab | `$RUN_DIR/tab.txt` | **Read it.** Structured, 6 labeled strings, sensible columns? |
| 5. Publish | the website itself | Does the song show up, with a plausible tempo? |

## Known, deliberate rough edges — not bugs, don't "fix" without asking first

- `tab.json`'s `durationSec` per note is approximated ("time until the next note"), not the note's true length — deliberate, confirmed acceptable by the user (tempo/feel is the human's job when practicing).
- `tempoBpm` is now accurate via real `librosa` beat-tracking on the source audio, confirmed against two known songs; the metronome (`app/hooks/useMetronome.ts`) depends on this.
- Tab fret/string choices may differ from a real published tab for the same song — expected, `tuttut` picks *a* playable fingering, not necessarily the original performer's. A deferred check (compare transcribed pitches, not fret choices, against a real tab) is logged in `research/00_spike/RESULTS.md` Checkpoint 3, intentionally not done yet.
- 4 moderate `npm audit` findings in `app/`, all from `esbuild` via `drizzle-kit` — dev-tool-only (schema migrations), never ships to the deployed app. Decided to leave as-is; the fix is a breaking `drizzle-kit` downgrade. Don't "fix" this reflexively if `npm audit` flags it again.
- `pipeline/s05_publish/publish.py` has no test yet, unlike every other stage — a real gap, not an oversight to hide (see its `STATUS.md`).

## Still open — decisions worth making explicitly

1. **One-command orchestration** — 5 manual commands per song is still the reality; a `run_pipeline.py` wrapping all 5 would help, hasn't been asked for yet.
2. **Local web UI for triggering runs** (pick a file, click a button) instead of CLI commands — backlogged, resources already gathered in `docs/decisions/backlog-and-scope.md`, not built.
3. **CI (GitHub Actions)** — still not set up; genuinely worthwhile now that real code+tests exist.
4. **Phase 0 Checkpoints 4/5** (the harder, full-band songs) — both local processing and the hosted UI now exist, so these are in scope.
5. **The pipeline has only been run end-to-end on Mister Sandman and a synthetic tone** through the real code — a harder song hasn't gone through `s01`-`s05` yet, only through the old Phase 0 spike scripts.

For the history behind any of this (relocation, doc restructuring, past incidents), see `docs/DRIFT_LOG.md` — this file only tracks what's true now.
