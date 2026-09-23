# Task spec: Design system — token write/reset API route

Implements Task 5 of `docs/superpowers/plans/2026-09-19-design-system.md` (design spec §5.2,
"Editing model" and "Reachability," the API-route half). Read both first. Depends on Tasks 1–4,
all implemented and checkpointed on `task/design-system-brand-data` (commit `602d268`).
Work from that branch.

This is the first task where writing to this package produces a **live side effect on disk**
outside of a build step — a request to this route mutates `tokens.json` and regenerates
`app/app/design-tokens.generated.css` while the dev server is running.

**Revision note:** this draft was reviewed before implementation began. The review confirmed the
route-shape decisions (§0) and found real gaps — a type-confusion hole with no `typeof` guards, a
dead `number` validation row, an unhandled-throw path that would break the promised error shape,
and a request the review made explicit that this spec settles: how Task 6's editor is actually
supposed to dispatch on `percentage`-typed tokens, since the original draft only wired
`dimension`/`number` to `Slider`. Decisions below are now binding.

| Question | Decision |
|---|---|
| Add `typeof` guards for `action`/`path`/`value` before any other validation? | **Yes** — three checks, first, before path lookup or format validation (§3). |
| Keep a `number` `$type` validation row with zero current consumers? | **No** — removed. A future `number` token gets its own rule with its own review, not a speculative one written now (§3). |
| What happens if `tokens.json` is hand-corrupted (invalid JSON) when the route reads it? | Wrap the handler so **every** throw after the production guard returns `500 { ok: false, error }`, not an unhandled exception (§4). |
| How does Task 6 dispatch on the six `percentage` tokens Task 4 added specifically to be editable? | **`percentage` → `Slider`**, `0`–`100` range, `%`-suffixed string serialization; `fontFamily` stays read-only, consistent with this route rejecting `fontFamily` writes. Documented here as the consumer contract (§2.1) since Task 6's spec doesn't exist yet. |
| Manual `curl` checks only, or automated tests against the write path? | **Automated tests too** — pure validation/dispatch logic extracted into its own module with tempfile round-trip tests (§3a); manual `curl` stays as the live, real-server check. |
| Plain `writeFileSync`, or atomic writes? | **Atomic** — write to a temp file in the same directory, then rename (§4). |
| Any range check on `percentage` values beyond the `%`-suffix format? | **Yes — reject outside `0`–`100`** (§3). No current consumer wants outside that range, and `color-mix()` handles out-of-range percentages inconsistently across engines. |

## 0. Two things decided here that the plan left open

**(a) One route, one POST handler, actions dispatched by a body field — not four HTTP
methods/sub-routes.** The plan lists four operations (write, reset, reset-all, set-as-default)
but doesn't fix how they map onto the route. They don't divide cleanly onto REST verbs (`write`
and `reset` are both "set a path to a value," just from a different source; `reset-all` has no
path at all) — inventing a verb mapping (`PUT` for write, `DELETE` for reset?) would be forcing a
resource model onto four RPC-shaped actions. One `POST` handler, `{ action: "..." }` discriminates
(§2). `GET`/other methods on this route are unhandled — Next's default `405 Method Not Allowed`
is correct there and needs no code.

**(b) `build-tokens.mjs` gains one small exported function; nothing else about Tasks 1–4 changes.**
Read `packages/design-system/src/build-tokens.mjs`'s current CLI entrypoint (bottom of the file,
lines 152–156): the disk-write (`writeFileSync(outPath, generateCSS(resolveBrandDir()))`) only
happens inside the `if (process.argv[1] === ...)` main-module guard, so there is currently no way
to trigger "resolve the active brand, generate CSS, write it to disk" from another module without
either duplicating that guard's three lines or shelling out to the CLI (slow, and wrong here —
this needs to run in-process, in the same request, before responding). Fix: extract those three
lines into an exported `buildActiveBrand()` function; the CLI guard becomes a two-line caller of
it. Verified against the real file: `outPath` is computed relative to `HERE` (the module's own
directory), so it resolves identically whether called from the CLI or imported — no
`process.argv`/`process.cwd()` dependency to break by calling it from elsewhere. This is a pure
refactor (confirm by running `npm run tokens:build` before and after and diffing the generated CSS
byte-for-byte — §10).

