# Pending human actions

Things only a human can actually do — not automatable by an AI session. Checked off as done, new ones added as discovered; never delete a checked-off item, so there's a record of what's been handled. Kept separate from `docs/DRIFT_LOG.md` (records checks performed) and `pipeline/VERIFY.md` (records current technical state) — this file is specifically "what Toms needs to go do."

Format: `- [ ] <what> (<when flagged>, <why/context if not obvious>)`

- [ ] Rotate the Turso platform API token — it was pasted directly into a chat conversation on 2026-09-07. Do via the Turso dashboard (app.turso.tech), not by handing an AI the old token.
- [x] Run a security review of `app/` + `pipeline/s05_publish/publish.py` (2026-09-08) — done via the `security-review` skill, adapted from its usual "review a PR diff" framing since nothing was pending, to "audit the current live app's actual attack surface." **No findings** — parameterized queries throughout (Drizzle's `eq()`, `publish.py`'s `?` placeholders), secrets never reach client code, no `dangerouslySetInnerHTML`/`eval`, no hidden write/admin routes, standard 404 on missing songs. Full report in that day's conversation.
- [ ] **Re-run the security review once the app's shape changes** — today's clean result is specific to a fully read-only, no-auth, no-forms app. The moment a write path reachable from outside gets added (a public local-processing UI, user accounts, any form, file uploads), that's new attack surface and needs its own fresh review, not an assumption that "it was clean before."
- [x] Create a Vercel account and connect this GitHub repo (2026-09-08) — done via `vercel login` (device-code flow, user completed auth in browser) + `vercel link`, which also auto-connected the GitHub repo.
