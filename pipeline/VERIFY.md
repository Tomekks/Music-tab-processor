# How to verify the pipeline end-to-end

A manual walkthrough for confirming `s01_ingest` → `s02_separate` → `s03_transcribe` → `s04_tab` still runs cleanly, and what to actually look/listen for at each step. Written for a non-engineer to follow — every command is copy-pasteable.

## 1. Sanity check first (30 seconds)

```bash
cd "/Users/tomsvarpins/Documents/Guitar APP"
.venv/bin/pytest pipeline/ -v
```
**Expect:** `12 passed`. If anything fails here, something broke since the last verified run — worth investigating before doing a real end-to-end pass, since a broken unit test usually means a real run will fail too.

## 2. Run the pipeline on a real file, one stage at a time

Pick any audio file already in `research/00_spike/audio/` (or a new one). Mister Sandman is the known-good case; try a harder song too if you want to see the difference Phase 0 already documented.

```bash
# Stage 1 — ingest
.venv/bin/python pipeline/s01_ingest/ingest.py "research/00_spike/audio/Chet Atkins - Mister Sandman.wav" --title "My Test Run"
```
Copy the run directory path it prints (e.g. `pipeline_runs/my-test-run-20260908-...`) — you'll reuse it for every step below. Set it as a shell variable to save retyping:
```bash
RUN_DIR="pipeline_runs/my-test-run-<paste-the-rest>"
```

```bash
# Stage 2 — separate into stems
.venv/bin/python pipeline/s02_separate/separate.py "$RUN_DIR"

# Stage 3 — transcribe the guitar-ish stem into notes
.venv/bin/python pipeline/s03_transcribe/transcribe.py "$RUN_DIR"

# Stage 4 — turn notes into a tab
.venv/bin/python pipeline/s04_tab/tab_generate.py "$RUN_DIR"
```

**"Smoothly" means:** no red error text at any step, and each step prints a normal-looking success line. If a step crashes with a traceback, that's a real problem — stop and flag it, don't just re-run and hope.

## 3. What to actually check at each stage (this needs your attention, not just "did it run")

| Stage | File to look at | What you're checking |
|---|---|---|
| 1. Ingest | `$RUN_DIR/metadata.json` | Duration/sample rate look right for the song? |
| 2. Separate | `$RUN_DIR/stems/other.wav` | **Listen to it.** This is the one that matters — does the guitar/melody come through recognizably? (Vocal bleed and some haziness is expected and already documented — that's not a new problem.) |
| 3. Transcribe | `$RUN_DIR/transcription.mid` | Note count in the terminal output — wildly low (a handful) or absurdly high (tens of thousands) for the song's length is a red flag. Listening to the MIDI itself needs a player/synth — ask me if you want a quick sonified `.wav` version instead, same as Phase 0 did. |
| 4. Tab | `$RUN_DIR/tab.txt` | **Read it.** Does it look like a real, structured tab (6 labeled string lines, numbers in sensible columns, not garbled)? You don't need to judge if it's the *best* fingering — just whether it looks structurally sane. |

## 4. Known limitations — not bugs, don't re-report these

- Rough/hazy separation and vocal bleed on full-band songs (Phase 0, `research/00_spike/RESULTS.md`).
- `tab.json`'s `tempoBpm` is an unreliable estimate (came out 214.51 for a ~110bpm song in testing) — don't trust it yet.
- `tab.json`'s `durationSec` per note is an approximation ("until the next note"), not the note's true length.
- Tab fret/string choices may differ from a real published tab for the same song — expected, `tuttut` picks *a* playable fingering, not necessarily the original performer's.

## 5. If something looks genuinely wrong

Note exactly which stage, what you saw, and whether it's a crash (real bug) or a quality concern (needs judgment) — bring both to the next session either way.

## 6. What's missing, and what needs a decision before continuing

**Not built yet (gaps, not bugs):**
- **One-command orchestration.** Right now, running the pipeline means 4 separate manual commands. A single `run_pipeline.py <file>` wrapping all four would make this walkthrough (and real use) much simpler. Nothing blocks building this — just hasn't been asked for yet.
- **Database.** `DECISIONS.md` wants one "from day one" (it's the mechanism that makes hosting possible later without exposing this Mac). There's now real tab output worth storing, but nothing persists between runs except files in `pipeline_runs/`.
- **Local web UI, Next.js app, playback, metronome, visual note-highlighting.** All backlogged in `DECISIONS.md`, none built. The pipeline can produce a tab; nothing yet lets you *use* one without reading raw files.
- **CI (GitHub Actions).** `docs/DRIFT_CHECK.md` already notes this isn't built — now that real code and tests exist (not just docs/spikes), it's actually meaningful to add.
- **A fresh, independent drift check.** The last one ran before the first GitHub push; a lot has happened since (4 real pipeline stages, a folder rename touching multiple docs). `docs/DRIFT_CHECK.md` recommends this be run by a session other than the one that did the work — worth doing before this gets much bigger.
- **The pipeline hasn't been run end-to-end on a harder song yet** — only Mister Sandman and a synthetic tone went through the *real* code (as opposed to the Phase 0 spike scripts). Worth trying a full-band song through the actual pipeline to see if anything breaks that didn't show up on clean acoustic material.

**Decisions worth making explicitly, not by default:**
1. **What's next: database, local UI, or Next.js app first?** All three are backlogged with no stated order among themselves.
2. **Is `tempoBpm`'s unreliable estimate good enough to build on**, or does it need a better approach before anything (like playback) depends on it?
3. **Is `durationSec`'s "until next note" approximation good enough**, same question.
4. **Are Phase 0 Checkpoints 4 and 5 back in scope now?** `DECISIONS.md` deferred them until "a working pipeline/app exists end-to-end" — the CLI pipeline now does, but the *app* doesn't yet. Worth deciding if the trigger has actually fired or not.
5. **Should the pipeline be smoke-tested on a harder/full-band song before calling this phase done**, given only clean acoustic material has gone through the real code so far?
