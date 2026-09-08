# How to verify the pipeline end-to-end, and handoff notes

## If you're a new AI session or model picking this up cold

Read `START_HERE.md` at the repo root first — this file assumes that's done. As of **2026-09-08**, here's the exact state:

**What works, verified live:** `s01_ingest` → `s02_separate` → `s03_transcribe` → `s04_tab` → `s05_publish` → a real Turso database → a real Next.js app (`app/`), **deployed and live at https://app-six-psi-70.vercel.app**, confirmed rendering real data from the database on the actual public URL. Full reasoning: `docs/DECISIONS.md`. Current architecture: `docs/ARCHITECTURE.md`.

**Deployment and a first security review are both done** (2026-09-08, no findings — see `docs/PENDING_ACTIONS.md` for the standing "re-review if the app's shape changes" reminder). **No single mandated next step now** — pick from the backlog: local processing UI (resources already gathered in `DECISIONS.md`), playback/metronome/note-highlighting, CI, or Phase 0 Checkpoints 4/5 (now actually in scope per `DECISIONS.md`'s trigger — both processing and hosted UI exist). This is a real decision point, not something to default on.

**Action items for the human:** see `docs/PENDING_ACTIONS.md` — a persistent, checkable list (token rotation, the pending security review, etc.), rather than duplicated here where it'd drift out of sync.

**One environment detail worth knowing:** two `.env.local` files exist with the *same* Turso credentials — one at the repo root (read by `pipeline/s05_publish/publish.py`'s minimal hand-rolled parser) and one inside `app/` (read automatically by Next.js). Both gitignored, verified untracked. If credentials are ever rotated, update both.

**Known, deliberate rough edges — not bugs, don't "fix" without asking first:**
- `tab.json`'s `durationSec` per note is approximated ("time until the next note"), not the note's true length — deliberate, confirmed acceptable by the user (tempo/feel is the human's job when practicing, not the tab's).
- `tempoBpm` **was** unreliable (214.51bpm on a real ~112bpm song) but is now fixed via real `librosa` beat-tracking on the source audio, confirmed accurate against two known songs. This matters for real now — a future metronome feature will use it.
- Tab fret/string choices may differ from a real published tab for the same song — expected, `tuttut` picks *a* playable fingering, not necessarily the original performer's. A deferred check (compare transcribed pitches, not fret choices, against a real tab) is logged in `research/00_spike/RESULTS.md` Checkpoint 3, intentionally not done yet ("once the MVP exists").
- 4 moderate `npm audit` findings in `app/`, all from `esbuild` via `drizzle-kit`'s dependency chain — dev-tool-only (schema migrations), never ships to the deployed app. Decided to leave as-is; the suggested fix is a breaking `drizzle-kit` downgrade. Don't "fix" this reflexively if `npm audit` flags it again.
- `pipeline/s05_publish/publish.py` has no test yet, unlike every other stage — a real gap, not an oversight to hide (see its `STATUS.md`).
- The `.claude/launch.json` needed for this session's browser-preview tool to find the dev server lives in a scratch-workspace path *outside* this repo, specific to this particular Claude Desktop session's environment — a different AI/session/terminal won't have this quirk and can just run `npm run dev` inside `app/` directly.

## Manual verification walkthrough (unchanged from before, still valid)

### 1. Sanity check first (30 seconds)
```bash
cd "/Users/tomsvarpins/Documents/Guitar APP"
.venv/bin/pytest pipeline/ -v
```
**Expect:** `12 passed`.

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

## Still open — decisions worth making explicitly

1. **Vercel deployment** (see above — the actual next task).
2. **One-command orchestration** — 5 manual commands per song is still the reality; a `run_pipeline.py` wrapping all 5 would help, hasn't been asked for yet.
3. **Local web UI for triggering runs** (pick a file, click a button) instead of CLI commands — backlogged in `DECISIONS.md`, resources already gathered there, not built.
4. **CI (GitHub Actions)** — still not set up; now genuinely worthwhile since real code+tests exist.
5. **Phase 0 Checkpoints 4/5** (the harder, full-band songs) — explicitly confirmed by the user: relevant "only once we have both processing and hosted UI's done." Hosted UI isn't done yet (this is item 1 above) — so these stay deferred until *after* Vercel deployment, not before.
6. **The pipeline has only been run end-to-end on Mister Sandman and a synthetic tone through the real code** — a harder song hasn't gone through `s01`-`s05` yet, only through the old Phase 0 spike scripts.
