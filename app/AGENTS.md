<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# App rules

- **Design tokens only.** No hardcoded colors, sizes or spacing in app UI; use the design-system tokens.
- **Verify:** `npm run verify` in `app/` (typecheck, lint, unit tests, design-system tests). Read the footer.
- **Stage before asking to ship:** `npm run stage` (real build served on :3001), then ask the push/deploy
  question from the root `AGENTS.md`. Deploy only from the repo root, never from `app/`.
- A new write path reachable from outside (forms, auth) needs a fresh security review; so does any change
  to the app's read-only shape (today's clean result is specific to a read-only, no-auth app).
- Stack versions and generated files: don't trust stale version notes; check `package.json` and lockfile.
- Four npm-audit findings from `esbuild` via `drizzle-kit` are dev-tool-only; leave them, don't downgrade.

<!-- covers: R022 R027 R032 R033 R073 R096 R242 -->
