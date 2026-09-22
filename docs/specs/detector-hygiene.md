# Spec H — Detector hygiene (ignore static public pages)

Tier: Trivial — one config file, no app code, no staging. Goes straight to implementation + `verify` (config-validity only).

## 0. User story

As a maintainer running `detect`, I see only findings on real app code, so its end-of-task runs stay meaningful instead of drowning in docs-page noise.

## 1. Scope

Create `.impeccable/config.json` (absent in main repo — verified; merge the `detector` key if a config appears before execution) with:

```json
{ "detector": { "ignoreFiles": ["app/public/**"] } }
```

Detector semantics verified in the skill's `docs/CLI-CONTRACT.md`: `shouldIgnoreDetectionFile` tests raw, absolute, **and root-relative** paths against `ignoreFiles` — so `app/public/**` matches when `detect` runs from the repo root. `.env`/credentials excluded.

## 2. Non-goals

No token, font, or component changes (spec 0). No app staging — no app file changes. No hiding of real code: the ignore scope is the static `public/` dir only.

## 3. Acceptance criteria

* Before (evidence, quoted beside the claim — baseline from the critique pass: `detect --json app/` exit 2 with ~60 findings, all but the `globals.css:7` `overused-font` warning located in `app/public/archytechy/index.html`).
* After, from the repo root: `detect --json app/` — quote command + exit code + finding count + the full residual list. Required residual state:
  * the `app/public/archytechy` noise is **gone** (proves the ignore matched);
  * the exact remaining finding(s), if any, named individually — criterion is the named residual, not "≤1";
  * ignored files reported separately (the config + this spec are the record);
  * no `app/` source file (tsx/ts/css outside `public/`) newly absent from the scan vs baseline.
* If the noise persists (pattern didn't match — e.g. root resolves elsewhere): fall back to the absolute repo path pattern, record which form worked and why. Do not stack both patterns blindly.
* `npm run verify` unaffected (config is not code) — run it only as a sanity check if touched tooling demands it, not as proof.
* No Playwright, no staging, no human checkbox (nothing renders differently).

## 4. Definition of done

After-scan output quoted + residual named + fallback documented if used + `git diff --stat` shows only `.impeccable/config.json` + checkpoint commit. Order: lands **after spec 0** (so the Arial residual is already gone and the expected residual is empty).

## 5. Stop-conditions

* Residual contains any `app/` source finding not in the baseline → stop, the ignore is over-broad.
* Anything ambiguous → ask.

## 6. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task:

* Checks rows: Required verification (before/after `detect --json app/` outputs, quoted) | E2E `N/A` | Staging/build `N/A` (no app change — say so explicitly) | Diff check (`git diff --stat` shows only `.impeccable/config.json`).
* No Runtime Evidence section (no server used). No Human Review section (nothing renders differently).
* Status: `COMPLETE` when the residual is named and empty as ordered (post-spec-0); `BLOCKED` with Failure Details if noise persists or the residual names an unexpected finding.
