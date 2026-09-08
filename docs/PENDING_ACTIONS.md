# Pending human actions

Things only a human can actually do — not automatable by an AI session. Checked off as done, new ones added as discovered; never delete a checked-off item, so there's a record of what's been handled. Kept separate from `docs/DRIFT_LOG.md` (records checks performed) and `pipeline/VERIFY.md` (records current technical state) — this file is specifically "what Toms needs to go do."

Format: `- [ ] <what> (<when flagged>, <why/context if not obvious>)`

- [ ] Rotate the Turso platform API token — it was pasted directly into a chat conversation on 2026-09-07. Do via the Turso dashboard (app.turso.tech), not by handing an AI the old token.
- [ ] Run a security review once `app/` is actually live on a public Vercel URL (flagged 2026-09-08) — not before, there's nothing public to review yet. Use the `security-review` skill/workflow at that point.
- [ ] Create a Vercel account and connect this GitHub repo (flagged 2026-09-08), when ready to deploy `app/`.
