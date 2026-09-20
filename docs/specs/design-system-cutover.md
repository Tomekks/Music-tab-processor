# Task spec: Design system — cutover (wire the build, replace hand-rolled tokens)

Implements Task 3 of `docs/superpowers/plans/2026-09-19-design-system.md`. Read that task's
section and its own "highest-risk task" framing first. Depends on Task 1
(`docs/specs/design-system-brand-data.md`) and Task 2
(`docs/specs/design-system-resolver-and-build.md`), both implemented and verified on
`task/design-system-brand-data` (not yet merged to `master`). Work from that branch.

**This is the one task in the whole plan that changes what the running app actually renders.**
Every other task so far has been additive and inert (new files, nothing wired in). This one
deletes real, currently-load-bearing CSS and replaces it with generated output. Read all of §3
before touching `globals.css` — the order of operations matters, not just the end state.

## 1. Scope

- `app/package.json`: add `"tokens:build": "node packages/design-system/src/build-tokens.mjs"`,
  and three lifecycle hooks that all call it: `"predev"`, `"prebuild"`, `"prestage"`.
- `app/packages/design-system/src/build-tokens.mjs`: add a main-module CLI entrypoint (the
  file's exports from Task 2 — `generateCSS`, `resolveBrandDir` — don't change) that writes the
  generated CSS to `app/app/design-tokens.generated.css`.
- `app/.gitignore`: add `/app/design-tokens.generated.css`.
- `app/app/globals.css`: add the `@import`, delete every hand-rolled definition it now
  supersedes, in the same change.
- No `.env`/credential contact. No changes to `app/app/` beyond `globals.css` itself — no
  component changes, nothing under `app/app/api/` or `app/app/design-system/` (those are Tasks 5
  and 6).

## 2. Non-goals

- No new tokens, no `tokens.json` changes.
- No changes to `resolve.mjs`'s or `generateCSS`'s exported behavior — this task only adds a
  small amount of code *around* `build-tokens.mjs` (the CLI entrypoint), it doesn't touch the
  resolution or emission logic Task 2 already tested.
- No "fixing" `globals.css`'s `body { font-family: Arial, Helvetica, sans-serif; }` line to use
  `var(--font-sans)` instead — that's a pre-existing mismatch (the body tag has never actually
  used the Geist font `@theme inline` sets up), unrelated to this cutover, and out of scope to
  "improve" while in the area.
- No visual redesign of anything. If a value looks improvable, that's not this task's call.

## 3. Interface / exact changes

### 3.1 `build-tokens.mjs`'s CLI entrypoint

Add, at the bottom of the existing file, a main-module check (Node's standard pattern:
`if (import.meta.url === \`file://${process.argv[1]}\`)` or equivalent) that:

1. Calls `resolveBrandDir()` and `generateCSS(brandDir)` (both already exported, unchanged).
2. Writes the result to `app/app/design-tokens.generated.css` — resolved from this file's own
   location (`HERE`, already computed in the file per Task 2), **not** from `process.cwd()`:
   `path.resolve(HERE, "../../../app/design-tokens.generated.css")` (`src` → `design-system` →
   `packages` → `app`, then into `app/design-tokens.generated.css`). Same cwd-independence
   reasoning as `resolveBrandDir()` in Task 2 — this file gets invoked from different working
   directories by different callers (an npm script here, potentially Task 5's API route later),
   and it must produce the same result regardless.
3. Prints a one-line confirmation (`Generated: <path>`) on success, so `npm run dev`'s startup
   isn't silently doing this — matching the visibility precedent in the `ui-ux-pro-max` reference
   script this design's build script was originally modeled on (Task 2's spec, §10 equivalent
   reasoning — visibility, not silence, on a generated-file write).

### 3.2 `package.json` scripts

```json
"tokens:build": "node packages/design-system/src/build-tokens.mjs",
"predev": "npm run tokens:build",
"prebuild": "npm run tokens:build",
"prestage": "npm run tokens:build",
```

**Why three hooks, not one — this is the actual finding this task's own review pass turned up:**
`"stage": "next build && next start -p 3001"` calls the `next build` *binary* directly, not
`npm run build`. npm's `pre<script>` convention only fires for the script name it's attached to —
`prebuild` fires for `npm run build`, but `npm run stage` never invokes `npm run build`, so
`prebuild` alone would leave `npm run stage` running against a stale or entirely absent
`design-tokens.generated.css` on a machine where `predev` hadn't already generated one (a fresh
checkout, or CI, if `stage` were ever run there). `prestage` closes that gap without touching
`stage`'s own command body.

### 3.3 `.gitignore`

`app/.gitignore` gets one added line: `/app/design-tokens.generated.css`. (Leading `/` anchors
it to `app/.gitignore`'s own directory — `app/` — so this correctly targets
`app/app/design-tokens.generated.css`, matching the existing `/design_system` entry's same
convention in the same file.)

### 3.4 `globals.css` — the actual cutover

**Add**, in the exact position the deleted `:root` block currently occupies (immediately after
the existing `@import "tailwindcss";` line — preserve that relative ordering, don't move the new
import elsewhere):

