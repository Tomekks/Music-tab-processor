# Task: design system workbench, server scaffold and request guard (slice 1, task 1b)

Status: active
Branch: feat/ds-workbench-scaffold
Next: owner approves the "What changes for you" block; then from THIS folder (the worktree `../guitar_tab_processor-feat-ds-workbench-scaffold`, branch `feat/ds-workbench-scaffold`; `/start` in the main folder cannot see this task) run `bash scripts/delegate.sh docs/work/feat-ds-workbench-scaffold.md`, the first real test of the measurement hooks (check the `row:` line shows tokens, cost and seconds). Then Claude spot-checks the diff (Level 2 review of the brief is already done), owner runs the checklist. Local-only: this branch (not pushed), master is 43 commits ahead of origin (not pushed), untracked `.claude/skills/` and `app/packages/design-system/brands/{byebye,heyhey}` (not part of this task). Measured so far for the whole plan: 8 marks, 12359 s from plan start (`bash scripts/measure.sh report design-system-workbench`); plan usage 34% (5 h) / 33% (weekly) at 2026-10-03 evening.
Written against: 5ae2909

## What changes for you
A new, empty app exists in `tools/Design_System/`. Run `npm --prefix tools/Design_System run dev` and open http://127.0.0.1:5174: you see one plain placeholder page. It only answers requests addressed to `localhost:5174` or `127.0.0.1:5174`, and refuses a write (POST etc.) that did not come from its own page. Nothing in the web app or Control Center changes. The three-column shell is the next task.

## Scope
**Modify only:** (every path is a new file)
- `tools/Design_System/tsconfig.json`
- `tools/Design_System/src/app.html`
- `tools/Design_System/src/hooks.server.ts`
- `tools/Design_System/src/lib/server/config.ts`
- `tools/Design_System/src/lib/server/origin.ts`
- `tools/Design_System/src/lib/server/origin.test.ts`
- `tools/Design_System/src/routes/+page.svelte`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above
- `tools/Design_System/vite.config.ts` (already committed by Claude: the builder cannot edit `*.config.*`; read it, do not change it), `tools/Design_System/package.json`, `package-lock.json`, `.gitignore` (already committed; dependencies are installed, do not run `npm install`)
- `tools/Control_Centre/` (copy from it, never edit it), `app/`

## Size
Files touched: 7, all new (plus `vite.config.ts` already committed). Expected diff: about 90 lines. New tests: 6.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none for the builder (dependencies were installed in the prep commit). Security-relevant: the request guard decides who can reach a local server that will later write files. Review level: 2 (Claude).

## Steps
- [ ] Read the sibling files to copy: `tsconfig.json`, `src/app.html`, `src/hooks.server.ts`, `src/lib/server/origin.ts`, `src/lib/server/origin.test.ts`, `src/lib/server/config.ts` (only the `ALLOWED_HOSTS` line).
- [ ] Write `origin.test.ts` first with the 6 cases below; run it and see it fail (the module does not exist yet).
- [ ] Write `origin.ts` (copy of the sibling), then the other files; run the tests until they pass.
- [ ] Break each rule once (edit it, see the matching test fail, restore it).
- [ ] Run `bash scripts/verify-task.sh`, fill `## Report`, run `bash scripts/finish.sh`.

**Files.**
1. `origin.ts`: the same `isRequestAllowed(method, host, origin, allowedHosts)` as Control Centre, copied exactly.
2. `config.ts`: `export const ALLOWED_HOSTS: readonly string[] = ["localhost:5174", "127.0.0.1:5174"];` and nothing else.
3. `hooks.server.ts`: only the `handle` function from the sibling (no `init`, no manifest, no chain code): answer 403 "Forbidden" when `isRequestAllowed` is false, otherwise `resolve(event)`.
4. `vite.config.ts`: already written and committed by Claude; it imports `ALLOWED_HOSTS` from `./src/lib/server/config.ts`, so that file must export it exactly as in item 2. Do not edit it.
5. `tsconfig.json` and `src/app.html`: `tsconfig.json` is a copy of the sibling's; `app.html` is the sibling's without the theme script and without `data-sveltekit-preload-data` (keep `%sveltekit.head%` and `%sveltekit.body%`).
6. `+page.svelte`: one `<h1>Design System workbench</h1>` and a short line saying the shell comes in the next task. Nothing else.

**The 6 tests** (`node:test`, `node:assert/strict`, relative imports ending in `.ts`, as in the sibling's test):
1. GET with an allowed host is allowed
2. a host that is not in the list is refused (for example `evil.example`), also for GET
3. a missing host header is refused
4. POST with no origin is refused
5. POST with origin `null` is refused
6. POST whose origin equals `http://<host>` is allowed, and POST from another origin (for example `http://evil.example`) is refused

No file or network access in the code, no new dependency, no other routes.

## Acceptance checks
(The builder can only run `bash scripts/verify-task.sh` and read-only git. Put anything else in the owner checklist.)
- Run: `bash scripts/verify-task.sh` / Expected: output contains `--- design system workbench` and ends with `verify-task: PASS`.
- Run: `npm --prefix tools/Design_System run test` / Expected: 6 tests pass, 0 fail.
- Each rule names the test that fails if it is broken: guard rules 1 to 6 in `origin.test.ts` (cases 1 to 6). The port, host binding and 403 response have no unit test; the owner checklist covers them.

## Owner checklist
- [ ] `npm --prefix tools/Design_System run dev`, open http://127.0.0.1:5174 → the placeholder page with the heading.
- [ ] In a second terminal: `curl -s -o /dev/null -w "%{http_code}" -H "Host: evil.example" http://127.0.0.1:5174/` → `403`.
- [ ] `lsof -nP -iTCP:5174 -sTCP:LISTEN` → shows `127.0.0.1:5174`, not `*:5174`.
- [ ] Stop the dev server (Ctrl+C) → port 5174 is free again (`lsof -i :5174` prints nothing).

## Decisions (chat, 2026-10-03)
- First builder run (2026-10-04) stopped after 7 of 8 files: its permission layer denies `*.config.*`, so `vite.config.ts` was removed from its list and committed by Claude (`5ae2909`). The first run's output is kept in `git stash list`. Process gap: the brief checker does not warn about paths the builder cannot edit (logged in the plan).
- Task 1b is split: 1b (this one: server scaffold and request guard, 8 files) and 1b2 (the three-column shell, `AGENTS.md`, registry); plan table updated on master.
- Dependencies were installed by Claude in the prep commit `2ddf146` because the builder has no `npm install`; same versions as Control Center.
- `scripts/new-worktree.sh` now also installs `tools/Design_System` (commit `001f03a` on master; not on the owner's original list of five files, reversible).
- Level 2 review was done by Claude, who also wrote the brief, so it is not independent. The "eight questions" of a Level 2 review are not written anywhere in the current rules (only a count in the old `PROCESS.html`).
- Port 5174, `127.0.0.1` only, guard copied from Control Center; the workbench imports nothing from it.

## Questions
(none open)

## Report
<Filled by the builder when done, see docs/rules/executor.md.>
