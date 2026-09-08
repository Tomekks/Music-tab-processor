# Pending human actions

Things only a human can actually do — not automatable by an AI session. Checked off as done, new ones added as discovered; never delete a checked-off item, so there's a record of what's been handled. Kept separate from `docs/DRIFT_LOG.md` (records checks performed) and `pipeline/VERIFY.md` (records current technical state) — this file is specifically "what Toms needs to go do."

Format: `- [ ] <what> (<when flagged>, <why/context if not obvious>)`

- [ ] Rotate the Turso platform API token — it was pasted directly into a chat conversation on 2026-09-07. Do via the Turso dashboard (app.turso.tech), not by handing an AI the old token.
- [ ] **Run a security review — now genuinely relevant, not "someday."** The app is live at https://app-six-psi-70.vercel.app as of 2026-09-08. Use the `security-review` skill/workflow.
- [x] Create a Vercel account and connect this GitHub repo (2026-09-08) — done via `vercel login` (device-code flow, user completed auth in browser) + `vercel link`, which also auto-connected the GitHub repo.