## 1. Scope

- `app/packages/design-system/src/build-tokens.mjs`: extract `buildActiveBrand()` (§0(b)) as a
  new named export. No other change to this file.
- Create `app/packages/design-system/src/token-writes.mjs`: pure functions implementing the four
  actions' validation and tree-mutation logic, with no filesystem access (§3a). This is what makes
  the logic unit-testable without a running Next server or real disk writes.
- Create `app/packages/design-system/src/token-writes.test.mjs`: tests against `token-writes.mjs`
  using in-memory fixture trees and tempfile round-trips (§3a).
- Create `app/app/api/design-system/tokens/route.ts`: `export const dynamic = "force-dynamic"`.
  Single `POST` handler, `{ action }`-dispatched (§2). Checks `process.env.NODE_ENV ===
  "production"` **before parsing the request body or touching the filesystem** and returns a bare
  404 `Response` if so (design spec §5.2 "Reachability"). Thin: reads the two JSON files, delegates
  to `token-writes.mjs` for validation/mutation, writes results back atomically (§4), calls
  `buildActiveBrand()` when required, maps results to HTTP responses.
- No `.env`/credential contact. No changes to `tokens.json`/`tokens.default.json`'s *committed*
  content — the route reads/writes them at runtime during manual testing, but that state must be
  restored before this task is done (§8).

## 2. Interface — exact request/response shapes

All four actions are `POST /api/design-system/tokens` with a JSON body. `path` is a dot-joined
string identical to how `tokens-validation.test.mjs` already represents paths (e.g.
`"semantic.color.accent"`, `"component.button.primaryBackground"`) — not a `{...}`-wrapped
reference string, and not an array.

```ts
type WriteBody = { action: "write"; path: string; value: string };
type ResetBody = { action: "reset"; path: string };
type ResetAllBody = { action: "reset-all" };
type SetAsDefaultBody = { action: "set-as-default"; path: string };
```

`value` in `WriteBody` is **always a string on the wire**, regardless of the target token's
`$type` — a `Slider` posts `"12px"` or `"8%"` (the full canonical form, unit/suffix included), not
a bare JSON number, so the server-side format check (§3) is the single source of truth for what's
valid, never JS's type coercion. **Extra/unrecognized fields in the body are ignored, not
rejected** — e.g. a stray `path` field alongside `{action: "reset-all"}` doesn't `400`; only
missing *required* fields for the given action do. Task 6's caller is responsible for sending the
canonical string form; this route validates, it never coerces or reformats a value on the way in.

**Type guards, before any other validation, on every action:** `action` must be a `string` and one
of the four known values; any `path`/`value` field the action requires must be present and a
`string`. Fail any of these with `400` before doing path lookup or format validation — this closes
the type-confusion hole a non-string `value` (e.g. a bare JSON number, which a naive `regex.test()`
would silently coerce and pass) or a non-string `path` (which would otherwise crash `.split(".")`
into an unhandled `500`) would otherwise open.

**Response, every action, on success:** `200 { "ok": true }`. No echo of the new value or the
generated CSS — Task 6 doesn't need one (design spec §5.2: it calls `router.refresh()`, which
re-reads `tokens.json` fresh via the server-rendered page, not via this response body).

**Response, any failure:** `{ "ok": false, "error": string }`, with status:
- `404` — `NODE_ENV === "production"` (empty body, not the JSON shape above — this fires before
  the handler would even know what action was requested).
