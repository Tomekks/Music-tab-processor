# Design System Task 7 (Docs + Merge Prep) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the design-system package's docs up to date with what's actually built (README, status doc), remove a leftover gitignored playground file, close out the orphaned Task 6 spec commit, and get the branch merge-ready.

**Architecture:** Docs-only work plus one filesystem deletion. No source code changes, no new tests — "verification" here means running the existing commands and reading their real output, then eyeballing the written docs against the actual repo state. `npm run verify` still gates the branch (it runs typecheck via the pre-commit hook even though nothing typed changed).

**Tech Stack:** Markdown, npm workspaces (`node --test` for the design-system package), Next.js app router (for locating the token API route).

**Spec:** `docs/superpowers/specs/2026-09-19-design-system-design.md` (sections 2, 6, 6.1, 7 are load-bearing for this task — package structure, component scope, add/remove convention, Figma export).

## Global Constraints

- Run all workspace commands from `app/` (`npm test --workspace @guitar-tabs/design-system`, `npm run verify`) — repo root does not have these scripts.
- Every number that goes in a doc (test count, component count, etc.) must come from actually running the command this session, not from memory or from a prior session's report — a prior report in this same project already misstated the test count once (said 53, actual is 45).
- Stage only files this task touches. Do not `git add -A`. The working tree has unrelated untracked clutter (`.opencode/`, `0_case_study_raw_materials/`, `Skills/`, `_architecture_playground/`, `docs/specs/ui-fretboard-playhead.md`) that must never be staged by this branch.
- `app/design_system/index.html` is gitignored (`app/.gitignore:42`) — its removal is a plain `rm`, never a `git rm`, and will not show up in `git status`.

---

### Task 1: Commit the orphaned Task 6 spec

Task 6 (the editor page + field descriptors) was implemented and committed, but its spec file was never committed. It needs to land before Task 7's docs work so the branch history isn't missing a spec for shipped code.

**Files:**
- Commit (no edits): `docs/specs/design-system-editor.md` (already exists on disk, untracked)

**Interfaces:** None — this is a standalone commit, no code dependency.

- [ ] **Step 1: Confirm the file is untracked and unrelated files aren't swept in**

Run: `git status --short`
Expected: `docs/specs/design-system-editor.md` listed as `??`, alongside other untracked clutter that must NOT be staged (`.opencode/`, `0_case_study_raw_materials/`, `Skills/`, `_architecture_playground/`, `docs/specs/ui-fretboard-playhead.md`).

- [ ] **Step 2: Read the spec file once to confirm it matches what Task 6 actually shipped**

Run: `git log --oneline -1` (should show `c22d574 Implement design system editor page and field descriptors (Task 6)` or later) then read `docs/specs/design-system-editor.md` in full. If it describes behavior that diverges from `app/app/design-system/editor.tsx` / `page.tsx` / `app/packages/design-system/src/field-descriptors.mjs`, stop and flag the divergence instead of committing — do not silently commit a spec that no longer matches the code.

- [ ] **Step 3: Stage and commit only this file**

