# App Quality Gates (CI-readiness fixes + Tier B + Tier C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `app/` verification real and automatic — a working CI pipeline, a mechanical complexity gate, dependency-update automation, and one real component smoke test — without touching `pipeline/` (scheduled for a rewrite) or introducing more dependencies than the goal requires.

**Architecture:** Config- and workflow-file changes on top of the existing `npm run verify` (typecheck → lint → test, no build) and `npm run verify:full` (adds the build, for CI) built in the prior session. No app runtime code changes. Two tasks (CI, branch protection) have a human-only prerequisite that blocks them going fully green — the plan says exactly where.

**Tech Stack:** GitHub Actions, ESLint (`eslint.config.mjs`), Dependabot, Playwright (new dependency, justified in Task 5).

**Spec:** `app/status/engineering-practices.md` (the "Not done yet" list this plan implements) and this session's conversation (the Turso build-blocker finding, the Tier B/C scoping).

## Global Constraints

- Scope is `app/` only — `pipeline/` gets no equivalent yet (see `docs/decisions/agent-workflow-tooling.md`).
- No task adds a dependency without checking Ponytail's ladder first (already in codebase → stdlib → native → existing dependency → one line → only then, new code/dependency).
- Every task that changes a shared/external setting (repo secrets, branch protection) states who does it and blocks on that, rather than assuming.
- `AGENTS.md`'s ask-before-commit rule still applies — this plan's "Commit" steps are what to run once you've said yes, not permission to commit unasked.

---

### Task 1: ESLint complexity ceiling

**Files:**
- Modify: `app/eslint.config.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `npm run lint` now flags complexity past 9 or nesting depth past 4 — the exact thresholds `docs/decisions/stack-and-tooling.md` already validated against this repo via CodeScene.

**Executed 2026-09-10, with one deviation from the plan below:** Step 2 found the assumption in this task's own "Produces" line wrong — `HomePage` and `getTrackMetadata` were both built after the cited 2026-09-09 baseline and already exceed it (11 and 18 vs. ceiling 9). Rules shipped as `"warn"`, not `"error"`, so this doesn't block `lint`/`verify`/CI; the two real findings are tracked as their own follow-up in `app/status/engineering-practices.md`, not silently fixed as part of "add a lint rule." Step 3 (prove it fires) was skipped — the two real findings are stronger proof than a synthetic one.

- [x] **Step 1: Add the rules**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      complexity: ["error", 9],
      "max-depth": ["error", 4],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

- [x] **Step 2: Run lint to confirm the current codebase still passes**

Run: `cd app && npm run lint`
Actual: 2 warnings (not the expected zero) — see the deviation note above.

- [x] ~~**Step 3: Prove the gate actually fires**~~ — skipped, real findings above are sufficient proof.

- [ ] **Step 4: Commit**

```bash
git add app/eslint.config.mjs
git commit -m "app: add ESLint complexity/max-depth gate (CodeScene thresholds)"
```

---

### Task 2: Dependabot (security updates only)

**Files:**
- Create: `.github/dependabot.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: automated PRs for vulnerable `app/` npm dependencies. No effect on `pipeline/` (not configured).

- [x] **Step 1: Write the config** — as written below, no changes.

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/app"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    allow:
      - dependency-type: "all"
    # Security-only in spirit: weekly cadence + capped PR count keeps this
    # from becoming version-bump noise; Dependabot doesn't have a strict
    # "security-only" toggle for npm, so this is the closest equivalent
    # without a paid GHAS security-updates feature.
```

- [x] **Step 2: Verify the YAML is valid** — used `.venv/bin/python3` (already had PyYAML) rather than installing a new dependency for one check, per the decision ladder. Confirmed: `valid YAML`.

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "app: add Dependabot for npm dependency updates"
```

---

### Task 3: CI workflow for `app/`

**Blocking human prerequisite — do this before Step 3 of this task will actually go green:**
Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as GitHub Actions repository secrets (Settings → Secrets and variables → Actions), using the same values already in `app/.env.local`. Confirmed necessary: `app/db/client.ts` connects at module load, so the build hard-fails on any checkout without them — proven empirically this session.

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `app/scripts/verify.sh` (built prior session), the two secrets above.
- Produces: a GitHub check named `verify` on every push touching `app/**` — this is the exact check Task 4 (branch protection) will require.

- [ ] **Step 1: Write the workflow**

