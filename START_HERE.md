# Start here

If you are an AI model or agent picking up this project with no memory of any prior conversation about it: this file tells you what to do, in order.

## 1. Orient yourself — read these, in order

1. `AGENTS.md` — the working rules for anyone, human or AI, making changes here. Always first.
2. `docs/GUIDE.md` — what this project is and how its documentation is organized.
3. `docs/ARCHITECTURE.md` — how data flows through the system (a live visual diagram is linked from there).
4. `docs/DECISIONS.md` — an index, not the full reasoning: read it in full (it's short), then open the specific `docs/decisions/*.md` file it points to only once your actual task touches that topic. Don't re-litigate a decision without a genuinely new reason.
5. `docs/AUDIOPROCESSINGTOOLS.md` — same pattern: an index into `docs/audio-tools/`, so research doesn't restart from zero.
6. `research/00_spike/RESULTS.md` and each `pipeline/*/STATUS.md` — the actual current state: what's been tried, what works, what's next.

See `docs/GUIDE.md` for the full map of where everything lives, and `docs/DOCUMENTATION_PRINCIPLES.md` for why the docs are shaped this way.

## 2. Prove you actually oriented — the walk test

Before doing anything else, explain back, in your own words: what this project is, what's been decided and why, and exactly what state it's in right now. If that can't be done confidently from the files alone, something is missing from the docs — say so, don't guess.

## 3. Then, and only then, do the actual work

Follow whatever task was given, obeying everything in `AGENTS.md` — especially its safety principles, since this project can touch a real person's actual machine. If no specific task was given, ask what to work on next.

## For the human pointing an AI here

Whatever tool or model is being used, now or years from now, the one instruction that works everywhere:

> Read START_HERE.md in this repo and follow it.

That's the entire bootstrap. It doesn't depend on a tool recognizing `AGENTS.md` or `CLAUDE.md` by convention — it only depends on the tool being able to read a file it's pointed at. This is this project's deliberate use of one idea from `icm-architect` (github.com/RinDig/icm-architect): plain, committed files carry enough state for a memoryless agent to orient correctly, independent of any model's built-in configuration. See `docs/decisions/structure-and-methodology.md` for the fuller reasoning.
