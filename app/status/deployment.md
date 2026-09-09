# Deployment

Part of `app/status/` — see `app/STATUS.md` for the index. This is current state and how-to; the *why* behind these choices lives in `docs/decisions/hosting-and-deployment.md`, and full incident histories live in `docs/DRIFT_LOG.md` — not retold here.

**Setup:** Vercel CLI (`npx vercel`), no plugin/dashboard-only setup. `vercel link` auto-connected the GitHub repo. `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` added via `vercel env add <name> production` (production scope only, server-side — never `NEXT_PUBLIC_`), verified with `vercel env ls production` before deploying.

**Auto-deploy on push is off, on purpose.** `app/vercel.json`'s `git.deploymentEnabled: false` stops Vercel from building anything on any `git push`, any branch. Ordinary iteration on `master` never spends a Vercel build.

**To actually deploy a version: `npx vercel deploy --prod --yes` from the repo root — not from inside `app/`.** Running it from inside `app/` fails with "Couldn't find any `pages` or `app` directory" once Vercel's Root Directory project setting is set to `app` (it must stay set that way for GitHub-triggered deploys to work — see incident below). The repo-root deploy needs its own project link (`.vercel/project.json` at the repo root, gitignored, same project ID as `app/.vercel/project.json`) and its own `.vercelignore` at the repo root, since deploying from the repo root does not reliably honor the repo's own `.gitignore` — a first attempt without it tried to upload 1.9GB (`.venv/` and all), caught and killed before it finished, not after.

**Incident (2026-09-08, fixed): Vercel's Root Directory setting must stay `app`.** Left unset, GitHub-triggered production deploys fail at the TypeScript check step with misleading `Cannot find module '@/...'` errors (the bundler step just before it resolves the same imports fine) — three consecutive deployments failed this way before anyone noticed. Fix: Project → Settings → General → Root Directory → `app`. If a GitHub-triggered deploy ever fails with that exact error again, check this setting before assuming a code problem. Full incident: `docs/DRIFT_LOG.md`.

**Separately observed, not a code bug:** a deploy can occasionally fail with `useSearchParams() should be wrapped in a suspense boundary at page "/404"` while prerendering the auto-generated not-found page — nothing in this app's own code uses `useSearchParams`. Read as Turbopack production-build flakiness; a retry has resolved it every time so far. Retry before investigating further.
