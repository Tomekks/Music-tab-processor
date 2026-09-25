# Database

Part of `app/status/` — see `app/STATUS.md` for the index. The *why* behind Turso/Drizzle lives in `docs/decisions/hosting-and-deployment.md`, not here.

**Database access:** `db/schema.ts` (the one table: `songs`) and `db/client.ts` (the Drizzle+libSQL client). Schema changes: edit `db/schema.ts`, then `node --env-file=.env.local node_modules/.bin/drizzle-kit push` (plain `npx drizzle-kit push` won't see the env vars — `drizzle-kit` doesn't auto-load `.env.local` the way Next.js itself does).

**Known, accepted issue:** `npm audit` reports 4 moderate vulnerabilities, all from `esbuild` via `drizzle-kit`'s dependency chain (a dev-server CORS issue). This only affects local schema-migration tooling, never the deployed app. Decided to leave as-is rather than accept `npm audit fix --force`'s breaking `drizzle-kit` downgrade — don't "fix" this reflexively if it resurfaces.

**Analytics:** PostHog was removed (2026-09-25) — the project's being reused elsewhere. No analytics/exception-tracking integration in this app currently.
