# Start here

If you are an AI model or agent picking up this project with no memory of any prior conversation about it, this file tells you what to do, in order. This is the one thing a human needs to point you at — everything else follows from here, from the files alone.

## 1. Orient yourself — read these, in order

1. `AGENTS.md` — the working rules for anyone, human or AI, making changes here. Always first.
2. `docs/GUIDE.md` — what this project is and how its documentation is organized.
3. `docs/ARCHITECTURE.md` — how data flows through the system (a live visual diagram is linked from there).
4. `docs/DECISIONS.md` — the full reasoning behind why things are built the way they are. Don't re-litigate a decision here without a genuinely new reason.
5. `docs/AUDIOPROCESSINGTOOLS.md` — what's already been researched or tried for each pipeline stage, so research doesn't restart from zero.
6. `research/00_spike/RESULTS.md` and each `pipeline/*/STATUS.md` — the actual current state: what's been tried, what works, what's next.

## 2. Prove you actually oriented — the walk test

Before doing anything else, explain back, in your own words: what this project is, what's been decided and why, and exactly what state it's in right now — what's done, what's next. If that can't be done confidently from the files alone, something is missing from the docs. Say so. Don't guess and don't proceed on a guess.

## 3. Then, and only then, do the actual work

Follow whatever task was given, obeying everything in `AGENTS.md` — especially its safety principles, since this project can touch a real person's actual machine. If no specific task was given, ask what to work on next, based on the current state just described in step 2.

## For the human pointing an AI here

Whatever tool or model is being used — Claude Code, OpenCode, anything else, now or years from now — the one instruction that works everywhere, in any chat interface, regardless of whether that tool auto-loads any particular filename:

> Read START_HERE.md in this repo and follow it.

That's the entire bootstrap. It doesn't depend on a tool recognizing `AGENTS.md` or `CLAUDE.md` by convention — plenty do, but nothing guarantees all of them will, forever. It only depends on the tool being able to read a file it's pointed at, which is about as close to universal as anything gets.

This is this project's deliberate, heaviest use of the one idea from `icm-architect` (github.com/RinDig/icm-architect) worth leaning on completely: structure and plain, committed files carry enough state for a memoryless agent to orient correctly, on their own, independent of any model's built-in configuration. See `docs/DECISIONS.md` for the fuller reasoning on where else that methodology was and wasn't adopted.