```bash
git add docs/specs/design-system-editor.md
git commit -m "$(cat <<'EOF'
Add Task 6 spec: editor page + field descriptors (after the fact)

Spec was written and used to guide Task 6's implementation but never
committed. Landing it now so the branch history has a spec for
shipped code, matching the pattern used for Tasks 1-4.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Verify**

Run: `git log --oneline -1` — expected: the new commit is HEAD. Run: `git status --short` — expected: `docs/specs/design-system-editor.md` no longer listed; only the pre-existing unrelated untracked/modified entries remain.

---

### Task 2: Gather the real numbers before writing anything

Every doc-content task below (Task 3, Task 4) depends on actuals gathered here. Doing this once, up front, avoids re-running commands mid-edit and avoids copying stale numbers between sections.

**Files:** None created or modified — this task only runs commands and records their output for Task 3/4 to use.

**Interfaces:**
- Produces: the recorded actuals below, which Task 3 Step 2 and Task 4 Step 1 consume verbatim.

- [ ] **Step 1: Run the design-system test suite and record the count**

```bash
cd app && npm test --workspace @guitar-tabs/design-system
```

Expected tail: `ℹ tests N`, `ℹ pass N`, `ℹ fail 0`. Record the exact `N` — do not reuse a number from a prior conversation or report. (As of this plan being written, a fresh run showed `45`, but re-run it — Task 1's commit or other changes may shift it by the time Task 3 executes.)

- [ ] **Step 2: Run the verify gate and record pass/fail**

```bash
cd app && npm run verify
```

Expected: exits 0 / prints success. Record whether it passed cleanly (it's expected to, since this task changes no source — but confirm rather than assume).

- [ ] **Step 3: Confirm the token API route's real path**

```bash
find app/app/api -path "*design-system*"
```

Expected: `app/app/api/design-system/tokens/route.ts`. This is the exact path the README's "What lives here" section must cite — the route is NOT inside `packages/design-system/`.

- [ ] **Step 4: Confirm the component list and pure-logic module list**

```bash
ls app/packages/design-system/src/components
ls app/packages/design-system/src
```

Expected components: `Button.tsx`, `ColorField.tsx`, `SegmentedControl.tsx`, `Slider.tsx` (4, matching spec §6). Expected pure-logic modules relevant to the README's "where the pure-logic modules live" bullet: `token-writes.mjs` and `field-descriptors.mjs` (both have matching `.test.mjs` files in the same directory — `token-writes.test.mjs`, `field-descriptors.test.mjs`). Record whether this list has changed from what's written above; if it has, the README content in Task 3 must reflect the new list, not this one.

---

### Task 3: Expand `app/packages/design-system/README.md`

Replace the stub with a description of the as-built package, using the actuals from Task 2.

**Files:**
- Modify: `app/packages/design-system/README.md` (currently a 4-paragraph stub, full current content already read — final paragraph reads "Status as of this file: brand data only (colors, spacing, typography as JSON). No build script, no components, no editor yet — see the plan above for what's next and in what order.")

**Interfaces:** None — pure documentation, no code interface.

- [ ] **Step 1: Keep the existing intro and the tokens.json/tokens.default.json sync warning**

The first two paragraphs of the current stub (the one-line description + spec/plan pointers, and the "don't hand-edit tokens.json and tokens.default.json independently" warning) are both still accurate. Keep them verbatim; only the content after them changes.

- [ ] **Step 2: Delete the stale final paragraph**

Remove this paragraph entirely (it's now false):

```
Status as of this file: brand data only (colors, spacing, typography as JSON). No build script,
no components, no editor yet — see the plan above for what's next and in what order.
```

- [ ] **Step 3: Add "What lives here" section**

Insert after the sync warning:

```markdown
## What lives here

- **Brand data** — `brands/default/tokens.json` (live values), `brands/default/tokens.default.json`
  (factory reset target), `brands/default/DESIGN.md` (principles, not just values — see spec §4).
- **Build script + resolver** — `src/build-tokens.mjs` resolves `{path}` references and emits the
  generated CSS custom properties; `src/resolve.mjs` is the resolver it's built on.
- **4 components** — `src/components/`: `ColorField`, `Slider`, `SegmentedControl`, `Button`.
  Each consumes only CSS custom properties/Tailwind classes from the generated stylesheet (no
  hardcoded values) and has a matching `component.<name>` block in `tokens.json`.
- **Token write/reset API route** — lives at `app/app/api/design-system/tokens/route.ts`, i.e.
  **not** inside this package. The route owns HTTP + disk; the pure validation/mutation logic it
  delegates to (`applyWrite`, `applyReset`, `applyResetAll`, `applySetAsDefault`) lives here, in
  `src/token-writes.mjs`.
- **Editor page** — `app/app/design-system/page.tsx` + `editor.tsx`, also outside this package,
  consumes the components and the API route above for live in-browser token tuning.
