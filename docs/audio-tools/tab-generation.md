# Tab generation (notes → fret/string assignment)

Part of `docs/audio-tools/` — see `docs/AUDIOPROCESSINGTOOLS.md` for the index, the status-value legend, and the maintenance rule.

| Tool | Status | Notes |
|---|---|---|
| `tuttut` | tried — 2026-09-07 | MIDI → tab for any fretted instrument. Its exact pinned dependencies (`matplotlib==3.5.3`, `numpy==1.23.2`, `networkx==2.8.6`, `pretty-midi==0.2.9`) fail to build on this setup — installed with `--no-deps` against modern versions instead, which worked fine at runtime. Ran successfully on the Mister Sandman transcription. Its raw ASCII output needed real reformatting to be readable (see `research/00_spike/tuttut_clean_tab.py` and `RESULTS.md` Checkpoint 3) — the underlying fingering logic works, presentation needed the actual work. |
| `tayuya` | found | Python lib, MIDI → guitar tabs, built on `music21`, includes key detection. Looks less actively maintained than the others found here. |
| [`gtrsnipe`](https://github.com/scottvr/gtrsnipe) ("guttersnipe") | found | Newer. Bidirectional MIDI ↔ tab, notable for a fingering-optimization scoring algorithm (hand stretch, fret position, playability) rather than naive fret assignment — plausibly the most "guitarist-aware" of the four. Also converts to ASCII tab / abc / vexflow. |
| [`open-fret`](https://github.com/Sidmaz666/open-fret) | backlog (documented swap-in "once it matures," see `docs/decisions/backlog-and-scope.md`) | Custom T5 transformer (Fretting-Transformer architecture) trained specifically for ergonomic fingering — a learned approach rather than rule-based like the other three. New project (2025); maturity to be judged when actually tried. |