- `400` — malformed JSON body; a type-guard failure (above); an unknown `action` (`error` lists
  the four valid values, e.g. `"action must be one of: write, reset, reset-all,
  set-as-default"` — this is a dev-only tool used directly by whoever is debugging it, a specific
  error earns its keep); an unknown `path`; a `path` that resolves to a non-leaf (e.g.
  `"semantic.color"` — a section, not a token); a `write` targeting a `fontFamily`-typed leaf
  (§3); or a `value` that fails its leaf's `$type` format/range check (§3), with a message naming
  the expected format (e.g. `expected a hex color like #rrggbb, got "blue"`).
- `500` — anything else that throws after the production guard: a corrupted `tokens.json` failing
  `JSON.parse`, an unexpected filesystem error, or any other unhandled exception. **The whole
  handler body (after the 404 guard, before responding) is wrapped in one `try`/`catch`** so a
  corrupt token file or a permissions error still returns this JSON shape rather than Next's
  default HTML 500 page — the contract above ("any failure" gets this shape) has to hold even for
  failures the happy-path code never anticipated, not just the ones §3 explicitly validates for.

### 2.1 Consumer contract for Task 6 (documented here since Task 6's spec doesn't exist yet)

Task 6's plan (`docs/superpowers/plans/2026-09-19-design-system.md`) says the editor dispatches on
`$type`: `color` → `ColorField`, `dimension`/`number` → `Slider`, anything else → read-only text.
As written, that dispatch table **silently drops all six `percentage` tokens** (Task 4's
`hoverOpacity`/`focusOpacity`/`pressedOpacity`/`disabledOpacity`/`mutedTextOpacity`/
`mutedTextHoverOpacity`) into the read-only fallback — which is exactly backwards, since
converting them from `number` to `percentage` in Task 4 was specifically so they could become
editable and drive live CSS formulas. Binding correction for whoever writes Task 6's spec:

