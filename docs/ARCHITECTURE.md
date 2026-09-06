# Architecture

Live, visual version of this page: **Signal Path** — https://claude.ai/code/artifact/cc33502d-4b23-442b-81c1-0afd1a0d12b5
(Update this link if the diagram is ever republished under a new one.)

## Right now — everything on one machine

A song enters a local pipeline and a tab comes out the other end; a small app on the same machine reads the result. Four independent stages, each only agreeing with its neighbor on a data shape, not on how it does its job internally:

1. **Separate** (`htdemucs`) — splits the full mix into stems.
2. **Transcribe** (Basic Pitch) — listens to one stem, writes down pitch + time as plain notes (`contracts/notes.schema.json`).
3. **Generate tab** (`tuttut`) — turns those notes into string/fret choices (`contracts/tab.schema.json`).
4. **Store + serve** — tab data lands in a local database; a Next.js app reads it and renders a practice view (tab display, synthesized playback, metronome).

## Later — hosted

The heavy processing never leaves this Mac — free serverless hosting tiers are built for quick requests, not minutes of model inference. What moves online is a light, read-only web app. The two sides never talk to each other directly (this machine is never made reachable from the internet); they meet only at a shared hosted database. The Mac writes; the hosted app reads.

## Why two contracts, not one

Audio processing produces plain musical notes (`contracts/notes.schema.json`) — no guitar concept at all, just pitch/time/duration. Guitar logic turns that into string/fret choices (`contracts/tab.schema.json`). Splitting it this way is what makes "audio processing / guitar logic / UI stay separate" actually true instead of just stated: the audio module never needs to know a guitar exists.
