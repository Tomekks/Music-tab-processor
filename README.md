# TabbyTab

**If you are an AI model or agent:** read [`START_HERE.md`](START_HERE.md) before doing anything else. It tells you exactly what to read, in what order, and how to prove you actually understood it before touching any code.

A personal tool that turns a song recording into a playable, beginner-friendly guitar tab: upload or point at a song, get back a tab you can actually play along to — close enough to the real riff to be satisfying, not a note-perfect transcription. Built by a beginner guitarist who kept running into songs with no tab, or no tab matched to their skill level.

**Live at:** [app-six-psi-70.vercel.app](https://app-six-psi-70.vercel.app)

## What it does

- Converts a song recording into three ways to read it: ASCII tab, a fretboard diagram, and standard sheet music notation
- A metronome synced to the track's tempo, with loop practice for a specific section
- A flippable fretboard orientation and a cover-art/artist lookup for each song

Turning a recording into a note-perfect tab is a genuinely unsolved research problem — algorithms still struggle to separate a single instrument's audio out of a full mix, especially guitar in a distorted rock mix. So this project doesn't chase perfect accuracy; it aims for "recognizable enough to play along to."

## How it's built

- **Pipeline (local, Python):** audio ingestion → instrument separation (`htdemucs`) → note extraction (Basic Pitch) → tab generation, run on a MacBook, never in the cloud
- **App:** Next.js + TypeScript, [Turso](https://turso.tech) (libSQL) via Drizzle ORM, deployed on Vercel

## The second purpose

This is also a public demonstration of directing AI coding agents as a designer, not a professional software engineer — the repo structure and documentation are as much a part of the deliverable as the running app. Claude does the planning and review; execution models do the implementation, under a small set of hard rules (see [`AGENTS.md`](AGENTS.md)) earned from real mistakes along the way, not written in the abstract.

Two docs to start with:
- [`docs/GUIDE.md`](docs/GUIDE.md) — what this project is and how it's organized, in plain language.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how data flows through the system, with a link to the live diagram.