- `percentage` → `Slider`, `min={0} max={100} step={1}` (or finer, implementer's call), value
  displayed and sent as a `%`-suffixed string (`"8%"`, not `8` or `0.08`) — matching exactly what
  this route's `write` validator accepts (§3).
- `fontFamily` → read-only text display, same as the original draft. This route already refuses
  to write one (§3); the editor not offering a field for it is consistent, not a separate
  decision.
- `dimension`/`number` → `Slider`, value sent with its unit intact (`"12px"`, not `"12"`) —
  `number` currently has zero leaves in the schema (verified against the real `tokens.json` while
  writing this spec) but the dispatch rule still needs to exist for when one is added.
- General serialization rule for every editable field: **the client always sends the full
  canonical string this route's validator expects** (unit or suffix included); it never sends a
  bare number and relies on the server to reformat or coerce it. The server's job is validation,
  never normalization.

## 3. Validation (implemented in `token-writes.mjs`, §3a)

**Path validation (write, reset, set-as-default):** walk `tokens.json` by splitting `path` on
`.` (matching `resolve.mjs`'s own reference-splitting convention) until reaching a node with
`Object.hasOwn(node, "$value")`. Any missing segment, or a final node without `$value`, is a `400`
`"<path> is not a known token path"`.

`reset` and `set-as-default` additionally require the path to exist in **both** `tokens.json` and
`tokens.default.json` (the same invariant `tokens-validation.test.mjs` already asserts for the
whole schema) — `400` if only one file has it, which should never happen given that test passes,
but the route doesn't trust that invariant blindly at request time.

**Value format validation (write only)** — checked against the *existing* leaf's `$type` in
`tokens.json` (the server decides the type from the schema; the request does not supply one):

| `$type` | Accepted format | Regex / range |
|---|---|---|
| `color` | 3- or 6-digit hex, `#` required | `/^#(?:[0-9a-fA-F]{3}\|[0-9a-fA-F]{6})$/` |
| `dimension` | A non-negative or negative integer/decimal, `px` suffix required | `/^-?\d+(?:\.\d+)?px$/` |
| `percentage` | Integer/decimal, `%` suffix required, **and the numeric part must be within `0`–`100` inclusive** | `/^(\d+(?:\.\d+)?)%$/`, then `0 <= Number(match[1]) <= 100` |
| `fontFamily` | **Not writable at all** — `400 "fontFamily tokens are read-only"` regardless of the value sent | n/a |
| anything else (including `number`, and any future `$type` not listed here) | **Rejected**, `400 "unsupported token type for write: <type>"` | n/a |

`dimension` is restricted to `px` only (not `rem`/`em`/etc.) because every current `dimension`
token in the schema is a `px` value — a deliberate narrowing, not an oversight: if a future token
needs a different CSS unit, that's a schema change with its own review, not something this
validator should silently accept. There is **no `number` row** — a real inventory of the current
schema (`color: 33, percentage: 6, dimension: 17, fontFamily: 4`, zero `number` leaves) shows
nothing needs it yet; writing a speculative rule for a type with no consumer is exactly the "for
future flexibility" pattern the project's Global Constraints forbid. It falls into the catch-all
row instead — safely rejected, not silently accepted or crashing — so a future `number` token gets
its own validation rule reviewed on its own merits when it's actually added, rather than
inheriting an untested guess made now. The percentage range check exists because `color-mix()`'s
behavior for a percentage argument outside `0%`–`100%` isn't reliably specified/handled
consistently, and no current token needs to express one anyway.

`reset` and `set-as-default` need **no** format validation — both copy an already-schema-valid
`$value` string verbatim from one file to the other (which may itself be a `{reference}` string,
e.g. resetting a `component.*` token back to its factory reference — that's expected and correct,
not a bug: resetting undoes exactly the literal-value override an earlier `write` made, restoring
the original alias).

### 3a. `token-writes.mjs` — pure module, tempfile-tested

To make this logic testable without a running Next server or mutating real files on every test
run, the validation and tree-mutation logic lives in its own pure module, imported by both the
route and its test:

```ts
// All functions are pure: no fs access, no mutation of the input tree (return a new tree via
// structuredClone + targeted mutation, or an equivalent non-mutating update).
export const VALID_ACTIONS = ["write", "reset", "reset-all", "set-as-default"];

// Looks up `path` (dot-joined string) in `tree`. Returns the leaf node ({$value,$type}) or null
// if the path doesn't resolve to one. Used by write/reset/set-as-default.
export function getLeaf(tree, path);

// Every {path, leaf} pair in `tree`, dot-joined paths. Used only by applyResetAll's diff.
export function collectLeafPaths(tree);

// Type-guards + format/range checks value against leaf.$type. Returns
// { ok: true } | { ok: false, error: string }. No tree access — pure format validation.
export function validateWriteValue(leaf, value);

// Each of the four returns either
//   { ok: true, tokens?: <new tokens.json tree>, defaults?: <new tokens.default.json tree> }
// (only the file(s) that actually change are present) or
//   { ok: false, status: 400 | 500, error: string }.
export function applyWrite(tokensTree, path, value);
export function applyReset(tokensTree, defaultsTree, path);
export function applyResetAll(tokensTree, defaultsTree);
export function applySetAsDefault(tokensTree, defaultsTree, path);
```

`token-writes.test.mjs` tests these directly against small in-memory fixture trees (not the real
brand data — faster, and isolates the test from unrelated future schema changes) for every case in
§5's bad-case table that doesn't require an actual filesystem, plus one real round-trip test using
`node:fs`'s `mkdtempSync`: write a fixture tree to a temp file with
`JSON.stringify(tree, null, 2) + "\n"`, read it back, apply a no-op-equivalent transform, re-write,
and assert the file is byte-identical to the first write when nothing logically changed — this is
what makes §10's old "verify manually before shipping" formatting concern an enforced regression
test instead of a one-time manual check. The route itself (`route.ts`) is *not* unit-tested here —
it's a thin fs/HTTP adapter around `token-writes.mjs`, and its behavior is covered by the manual
`curl` checks in §8, which exercise the real files and the real `buildActiveBrand()` call.

## 4. Behavior per action (route.ts's adapter layer)

Every action: read `tokens.json` (and `tokens.default.json`, for `reset`/`reset-all`/
`set-as-default`) with `JSON.parse(readFileSync(...))` inside the handler's top-level `try` (§2 —
a parse failure here is what maps to `500`, not a special case). Call the matching
`token-writes.mjs` function. On `{ ok: false }`, respond with its `status`/`error` directly. On
`{ ok: true, ... }`:

- **`write`**: `applyWrite` returns the updated `tokens.json` tree → write it atomically (§4a) →
  call `buildActiveBrand()` → respond `{ ok: true }`.
- **`reset`**: `applyReset` returns the updated `tokens.json` tree (value copied from
  `tokens.default.json`) → same write + `buildActiveBrand()` + respond sequence as `write`.
- **`reset-all`**: `applyResetAll` returns the updated `tokens.json` tree with every differing leaf
  reset → always writes and calls `buildActiveBrand()` once, even if it turns out no leaf actually
  differed (simpler than pre-diffing to decide whether to skip — this is a rare, deliberate,
  low-frequency action, not a hot path worth optimizing).
- **`set-as-default`**: `applySetAsDefault` returns the updated `tokens.default.json` tree only →
  write **only that file**, atomically. **Does not** touch `tokens.json` or call
  `buildActiveBrand()` — the live token value and the generated CSS are already correct (this
  action only changes what "default" means going forward), so rebuilding would be a same-output
  no-op. This is the one action that deliberately doesn't rebuild — noted explicitly so it isn't
  "fixed" into consistency without reading this paragraph first.

### 4a. Atomic writes

Every write to `tokens.json` or `tokens.default.json` goes through: write the new content to a
temp file in the **same directory** (e.g. `tokens.json.tmp-<random>`, via `writeFileSync`), then
`renameSync` it over the real filename. A rename within the same filesystem is atomic — a crash or
concurrent read mid-write can never observe a half-written token file. Both files use
`JSON.stringify(tree, null, 2) + "\n"`, matching `tokens.json`'s existing 2-space, trailing-newline
format exactly (verified against the real file's raw bytes while writing this spec — confirm this
still holds for `tokens.default.json` too before relying on it, since it hasn't been directly
byte-inspected here).

**Import specifier, since nothing in `app/app` imports from this package yet:** the package
(`app/packages/design-system/package.json`) has no `"main"`/`"exports"` field, so a bare
`import ... from "@guitar-tabs/design-system"` will not resolve to anything under `src/` — only
`index.ts`'s barrel is meant to be consumed that way once such a field exists (a gap Task 6 will
hit first for the *components*, not this task's problem to fix). `build-tokens.mjs` and
`token-writes.mjs` are internal modules, not part of that public barrel anyway. `route.ts` imports
both via an explicit relative path from its own location
(`app/app/api/design-system/tokens/route.ts`):

```ts
import { buildActiveBrand, resolveBrandDir } from "../../../../packages/design-system/src/build-tokens.mjs";
import { applyWrite, applyReset, applyResetAll, applySetAsDefault } from "../../../../packages/design-system/src/token-writes.mjs";
```

Verify TypeScript's configured `moduleResolution` (check `app/tsconfig.json`) accepts an explicit
`.mjs`-extensioned relative import before relying on this — Next 16's default bundler resolution
should, but this repo's `AGENTS.md` explicitly warns not to assume Next.js behavior from training
data; check `node_modules/next/dist/docs/` if this doesn't compile cleanly.

## 5. Bad-case behavior

| Case | Required behavior |
|---|---|
| `NODE_ENV === "production"` | `404`, before parsing the body or reading any file |
| Request body isn't valid JSON | `400`, `error` says so |
| `action` missing, non-string, or not one of the four known values | `400`, error lists the four valid actions |
| `path`/`value` missing or non-string where the action requires them | `400` (type-guard, before path lookup — closes the coercion/crash hole) |
| `write`/`reset`/`set-as-default` with a `path` that isn't a real leaf | `400` (§3) |
| `write` on a `fontFamily` leaf | `400`, regardless of what `value` was sent |
| `write` on a `number`-typed leaf, or any `$type` not in §3's table | `400`, "unsupported token type for write" |
| `write` with a `percentage` value outside `0`–`100` | `400` |
| `write` with a `value` that otherwise doesn't match its leaf's `$type` format | `400`, message names the expected format |
| `reset`/`set-as-default` with a `path` present in only one of the two files | `400` — should be unreachable given `tokens-validation.test.mjs`, but not assumed |
| Extra/unrecognized fields in the body | Ignored, not rejected |
| `tokens.json` is hand-corrupted (invalid JSON) | `500 { ok: false, error }` — caught by the handler's top-level `try`, never an unhandled exception or Next's default HTML error page |
| Two requests arrive concurrently | No special handling beyond the atomic per-file write (§4a) — single-user local dev tool, per design spec §5.2's explicit "no multi-tab concurrent-edit safety" scope. Atomicity prevents a *corrupted* file from a torn write; it does not prevent a *lost update* from two overlapping requests, which remains an accepted, documented non-goal |
| Filesystem write fails (permissions, disk full, etc.) | `500`, `error` is the caught exception's message, not swallowed |

## 6. Forbidden patterns

- No bare `except`/`catch` that swallows an error silently — every `catch` maps to a `400`/`500`
  with a real `error` message; nothing is caught and ignored.
- No touching `.env` or credentials.
- No new read/GET endpoint on this route (design spec §5.2 — Task 6 uses `router.refresh()`
  against the server-rendered page, not a fetch against this route).
- No accepting a `{...}`-reference-style string as a `write` value — `write` only accepts a
  literal matching §3's format table.
- No non-atomic (`writeFileSync` directly to the real filename) write to either token file (§4a).
- No coercing or reformatting a `value` server-side — validate the string as sent, or reject it;
  never "helpfully" normalize `"8"` into `"8%"` or similar (§2).

## 7. File allowlist

- `app/packages/design-system/src/build-tokens.mjs` (modify — §0(b), extract `buildActiveBrand()` only)
- `app/packages/design-system/src/token-writes.mjs` (create — §3a)
- `app/packages/design-system/src/token-writes.test.mjs` (create — §3a)
- `app/app/api/design-system/tokens/route.ts` (create)

## 8. Acceptance criteria

- `npm test --workspace @guitar-tabs/design-system` passes, including the new
  `token-writes.test.mjs` suite (record the before/after test count in the PR description).
- `npm run verify` passes (typecheck + lint + unit tests — the existing `build-tokens.test.mjs`
  suite must still pass unchanged after §0(b)'s refactor, since it's a pure extraction).
- Manual check against `npm run dev` (`NODE_ENV` unset/`development`):
  - `POST` a `write` for a known `color` path (e.g. `semantic.color.accent`) with a valid hex →
    `200 { ok: true }`; `tokens.json` shows the new literal at that path;
    `app/app/design-tokens.generated.css` regenerates with the new value.
  - `POST` the same `write` with an invalid value (e.g. `"blue"`) → `400`, `tokens.json`
    unchanged.
  - `POST` a `write` with `value: 12` (a JSON number, not a string) → `400` (type-guard, §2).
  - `POST` a `write` for a `percentage` path with `"150%"` → `400` (range check, §3).
  - `POST` a `reset` for the color path above → `200`; `tokens.json` matches
    `tokens.default.json` again at that path.
  - `POST` a `write` for a `fontFamily` path → `400`.
  - `POST` any action with an unknown `path` → `400`.
- Manual check against `npm run stage` (`NODE_ENV=production`): every action returns `404`, and
  none of them touch `tokens.json` (confirm via `git status` showing no changes to it after the
  attempt). `design-tokens.generated.css` is gitignored, so any residue there from the `dev`-mode
  manual checks above is harmless and needs no cleanup — only `tokens.json` is tracked and needs
  the restore step below.
- **Before this task is considered done, restore `tokens.json` to its committed state** — the
  manual checks above mutate a tracked file. `git checkout --
  app/packages/design-system/brands/default/tokens.json` (or a final `reset-all` call) before the
  checkpoint commit. Verify with `git status` showing no diff on that file before committing.
- `git diff --stat` matches the file allowlist (§7): 1 modified, 3 created.

## 9. Definition of done

`npm test --workspace @guitar-tabs/design-system` passes + `npm run verify` passes + the manual
dev/stage checks above pass + `tokens.json` restored to its committed state (verified via `git
status`) + `git diff --stat` matches the allowlist + checkpoint commit (ask-first per
`AGENTS.md`, made routinely per `docs/WEB_APP_WORKFLOW.md` §4 once verified — see
`[[checkpoint-commit-policy]]`).

## 10. Stop-conditions

- If `buildActiveBrand()`'s extraction (§0(b)) changes the generated CSS's byte content at all
  (diff `design-tokens.generated.css` before/after the refactor, from a clean `npm run
  tokens:build`), stop — that means the extraction wasn't the pure refactor this spec assumes.
- If a token's `$type` shows up in `tokens.json` that isn't one of `color`/`dimension`/
  `percentage`/`fontFamily` (the four real types as of Task 4 — verify against the real file
  before assuming), that's expected to hit the catch-all `400` (§3), not a bug — don't add a new
  row to handle it without a separate review of what its format/range rule should be.
- If `tokens.default.json`'s raw formatting doesn't match `tokens.json`'s (2-space indent,
  trailing newline) when read directly, stop and confirm before assuming `4a`'s
  `JSON.stringify(tree, null, 2) + "\n"` is correct for both files — this spec asserts it based on
  `tokens.json` alone.
