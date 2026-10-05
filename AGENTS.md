# Agent instructions

Single-maintainer hobby project with a publicly reachable app. Smallest reliable, reversible solution wins.
Read this file and your task file. Orientation docs (`docs/GUIDE.md`, `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md`) only after a long gap or on request. Flow: `docs/rules/process.md`; checks:
`docs/rules/verify.md`; builder: `docs/rules/executor.md`; models: `docs/rules/models.md`.

## Map
- `app/` Next.js web app (area rules: `app/AGENTS.md`). `pipeline/NN_stage/` numbered processing stages
  (`pipeline/AGENTS.md`). `tools/Control_Centre/` SvelteKit tool (`tools/Control_Centre/AGENTS.md`).
- `contracts/` data-shape agreements between modules. Read before producing or consuming them.
- `research/` throwaway spikes. Never promoted into `pipeline/` without a proper rewrite.
- `docs/plans/` plans and task specs; `docs/work/` live task files; `docs/decisions/` decision records.

## Ask first (stop, name the action, wait for a yes)
- Any `git push`, PR or deploy, every time. For `app/` ask the three-way question: **Push to git?** /
  **Push to git & deploy?** / **Skip for now?** Deploy is `npx vercel deploy --prod --yes` from the repo
  root, never from `app/`. Never deploy because a push happened, or require a push before a local check.
- Deleting or moving anything: permission for that specific case, never carried over from an earlier yes.
- Touching `contracts/`, config or secrets. A `contracts/` change is its own flagged task, never a side effect.
- Anything that makes this machine reachable from the internet (port, tunnel, inbound access): explain
  the tradeoffs and get an explicit yes. Hard rule.
- Outbound requests beyond a normal package install: say what, from where, why, before making them.
- Edits inside the task's allowed files and a task's own local checkpoint commit need no separate yes
  (commit, then report). Anything spanning more than the one task needs an ask.
- On this machine prefer adding new things beside old ones over editing shared system settings (PATH,
  shell profile, global config). Say so when a task requires it.
- Never put credentials in chat. A real credential in a blocked commit: stop and rotate, never `--no-verify`.

## Engineering posture
- No enterprise infrastructure, speculative abstractions or extension points without a concrete need.
  Explicit requirements, real security/data/accessibility risks and repo gates outrank this default.
- Ladder, in order: does it need to exist, existing code, standard library, installed dependency, one
  line, only then new code. Minimum code; nothing unasked.
- Small reusable functions. Change what the task needs; leave unrelated working code alone. Clean up
  only what your own edit orphaned; mention pre-existing dead code, don't delete it.
- Keep audio, guitar logic and UI in separate modules. They talk only through `contracts/`.
- Validate input at boundaries (files, user input): fail with a clear message, never a crash or divide by
  zero. Refresh and render paths never run destructive operations; reads must not delete.
- Before swapping a library or tool, do fresh research and check `docs/audio-tools/` first.
- Work in this session directly; delegate to subagents only for real parallelism or a context-size risk.
- Mechanical before reasoning: if grep, a count or a script can answer it, use that, not a model's judgment.

## Honesty
- State assumptions and name alternatives; if genuinely unclear, stop and ask. Never guess and proceed.
- Never mislead or downplay a change. Say plainly what is risky, uncertain, or was not run or checked.
- No "verified" or "done" without the command and its output beside it.

## Reply style
Reader is a designer, not an engineer. Write so a junior engineer follows it the first time.
- Answer first, in plain words. No greetings, no restating the question, no closing offers.
- Define any technical term in one clause the first time it appears. Prefer the plain word.
  Use an analogy only when a plain explanation has failed.
- Decisions and plans: say what it means for you, what each option changes, what could go wrong
  and how you would notice, then my recommendation and why.
- Warn before acting on: contracts/, config, secrets; deleting or moving files; anything hard to
  undo; new dependencies or moving parts; anything that changes what you see in the app;
  anything that raises cost or token use.
- Length follows stakes: confirmations are one or two lines; decisions get the detail above.
  No tables or long code unless asked.
- Wrap-up logs how many times the owner asked to "explain simpler" this session (target: under 2).

## Session
- One job per session. A decision made in chat goes into the task file as one line, at once.
- A command offered for the owner to launch (server, watcher) comes with its stop command and a free-port check in the next blocks.
- Before you stop, update the task file's `Next:` line and checklist. `/start` begins a session.

## Testing, debugging, done
- Logic and bug fixes: failing test first, then code. Audio/ML pipeline stages use a golden-file
  comparison. Tests use their own fixtures, never real user data. Budget: `docs/rules/verify.md`.
- Debugging: reproduce, gather evidence, one hypothesis at a time, root cause before fix, add a
  regression test. Two failed attempts at the same problem: stop and report.
- Done = `npm run verify` footer pasted (in `app/`; pipeline work: `scripts/verify-pipeline.sh`), the
  task's acceptance checks run, task file updated, and the work committed. Docs and each pipeline
  stage's `STATUS.md` are part of the deliverable.
- A manual check that writes to disk ends with its own revert.

## Worktrees
Use a worktree (`scripts/new-worktree.sh`) when the work needs isolation from the current workspace or
splits into independent parallel pieces. Rare at this size. It sets `core.hooksPath` and the env files.
