# How to use the new verification setup

Written for you, not for an AI picking up the repo — plain language, no assumed engineering background. If a term needs explaining, it's explained here rather than skipped.

## The one-time setup (do this once, on this Mac, and again on any future clone)

```bash
cd /Users/tomsvarpins/Projects/guitar_tab_processor
git config core.hooksPath .githooks
```

That's it. This tells Git "before every commit, run the check script in `.githooks/` first." It's a *local* setting — it lives on your machine, not in the repo itself, which is deliberate (a hook that ran automatically on every clone with no visibility would be a bigger trust leap than one line you type once, knowingly). **Already done for you as part of building this** — you only need to re-run it if you ever clone this repo fresh somewhere else.

## What actually changed, in plain terms

**Before:** "is this done?" meant someone (usually me, in a conversation) had to remember to run several separate commands in the right order — a type check, a lint pass, the tests, a build — and there was no guarantee all of them actually happened every time.

**Now:** one command answers that question, and a second one runs automatically before anything gets committed.

## 1. `npm run verify` — the "is this actually done" command

Run this from inside `app/`:

```bash
cd app
npm run verify
```

It runs, in order: a type check, the linter, and the unit tests — the things that used to be a manually-remembered checklist. If everything's fine, you'll see:

```
VERIFY: PASS
```

If anything fails, the script stops right there and shows you what broke — you will **not** see `VERIFY: PASS` mixed in with a failure. That line means "this actually passed everything," full stop.

**`npm run verify:full`** adds a real production build on top — that's what CI runs, since CI has no human around to preview a `stage` server. Locally, you don't need it: `npm run stage` (below) already proves the build works, so running it twice would just pay for the same check again.

**When to run it yourself:** you don't have to — I'll run it as part of finishing app-related work, per the rule now written into `AGENTS.md`. It's here so you *can* check for yourself any time, without needing to ask.

## 2. The pre-commit hook — a safety net you'll mostly never notice

Every time a commit happens to this repo (from this Mac, now that the setup step above is done), two checks run automatically first:

1. **A secret scan** — looks at exactly what's being committed for anything shaped like an API key or access token, and blocks the commit if it finds one.
2. **A type check** on `app/` — blocks the commit if it's broken.

**If you (or I) never paste a real credential into a file and everything type-checks, you will never see this hook do anything.** It's silent until it catches something.

**If it ever blocks a commit, you'll see one of two messages:**

- *"BLOCKED: ... looks like it contains a secret"* — take this seriously. If it's a real credential, don't commit it — remove it from the file, and if that credential was ever pasted anywhere else (a chat, a doc), it needs rotating (this project already has a track record of exactly this happening — Turso, CodeScene, and Spotify tokens all needed rotating after being pasted into chat; see `docs/PENDING_ACTIONS.md`).
- *A typecheck failure* — means the code doesn't actually compile correctly; the commit is blocked until it's fixed, same as the secret case.

**A rare legitimate exception** (a false positive — something that merely *looks* secret-shaped but isn't): the block message tells you how to override it once (`git commit --no-verify`). Don't reach for this reflexively; if it happens, mention it so the detection pattern can be tightened.

## 3. Why this matters for you specifically, not just "best practice"

You said token consumption is a real constraint and you want to do more work with the tokens you have. This is the direct payoff: every one of these checks used to require *reasoning* — me remembering the right commands, in the right order, and you trusting that I actually did. Now it's a single deterministic command and an automatic gate that runs whether anyone remembers to ask for it or not. The tokens that used to go into "let me run the type check... now the lint... now the tests..." are freed up for the actual work — the reasoning only gets spent where a machine genuinely can't do it for you.

## What's still missing (the honest list)

This is a real safety net, not a complete one yet. See `app/status/engineering-practices.md` for the full, current list of what's built vs. what's still missing (CI running this automatically on every push, a rule that blocks merging without it passing, and test coverage for the visual components, among others) — that file is kept up to date as more of this gets built; this guide won't repeat it and risk going stale.
