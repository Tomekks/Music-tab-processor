# Task: design system workbench, server scaffold and request guard (slice 1, task 1b)

Status: active
Branch: feat/ds-workbench-scaffold
Next: owner approves "What changes for you"; then Level 2 review by Claude; then `bash scripts/delegate.sh docs/work/feat-ds-workbench-scaffold.md`.
Written against: 2ddf146

## What changes for you
A new, empty app exists in `tools/Design_System/`. Run `npm --prefix tools/Design_System run dev` and open http://127.0.0.1:5174: you see one plain placeholder page. It only answers requests addressed to `localhost:5174` or `127.0.0.1:5174`, and refuses a write (POST etc.) that did not come from its own page. Nothing in the web app or Control Center changes. The three-column shell is the next task.

## Scope
**Modify only:** (every path is a new file)
- `tools/Design_System/vite.config.ts`
- `tools/Design_System/tsconfig.json`
- `tools/Design_System/src/app.html`
- `tools/Design_System/src/hooks.server.ts`
- `tools/Design_System/src/lib/server/config.ts`
- `tools/Design_System/src/lib/server/origin.ts`
- `tools/Design_System/src/lib/server/origin.test.ts`
- `tools/Design_System/src/routes/+page.svelte`

**Do NOT touch:**
- `contracts/`, config, secrets, anything not listed above
- `tools/Design_System/package.json`, `package-lock.json`, `.gitignore` (already committed; dependencies are installed, do not run `npm install`)
- `tools/Control_Centre/` (copy from it, never edit it), `app/`

## Size
Files touched: 8, all new. Expected diff: about 110 lines. New tests: 6.

## Risk
Triggers (deletes, `contracts/`, shell or network, schema, deploy, secrets): none for the builder (dependencies were installed in the prep commit). Security-relevant: the request guard decides who can reach a local server that will later write files. Review level: 2 (Claude).

## Steps
- [ ] Read the sibling files to copy: `tools/Control_Centre/vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/hooks.server.ts`, `src/lib/server/origin.ts`, `src/lib/server/origin.test.ts`, `src/lib/server/config.ts` (only the `ALLOWED_HOSTS` line).
- [ ] Write `origin.test.ts` first with the 6 cases below; run it and see it fail (the module does not exist yet).
- [ ] Write `origin.ts` (copy of the sibling), then the other files; run the tests until they pass.
- [ ] Break each rule once (edit it, see the matching test fail, restore it).
- [ ] Run `bash scripts/verify-task.sh`, fill `## Report`, run `bash scripts/finish.sh`.

**Files.**
1. `origin.ts`: the same `isRequestAllowed(method, host, origin, allowedHosts)` as Control Centre, copied exactly.
2. `config.ts`: `export const ALLOWED_HOSTS: readonly string[] = ["localhost:5174", "127.0.0.1:5174"];` and nothing else.
3. `hooks.server.ts`: only the `handle` function from the sibling (no `init`, no manifest, no chain code): answer 403 "Forbidden" when `isRequestAllowed` is false, otherwise `resolve(event)`.
4. `vite.config.ts`: like the sibling but `server` and `preview` use `host: '127.0.0.1', port: 5174, strictPort: true` (no `watch.ignored`), the same `sveltekit({ compilerOptions: { runes ... }, csrf: { trustedOrigins: ALLOWED_HOSTS.map((h) => `http://${h}`) }, adapter: adapter() })`, imports `ALLOWED_HOSTS` from `./src/lib/server/config.ts`.
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

## Questions
(none open)

## Report
<Filled by the builder when done, see docs/rules/executor.md.>
