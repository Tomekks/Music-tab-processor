# Agent workflow tooling

Part of `docs/decisions/` — see `docs/DECISIONS.md` for the index and the reading policy.

## Superpowers adopted as the process driver, not just another tool (2026-09-10)

[obra/superpowers](https://github.com/obra/superpowers) is a Claude Code plugin — a maintained library of engineering-process skills (`brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`/`receiving-code-review`, `using-git-worktrees`, `finishing-a-development-branch`, `verification-before-completion`, `subagent-driven-development`, `dispatching-parallel-agents`) built and maintained outside this project. It was installed user-wide (`claude plugin marketplace add obra/superpowers-marketplace`, then `claude plugin install superpowers@superpowers-marketplace`), so it applies to every repo this developer works in, not just this one.

The decision, explicitly: where this project's own `AGENTS.md` had grown ad hoc versions of generic engineering practice — "small isolated chunks," "write a test as part of the task," the per-task "walk test" — those now defer to the matching Superpowers skill instead of restating it inline. Reasoning: those were this developer's own approximations of practices that already exist, better specified, in a skill library built for exactly this purpose; letting home-grown habits keep governing them risked both drift from better practice and pure context bloat — the same guidance said twice, once loosely in `AGENTS.md`, once properly in the skill that's actually invoked when it matters. This is the same "three homes" problem `docs/DOCUMENTATION_PRINCIPLES.md` already names: a fact retold in more than one place instead of living in the one place that owns it.

**What actually changed in `AGENTS.md`:** the task-sizing/planning bullet now points to `superpowers:brainstorming` → `superpowers:writing-plans`; the "write a test" bullet points to `superpowers:test-driven-development`, keeping only the one thing that skill can't know on its own — that this project's audio/ML pipeline stages use a golden-file comparison in place of a conventional unit test; the walk-test bullet keeps its own definition (it's a named concept referenced from `START_HERE.md`, `docs/DRIFT_CHECK.md`, and `docs/DOCUMENTATION_PRINCIPLES.md` — not something to quietly rename) but is now explicitly the concrete form `superpowers:verification-before-completion` takes here, not a competing check running alongside it. Debugging, code review, and workspace isolation — none of which this project had ever codified before — now point to `superpowers:systematic-debugging`, `superpowers:requesting-code-review`/`receiving-code-review`, and `superpowers:using-git-worktrees` respectively.

**What deliberately did not change, and won't just because a skill exists:** everything in `AGENTS.md`'s "Safety & trust principles" section — ask before every commit or push, ask before deletion, never make the machine internet-reachable, explain outbound requests before making them — stays exactly as strict, because those are this specific machine's safety rules, not generic engineering process, and Superpowers has no opinion on them one way or the other. Same for everything structural to this repo specifically: the `contracts/` boundary rule, per-stage `STATUS.md` discipline, and the three-gate app/ preview-and-shipping procedure. A skill can tell you *how* to plan or test; it can't know this repo keeps audio/ML output out of git, or that a Vercel deploy needs its own explicit yes every time. Per Superpowers' own stated precedence (its `using-superpowers` skill: "User instructions... take precedence over skills"), none of this is in tension — the skill governs process, this file's rules govern this project and this machine, and where the two would ever conflict, this file wins.

## Two rules cherry-picked from an external source, not installed as a plugin (2026-09-10)

[multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) is a single `CLAUDE.md` of four behavioral principles distilled from Andrej Karpathy's public observations on LLM coding mistakes — not written by Karpathy himself, and worth naming as third-party attribution rather than treating as official. Reviewed all four against what this repo already has: "Simplicity First" mostly duplicates the existing `simplify` skill, and "Goal-Driven Execution" mostly duplicates `superpowers:writing-plans`/`verification-before-completion` — installing the whole thing as a plugin would have added another always-on text block restating what's already enforced, the exact bloat this file's other entries exist to avoid.

Two pieces were genuine, currently-missing gaps, so they were folded directly into `AGENTS.md` instead of adopting the source wholesale:
- **Surface assumptions instead of picking silently** — nothing in this repo previously told an agent to name competing interpretations or stop and ask on an ambiguous *ordinary* task (`superpowers:brainstorming` only covers this for creative/feature work).
- **Clean up only the orphans your own edit creates** — a precise refinement of the existing "make only the changes a task requires" rule; mention pre-existing dead code, don't delete it.

## Ponytail's decision ladder cherry-picked, plugin not installed (2026-09-10)

[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — a real, actively-maintained, MIT-licensed plugin (verified via GitHub's API, not just the README: 134k+ stars, created 2026-06-12). Its hook scripts (`ponytail-activate.js`, `ponytail-runtime.js`, `ponytail-config.js`, `ponytail-mode-tracker.js`) were read directly before any decision: no network calls, no telemetry, no subprocess execution — they write only to their own local state (`~/.config/ponytail/`, a flag file under `~/.claude`).

Not installed anyway: its delivery mechanism is three hooks firing on every session start, every subagent start, and every prompt submitted — permanent, always-on overhead, which cuts directly against the token-economy goal this file's other entries exist to serve. Its actual content was worth keeping — `AGENTS.md` points here rather than repeating it inline (that repetition was itself a small bloat regression, caught and fixed 2026-09-10). **The ladder, in full — work down it and stop at the first yes:**

1. Does this need to exist at all?
2. Already in this codebase?
3. Does the standard library do it?
4. A native platform feature?
5. An already-installed dependency?
6. Can it be one line?
7. Only then: the minimum new code that works — no new abstraction, dependency, or "flexibility" that wasn't asked for.

Explicitly out of scope for what this addition solves: it improves *new* code (less bloat, fewer dependencies), not *runtime performance* (audio pipeline speed) and not verification of *already-written* code — those are separate problems (CodeScene, CI, and test-suite runs are the right tools for those, not this).

See also: `docs/decisions/stack-and-tooling.md` (the reliability toolkit this supersedes the process-mechanics half of), `docs/decisions/structure-and-methodology.md` (where the walk test itself came from), and `docs/AGENT_TOOLING_LOG.md` (the *what's installed, when* companion to this file's *why* — every plugin/skill added to the coding agent's environment, not just Superpowers).
