# Tools registry

A running catalog of tools found for each pipeline stage, whether we've tried them, and what we thought. Purpose: **don't re-research what's already been found.** Before starting a research pass on a stage, check here first. Per `AGENTS.md`, still do a fresh pass before actually adopting anything — "not tried" or an old date here is the signal that the pass hasn't been done *yet*, not a substitute for doing it.

Status values: **tried** (ran it, have an assessment) · **found** (identified, not run) · **backlog** (deliberately deferred, see `DECISIONS.md`).

## Source separation (audio → stems)

| Tool | Status | Notes |
|---|---|---|
| `htdemucs` (default bag-of-1) | tried — Checkpoint 1, 2026-09-06 | Current pipeline default. Rough-but-usable. Vocals bleed into the "other" stem with artifacts; guitar is hazy/muted (shares "other" with everything that isn't drums/bass/vocals). Full results: [`research/00_spike/RESULTS.md`](../research/00_spike/RESULTS.md). |
| `htdemucs_ft` | found | Same `demucs` package already installed — no new dependency, just a different `-n` flag (downloads its own ~4×90MB model weights). Bag of 4 fine-tuned models, ~4× slower. Generally cleaner than base `htdemucs`, especially vocal-heavy material — but vocal cleanliness is no longer the goal (see below), so this is now low priority. |
| `htdemucs_6s` | **tried — 2026-09-06** | Same package, single different model (~90MB weights). Ran without error on both songs; output includes a dedicated `guitar.wav` (and `piano.wav`) instead of dumping them into `other`. Output: `research/00_spike/output/htdemucs_6s/`. Now the priority pick since it's the only free option that isolates guitar specifically — by-ear quality assessment pending (research suggested guitar/piano quality on this variant is only "so-so," with its own bleed; needs verification against our actual songs). |
| `mlx-demucs` | backlog (see `DECISIONS.md`) | Apple-Silicon-native (MLX) build of the same Demucs weights. Same separation quality, faster runtime on this Mac. A speed win, not a quality one. |
| Ultimate Vocal Remover (UVR) / [`audio-separator`](https://github.com/nomadkaraoke/python-audio-separator) | tried (partial) — 2026-09-06, then deprioritized | Installed `audio-separator[cpu]` (new dependency, pulls in onnxruntime/torchvision). Ran the top 2-stem **BS-Roformer** model (`model_bs_roformer_ep_317_sdr_12.9755.ckpt`, 639MB, cached outside the repo at `/private/tmp/audio-separator-models` — a best-effort-cache exception like Demucs' HF cache) — completed on Seven Nation Army only, killed mid-run on Friction once the goal was clarified as guitar/melody, not vocals. **Correction to an earlier research pass:** this package's model zoo does NOT include a non-Demucs 4-stem (vocals/drums/bass/other) model — its MDX23C entries are all 2-stem or specialized (de-reverb, drum-only). So it has nothing to offer for guitar isolation specifically; its only relevant capability (clean vocal removal) is now out of scope per the vocal-quality decision below. Deprioritized — not worth pursuing further unless the guitar/melody stems remain unusable and vocal bleed turns out to be the cause. |
| [`mlx-audio-separator`](https://github.com/ssmall256/mlx-audio-separator) | found | MLX-native build covering Demucs/MDX/MDXC/VR/Roformer — same model access as `audio-separator`, potentially faster on this Mac. Deprioritized for the same reason as `audio-separator` above. |

**Current read (updated 2026-09-06):** Vocal separation quality is explicitly out of scope — the goal is guitar/melody for tabs, not clean vocal isolation (see `DECISIONS.md`). This flips the earlier recommendation: `htdemucs_6s`'s dedicated guitar stem is now the priority to evaluate by ear, not the Roformer/vocal-focused route. If `htdemucs_6s`'s guitar stem still isn't good enough, the next thing worth a fresh look is guitar/instrument-specific separation models (e.g. UVR's dedicated instrumental models) rather than anything vocal-focused.

## Transcription (audio/stems → notes)

| Tool | Status | Notes |
|---|---|---|
| Basic Pitch (Spotify) | tried — Checkpoint 0 only (env sanity, ran without error; accuracy not yet judged) | Lightweight, pip-installable, actively maintained, fast (CPU-only, small model). General-purpose, not guitar-specific — accuracy on polyphonic guitar parts still unverified (that's Checkpoint 2). |
| MT3 (Google Magenta) | found | Historically the SOTA baseline for multitrack transcription. Heavier setup — research code (TF/JAX), not a pip-installable tool. Known weakness: "instrument leakage" (notes bleeding across instrument classes). |
| [MR-MT3](https://github.com/gudgud96/MR-MT3) | found | Successor to MT3, adds a memory-retention mechanism specifically to reduce instrument leakage; measurably better F1 and lower leakage than MT3 in its own paper's benchmarks. Still research-grade code, expect real setup effort, not a packaged tool. |

## Tab generation (notes → fret/string assignment)

| Tool | Status | Notes |
|---|---|---|
| `tuttut` | found — chosen Phase 0 default (see `DECISIONS.md`), not yet run | MIDI → tab for any fretted instrument. Maintained forks exist (e.g. `natecdr/tuttut`). |
| `tayuya` | found | Python lib, MIDI → guitar tabs, built on `music21`, includes key detection. Looks less actively maintained than the others found here. |
| [`gtrsnipe`](https://github.com/scottvr/gtrsnipe) ("guttersnipe") | found | Newer. Bidirectional MIDI ↔ tab, notable for a fingering-optimization scoring algorithm (hand stretch, fret position, playability) rather than naive fret assignment — plausibly the most "guitarist-aware" of the four. Also converts to ASCII tab / abc / vexflow. |
| [`open-fret`](https://github.com/Sidmaz666/open-fret) | backlog (documented swap-in "once it matures," see `DECISIONS.md`) | Custom T5 transformer (Fretting-Transformer architecture) trained specifically for ergonomic fingering — a learned approach rather than rule-based like the other three. New project (2025); maturity to be judged when actually tried. |

## Ingestion

| Tool | Status | Notes |
|---|---|---|
| `yt-dlp` | backlog (explicitly not in scope yet, see `DECISIONS.md`) | Mature, actively maintained, low research need whenever this is picked up. |

## Maintaining this file

Update it — not just `research/00_spike/RESULTS.md` — whenever a tool is newly found, tried, or re-assessed. `RESULTS.md` records what happened in a specific checkpoint run; this file is the standing "what do we know about our options" reference so the next research pass starts from here instead of from zero.