```

- [ ] **Step 4: Add "Add-a-component convention" section**

Insert after "What lives here":

```markdown
## Add-a-component convention (spec §6.1)

**Adding:** create the file in `src/components/`, add a `component.<name>` token block that
references semantic tokens only (never a hardcoded value), document it in `brands/default/DESIGN.md`
if it introduces a new behavior pattern.

**Removing:** delete the component file, delete its `component.<name>` block, grep the codebase to
confirm nothing else references those specific token paths before deleting them — prevents orphaned
dead tokens in either direction.
```

- [ ] **Step 5: Add "Pure-logic modules" section**

Insert after the component convention. Use the module list confirmed in Task 2 Step 4:

```markdown
## Where the pure logic lives

`src/token-writes.mjs` and `src/field-descriptors.mjs` hold all the logic that doesn't need a
filesystem, network, or React — both are covered by `node --test` (`token-writes.test.mjs`,
`field-descriptors.test.mjs`). The thin layers around them are manually verified rather than unit
tested: `route.ts` (owns HTTP + disk, delegates to `token-writes.mjs`) and the editor page's
adapters that call it from the browser.
```

- [ ] **Step 6: Add "Figma export" section**

```markdown
## Figma export

No code needed. `tokens.json`'s shape (`$value`/`$type`, `{path}` references,
`primitive`/`semantic`/`component` layers) is already the format the **Tokens Studio for Figma**
plugin imports natively. Point it at `brands/default/tokens.json` when Figma import is actually
needed.

One caveat: typography tokens (`semantic.typography.sans`/`.mono`) hold CSS `var()` passthroughs
(`var(--font-geist-sans)`), not literal font names — they won't import as usable font choices in
Figma as-is.
```

- [ ] **Step 7: Add "Tests and verification" section, using Task 2's actual numbers**

```markdown
## Tests and verification

`npm test --workspace @guitar-tabs/design-system` — <N tests from Task 2 Step 1> passing, 0 failing.

