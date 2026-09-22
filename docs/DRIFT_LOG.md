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

Older entries: `docs/DRIFT_LOG_archive.md`.

## 2026-09-20 — pre-merge check on the design-system branch (checked by this session, not fully independent — see note)

- Checked: Tier 1 (START_HERE.md present; spot-checked `c22d574` + `aebc3ed`, messages match their diffs; no hard-rule touches in the branch log — only localhost dev/stage servers, since killed; sole deletion is the approved gitignored playground file) + Tier 2 (`app/status/design-system.md` rewritten by this task to match; `song-views.md`'s "first component on real tokens" claim still accurate; `contracts/` untouched on this branch; BACKLOG 14 is the future child-overrides item, unaffected — the shipped main system came via reviewed plan+specs, nothing un-backlogged silently). Tier 3 dormant (pipeline frozen). Tier 4 not warranted (no long gap).
- Found: nothing off. One observation for the merger: `master` still has the zinc-duplicate MetronomeControls button (Task 4's removal is branch-only), so the post-merge deploy ships a user-visible fix, not just plumbing.
- Action: none beyond this entry. Same standing note: implementing session checking its own work — the upcoming PR review is the independent eye this check can't be.

## 2026-09-20 — token-discipline pass (checked by this session, not fully independent — see note)
- Baseline (step 0, standing): record session token totals for the next 2–3 tasks before judging effect; one line per task staged for the next entry.
- Action: added §7 "Token discipline" to `docs/WEB_APP_WORKFLOW.md` (output hygiene, soft session-preference rule, handoff directive); added governing-doc pointer to `docs/DEVELOPMENT_PROCESS.md:4`. Codescene cleanup explicitly deferred (trial active; BACKLOG #11 + token-rotation item untouched). No spec/plan qualified for archive today (iteration-2 plan live, 09-18 plans unverified).
- Forward rule (so this isn't re-decided): a spec/plan archives to `docs/specs/archive/` or `docs/superpowers/plans/archive/` only when its work shipped per `git log`/merged PRs — never by age; the move updates all inbound refs in the same commit (known case: 9 refs to the 2026-09-19 design-system plan, incl. the shipped package README — crossed scope gets named explicitly).
