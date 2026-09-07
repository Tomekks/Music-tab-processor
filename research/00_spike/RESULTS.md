# Phase 0 results

Filled in as each checkpoint actually runs — this file is the durable record, not the conversation that produced it.

## Checkpoint 0 — environment sanity
- Date: 2026-09-06
- Result: Pass. `.venv` built from Homebrew `python@3.11` (3.11.16). Installed `demucs==4.1.0`, `basic-pitch==0.4.0` from PyPI (pulls in PyTorch 2.14.0 and dependencies — multi-GB install). Both tools ran without error against one file (Seven Nation Army).
- Environment note: `basic-pitch`'s dependency `resampy` requires `pkg_resources`, which current PyPI `setuptools` (84.0.0) no longer ships. Fixed by pinning `setuptools<81` (installed 80.10.2). Worth capturing in requirements/setup docs for this venv going forward.
- Second environment note (hit later, during Checkpoint 2 prep): even with `setuptools<81` pinned, `pkg_resources` also needs `jaraco.text` as a separate package, which isn't pulled in automatically. Fixed with `pip install jaraco.text`.
- Model cache note: Demucs 4.1.0 fetches pretrained weights via **Hugging Face Hub**, not the old `TORCH_HOME`/torch-hub mechanism, so the `TORCH_HOME` redirect into `.cache/torch` (per the task spec) did not take effect. Weights (~89MB, model `adefossez/HTDemucs`) landed in the default `~/.cache/huggingface` instead. Per the spec's own guidance, this is treated as an acceptable best-effort exception rather than something to fight — noted here, not fixed.

## Checkpoint 1 — separation quality, by ear
- Setup: ran `htdemucs` (default model) on both full songs via `demucs -n htdemucs -o research/00_spike/output`. No errors. Output: `research/00_spike/output/htdemucs/<track name>/{drums,bass,other,vocals}.wav` for each song. Source files used: `Seven Nation Army - The White Stripes.m4a` and `Friction - Shame.m4a` (filenames differ from the spec's suggested `seven-nation-army`/`friction` slugs, but are the same two intended songs).
- Seven Nation Army — htdemucs "other" stem: rough-but-usable —
- Friction — htdemucs "other" stem: rough-but-usable —
- Notes: User's by-ear assessment (2026-09-06): outputs are separated but rough. Vocals bleed through the "other" stem with noticeable artifacts in places; guitar content is hazy/muted rather than clean. No baseline to compare against yet, so absolute quality vs. alternative tools is unknown — flagged for a follow-up research pass on separation backends (default `htdemucs` bag-of-1 model was used; not yet tried: `htdemucs_ft` fine-tuned variant, `htdemucs_6s` 6-source variant with a dedicated guitar stem, or non-Demucs tools).

## Checkpoint 1b — guitar-isolation follow-up (htdemucs_6s)
- Decision (2026-09-06): vocal separation quality is explicitly out of scope going forward — the goal is guitar/melody for tabs, not clean vocals. See `docs/DECISIONS.md`. This superseded an in-progress spike of `audio-separator`'s BS-Roformer model (vocal-focused); that run was stopped mid-way (completed for Seven Nation Army only) and abandoned rather than finished, and the `audio-separator` package was uninstalled again afterward.
- Setup: ran `htdemucs_6s` (6-stem Demucs variant, dedicated `guitar`+`piano` stems) on both full songs. No errors. Output: `research/00_spike/output/htdemucs_6s/<track name>/{drums,bass,guitar,piano,other,vocals}.wav`.
- Verdict (2026-09-07): htdemucs_6s's dedicated `guitar` stem judged **slightly worse** than plain `htdemucs`'s "other" stem for guitar clarity — separating into more stems (guitar, piano, in addition to the original four) appears to cost some separation quality per stem. htdemucs_6s is more complex for a worse result here.
- Preference going forward: plain `htdemucs`, not `htdemucs_6s`, unless a later comparison changes this.
- Next comparison planned: `mlx-demucs` (Apple-Silicon-native build of the same weights) vs. plain `htdemucs`, to see if the MLX build produces different (not just faster) output.

## Checkpoint 1c — mlx-demucs vs. htdemucs
Tested `mlx-demucs` (an Apple-Silicon version of the same tool) against the regular `htdemucs` on both songs. By ear, no noticeable quality difference. Processing time was actually a little *slower* with mlx-demucs (17.5s and 21.4s per song) than regular htdemucs (15s and 17s per song) — not the speed improvement expected. Decision: keep using plain `htdemucs` going forward.

## Checkpoint 2 — transcription quality (Basic Pitch)
Tested Basic Pitch on both the separated "other" stem and the full original mix, for both songs. Full-mix transcription sounded noticeably better for Seven Nation Army and slightly better for Friction than the separated version — separation seems to remove some useful signal (other instruments reinforcing the same notes) even while removing interference. Both versions broke down in sections where all instruments play together — a known limitation of Basic Pitch as a general-purpose transcriber, not something separation quality alone fixes.

Follow-up test on a third song — Chet Atkins' "Mister Sandman," fully acoustic solo guitar, lossless WAV — transcribed very well with no separation needed. Since the original two songs are already high-quality 320kbps AAC, this rules out source audio quality as the bottleneck. The real driver is song complexity/genre: dense, distorted, multi-instrument recordings are hard for Basic Pitch; simple acoustic solo-guitar content is not.

**Decision (2026-09-07): scope down for now.** Rather than chasing better results on full-band/distorted songs immediately (MT3/MR-MT3, riff-trimming), treat simpler/acoustic songs as the realistic near-term target and revisit harder songs later, once the rest of the pipeline (tab generation, app) is proven end-to-end. See `docs/DECISIONS.md`.

## Checkpoint 3 — tab quality (tuttut)
Installed `tuttut` (needed a workaround — its exact pinned dependencies, e.g. `matplotlib==3.5.3`, don't build on this setup; installed with `--no-deps` against modern versions instead, which worked fine at runtime). Ran it on the Mister Sandman transcription (the one song that transcribed cleanly). Its default dense ASCII output was hard to read; an early "chronological list" reformat made it worse by breaking the standard left-to-right-per-string convention tabs are actually read in. Settled on: a proper 6-line ASCII tab (chords shown as stacked frets in the same column, single notes alone, fixed-width aligned columns, wrapped into readable rows), with a toggle for string order (standard "thin e on top" vs. "thick E on top" matching how the neck physically sits), and no per-note timing — order alone is enough, timing/feel is the human's job. Also produced a simple machine-readable JSON of the same ordered steps. Script: `research/00_spike/tuttut_clean_tab.py`.

Backlogged from this checkpoint: audible playback with a visual note-highlight cue (see `DECISIONS.md`), and richer display modes (fretboard diagrams) as later opt-in layers on top of the same data.

## Checkpoint 4 — does trimming to just the riff help?
Deferred (2026-09-07) — see `docs/DECISIONS.md`. Building toward an end-to-end MVP using Mister Sandman first; revisit this once that exists.

## Checkpoint 5 — second data point (Friction, full comparison)
Deferred (2026-09-07) — see `docs/DECISIONS.md`. Same reasoning as Checkpoint 4.