`npm run verify` (from `app/`) is the merge gate — runs across the whole `app/` workspace, not just
this package.
```

Replace `<N tests from Task 2 Step 1>` with the literal number recorded in Task 2 — do not leave the placeholder text in the committed file.

- [ ] **Step 8: Re-read the whole file against the actual repo**

Open `app/packages/design-system/README.md` and check every claim against the real filesystem: component list, module list, route path, test count. Fix anything that drifted between Task 2 and now.

---

### Task 4: Rewrite `app/status/design-system.md`

**Files:**
- Modify: `app/status/design-system.md` (currently 4 paragraphs: playground description, "planned bridge mode" paragraph, "SheetDiagram-only adoption" paragraph, theme-presets paragraph)

**Interfaces:** None — pure documentation.

- [ ] **Step 1: Keep paragraph 1 (playground) and paragraph 4 (theme presets) as-is**

The first paragraph ("In progress, local-only by design...") describing `app/design_system/index.html` as a gitignored playground stays true and is kept, condensed only if it reads long — don't cut factual content. The last paragraph (three named theme presets, `patchbay`) is unrelated to this task's changes and stays as-is.

- [ ] **Step 2: Replace the "planned bridge mode" paragraph**

Delete this paragraph:

```
**Planned next (not built):** a live "bridge" mode — the tool embeds the real `npm run dev`
server in an iframe and pushes token changes into it via `postMessage`, so tweaks preview
against the actual rendered app (real Tailwind output, real components) instead of a hand-built
mockup, without ever touching the live/deployed site. Needs a small dev-only listener in the app
itself, gated to never run in production. Once real Tailwind components (e.g. shadcn/ui) exist,
Storybook is the natural next step up from this tool — deliberately deferred until there's an
actual component set worth isolating.
```

Replace with:

```markdown
**Shipped instead of the bridge:** the package (`app/packages/design-system/`, see its README)
plus an in-app editor at `/design-system` (`app/app/design-system/`) now do what the planned
"bridge" mode was for — live token tuning against the real rendered app. Because the editor runs
inside the actual Next.js dev server and writes straight to `tokens.json`, Next's own HMR pushes
every change into the live page automatically; no iframe/`postMessage` bridge was needed. The
standalone playground above stays useful for quick mockup-only sketches, but it's no longer the
only way to preview a token change against real components.
```

- [ ] **Step 3: Replace the "SheetDiagram-only adoption" paragraph**

Delete this paragraph:

```
**Actual adoption so far:** `SheetDiagram.tsx` is the first (and only) component wired to the
real tokens (`var(--background)`/`var(--foreground)`) instead of hardcoded colors — see
`app/status/song-views.md`.
```

Replace with:

```markdown
**Current state:** the whole app runs on the generated token stylesheet now (Task 3's cutover),
not just `SheetDiagram.tsx` — see `app/packages/design-system/README.md` for what the package
contains and `docs/superpowers/specs/2026-09-19-design-system-design.md` for the full design.
(`app/status/song-views.md`'s older "SheetDiagram is the only component on real tokens" note is
stale and not corrected as part of this task — flagging here rather than silently leaving it
looking like an oversight.)
```

- [ ] **Step 4: Re-read the whole file against the actual repo**

Open `app/status/design-system.md` and confirm every claim: `/design-system` route exists (`app/app/design-system/page.tsx`), README path is correct, spec path is correct.

---

### Task 5: Delete the stale local playground file, verify, and checkpoint commit

**Files:**
- Delete: `app/design_system/index.html` (gitignored — filesystem delete only, not tracked by git)
- Commit: `app/packages/design-system/README.md`, `app/status/design-system.md`

**Interfaces:** None.

- [ ] **Step 1: Confirm the file is gitignored, then delete it**

```bash
git check-ignore -v app/design_system/index.html
```

Expected: prints the matching `.gitignore` rule (confirms this is a safe plain delete, not something git is tracking).

```bash
rm app/design_system/index.html
```

- [ ] **Step 2: Confirm the delete is invisible to git status**

```bash
git status --short
```

Expected: no line for `app/design_system/index.html` (gitignored files don't show up). Confirm `app/packages/design-system/README.md` and `app/status/design-system.md` show as `M`.

- [ ] **Step 3: Run the verify gate**

```bash
cd app && npm run verify
```

Expected: passes (docs-only change; the pre-commit hook will also run typecheck when you commit, but running it now catches problems before staging).

- [ ] **Step 4: Human re-read both files against reality, one more time**

Re-open `app/packages/design-system/README.md` and `app/status/design-system.md` in full. This is a deliberate second read (Task 3 Step 8 / Task 4 Step 4 already did one) — the goal is a fresh pass after both files exist together, checking for cross-references that don't line up (e.g. README pointing at the editor page, status doc pointing at the README) rather than checking each file in isolation.

- [ ] **Step 5: Stage and commit exactly these two files**

```bash
git add app/packages/design-system/README.md app/status/design-system.md
git commit -m "$(cat <<'EOF'
Update design system docs to match as-built state (Task 7)

README.md: replace the Phase-0 stub with what's actually shipped —
package contents, add/remove-a-component convention, where the pure
logic lives, Figma export caveats, current test count.

app/status/design-system.md: replace the "planned bridge mode" and
"SheetDiagram-only adoption" paragraphs with what actually shipped
(package + in-app editor via HMR; whole-app token cutover). Also
removes the stale local-only playground file, app/design_system/
index.html (gitignored, so this deletion doesn't appear in git
status).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Verify the commit and clean tree**

```bash
git log --oneline -3
git status --short
```

Expected: the new commit is HEAD, on top of Task 1's spec commit and Task 6's implementation commit. `git status --short` shows only the pre-existing unrelated clutter (`.opencode/`, `0_case_study_raw_materials/`, `Skills/`, `_architecture_playground/`, `docs/specs/ui-fretboard-playhead.md`, and whatever `docs/DRIFT_LOG.md` state was already there before this task) — nothing from this task left uncommitted.

---

### Task 6: Post-Task-7 merge sequence

Everything in this task happens after Task 5's commit, and several steps are deliberately gated on human action (browser testing, PR review) — this task is a checklist, not something to run unattended end-to-end.

**Files:** None created. Modifies `docs/DRIFT_LOG.md` (drift check logging) and `docs/PENDING_ACTIONS.md` (hygiene step) as part of its steps.

**Interfaces:** None.

- [ ] **Step 1: Browser click-test (deferred from Task 6, ~30 seconds)**

```bash
cd app && npm run dev
```

Open `http://localhost:3000/design-system` in a browser. Confirm: the reset-all control requires two clicks (confirmation step) before it actually resets, and a Slider drag feels debounced (value doesn't spam-write on every pixel of movement — roughly a 200ms settle before it commits). This is the only interaction path Task 6 shipped without a human eyeballing it; curl/tests can't exercise timing feel. Stop the dev server after.

- [ ] **Step 2: Run the drift check**

Follow `docs/DRIFT_CHECK.md`'s procedure. Log the result as a new dated entry in `docs/DRIFT_LOG.md`, following the format of existing entries (Checked / Found / Action). A fresh session (not this one) is preferred for this step, per the existing "same-session check is not fully independent" caveat already present in the log's most recent entry — but if none is available, run it here and say so explicitly in the log entry, the way the 2026-09-19 entry already does.

- [ ] **Step 3: Push the branch and open the PR**

```bash
git push -u origin task/design-system-brand-data
```

Open a PR to `master` (repo practice — see PR #18 for the prior design-system-planning PR as a reference for format). Before pushing, run `git status --short` one more time and confirm none of `.opencode/`, `0_case_study_raw_materials/`, `Skills/`, `_architecture_playground/`, or the `ui-fretboard-playhead` spec/branch are staged or committed on this branch — those are other sessions' work-in-progress and don't belong in this PR.

Wait for human review and merge. Do not merge without human review.

- [ ] **Step 4: Post-merge deploy question**

After merge, ask the human a three-way question: deploy to Vercel now (`npx vercel deploy --prod --yes` from repo root), skip for now, or defer to a specific later time. Include this framing in the question: the editor page and its API route will 404 in production (Vercel's filesystem is read-only / ephemeral, so the token-write route can't work there) — a deploy at this point only ships the regenerated-token CSS pipeline and the unrelated MetronomeControls fix already on `master`. Don't deploy without an explicit answer.

- [ ] **Step 5: PENDING_ACTIONS hygiene**

Open `docs/PENDING_ACTIONS.md`. Check off the line-9 item ("Re-run the security review once the app's shape changes") as not-applicable-yet, citing this task's stage-testing evidence: both the editor page and the API route 404'd on staging, and `tokens.json` was never reachable/writable from outside — no new externally-reachable write path shipped. Leave the token-rotation and deploy-decision items (if present) untouched; they belong to their own owners, not this task.

---

## Self-Review Notes

- **Spec coverage:** README additions map to spec §2 (package structure), §6/§6.1 (component scope + convention), §7 (Figma export). Status doc rewrite reflects §5.2 (visual editor, shipped) superseding the bridge-mode plan. Task 6 checklist covers the outline's full "after Task 7" section (click-test, drift check, push/PR/merge, deploy question, PENDING_ACTIONS hygiene) with nothing dropped.
- **Placeholder scan:** every doc section has literal text to insert, not descriptions of what to write. The one intentional placeholder (`<N tests from Task 2 Step 1>` in Task 3 Step 7) is explicitly flagged as something to replace with a real number before committing, not left in.
- **Gap closed vs. the original outline:** Task 1 (committing the orphaned Task 6 spec) was missing from the user's draft outline entirely — added here so it doesn't get swept into Task 7's commit by accident or lost as stray untracked clutter.
