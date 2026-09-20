# Drift log

Short entries only. See `docs/DRIFT_CHECK.md` for the procedure this follows.

Format for each entry:

```
## YYYY-MM-DD — checked by <who/what ran it>
- Checked: which checklist items
- Found: what was off, if anything
- Action: what was done about it, if anything
```

---

Entries 2026-09-07 → 2026-09-09 (ninth check) archived to `docs/DRIFT_LOG_ARCHIVE.md`
on 2026-09-20 (archive split per `docs/DOCUMENTATION_PRINCIPLES.md` — same format,
nothing deleted). Recent entries stay below.

---

## 2026-09-11 (tenth check) — full handoff after adopting engineering process end-to-end (checked by this session, not fully independent — see note)

- **Scope note:** this was an unusually long, unusually consequential session — process/tooling adoption (Superpowers, cherry-picked ideas from Ponytail/Karpathy-derived sources), a full documentation de-bloat pass, real CI + branch protection + Dependabot going live, an interactive diagram tool wired into the design system, and portfolio case-study notes — not a single narrow change. **The ninth check's own closing note recommended treating a landed architectural milestone as a deliberate handoff point instead of continuing in the same context — that advice wasn't followed this time either**, for the same reason as before: momentum. Worth repeating again, not just noting once: the next real milestone (CI going green, say) is a good place to actually stop, not just a good place to remark that stopping would have been good.
- Checked: pipeline suite 12/12, `app/`'s `npm run verify` PASS, git sync (local matches `origin/master` at `612c74b`), `contracts/` unchanged, 3 Vercel Production deployments `Ready` (~7h old — not correlated to a commit, out of scope for a routine check), `docs/PENDING_ACTIONS.md` skimmed and updated, `AGENTS.md`'s hard rules unchanged by anything this session touched (checked via `git log -p`).
- **What happened, briefly (each already has its own STATUS/decision file — not re-derived here):** adopted the Superpowers plugin as the project's process driver, cherry-picked two external ideas (a YAGNI decision ladder, an assumption-surfacing rule) rather than installing their source plugins — `docs/decisions/agent-workflow-tooling.md`. Trimmed real duplication out of `AGENTS.md`/`DECISIONS.md`/`START_HERE.md`/`CLAUDE.md`/`pipeline/VERIFY.md`, deleted two confirmed-dead files. Built and — after real trouble — actually landed working CI (`app` job, live since this session, took 4 real fixes to get green: a missing OAuth scope, an uncommitted `.nvmrc`, a too-narrow path filter, and `verify.sh`/the pre-commit hook itself having been built and tested locally but never pushed). Turned on branch protection for real (a GitHub ruleset, PRs now required for `app/` work — used for the first time this session, `#5`, merged clean). Reviewed and resolved all 4 open Dependabot PRs (2 merged, 2 closed with the specific real incompatibility named). Built `docs/patch-bay/` — two interactive, animated diagrams (development workflow, pipeline architecture) with real click-to-detail content and a guided trace mode — and wired its palette into `app/design_system/` as a proper third theme (`patchbay`), fixing a stale comment left over from an earlier deletion along the way.
- **Found, mid-session, worth its own line:** `.nvmrc`, `app/scripts/verify.sh`, `app/package.json`'s new scripts, and `.githooks/pre-commit` had all been built and genuinely tested *locally* several turns earlier in this same session, then never actually committed — invisible because they worked regardless of git status. Same root cause, four separate times. The lesson taken forward: after building anything CI depends on, confirm `git status` is clean before calling it done, not just that it runs.
- **Left mid-build, deliberately paused, not broken:** a third `docs/patch-bay/` diagram (technology/tech-stack architecture — local pipeline / application / data & hosting / source control, as a hub around the database rather than a straight line) was one CSS edit into being built when this handoff was requested. The file is in a fully working state — both existing tabs still function, the added CSS classes are just unused so far. Resume by adding the third tab button, its stats, the `<figure id="fig-stack">` SVG block, and wiring it through the existing generic `setupDiagram()` — the plan (card layout, coordinates, content, the 3 real relationships to draw) was already fully worked out in-conversation before the pause.
- **Found, not this session's to fix:** a concurrent Claude Code session has substantial uncommitted work across `app/`'s component tree (Fretboard, Metronome, Sheet, a new `AppHeader`, a new `StringOrientationToggle`) — noticed via `git status` during this checkpoint and confirmed via an independent hook signal ("another chat's dev server is running in this folder"). Not touched, reviewed, or committed by this session; flagged in `docs/PENDING_ACTIONS.md` since only the user can see both sessions to decide what to do with it.
- Action: `docs/PENDING_ACTIONS.md` updated with the above plus a note that the "deploy the home page" item may already be stale given the 3 recent `Ready` deployments (unconfirmed, not assumed). Same standing caveat as every prior entry, sharper this time given the sheer scope: this is a self-check, not an independent one, and a genuinely fresh session reading the new CI/process setup cold — not just the code it produced — is worth doing before trusting it as thoroughly proven.

## 2026-09-20 — pre-merge check on the design-system branch (checked by this session, not fully independent — see note)

- Checked: Tier 1 (START_HERE.md present; spot-checked `c22d574` + `aebc3ed`, messages match their diffs; no hard-rule touches in the branch log — only localhost dev/stage servers, since killed; sole deletion is the approved gitignored playground file) + Tier 2 (`app/status/design-system.md` rewritten by this task to match; `song-views.md`'s "first component on real tokens" claim still accurate; `contracts/` untouched on this branch; BACKLOG 14 is the future child-overrides item, unaffected — the shipped main system came via reviewed plan+specs, nothing un-backlogged silently). Tier 3 dormant (pipeline frozen). Tier 4 not warranted (no long gap).
- Found: nothing off. One observation for the merger: `master` still has the zinc-duplicate MetronomeControls button (Task 4's removal is branch-only), so the post-merge deploy ships a user-visible fix, not just plumbing.
- Action: none beyond this entry. Same standing note: implementing session checking its own work — the upcoming PR review is the independent eye this check can't be.

## 2026-09-20 — Tier 0 doc sweep (checked by this session, not fully independent — see note)
- Checked: verified-then-wrote throughout. `pytest pipeline/ -q` → 13 passed (was 12); `ls` confirms `app/e2e/home.spec.ts` + `scripts/sync-secrets-to-github.sh` exist; "Protect master" ruleset active via API; `app/lib/spotify.ts` absent (publish-time metadata commits `d742a78`/`83a93ab`/`7e16acd`); `npx eslint app/page.tsx` clean (exit 0); `contracts/` untouched; deploy truth unverifiable here (no vercel CLI) so left flagged, not declared.
- Found: README still said "Phase 0, no app code"; VERIFY said 12/12 + "CI not set up"; PENDING :17 referenced deleted spotify.ts, :18 deploy ambiguity, :19 stale 2026-09-11 session flag; s05 STATUS said artist always null; BACKLOG #7/#24/#26/#27/#29 resolved-but-unrecorded, #22 pointer stale, #25 void.
- Action: fixed all of the above across README, VERIFY, PENDING, s05 STATUS, app/STATUS deploy caveat, BACKLOG (6 items to Archive) + board SEED status mirror; recorded Skills/ keep-decision in AGENT_TOOLING_LOG. No code touched, no deletions, nothing committed. Same standing note: self-check, fresh-session pass still owed.
