# How to verify the pipeline end-to-end, and handoff notes

## If you're a new AI session or model picking this up cold

Read `START_HERE.md` at the repo root first — this file assumes that's done. As of **2026-09-08**, here's the exact state:

**What was verified live:** `s01_ingest` → `s02_separate` → `s03_transcribe` → `s04_tab` → `s05_publish` → a real Turso database → a real Next.js app (`app/`), **deployed and live at https://app-six-psi-70.vercel.app**, confirmed rendering real data from the database on the actual public URL. Full reasoning: `docs/DECISIONS.md`. Current architecture: `docs/ARCHITECTURE.md`.

**Current blocker: none.** A same-day entry here previously claimed the pipeline suite had 10 passing and 2 failing tests, both in `s03_transcribe`, on the theory that Basic Pitch 0.4.0 requires `--save-midi` to write a MIDI file. That was a misdiagnosis, never confirmed by actually re-running the suite — re-verified later the same day: `.venv/bin/pytest pipeline/ -v` passes **12/12**, and a fresh end-to-end run on a real song produced output consistent with two prior independently-verified runs. See `pipeline/s03_transcribe/STATUS.md` for the full correction. The pipeline is healthy.

**Deployment and a first security review are both done** (2026-09-08, no findings — see `docs/PENDING_ACTIONS.md` for the standing "re-review if the app's shape changes" reminder). **The app side has grown a lot since (2026-09-09, not yet deployed as of this line — see `app/STATUS.md`'s Status line for exactly what's live vs. just committed):** a tabbed song page (Sheet/Fretboard/Ascii), a real design-token playground, and an independent metronome with a playhead on the Sheet view. **No single mandated next step now** — pick from the backlog: local processing UI (resources already gathered in `DECISIONS.md`), CI, extending the metronome's playhead to Fretboard/Ascii, applying the design-system tokens to the rest of the app, or Phase 0 Checkpoints 4/5 (in scope per `DECISIONS.md`'s trigger — both processing and hosted UI exist). This is a real decision point, not something to default on.

**Action items for the human:** see `docs/PENDING_ACTIONS.md` — a persistent, checkable list (currently token rotation and a conditional future security review), rather than duplicated here where it'd drift out of sync.

**One environment detail worth knowing:** two `.env.local` files exist with the *same* Turso credentials — one at the repo root (read by `pipeline/s05_publish/publish.py`'s minimal hand-rolled parser) and one inside `app/` (read automatically by Next.js). Both gitignored, verified untracked. If credentials are ever rotated, update both.

**Analytics:** PostHog now records page views on the deployed app. Its public browser project key and US ingestion host are in `app/.env.local` and Vercel production; the configuration deliberately disables autocapture, session replay, identity profiles, and persistent browser storage. See `app/STATUS.md` and `app/.env.example`.

**Known, deliberate rough edges — not bugs, don't "fix" without asking first:**
- `tab.json`'s `durationSec` per note is approximated ("time until the next note"), not the note's true length — deliberate, confirmed acceptable by the user (tempo/feel is the human's job when practicing, not the tab's).
- `tempoBpm` **was** unreliable (214.51bpm on a real ~112bpm song) but is now fixed via real `librosa` beat-tracking on the source audio, confirmed accurate against two known songs. This matters for real now — the metronome feature (`app/hooks/useMetronome.ts`, built 2026-09-09) uses it as its default bpm.
- Tab fret/string choices may differ from a real published tab for the same song — expected, `tuttut` picks *a* playable fingering, not necessarily the original performer's. A deferred check (compare transcribed pitches, not fret choices, against a real tab) is logged in `research/00_spike/RESULTS.md` Checkpoint 3, intentionally not done yet ("once the MVP exists").
- 4 moderate `npm audit` findings in `app/`, all from `esbuild` via `drizzle-kit`'s dependency chain — dev-tool-only (schema migrations), never ships to the deployed app. Decided to leave as-is; the suggested fix is a breaking `drizzle-kit` downgrade. Don't "fix" this reflexively if `npm audit` flags it again.
- `pipeline/s05_publish/publish.py` has no test yet, unlike every other stage — a real gap, not an oversight to hide (see its `STATUS.md`).
- **Correction (2026-09-09):** the line that used to be here claimed `.claude/launch.json` lives outside this repo — checked directly, that's wrong: it's a real, git-tracked file at `.claude/launch.json` in the repo root. It configures this session's browser-preview tool to run `npm run dev` inside `app/`; a different AI/session/terminal without that tool can just run the same command directly and does not need this file at all.

## Manual verification walkthrough (unchanged from before, still valid)

### 1. Sanity check first (30 seconds)
```bash
cd "/Users/tomsvarpins/Documents/Guitar APP"
.venv/bin/pytest pipeline/ -v
```
**Current result:** `12 passed, 0 failed`. (An earlier same-day note here claimed 2 `s03_transcribe` failures — that was a misdiagnosis, corrected above.)

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

1. ~~Restore `s03_transcribe` test health~~ — was never actually broken; see the correction above. No action needed.
2. **One-command orchestration** — 5 manual commands per song is still the reality; a `run_pipeline.py` wrapping all 5 would help, hasn't been asked for yet.
3. **Local web UI for triggering runs** (pick a file, click a button) instead of CLI commands — backlogged in `DECISIONS.md`, resources already gathered there, not built.
4. **CI (GitHub Actions)** — still not set up; now genuinely worthwhile since real code+tests exist.
5. **Phase 0 Checkpoints 4/5** (the harder, full-band songs) — both local processing and hosted UI now exist, so these are in scope now.
6. **The pipeline has only been run end-to-end on Mister Sandman and a synthetic tone through the real code** — a harder song hasn't gone through `s01`-`s05` yet, only through the old Phase 0 spike scripts.