```css
@import "./design-tokens.generated.css";
```

**Delete, in the same change** — every block below is fully superseded by the generated file
(verified in Task 2 to be byte-identical to what these blocks currently produce):

- The entire `:root { ... }` block (`--background`, `--foreground`, `--color-accent`,
  `--color-border`, `--color-surface`, `--radius`, `--space-1` through `--space-8`,
  `--sidebar-width`).
- The entire `@theme inline { ... }` block.
- The entire `@media (prefers-color-scheme: dark) { :root { ... } }` block — confirmed
  unreachable dead code in Task 1's spec (§3): `data-theme` is hardcoded on `StudioShell`, which
  wraps the entire shipped app, so nothing ever falls through to this media query.
- The `[data-theme="light"] { ... }` block.
- The `[data-theme="dark"] { ... }` block.

**Keep, unchanged:**

- `@import "tailwindcss";` (the first line — unrelated to our tokens).
- `body { background: var(--background); color: var(--foreground); font-family: Arial,
  Helvetica, sans-serif; }` — still reads the token variables (now supplied by the generated
  import instead of the deleted hand-rolled block), and its `font-family` line is a pre-existing
  quirk this task doesn't touch (§2).

**Resulting `globals.css` should be four things, in this order:** the Tailwind import, the new
design-tokens import, the (unchanged) `body` rule, nothing else. If anything else is currently in
the file that this list doesn't mention, stop and ask (§9) rather than guessing whether it's
token-related.

**Provenance:** the add/delete lists above are verified against the actual current file (read
directly while writing this spec, not from memory), as of commit `96d9ed0` (2026-09-18) — the
same commit Task 1's spec cited, confirming no drift since. If `globals.css` has changed since,
see §9.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `design-tokens.generated.css` doesn't exist when `next dev`/`next build`/`next start` runs | Shouldn't happen if `predev`/`prebuild`/`prestage` are wired correctly — if it does, that's this task failing its own acceptance criteria (§7), not a runtime case to handle gracefully |
| The CLI entrypoint is imported (not run directly) by something else later (Task 5) | Must not fire — the main-module check is exactly what prevents `generateCSS`/`resolveBrandDir` from having a disk-writing side effect when merely imported |
| Something in `globals.css` doesn't cleanly match either the "add" or "delete" lists in §3.4 | Stop and ask (§9) |

## 5. Forbidden patterns

- No touching `resolve.mjs`, `generateCSS`, or `resolveBrandDir`'s existing logic (§2).
- No "improving" `body`'s `font-family` line (§2).
- No deleting or editing anything in `globals.css` beyond exactly the blocks named in §3.4.
- No touching `.env` or credentials.

## 6. File allowlist

- `app/package.json` (modify)
- `app/packages/design-system/src/build-tokens.mjs` (modify)
- `app/.gitignore` (modify)
- `app/app/globals.css` (modify)

`app/app/design-tokens.generated.css` is a **build output**, not a source file this task commits
— it's gitignored (§3.3). Don't add it to the allowlist or stage it.

## 7. Acceptance criteria

- `npm run verify:full` passes — this specifically exercises `npm run build` → `prebuild` →
  `next build` on what should behave like a clean build, the exact scenario `prebuild` exists to
  keep from failing.
- `rm -f app/app/design-tokens.generated.css && cd app && npm run stage` — deliberately delete
  the generated file first to prove `prestage` actually regenerates it, not just that a
  leftover copy from an earlier `predev` run happened to still be there. Confirm the file exists
  again after `stage` starts, before doing the visual check below.
- **Manual visual check** (per `docs/WEB_APP_WORKFLOW.md` §5 step 8 — this is the human judgment
  call the automated checks above can't make): with `npm run stage` running, open `/` (the only
  real surface — `/studio` just redirects to it, per Task 1's spec) and confirm colors and
  spacing look identical to how they looked before this change. There is no live light-mode view
  to compare against today (Task 1's spec, §3) — if you want to spot-check the light theme too,
  force `data-theme="light"` on the root element via devtools; that's not part of this
  acceptance check's required scope, just available if you want the extra confidence.

## 8. Definition of done

`npm run verify:full` passes + the `prestage` regeneration check above shows the file exists post
-delete + the manual visual check confirms no visible change + `git diff --stat` matches the
allowlist (4 files, all modified) + checkpoint commit (ask-first per `AGENTS.md`).

## 9. Stop-conditions

- If anything in `globals.css` doesn't cleanly sort into §3.4's "add" or "delete" lists, stop and
  ask — don't guess whether an unlisted rule is token-related.
- If the visual check shows *any* difference on `/`, stop — don't hunt for which hand-rolled
  value the generated CSS is supposed to match by trial and error; go back to Task 2's pinned
  output (its spec, §3) and compare line by line against exactly what was deleted.
- If `npm run stage` still serves a stale `design-tokens.generated.css` after the delete-and-
  regenerate check in §7 (i.e., `prestage` didn't actually fire), stop and ask rather than adding
  a manual `rm` step to the `stage` script itself as a workaround.
