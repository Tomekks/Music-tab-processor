# Engineering practices — status toward "standard," not just "started"

Part of `app/status/` — see `app/STATUS.md` for the index. For *why* this exists at all (token-economy reasoning, what was cherry-picked from where), see `docs/decisions/agent-workflow-tooling.md`.

## Done (2026-09-10) — Tier A

- **`app/scripts/verify.sh`** + `npm run verify` — one command: typecheck (`next typegen && tsc --noEmit`) → lint → unit tests → a real production build. Prints `VERIFY: PASS` or stops at the first failure. Confirmed working end-to-end.
- **`npm run typecheck`** — the same typecheck step, standalone (used by the pre-commit hook too).
- **Node version pinned** — root `.nvmrc` (26) + `app/package.json`'s `engines.node` (`>=22`, the actual floor for reliable native TS support). Prevents a real, confirmed failure mode: on Node 20, `node --test` on `.ts` files silently runs zero tests instead of erroring — a false "pass."
- **Pre-commit hook** (`.githooks/pre-commit`) — blocks a commit if the staged diff contains an API-key/token-shaped string, or if `app/`'s typecheck fails. Tested against both a real block (fake secret) and a clean pass. Enabled for this clone via `git config core.hooksPath .githooks` — **per-clone, not committed**, so anyone else working on this repo needs to run that once too (see `docs/DEV_WORKFLOW_GUIDE.md`).

## Done (2026-09-10, later) — from `docs/superpowers/plans/2026-09-10-app-quality-gates.md`

- **ESLint complexity/`max-depth` rules** — added to `eslint.config.mjs`, at `warn` not `error` (see finding below).
- **Dependabot** — `.github/dependabot.yml`, npm, `app/` only, weekly.

## A real finding from turning the complexity gate on

Two functions already exceed it, built after the 2026-09-09 CodeScene baseline this repo's `docs/decisions/stack-and-tooling.md` cites as clean:
- `app/app/page.tsx`'s `HomePage` — complexity 11 (ceiling 9)
- `app/lib/spotify.ts`'s `getTrackMetadata` — complexity 18 (ceiling 9, the worse of the two)

The rule is set to `warn` rather than `error` specifically because of these — refactoring them is real work, not part of "add a lint rule." **Next step, not yet started:** extract the branchy logic in each into smaller named functions, then promote both rules to `error` once they're under the ceiling.

## Done (2026-09-10, later still) — CI is live and green

**`.github/workflows/ci.yml`** — runs `npm run verify:full` on every push touching `app/**` or `.nvmrc`. First real run: `34551557759`, green. Getting there took 4 real fixes, all logged in the plan file (`docs/superpowers/plans/2026-09-10-app-quality-gates.md`) — worth reading once, since the pattern (things built and tested locally, never actually committed) bit twice and is worth watching for elsewhere: `.nvmrc`, `app/scripts/verify.sh`, `app/package.json`'s new scripts, and `.githooks/pre-commit` had all been sitting local-only since earlier in the session, invisible because they worked fine locally regardless of git status.

## Not done yet — what "standard" still needs (ranked)

- **Branch protection** requiring that CI check before merge — also requires deciding to adopt a PR-based workflow instead of direct pushes to `master`; not implemented until that's agreed separately.
- **Component test coverage** — `npm test` only covers `lib/**/*.test.ts` (pure logic). Zero coverage on `FretboardDiagram`, `SheetDiagram`, or any page. Scoped as a Playwright smoke test (one test, home page loads without a console error) rather than a new test framework — see the plan.
- **PR template** — not created. Lowest-priority item; a nudge, not a gate.
- **A fresh CodeScene audit scoped to `app/`** — last run 2026-09-09 against the whole repo, now stale (see finding above). Worth re-running once the two flagged functions are fixed, to confirm nothing else drifted.

## Minor gaps noticed while building the above, not fixed (out of scope for this task, mentioned per `AGENTS.md`'s "don't touch pre-existing dead code" rule)

- `npm test` prints a Node warning: `app/package.json` has no `"type"` field, so `.ts` test files get reparsed as ES modules with a small performance cost. Real, but not part of Tier A.
- `app/package.json`'s `@types/node` is pinned to `^20` while the actual runtime is Node 26 — a type-definitions/runtime version mismatch, not currently causing a visible problem.

## Deliberately not covered here

`pipeline/` (the Python audio pipeline) has no equivalent of any of this — not an oversight. It's scheduled for a rewrite; building verification infrastructure against code that's about to be replaced would be wasted effort. Revisit this file once that rewrite starts.
