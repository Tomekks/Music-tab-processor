# Transcription (audio/stems → notes)

Part of `docs/audio-tools/` — see `docs/AUDIOPROCESSINGTOOLS.md` for the index, the status-value legend, and the maintenance rule.

| Tool | Status | Notes |
|---|---|---|
| Basic Pitch (Spotify) | tried — Checkpoint 0 only (env sanity, ran without error; accuracy not yet judged) | Lightweight, pip-installable, actively maintained, fast (CPU-only, small model). General-purpose, not guitar-specific — accuracy on polyphonic guitar parts still unverified (that's Checkpoint 2). |
| MT3 (Google Magenta) | found | Historically the SOTA baseline for multitrack transcription. Heavier setup — research code (TF/JAX), not a pip-installable tool. Known weakness: "instrument leakage" (notes bleeding across instrument classes). |
| [MR-MT3](https://github.com/gudgud96/MR-MT3) | found | Successor to MT3, adds a memory-retention mechanism specifically to reduce instrument leakage; measurably better F1 and lower leakage than MT3 in its own paper's benchmarks. Still research-grade code, expect real setup effort, not a packaged tool. |
