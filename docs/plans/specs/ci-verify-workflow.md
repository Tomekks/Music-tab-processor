# Spec: CI workflow reporting the `verify` status check

**Tier:** Bounded (per `docs/WEB_APP_WORKFLOW.md`).

## Scope

- New: `.github/workflows/ci.yml`
- No other files. Explicitly excludes `.env`/credential files.

## Non-goals

- No `visual` or `pipeline` CI jobs (HARDENING_PLAN's original Phase 2.2 proposed three jobs —
  this spec only builds the `app` verification job needed to satisfy the `master` ruleset's
  required `verify` check). Visual regression CI is still deferred, per
  `docs/WEB_APP_WORKFLOW.md` §6.
- No change to the `master` ruleset itself (re-enabling "Require status checks to pass" is a
  manual step the user does once this workflow is confirmed working — not part of this task).
- No Playwright/e2e run in CI (`npm run test:e2e` needs browsers installed; out of scope here).
- No changes to `pipeline/` — this only covers `app/`.

## Interface

`.github/workflows/ci.yml`:
- Triggers: `pull_request` targeting `master`, and `push` to `master`.
- One job, **named exactly `verify`** (the job's `name:` or, if omitted, its id — whichever
  produces a GitHub check run literally titled `verify`, matching the ruleset's required check
  name). Do not add a second job or matrix that would change the reported check name.
- Steps: checkout → `actions/setup-node` pinned to Node 22 (matching `app/package.json`'s
  `engines.node: ">=22"`) with npm caching → `cd app && npm ci` → `cd app && npm run verify:full`
  (the `--full` variant, which includes the production build — per `scripts/verify.sh`'s own
  comment, CI has no human to run `npm run stage`, so the build check has to happen here).

## Bad-case behavior

| Case | Behavior |
|---|---|
| No `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` in CI | Must not fail the build. `app/db/client.ts` constructs its client at module load with these values, but the route is `force-dynamic` (no static prerendering), so this should not execute during `next build`. **Verify this by actually running `npm run verify:full` locally with those two env vars unset** before writing the workflow file as final. If it does fail, add dummy placeholder values (e.g. `TURSO_DATABASE_URL: "libsql://ci-placeholder"`, `TURSO_AUTH_TOKEN: "ci-placeholder"`) as job-level `env:` — never real credentials, and say plainly in a code comment that they're inert placeholders never used to make a real connection. |
| PR from a fork | Not a concern yet — this is a solo repo, no fork-based contributions expected. If it ever happens, secrets scoping would need revisiting; not handled by this spec. |
| Workflow file itself has a syntax error | GitHub Actions surfaces this as a failed run in the Actions tab; no special handling needed beyond that. |

## Forbidden patterns

- No real `TURSO_AUTH_TOKEN`/`TURSO_DATABASE_URL`/`SPOTIFY_CLIENT_SECRET` values anywhere in the
  workflow file, not even in a comment.
- No `--no-verify` or skipped steps to force a green check.
- No second job/check name that could be confused with or accidentally satisfy the ruleset's
  required `verify` check without actually running the real command.

## File allowlist

`.github/workflows/ci.yml` only.

## Acceptance criteria

1. Locally, first confirm: `cd app && env -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN npm run verify:full` — does it pass or fail? Report this back before finalizing the workflow file (this determines whether placeholder env vars are needed, per the bad-case table above).
2. Push the new workflow file on a branch, open a throwaway PR (or use the existing pending PRs) against `master`, and confirm a check literally named `verify` appears and goes green in the PR's checks list.
3. `npm run verify` (the plain, non-CI command) still passes locally — this task doesn't touch anything `verify` itself depends on.

## Definition of done

- The local env-var check (acceptance #1) has been run and its answer is reflected in the final workflow file.
- A real PR shows a green `verify` check produced by this workflow.
- `git diff --stat` matches the file allowlist (one new file).
- Checkpoint commit made (ask-first, per `docs/WEB_APP_WORKFLOW.md` §4).

## Stop-conditions

- If `next build` fails locally without Turso env vars for any reason other than the expected
  missing-credentials case (e.g. an unrelated build error), **stop and ask** — don't paper over
  it with placeholder env vars if the real cause is something else.
- If the reported check name doesn't exactly match `verify` (e.g. GitHub prefixes it with the
  workflow name), **stop and ask** rather than guessing at YAML restructuring — the exact string
  match is what the ruleset needs.