```yaml
name: app

on:
  push:
    paths:
      - "app/**"
      - ".github/workflows/ci.yml"

jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app
    env:
      TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
      TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
      - run: npm ci
      - run: npm run verify:full
```

- [ ] **Step 2: Confirm the secrets exist before pushing**

Run (requires `gh` CLI authenticated as you, not me): `gh secret list` — confirm `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are both listed. If not, stop and add them first (human step above) — pushing without them produces a guaranteed, misleading red run.

- [ ] **Step 3: Commit and push, then check the run**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add app verify workflow"
git push
```
Then: `gh run watch` (or check the Actions tab) — expect a green `verify` check within a few minutes. If it fails, read the log before assuming the workflow file is wrong — the two likeliest causes are a missing secret or an environment difference from your Mac (e.g. a case-sensitive import path that macOS's filesystem hides).

---

### Task 4: Branch protection requiring the `verify` check

**Blocking decision — confirm with the user before this task, not after:** this requires switching `app/` work to a PR-based flow (branch → PR → merge once `verify` passes) instead of direct pushes to `master`. Branch protection's required-status-checks mechanism is PR-shaped; it does not gate a direct push on its own. Do not implement this task until that workflow change is explicitly agreed, separately from "yes, add branch protection."

**Files:** none (GitHub repo setting, not a file) — needs `gh` authenticated as the repo owner, or the GitHub web UI. Not something I can verify blind; the commands below are what you'd run, in your own terminal.

- [ ] **Step 1 (human): Confirm Task 3 has at least one green run**

`gh run list --workflow=ci.yml --limit 1` — status must be `success`.

- [ ] **Step 2 (human): Add the protection rule**

```bash
gh api repos/Tomekks/Music-tab-processor/branches/master/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks.strict=true \
  -f 'required_status_checks.contexts[]=verify' \
  -f enforce_admins=true \
  -f required_pull_request_reviews=null \
  -f restrictions=null
```

- [ ] **Step 3: Confirm it's live**

`gh api repos/Tomekks/Music-tab-processor/branches/master/protection` — should echo back the rule just set.

---

### Task 5: One real Playwright smoke test

**Files:**
- Modify: `app/package.json` (add `playwright` devDependency + a `test:e2e` script)
- Create: `app/playwright.config.ts`
- Create: `app/e2e/home.spec.ts`

**Interfaces:**
- Consumes: the running app (starts it itself via Playwright's `webServer` config, using `npm run build && npm run start` — reuses existing scripts, adds no new server-start logic).
- Produces: `npm run test:e2e` — a separate script from `npm test`, not yet wired into `verify.sh` (deliberately: this first test proves the harness works; folding it into the mandatory gate is a follow-up once there's more than one test, not this task).

- [ ] **Step 1: Install Playwright**

```bash
cd app && npm install -D @playwright/test && npx playwright install --with-deps chromium
```

- [ ] **Step 2: Write the config**

```ts
// app/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

- [ ] **Step 3: Write the failing test first**

```ts
// app/e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("home page loads and shows the song list without a console error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
});
```

- [ ] **Step 4: Add the script and run it**

```json
"test:e2e": "playwright test"
```
Run: `npm run test:e2e`
Expected: 1 passed. If it fails on a real console error, that's a real finding — investigate before treating this task as done, don't loosen the assertion to make it pass.

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/package-lock.json app/playwright.config.ts app/e2e/home.spec.ts
git commit -m "app: add Playwright + one home-page smoke test"
```

- [ ] **Step 6: Update the tracker**

Modify `app/status/engineering-practices.md`: move "component test coverage" from "Not done yet" to "Done," and add a line noting the smoke test exists but isn't yet in `verify.sh`, and that full visual-regression baselines (Docker-recorded, per the earlier `HARDENING_PLAN.md` note) are still a separate, un-started task.

---

## Self-Review

**Spec coverage:** ESLint gate (Task 1), Dependabot (Task 2), CI (Task 3), branch protection (Task 4), component test coverage (Task 5) — all five items from `app/status/engineering-practices.md`'s "Not done yet" list except "a fresh CodeScene audit" and "PR template," both explicitly deferred as lowest-priority per the prior session's ranking, not silently dropped.

**Placeholder scan:** every step has real, runnable content — no "add appropriate error handling"-shaped gaps.

**Type/name consistency:** `verify.sh` (Task 3) and `test:e2e` (Task 5) are named distinctly and never conflated; Task 5 explicitly does not fold into Task 3's gate, stated once, not contradicted later.
