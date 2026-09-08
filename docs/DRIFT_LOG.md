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
