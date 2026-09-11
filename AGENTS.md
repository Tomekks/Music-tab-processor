# Agent instructions

Read `docs/GUIDE.md` and `docs/ARCHITECTURE.md` before touching code. This file is the rules; those are the map.

## Process: driven by the Superpowers plugin, not ad hoc habit

This repo's coding agent runs the [Superpowers](https://github.com/obra/superpowers) plugin (installed 2026-09-10, user-wide). Its skills — `brainstorming`, `writing-plans`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`/`receiving-code-review`, `using-git-worktrees`, `finishing-a-development-branch`, `verification-before-completion` — are now the default source for *how* to plan, test, debug, review, and verify work, superseding this project's own earlier, looser versions of the same practices. See `docs/decisions/agent-workflow-tooling.md` for the full reasoning on what changed below and why.

What does **not** defer to any skill, ever: every rule in "Safety & trust principles" below, and everything specific to this repo's own structure (`contracts/`, per-stage `STATUS.md`, the app/ preview-and-shipping gate). Those bind regardless of what a skill would otherwise do on its own.

## How to work in this repo

- **Task sizing and planning follow `superpowers:brainstorming` → `superpowers:writing-plans`.** Brainstorm intent before creative/feature work, then break it into a written plan of small, independently verifiable steps before touching code — no monolithic generation.
- **Surface assumptions instead of picking silently.** Before non-trivial work: state what you're assuming; if multiple reasonable interpretations exist, name them rather than quietly choosing one; if something's genuinely unclear, stop and ask rather than guess-and-proceed.
- **Never change a file under `contracts/` as a side effect of another task.** Those are the seams the whole system's modularity depends on (see `docs/ARCHITECTURE.md`). Changing one is its own explicit task, flagged as such, because it can affect every module on both sides of it.
- **Every pipeline stage keeps its own `STATUS.md`** (see `pipeline/*/STATUS.md`) stating: what it does, what contract it reads, what contract it writes, and its current status. Update it as part of finishing a task in that folder — that file, not the code, is what a memoryless reader (human or agent) should be able to trust.
- **Implementation follows `superpowers:test-driven-development`** (red-green-refactor) rather than a bare "write a test" rule. The one thing that skill can't know on its own: for pipeline stages that touch audio/ML, a "golden file" comparison against a known-good prior output stands in for a unit test.
- **When TDD's green step leaves more than one way to pass the test, use the decision ladder in `docs/decisions/agent-workflow-tooling.md`** (adapted from the `ponytail` plugin, not installed) to pick the minimal implementation.
- **Before proposing to swap an existing library or tool for an alternative** (a new separation backend, transcription model, tab generator), do a fresh research pass on that alternative at that time — don't reuse an old comparison, tools and their maturity change.
- **Keep audio processing, guitar logic, and UI in separate modules.** They only ever communicate through the schemas in `contracts/`. A module in one layer should never need to import or understand the internals of another layer.
- **Small, reusable functions. Don't rewrite working code that wasn't part of the task.**
- **Debugging follows `superpowers:systematic-debugging`** — root-cause it before proposing a fix. **Non-trivial or risky changes get `superpowers:requesting-code-review`/`receiving-code-review`** before being called finished. **Work needing isolation from the current workspace uses `superpowers:using-git-worktrees`.**
- **Never add anything that makes this machine reachable from the internet** (opening a port, a tunnel, inbound access of any kind) without stopping and asking first. Outbound requests a normal package install or API call would make are fine.
- **Verification before calling a task done follows `superpowers:verification-before-completion`** — run the actual check and confirm real output, not a mental pass. **For `app/` work: `npm run verify`** (typecheck → lint → unit tests, no build — `npm run stage` below already proves the build) locally, **`npm run verify:full`** (adds the production build) in CI, which has no human to preview a `stage` server. Don't run the build twice for the same change. Pipeline work doesn't have an equivalent yet (due for a rewrite; see `docs/decisions/agent-workflow-tooling.md`). The project's own **walk test** (could someone with zero memory of this conversation open the folder you just touched and tell what it does and whether it works, from its files alone?) is a separate, complementary check — see `docs/decisions/structure-and-methodology.md`. If either fails, the task isn't finished.
- **Not every task earns full Superpowers ceremony.** A single, well-specified, low-risk change (a copy edit, a color/spacing tweak, a one-line fix) skips `brainstorming`/`writing-plans` and goes straight to implementation + `verify` — reserve the full ceremony for genuinely ambiguous or multi-step work. This is a deliberate, project-level override of Superpowers' own default ("invoke a skill if there's even a 1% chance it applies"), allowed per that same plugin's stated precedence: project instructions win over a skill's own bias.
- **Every commit to `app/` runs through a pre-commit hook** (`.githooks/pre-commit`, a secret scan + typecheck) once `git config core.hooksPath .githooks` is set for this clone — see `docs/DEV_WORKFLOW_GUIDE.md` for setup. A block on a real credential means stop and rotate it, not `--no-verify` past it.

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

- **Make only the changes a task actually requires.** No incidental "while I'm here" edits, no touching files, settings, or tools outside what the task explicitly needs. If your own edit orphans something (an import, variable, or function only your change made unused), clean that up as part of the task; leave pre-existing dead code alone — mention it, don't delete it.
- **Ask explicit approval before any file change** — creating, editing, moving, or deleting anything, no exceptions for a file the same session created moments earlier. The project is meant to be pickable-up by any AI, so this rule binds whoever is working here, not just one model's habits.
- **Never make this machine reachable from the internet** — no open ports, no tunnels, no inbound access of any kind — without stopping and asking first, explaining the tradeoffs, and getting an explicit yes. This is a hard rule, not a default that can be reasoned around.
- **Explain outbound network requests before making them**, beyond what a normal package install already implies (pip/npm/brew fetching a named package from its usual registry). Say what's being fetched, from where, and why.
- **Prefer additive, reversible changes** — a new Homebrew formula, a new file, a new virtual environment — over changes to shared system configuration (PATH, shell profile, default interpreters, global settings) unless a task specifically requires it, and say so plainly when it does.
- **Never lie, mislead, or downplay what a change does.** If something is uncertain, risky, or has a side effect, say so plainly rather than presenting it as routine.
- **Deletion on the user's machine requires permission for that specific case** — never assumed from an earlier approval, and never applied more broadly than what was asked.
- **Ask before every git commit or push, not just `app/` changes, every single time.** Never infer permission from a broader instruction like "handoff" or "let's clean up" — a commit needs its own explicit yes, the same way a deletion does. (The `app/`-specific "Push to git? / Push to git & deploy? / Skip for now?" question below is the app case of this same general rule, not the whole of it.)

## Periodic review

At natural pause points — end of a phase, before starting a new pipeline stage, before anything gets hosted or pushed to a public GitHub remote, or when resuming after a long gap — run the drift check in `docs/DRIFT_CHECK.md`, and record the result in `docs/DRIFT_LOG.md`. Preferably from a fresh session, not the one that did the work being checked.
