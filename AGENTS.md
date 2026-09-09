# Agent instructions

Read `docs/GUIDE.md` and `docs/ARCHITECTURE.md` before touching code. This file is the rules; those are the map.

## How to work in this repo

- **Small, isolated, independently verifiable chunks.** One task = one narrow, self-contained change. No monolithic generation. If a task feels big, it should be split before it's started, not after.
- **Never change a file under `contracts/` as a side effect of another task.** Those are the seams the whole system's modularity depends on (see `docs/ARCHITECTURE.md`). Changing one is its own explicit task, flagged as such, because it can affect every module on both sides of it.
- **Every pipeline stage keeps its own `STATUS.md`** (see `pipeline/*/STATUS.md`) stating: what it does, what contract it reads, what contract it writes, and its current status. Update it as part of finishing a task in that folder — that file, not the code, is what a memoryless reader (human or agent) should be able to trust.
- **Write or update a test as part of the task, not after.** A task isn't done until its test passes. For pipeline stages that touch audio/ML, a "golden file" comparison against a known-good prior output counts as the test.
- **Before proposing to swap an existing library or tool for an alternative** (a new separation backend, transcription model, tab generator), do a fresh research pass on that alternative at that time — don't reuse an old comparison, tools and their maturity change.
- **Keep audio processing, guitar logic, and UI in separate modules.** They only ever communicate through the schemas in `contracts/`. A module in one layer should never need to import or understand the internals of another layer.
- **Small, reusable functions. Don't rewrite working code that wasn't part of the task.**
- **Never add anything that makes this machine reachable from the internet** (opening a port, a tunnel, inbound access of any kind) without stopping and asking first. Outbound requests a normal package install or API call would make are fine.
- **Walk test, before calling a task done:** could someone with zero memory of this conversation open the folder you just touched and tell what it does and whether it works, from its files alone? If not, the task isn't finished — the code might be, but the documentation of it isn't.

## Where things live

- `contracts/` — the data-shape agreements between modules. Read before writing anything that produces or consumes them.
- `pipeline/NN_stage/` — the real, numbered processing stages, in order. Each has its own `STATUS.md`.
- `research/` — throwaway exploration and spikes. Not production code. Fine to be messy; not fine to be silently promoted into `pipeline/` without being rewritten properly.
- `docs/specs/` — one file per task handed to an execution model: exact inputs/outputs, file locations, and a "done when" checklist. No ambiguity by design.

## Previewing and shipping a change to `app/`

Standing procedure, no exceptions without the user's explicit go-ahead to skip it, binding on every model working in this repo — not a preference of whichever one wrote this:

1. **After any change to `app/`, always preview it with a real local staging build first** — `npm run stage` (`next build && next start -p 3001`) from inside `app/`, not just `npm run dev`. Dev mode behaves differently in real ways (unminified, dev-mode warnings, no static optimization); staging is the actual "does this really work" check, and it's free — zero GitHub or Vercel involvement, run it as many times as needed.
2. **Then ask, every time, exactly this choice — never assume, never skip the question:**
   - **Push to git?** — versioning only, `git commit` + `git push`.
   - **Push to git & deploy?** — also `npx vercel deploy --prod --yes` from the **repo root** (not from inside `app/` — see the Root Directory incident in `app/STATUS.md`).
   - **Skip for now?** — keep iterating locally, touch neither.
3. **Never push to GitHub or deploy to Vercel on your own initiative after an `app/` change** — only after the user picks one of the three above.

Why three separate gates, not one: staging shows what's been built, a GitHub push marks when a version exists, a Vercel deploy marks when it's actually live and accessible — each answers a different question the user asked for explicitly, and conflating any two of them (e.g. deploying because a push happened, or requiring a push before a local staging check) breaks that. See `app/STATUS.md`'s "Four separate layers" note for the fuller mechanics, and `docs/DECISIONS.md` for why Vercel auto-deploy-on-push was turned off in the first place.

## Safety & trust principles

These apply to every model working on this repo or this machine — not just this session, and not just Claude.

- **Make only the changes a task actually requires.** No incidental "while I'm here" edits, no touching files, settings, or tools outside what the task explicitly needs.
- **Ask explicit approval before any file change** — creating, editing, moving, or deleting anything, no exceptions for a file the same session created moments earlier. The project is meant to be pickable-up by any AI, so this rule binds whoever is working here, not just one model's habits.
- **Never make this machine reachable from the internet** — no open ports, no tunnels, no inbound access of any kind — without stopping and asking first, explaining the tradeoffs, and getting an explicit yes. This is a hard rule, not a default that can be reasoned around.
- **Explain outbound network requests before making them**, beyond what a normal package install already implies (pip/npm/brew fetching a named package from its usual registry). Say what's being fetched, from where, and why.
- **Prefer additive, reversible changes** — a new Homebrew formula, a new file, a new virtual environment — over changes to shared system configuration (PATH, shell profile, default interpreters, global settings) unless a task specifically requires it, and say so plainly when it does.
- **Never lie, mislead, or downplay what a change does.** If something is uncertain, risky, or has a side effect, say so plainly rather than presenting it as routine.
- **Deletion on the user's machine requires permission for that specific case** — never assumed from an earlier approval, and never applied more broadly than what was asked.

## Periodic review

At natural pause points — end of a phase, before starting a new pipeline stage, before anything gets hosted or pushed to a public GitHub remote, or when resuming after a long gap — run the drift check in `docs/DRIFT_CHECK.md`, and record the result in `docs/DRIFT_LOG.md`. Preferably from a fresh session, not the one that did the work being checked.
