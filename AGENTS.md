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