- **Rollback:** `git checkout -- app/packages/design-system/src/build-tokens.mjs && rm -f
  app/packages/design-system/src/token-writes.mjs
  app/packages/design-system/src/token-writes.test.mjs
  app/app/api/design-system/tokens/route.ts` restores the pre-task state, provided Tasks 1–4 are
  committed first (they are — checkpoint `602d268`). If manual testing left `tokens.json` dirty,
  `git checkout -- app/packages/design-system/brands/default/tokens.json` before or as part of
  rollback (§8 already requires this regardless of rollback).

## 11. Known, deferred debt (not fixed here)

`token-writes.mjs`'s `collectLeafPaths` (used only by `applyResetAll`'s diff) is a fourth
implementation of "walk the token tree to its `$value` leaves," alongside `build-tokens.mjs`'s
`collectLeaves`, `tokens-validation.test.mjs`'s `leafPaths`, and now this one. `getLeaf` (single-
path lookup, used by `write`/`reset`/`set-as-default`) is a different, smaller shape — not another
copy of the same walk, so it isn't part of this count. Worth consolidating the tree-enumeration
functions into one shared, exported helper (`resolve.mjs` is the natural home, since it already
owns reference-path/tree semantics) the next time any of them needs to change — not done here, to
keep this task's diff to the files it actually needs. If a shared `getLeaf(tree, path)` is ever
wanted too, that's additive on top of whatever consolidation happens, not part of it.

---
**Landed:** commit `aebc3ed` (Iteration 1, Task 5). `app/app/api/design-system/tokens/route.ts` confirmed in active use and extended multiple times this session (set-description, dark-value handling).
