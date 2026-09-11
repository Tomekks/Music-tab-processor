# Project purpose and scope

Part of `docs/decisions/` — see `docs/DECISIONS.md` for the index and the reading policy.

## The core reframe: recognizable, not accurate

The goal is "what's the easiest way for a beginner guitarist to play something recognizably close to this song" — not a note-perfect transcription of the original recording. This isn't a lowered bar for its own sake; it's what makes several otherwise very hard problems tractable. A guitar-only, pixel-perfect source separation is a hard, partly unsolved problem; "notes that sound like the riff when played on a guitar" is a much easier target, and it's the one that actually matters here — musicians learn songs by ear and approximate them constantly, and tabs are copyrighted anyway, so an approximation was always the honest goal, not a compromise. Concretely, this reframe is why vocal separation quality was later declared explicitly out of scope — vocals don't need to be clean, they just need to not contaminate the guitar/melody content enough to confuse transcription. Keep coming back to this framing whenever a technical decision threatens to get complicated: the question is never "is this the real sound," it's "would this let someone play something that sounds like the song."

This project also has a second, explicit purpose: it's a public demonstration of the developer's ability to direct AI tools, as a designer, not a professional software engineer. That's why the repo structure and documentation quality matter as much as the running app — the repo itself is part of the deliverable.

## What stays local-only, and why

Source audio, separated stems, MIDI transcriptions, generated tab data, and reference images (`research/00_spike/audio/`, `output/`, `fretboard/`) are excluded from the public GitHub repo (see `.gitignore`). A MIDI or tab derived from a copyrighted song is a derivative work in the same category as a tab itself — fine to keep and use locally, not something to publish. Only the text analysis describing what was tried and found (`RESULTS.md`, `README.md`) is public, since it doesn't reproduce any song's actual content.

## Using existing published tabs as a validation aid, never as a pipeline input

When judging Phase 0 output by ear, comparing it against a known, already-published tab for that song sharpens the judgment beyond "does this sound roughly right." This is different from feeding existing tabs into the pipeline itself, which would defeat the project's purpose — most songs someone actually wants to learn won't already have a tab, so the pipeline has to work without one.
