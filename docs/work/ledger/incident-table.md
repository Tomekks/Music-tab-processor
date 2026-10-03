# Incident → rule table (P2 step 8)

Source: `incidents.tsv` (296 lines) classified by muse spark (37 INCIDENT, 259 NOISE), then spot-checked:
22 random NOISE rows reviewed, 1–2 missed (I015, maybe I086) → estimate ~5–9% miss rate in NOISE.
"Covered" = the new design already prevents it. **GAP** = needs a new rule/line (collected at the bottom).

| Lesson (incident ids) | Covered by | Status |
|---|---|---|
| No empirical claim without evidence; verify baselines before ceilings; re-run before claiming blocked (I001, I012, I289) | Evidence rule (list #18) + verify footer | Covered |
| Output counts, not just exit codes; `sh` has no globstar so `**` silently shrinks (I015, I017, I018, I041) | Verify footer prints counts and "not run" | Covered |
| Typecheck return values / types (I118) | `npm run verify` typecheck | Covered |
| Built and tested locally, never committed; uncommitted file broke CI (I002, I003, I279) | Builder commits + shows `git status` (#24); pre-commit; CI | Covered |
| Spec file never committed (I052) | — | **GAP G5** |
| Read live files before writing a spec (I287) | Spec drift check (#25) | Covered |
| 268-line spec for 30 lines of change (I288) | One-sentence test + brief size estimate | Covered |
| Don't split specs that share interfaces (I292) | Tiering guidance: split only at a genuine seam | Covered (keep line) |
| Playwright for UI behavior, not manual staging (I291); run full suite before done (I187) | Playwright spike; but e2e is NOT in `verify` | **GAP G7** (planned) |
| Manual check left generated files mutated (I290) | — | **GAP G3** |
| Tests broke when a real brand was created (I171, I199) | — | **GAP G2** |
| Crash on missing brand file; divide by zero on tempo input (I112, I164) | #16 dropped as prose; nothing replaces it | **GAP G1** |
| Refresh path deleted a running step's files; Stop treated as failure (I252) | Regression test exists; no general rule | **GAP G4** |
| Port already in use, stale server (I260) | Memory note only | **GAP G6** |
| Hardcoded values instead of design tokens (I033) | — | **GAP G8** (lint candidate) |
| Pipeline gotchas: cwd, `.venv` binaries, temp files in `finally` (I013, I217, I272) | — | **GAP G9** (pipeline AGENTS) |
| SvelteKit gotchas: whitespace trim, `value` vs `selected` (I221, I257) | — | **GAP G10** (Control Center AGENTS) |
| Dispatch table dropped a token type; JS key-order sort bug (I043, I060, I062) | Testing budget (one test per edge) | Partly covered |
| Product facts (I004, I006, I091, I196, I218, I273) | Decision records / backlog | Not rules |

## Gaps → new lines to write in P3
- **G1** Validate inputs at boundaries (files, user input); fail with a clear message, never a crash or divide by zero.
- **G2** Tests use their own fixtures; never depend on real user data (e.g. the live brands directory).
- **G3** A manual check that writes to disk includes its own revert step.
- **G4** Refresh/render paths never run destructive operations (reads must not delete).
- **G5** Commit the task file together with the code.
- **G6** Check the port is free before e2e or a dev server (builder script does it).
- **G7** Add `verify:e2e` (browser tests) and a pipeline checker; e2e is currently in neither `verify` nor CI (top-level specs).
- **G8** Design tokens only, no hardcoded colors/sizes in app UI (app/AGENTS.md; lint later).
- **G9** Pipeline AGENTS.md: set cwd explicitly, resolve venv binaries via `sys.executable`, clean temp files in `finally`.
- **G10** Control Center AGENTS.md: the two SvelteKit gotchas.
