# Task spec: Phase 0 environment setup + Checkpoints 0-1

## Goal
Set up a project-local Python environment and run the first two Phase 0 checkpoints — environment sanity, then separation quality by ear — to get the first real evidence on whether this pipeline's core idea works.

## Prerequisite (human, not agent)
The user places two audio files (their own copies, personal use) at:
- `research/00_spike/audio/seven-nation-army.mp3`
- `research/00_spike/audio/friction.mp3`

These are gitignored (`*.mp3` in `.gitignore`) — personal files, never committed. Do not proceed past Checkpoint 0 without confirming both exist.

## Reads
- Homebrew `python@3.11` and `ffmpeg` (already installed, confirmed working)
- The two audio files above

## Writes
- `.venv/` — project-local virtual environment (gitignored)
- `.cache/` — redirected model-weight cache, best effort (gitignored)
- `research/00_spike/output/` — separated stems (gitignored; regenerable, not meant to be committed)
- `research/00_spike/RESULTS.md` — filled in with what was run and the by-ear rating for each song. This file **is** committed — it's the durable record, not the chat that produced it.

## Constraints (see AGENTS.md for the full rules — these are the ones that matter most for this task)
- Create the venv and install packages inside this repo only. Never touch system Python, global site-packages, or shell profile files. No `sudo`.
- Explain outbound network requests before making them. This task has two different kinds, and only one is obvious: (1) `pip install demucs basic-pitch` — fetching named packages from PyPI, ordinary; (2) separately, Demucs downloading its pretrained model weights on first run — a much larger download from its own model hosting, not PyPI, and easy to miss as "just another pip thing." Flag (2) explicitly before it happens.
- Best-effort redirect Demucs' model cache into `.cache/` inside this repo (e.g. via `TORCH_HOME`). If it doesn't take effect cleanly, don't burn the task fighting it — note it in RESULTS.md and move on; a cache living in its tool's own default location is a minor, known exception, not a violation worth blocking on.

## Suggested steps
1. `/opt/homebrew/opt/python@3.11/bin/python3.11 -m venv .venv`
2. `source .venv/bin/activate`
3. `pip install --upgrade pip`
4. Before running: tell the user this pulls in PyTorch and is a multi-GB download, then `pip install demucs basic-pitch`
5. `mkdir -p .cache` ; `export TORCH_HOME="$(pwd)/.cache/torch"`
6. **Checkpoint 0 (sanity):** run `demucs` and `basic-pitch` against one file, no errors. Flag before this step specifically, since this is where Demucs' model download happens.
7. **Checkpoint 1 (separation quality):** run `htdemucs` on both full songs, output to `research/00_spike/output/`. Then stop — the user has to actually *listen* to the resulting "other" stem for each; this can't be judged by the agent.
8. Record ratings and observations in `research/00_spike/RESULTS.md`.

## Done when
- [ ] `.venv/` exists, built from Homebrew's `python@3.11`, not system Python
- [ ] `demucs` and `basic-pitch` run without error (Checkpoint 0)
- [ ] Both songs separated (Checkpoint 1), "other" stem present in `research/00_spike/output/`
- [ ] User has listened to both and the rating is recorded in `research/00_spike/RESULTS.md`
- [ ] Nothing outside this repo folder was modified
