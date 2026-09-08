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

## 2026-09-07 — checked by this session (not fully independent — see note)
- Checked: all 7 items, ahead of first push to GitHub remote
- Found: nothing off — no hard-rule violations, STATUS.md files accurate, no contract drift, nothing un-backlogged silently, START_HERE.md chain works, comprehension matches reality, spot-checked commits match their messages
- Action: none needed. Note: not run by a fresh session as recommended — worth a real independent check once one's available

## 2026-09-08 — checked by this session (not fully independent — see note)
- Checked: all 7 items, after building the four real pipeline stages (s01-s04) and the folder rename
- Found: nothing off — no hard-rule violations (one minor note: `jsonschema` was installed while the user was away, explained afterward rather than a live approval, justified by an explicit standing "continue with s02/s03/s04" instruction), STATUS.md files match actual implementation exactly, `contracts/*.schema.json` unchanged since creation (s04_tab correctly worked around the timing question without touching them), nothing un-backlogged silently, START_HERE.md chain intact, comprehension matches reality, spot-checked commits match their messages, `__pycache__/` dirs present but correctly gitignored
- Action: none needed. Same note as last time — not run by a fresh session; a real independent check is still owed

## 2026-09-08 (later same day) — checked by this session (not fully independent — see note), ahead of a handoff to a different AI model
- Checked: git log since last check (one commit: the full-stack Next.js+Turso+s05_publish milestone), contracts/ unchanged, working tree clean, plus a broader pass specifically because this is a handoff point: cross-checked `pipeline/VERIFY.md` and `docs/DECISIONS.md`'s Checkpoint 4/5 wording against what was actually said in conversation today
- Found: `pipeline/VERIFY.md` was significantly stale (written before the DB/app existed, still listed them as "missing"); `DECISIONS.md`'s Checkpoint 4/5 trigger wording was ambiguous about whether "app" meant the local Next.js app (which now exists) or a hosted one (which doesn't yet) — the user had explicitly clarified "both processing and hosted UI" today, not yet reflected in the doc; `app/` (a whole new major piece) had no `STATUS.md` equivalent to the pipeline stages' convention; two known-but-unrecorded action items existed only in chat (rotate the Turso platform token shared in an earlier message, do a security review once the app is actually live)
- Action: rewrote `pipeline/VERIFY.md` as the actual handoff document (current true state, the one clear next step, action items, known rough edges); tightened the Checkpoint 4/5 wording in `DECISIONS.md` to the precise confirmed trigger; added `app/STATUS.md`. Same note as before — not a fresh session, a real independent check is still owed, more so now given this is a handoff to a different model entirely

## 2026-09-08 (third check, same day) — full handoff per docs/SESSION_HANDOFF.md (checked by this session, not fully independent — see note)
- Checked: all 7 drift-check items (2 commits since last check: the handoff-procedure docs, and the Vercel deployment) — both accounted for, contracts/ still unchanged, cold-discovery chain intact, backlog integrity intact, spot-checked commit matches its message. Plus, per `SESSION_HANDOFF.md`'s explicit step: re-read the session's own recent conversation for anything decided but not yet in the repo.
- Found: the app was actually deployed to Vercel and live-verified since the last check (now recorded everywhere it needed to be — `ARCHITECTURE.md`, `app/STATUS.md`, `VERIFY.md`, `PENDING_ACTIONS.md`); a security review of `app/` + `s05_publish` was run this session and came back clean, but that result existed only in chat, not the repo — a real gap this step caught.
- Action: recorded the security review result and its "re-review if the app's shape changes" caveat in `docs/PENDING_ACTIONS.md` and `app/STATUS.md`; updated `VERIFY.md`'s stale "single next step" (was still pointing at the now-completed security review) to reflect that there's no single mandated next step anymore — a real backlog choice. This is the first drift check to actually exercise `SESSION_HANDOFF.md`'s new "re-read the conversation, not just git history" step, and it found something the git-log-only checks wouldn't have.

## 2026-09-08 (fourth check, same day) — full handoff after PostHog integration (checked by a fresh Codex session)
- Checked: all 7 drift-check items; pipeline suite; app lint; Vercel production deployment and build; recent commits and contracts/ diff.
- Found: PostHog page-view analytics was completed and deployed but not yet committed; `ARCHITECTURE.md` and `VERIFY.md` still contained contradictory pre-deployment text; `s03_transcribe`'s two Basic Pitch tests fail because its CLI command omits `--save-midi` (10 passed, 2 failed). No contract drift, no hard-rule violations, and no silently implemented backlog items.
- Action: documented the minimal PostHog configuration and deployment, corrected the stale deployment claims, and marked the Basic Pitch regression as the next required pipeline task. The pipeline code was deliberately not changed during this handoff. Basic Pitch also left an untracked 51-byte `:memory:.ses` artifact at the repo root; it is not part of this commit and remains until the user explicitly approves its deletion or ignoring it.
