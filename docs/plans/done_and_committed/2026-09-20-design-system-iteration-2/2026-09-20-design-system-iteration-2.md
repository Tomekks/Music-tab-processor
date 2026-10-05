# Design System Iteration 2 Implementation Plan

> **For agentic workers:** this project overrides the generic Superpowers execution loop for
> `app/` work — see `docs/WEB_APP_WORKFLOW.md`. Do NOT use `superpowers:subagent-driven-development`
> or `superpowers:executing-plans`. Instead: each task below becomes its own spec file in
> `docs/specs/` (written fresh against current code, per `WEB_APP_WORKFLOW.md` §3's rule), then
> runs `WEB_APP_WORKFLOW.md` §5's loop. Checkbox syntax below tracks task-level, not step-level,
> progress — the actual step-by-step detail belongs in each task's own spec, written right before
> that task starts, not baked into this plan up front (this project learned the hard way this
> session that specs go stale fast — see the git-blame on `WEB_APP_WORKFLOW.md`'s newest note).

**Goal:** Eight design-system improvements (Tasks 1-8 below name eight distinct features; Tasks 5
and 8 are each large enough that they're executed as multiple specs — 5a/5b/5c and 8a/8b — per
**Tracks & sequencing** below, so the actual spec-file count is higher than eight). Four sourced
from reviewing
[Chainlift/liftkit](https://github.com/Chainlift/liftkit) (concepts only — that repo is GPL-2 and
explicitly "not recommended for production"; no code is copied from it): generative color from
seed hues, a live preview in the token editor, a shared interaction-state primitive, and a real
dark/light theme switcher. The fifth (Task 5) is `docs/BACKLOG.md` item 14 — multi-brand
inheritance with per-token reset-to-parent — flagged by the user as a request from a prior
session that got dropped, not a liftkit-derived idea. The sixth (Task 6, a token orphan-detection
test) came out of external research into design-system anti-patterns, done in response to the
user's explicit request to research the field and find complementary improvements — see
`app/packages/design-system/SELF-EVALUATION.md` for the full research synthesis. The seventh and
eighth (Tasks 7-8, a per-component sidebar editor and staged exception-vs-brand-wide edits with
an explicit Save) are a second round of user-requested features (2026-09-20), independent of
liftkit/backlog/research.

**Architecture:** All eight build on the existing `@guitar-tabs/design-system` package
(`app/packages/design-system/`) and its `/design-system` editor — no new subsystem, no new
package. Most tasks are independently shippable and revertible, but two — Tasks 7 and 8 — have a
hard, unavoidable sequencing dependency (Task 8 restructures the commit model *inside* the panel
Task 7 creates), and several others share files closely enough that order matters even without a
hard dependency. See **Tracks & sequencing**, right after the global constraints below, for the
actual execution order — don't read the numbered Task list that follows as "run in any order."

**Note on `docs/BACKLOG.md`:** item 14's text is quoted directly in Task 5 below rather than that
file being edited to cross-reference this plan — `BACKLOG.md` has uncommitted changes from a
concurrent session as of 2026-09-20 (a docs-reorg pass, several files touched), and editing a
file mid-flight under another editor risks clobbering it. Whoever picks up Task 5 should update
`BACKLOG.md` item 14's status once it's safe to touch (after the concurrent session's changes
land or are confirmed clear). Re-check `git status` for `BACKLOG.md` at 5a spec-writing time —
the 2026-09-20 date above may be stale.

**Tech Stack:** Existing stack only — **no new runtime dependency**, superseding this paragraph's
earlier draft. Task 1 originally planned to add `@material/material-color-utilities` (Google's
HCT/tonal-palette library) as a runtime dependency of `@guitar-tabs/design-system`; verified at
Task 1's spec-writing time that the published package (`0.4.0`, `latest`) cannot be `import`ed
under plain Node.js ESM — an extensionless relative import several layers into its module graph
throws `ERR_MODULE_NOT_FOUND`, and its `exports` field blocks the subpath-import workaround that
would otherwise dodge it. Two smaller corrections to this paragraph's earlier claims, confirmed
via `npm view`: the package is **Apache-2.0**, not MIT; unpacked size is **~1MB/138 files**, not
"~30KB." Full detail and the resolved approach — vendoring the 8 specific files this task actually
needs, unmodified, rather than depending on the broken package — is in Task 1's own spec (landed,
archived: `docs/plans/2026-09-20-design-system-iteration-2/design-system-generate-ramp.md`). `@guitar-tabs/design-system` still has no runtime
dependency beyond `peerDependencies` on react/react-dom.

**Spec:** No separate design spec — this plan **is** the design doc; each task's own
`docs/specs/*.md` (written at execution time, per the note above) is the implementation-level
detail.

## Global Constraints

- `npm run verify` (typecheck, lint, `node --test`) must pass after every task — see
  `app/packages/design-system/src/*.test.mjs` for the existing tests (count grows with each
  landed task; check `npm test --workspace @guitar-tabs/design-system`'s own output rather than
  trusting a number written here) these changes must not break, especially `contrast.test.mjs`
  (WCAG AA 4.5:1 check on every semantic color pair, both themes — Task 1's generated output must
  keep passing this unchanged test, not a modified one).
- **Shipping model: checkpoint commits, not per-task branches/PRs** — per `WEB_APP_WORKFLOW.md`
  §4/§5 (this supersedes an earlier draft of this plan that said "every task ships via a branch +
  PR"; Task 7's own spec already correctly follows the checkpoint model, this line just brings the
  plan's stated constraint in line with it). Commit locally (not pushed) after each task's
  `npm run verify` passes, before the next spec starts. Push/deploy is asked once — the existing
  three-way push / push & deploy / skip question — at the very end of this plan's work, not per
  task. `master` is still branch-protected (confirmed this session by a rejected direct push), so
  that eventual push, whenever it happens, targets a branch + PR like any other push to this repo
  — it's just not a per-task ceremony.
- **Another AI model may be concurrently editing this same working tree.** Commits stay scoped
  tightly to each task's file allowlist — no broad `git add -A` — so a concurrent edit elsewhere
  in the tree doesn't get swept into a checkpoint commit by accident.
- No hardcoded colors — every new value is a token, resolved through the existing
  `{path.to.token}` reference system in `resolve.mjs`.
- Don't touch `.env`/credentials (none of these tasks need to).
- Per `DESIGN.md`: WCAG AA minimum (4.5:1 body text, 3:1 large text/UI), no decorative motion, no
  card-nesting.

## Tracks & sequencing

Three tasks touch `editor.tsx` heavily enough, in close enough succession, that "any order" isn't
actually safe — and Task 5 is large enough (and touches enough of the same files) that it's split
below rather than run as one task. This replaces the old "each task is independent" framing.

- **Track A — package logic, order-flexible:** Task 1 → Task 5a (parent-resolution + merge logic
  only, no editor UI) → Task 5b (reset-to-parent logic, no editor UI) → Task 3 → Task 6, run
  once early as a baseline (see Task 6 below).
- **Track B — editor, strictly serial (each lands on top of the previous, not in parallel):**
  Task 1b → Task 2 → Task 7 → Task 8a (batch-write logic + route, no editor UI) → Task 8b
  (pending-edits state + Save bar, inside Task 7's panel) → Task 5c (inherited/overridden UI, on
  top of Task 8's staged-save UI — the highest-complexity merge point in this plan, budgeted here
  explicitly rather than left implicit).
- **Track C — independent:** Task 4, any time after Task 1b lands (so its manual light-mode check
  covers Task 1's generated values, not hand-authored placeholders).
- **Gate:** Task 6 runs once early (confirm green today) and once more, mandatory, as the closing
  check after every token-touching task above has landed — see Task 6's own entry for why "run it
  whenever" was wrong.

Tracks A and C can run interleaved with Track B; within a track, the order shown is required.

**Shared-file serialization across tracks:** `app/app/api/design-system/tokens/route.ts` and
`app/packages/design-system/src/token-writes.mjs` are edited in a fixed order — `5b` has landed,
`1b` landed as `3f3b19d`, next up for those files: `8a`. (The order
originally stated here was `1b → 5b → 8a`; it actually landed as `5b` then `1b`, which still
avoided any collision, just not in the documented sequence — corrected here rather than left
stale for `8a`'s benefit.) The `token-writes.mjs` additions are additive and low-risk, but
adjacent-line `route.ts` dispatch insertions collide under a concurrent editor in the same tree;
this rule exists for that case.

---

### Task 1: Seed-color tonal ramp generator (pure logic)

**[Task 1] — Done**, committed as `ecfc7ef` (`generateNeutralRamp`/`generateAccentPair`, vendored
HCT math — no new npm dependency, the originally-planned package can't import under plain Node
ESM). 23/23 tests passing. Archived spec: `docs/plans/2026-09-20-design-system-iteration-2/design-system-generate-ramp.md`.

---

### Task 1b: Wire the generator into brand authoring + editor

**Done**, committed as `3f3b19d` (seed section in the editor, `generate-from-seed` route action,
`applyGenerateFromSeed` + 4 tests). Archived spec: `docs/plans/2026-09-20-design-system-iteration-2/design-system-generate-from-seed.md`.

---

### Task 2: Live, direct-DOM preview in the editor

**[Task 2] — Done**, committed as `aa60b5c`. `css-var-naming.mjs` extracted from `build-tokens.mjs`
(client-safe, no `node:fs`); `ColorRow`/`SliderRow` set the CSS custom property live on
`document.documentElement`, clean it up on unmount, revert local state on a failed write
(`runWrite` now returns `Promise<boolean>`). 85/85 tests passing. Archived spec:
`docs/plans/2026-09-20-design-system-iteration-2/design-system-live-preview.md`.

---

### Task 3: Shared hover/press/focus state primitive

**[Task 3] — Done**, committed as `40d2fdd`. Helper function, not a component
(`components/state-overlay.mjs`'s `stateOverlayClassName()`), Button-only — audit found no other
component duplicates the pattern — plus a new pressed state closing the `pressedOpacity` gap. No
`<StateOverlay />` component, no CSS file, no forced-colors, no focus overlay (ring stays the only
focus treatment). 3/3 tests passing; visual eyeball check still open, see the archived spec's §7.
Archived spec: `docs/plans/2026-09-20-design-system-iteration-2/design-system-state-overlay.md`.

---

### Task 4: Dark/light theme switcher

**What already exists:** `build-tokens.mjs` already emits both `[data-theme="light"]` and
`[data-theme="dark"]` CSS blocks from `tokens.json`'s base + `dark` blocks (confirmed by reading
`app/app/design-tokens.generated.css`). `tokens.json`'s `dark` block already has real, distinct
values (not placeholders). The only thing hardcoding the app to dark-only is
`app/app/_components/StudioShell.tsx:11`'s literal `data-theme="dark"`. This task is almost
entirely UI + persistence, not token/build work — scope it that way, don't let it balloon into
touching the generator.

**Files:**
- Modify: `app/app/_components/StudioShell.tsx` — add `"use client"` (it owns the theme-mode
  state and sets `data-theme`; `sidebar`/`detail` pass through as opaque children props, so
  server rendering of content is preserved), and replace the hardcoded `data-theme="dark"` with
  state.
- Create: `app/hooks/useThemeMode.ts` — `() => { mode: "light" | "dark", toggle: () => void }`,
  backed by `localStorage` (key: `"guitar-tabs-theme"`), falling back to
  `window.matchMedia("(prefers-color-scheme: dark)")` on first load if nothing is stored yet.
- Create: `app/app/_components/ThemeToggle.tsx` — small client button consuming `useThemeMode`,
  rendered inside `AppHeader.tsx` (which stays a server component and imports the client button
  — the standard pattern). **Resolved: AppHeader is the toggle home** — it is the one fixed
  landmark regardless of which song is selected (per its own comment); `DetailToolbar.tsx` is
  song-scoped UI and the wrong home for a global toggle.
- Test: none required (a `localStorage`-backed React hook + a DOM attribute — this project's
  `node --test` runner has no DOM/browser harness, same reasoning `ui-fretboard-playhead`'s spec
  used; manual visual check is the real gate here).

**Interfaces:**
- Produces: `useThemeMode(): { mode: "light" | "dark"; toggle: () => void }`.
- Consumes (in `StudioShell.tsx`): replace `<div data-theme="dark" ...>` with
  `<div data-theme={mode} ...>` where `mode` comes from `useThemeMode()`.

- [ ] Write `useThemeMode.ts`.
- [ ] Wire it into `StudioShell.tsx`.
- [ ] Render the client `ThemeToggle` inside `AppHeader` (resolved above — don't reintroduce
      `DetailToolbar`; it's song-scoped UI, the wrong home for a global toggle).
- [ ] Manual check: toggle in the browser, reload the page, confirm it persisted; confirm every
      view (Sheet/Fretboard/Ascii, the `/design-system` editor itself) reads correctly in both
      modes — this is the first time light mode will actually be seen live, so this is also
      informal QA of Task 1's generated (or hand-authored, if Task 1 hasn't shipped yet) light
      values.
- [ ] `npm run verify`, `npm run stage`.
- [ ] Checkpoint commit.

---

### Task 5: Multi-brand inheritance with per-token reset-to-parent

**Split into three specs, per Tracks & sequencing above — this was one oversized task, now three
right-sized ones:**
- **5a (Track A, early):** parent-resolution + `deepMerge` + `resolveBrandTree`, golden test.
  Pure logic, no editor UI. Tagged `[5a]` below.
- **5b (Track A, early, after 5a):** `applyResetToParent`, delete-not-copy test. Pure logic.
  Tagged `[5b]` below.
- **5c (Track B, last):** the editor's inherited/overridden UI, landing on top of Task 8's staged-
  save UI. Tagged `[5c]` below. This is the piece that has to wait — everything else here can run
  in Track A well before Task 7/8 exist.

The backlog-board-migration decision (below) belongs to 5a's spec, since it's about the first
real child brand's data, not any UI.

`docs/BACKLOG.md` item 14, quoted directly (that file is not being edited right now — see the
note above): *"One main design system holds the source-of-truth token values. Any surface that
needs a different look — the backlog board, the eventual local processing UI, or anything else
deemed to need a different look and feel — gets its own child design system that can override
individual token values on top of the main one. Any overridden value must be resettable back to
the main system's value per-token, not an all-or-nothing fork."* Its listed dependency ("the
token playground reaching a stable, exportable set") is satisfied — the system shipped via PR
#20 — so this is unblocked now, just never re-surfaced. Its "Cons" section already asks the right
question: *"something that can tell 'this value was deliberately overridden' from 'this value is
just inherited'"* and *"build-time... vs. runtime"* — both resolved below rather than left open,
since leaving them open is exactly the kind of unstated judgment call this project's own
execution loop (§5.1 of `WEB_APP_WORKFLOW.md`) exists to catch.

**External validation for this design:** Shopify Polaris models a runtime theme switch as a named
token-overlay selection on its `AppProvider` (a `theme` prop accepting a `ThemeName`) rather than
a separate mechanism from its base tokens — i.e. real systems treat "theme" and "brand variant" as
the same underlying mechanism (a named overlay), which is exactly what reusing the `dark`-block
overlay shape for child-brand overrides below does. Not a new task, just confirms this design
direction rather than inventing a second, parallel mechanism.

**Resolved decisions (make these explicit in this task's own spec too, don't silently inherit
them from this plan without saying so):**
- **Build-time, not runtime.** `generateCSS` already runs at `predev`/`prebuild`/`prestage`
  (the earlier cutover) and reads one `active-brand.json`-selected directory. A child brand gets its
  own `active-brand.json` (or an equivalent per-surface build invocation) pointing at its own
  directory; there is no client-side merge, no extra runtime cost, and no new build-time
  dependency beyond the existing script.
- **"Inherited" vs. "overridden" is structural, not value-based.** A child brand's `tokens.json`
  contains *only the leaves it overrides* — if a leaf is absent, it's inherited from the parent,
  full stop. This is the same shape `tokens.json`'s own `dark` block already uses to overlay
  `semantic.color` onto the base tree (and `contrast.test.mjs` already has a working `deepMerge`
  for exactly this shape — reuse it, don't write a second merge function). Comparing values (e.g.
  "override happens to equal the parent's current value") is explicitly the wrong test — it
  can't tell "deliberately overridden to the same value" from "never overridden," and would break
  the moment the parent's value changes.
- **Reset-to-parent means deleting the leaf from the child's `tokens.json`**, not copying the
  parent's current value into it — copying would look identical today but silently stops
  inheriting future parent changes, which defeats the entire point of the feature.

**Files/Interfaces (`[5c]` only — 5a/5b's own file lists are archived with their specs, §
below):**
- `[5c]` Modify: `app/app/design-system/editor.tsx` / `FieldDescriptor` (`field-descriptors.mjs`)
  — `isModified` today means "differs from `tokens.default.json`"; a child brand's editor needs a
  parallel `isInheritedFromParent` so the UI can show "inherited" vs. "overridden" distinctly,
  and the revert button's label/behavior changes accordingly on a child brand. Lands after Task
  8's staged-save UI exists (Track B) — integrate with it, don't reintroduce auto-commit here.

**`[5a]` — Done**, committed as `1ddd888`. `resolveBrandTree`/`deepMerge` extraction/`demo-child`
fixture. `docs/BACKLOG.md` item 14 updated (backlog-board migration itself still open, pending a
schema extension — not this task's job). Archived spec:
`docs/plans/2026-09-20-design-system-iteration-2/design-system-brand-inheritance-5a.md`.

**`[5b]` — Done**, committed as `5acd34f`. `applyResetToParent` (delete-not-copy, prunes empty
ancestors) + `route.ts` dispatch case. Archived spec:
`docs/plans/2026-09-20-design-system-iteration-2/design-system-brand-reset-to-parent-5b.md`.

**`[5c]` — Done**, committed as `49cd7ad`/`08df1aa`. Full inherited-field editing with override
creation on child brands (`ensureOwnLeaf`, `applyWrite`/`applyBatchWrite`'s `ownTree` param,
`route.ts` child-brand guards, `isInheritedFromParent`). 98/98 unit tests, 15 passed/1 skipped
(pre-existing fixme) on `app/e2e/design-system/inherited.spec.ts` + `staged-save.spec.ts` — both
independently re-run and confirmed, not just reported. Archived spec:
`docs/plans/2026-09-20-design-system-iteration-2/design-system-inherited-overridden-5c.md`.

---

### Task 6: Token orphan-detection test

Sourced from external research (see `app/packages/design-system/SELF-EVALUATION.md`'s anti-pattern
section), not liftkit or the backlog. A generator (Task 1) makes it easy to leave old
hand-authored token paths orphaned when a brand switches over to generated values, and unused
tokens are a named, common source of design-system bloat ("add noise without adding value...
tempt developers to reach for the wrong thing"). Small and standalone — fits this project's
existing all-in-house `node --test` convention rather than pulling in an external linter
(Design Token Kit, a Stylelint plugin) for a 4-component package.

**Run this twice, not once — it's a gate, not a normal task (see Tracks & sequencing above):**
an early baseline run right after this test is written (confirm it passes on today's tree), and a
**mandatory** re-run as the closing check after every other token-touching task in this plan has
landed (1, 1b, 3, 5a, 5b — anything that adds/removes/renames a token leaf or a reference to one).
Running it once "whenever, including first" and never again — the earlier framing — wastes its
whole value: it exists specifically to catch what those later tasks might orphan.

**Scoping rules, spelled out so the first run doesn't go red on a technicality:**
- `dark.*` leaves inherit the same "must be referenced" requirement as their `semantic.*`
  counterparts — being under `dark.*` doesn't exempt a leaf, it's the same token, themed.
- A `component.*` or `semantic.*` leaf counts as "used" if it's referenced either directly (
  `var(--...)` in CSS/Tailwind arbitrary values) **or** as an alias target (`{path.to.token}`
  appearing inside another leaf's `$value`) — an alias reference from a component leaf back to a
  semantic token is real usage, not orphaned just because nothing references it by CSS var
  directly.
- `primitive.*` leaves are exempt from the "must be directly used" check — they're expected to be
  referenced only via `{...}` aliases from `semantic.*`, never directly by CSS var, by design.
- `dark.X` counts as used iff base path `X` counts as used (strip the `dark.` prefix before
  checking) — nothing references a `dark.*` path directly by design, so requiring direct
  references would red-line every themed token.

**[Task 6] — Done**, committed as `c2f3733`. `token-usage.test.mjs`, keyed off a new
`cssVarNameForPath` export from `build-tokens.mjs` (avoids a second, driftable copy of its naming
logic). Baseline passed with 6 documented orphans in `KNOWN_ORPHANS`
(`focusOpacity`, `slider.trackColor`, `space.1/.2/.4/.8` — the last four found by the baseline
run itself, missed by the hand audit). Archived spec:
`docs/plans/2026-09-20-design-system-iteration-2/design-system-token-orphan-detection.md`.
**Still a live gate — re-run `token-usage.test.mjs` after every future token-touching task**
(the closing-gate run, per the "run this twice" framing above); report any new orphan as a real
finding for that task, not a flaw in this test, per the scoping rules above.

---

### Task 7: Per-component sidebar navigation — Done (`3f6789b` sidebar, `842fe89` editor
fixes, `cfe4c3c` root-scoped sidebar states; verify unit 41/41 + design-system 84/84).
Archived specs: `docs/plans/2026-09-20-design-system-iteration-2/design-system-editor-sidebar.md`,
`docs/plans/2026-09-20-design-system-iteration-2/design-system-editor-fixes.md`. Deferred: colour picker on swatch click
(own spec — changes shared `ColorField`, not `editor.tsx`); first-screenshot "All" pill
unexplained (non-blocking, noted in the fixes spec).

---

### Task 8: Exception-vs-brand-wide edit scope, staged changes, explicit Save

User-requested (2026-09-20), not from liftkit or research. Builds on Task 7's per-component view.
Today, every field edit auto-commits on blur (`ColorRow`)/after a 200ms debounce (`SliderRow`) via
`runWrite` → `POST /api/design-system/tokens` → `router.refresh()`. This task changes that model
for edits made inside a Task 7 component panel: edits are held locally until an explicit "Save"
action, and each edit carries a scope choice — an **exception** (this component only) or a
**brand-wide style change** (cascades to every component sharing the same underlying token).

**How "brand-wide" is actually possible without new schema:** a `component.*` leaf like
`component.button.primaryBackground` is either an alias (`rawValue` = `"{semantic.color.accent}"`,
`isAlias: true` — both already computed by `buildFieldDescriptors`, `field-descriptors.mjs:88`)
or a literal. When it's an alias, "brand-wide" means writing the new value to the **aliased
semantic path** (`d.rawValue.slice(1, -1)`, e.g. `"semantic.color.accent"`) instead of to
`d.path` — every other component whose own leaf also aliases that same semantic path picks up
the change automatically, because `resolveValue` re-resolves the alias live; no new "which
components share this token" tracking needed, the existing reference graph already *is* that
information. "Exception" means the ordinary `applyWrite(d.path, value)` — unchanged from today's
behavior, just no longer auto-committed (see below).

**Resolved decision — when "brand-wide" isn't offered:** if `d.isAlias` is `false` (the field is
already a literal, not aliasing any shared token), there's nothing to cascade *to* — offer only
"exception" in that case, don't show a meaningless disabled-by-definition second option. Confirm
at spec time whether this should show as a disabled radio (visible but greyed, with a tooltip
explaining why) or be hidden entirely — a real UX call, not fixed here.

**"Ability to reverse to brand" for an exception:** this is the existing Revert button/`applyReset`
— already restores a leaf to `tokens.default.json`'s value at that path, which for an
never-touched component leaf is the alias reference back to the shared semantic token. Confirm at
spec time that `tokens.default.json` still holds that leaf as an alias (i.e. nobody has previously
used "Set as default" — `applySetAsDefault` — to bake a literal into the defaults file for that
exact path); if it has, Revert legitimately won't restore the alias, and that's correct existing
behavior, not a bug this task needs to fix.

**Split into two specs, per Tracks & sequencing above:**
- **8a (Track B, right after Task 7):** `applyBatchWrite` + its tests + the `batch-write` route
  action. Pure logic and API surface, no editor UI. Tagged `[8a]` below.
- **8b (Track B, after 8a):** the pending-edits state, Save bar, and scope radios inside Task 7's
  panel. Tagged `[8b]` below.

**Resolved decision — unsaved pending edits across navigation:** pending edits **persist across
navigation** — switching to a different component or closing/reopening the panel does not discard
them — until an explicit Save or an explicit Discard action. No confirm dialog on navigation away.
This removes the single biggest open unknown in 8b and makes it directly plannable: 8b's pending-
edit state lives at the `Editor` level (already implied by "held at the `Editor` component level"
below), keyed by path across all four components at once, not reset when `selectedView` changes.
Add an explicit "Discard changes" action alongside "Save changes (`N`)" so there's a deliberate way
to drop pending edits, since silent navigation no longer does it implicitly.

**Open item — scope-selection granularity, resolve at 8b's spec-writing time:** the design below
still describes a per-field exception/brand-wide radio. Consider instead a single Save-bar-level
scope choice ("apply as: exceptions / brand-wide where possible") with per-field override only
where `isAlias` differs — fewer states to hold (`Map<path, value>` + one scope flag, vs.
`Map<path, {value, scope}>`), less UI surface for what's already the most decision-dense part of
this plan. Default to the bulk toggle with per-field override as the fallback unless 8b's spec
finds a concrete reason per-field-only is required.

**Files:**
- `[8a]` Modify: `app/app/api/design-system/tokens/route.ts` — new `action: "batch-write"`,
  `{ edits: { path: string; value: string; scope: "exception" | "brand" }[] }` (scope travels
  with each edit; 8a resolves it — see Interfaces).
- `[8a]` Modify: `app/packages/design-system/src/token-writes.mjs` — add
  `applyBatchWrite(tokensTree, edits: { path, value, scope }[])`: validates every edit first
  (reusing `validateWriteValue`), resolves a `"brand"`-scoped edit to its alias target read from
  the tree at that path (fail-closed: `"brand"` on a non-alias path fails the whole batch), and
  applies **all-or-nothing** — if any single edit fails validation, none are written. A
  partially-applied explicit Save would be worse than today's auto-commit model, not an
  improvement; don't ship a partial-apply path.
- `[8a]` Test: `token-writes.test.mjs` — `applyBatchWrite` cases: all-valid batch applies every
  edit; one invalid edit in a batch of three applies none of them; a `"brand"`-scoped edit
  resolves to the alias target path, not the originating component path (this is the core new
  behavior — test it directly, not just "batch write works").
- `[8b]` Modify: `app/app/design-system/editor.tsx` (Task 7's component detail panel) — replace
  `ColorRow`/`SliderRow`'s auto-commit-on-blur/debounce with local pending-edit state: a
  `Map<path, { value: string; scope: "exception" | "brand" }>` (or equivalent — see the open item
  above on whether `scope` is per-field or lives once on the Save bar), held at the `Editor`
  component level, persisting across navigation per the resolved decision above. Task 2's
  live-DOM-preview mutation (`document.documentElement.style.setProperty`) still fires on every
  change regardless of pending/saved state — **this task changes when a value is persisted to
  disk, not the instant-visual-feedback mechanism Task 2 built.** State the supersession
  explicitly in 8b's spec: Task 2's auto-commit-on-blur is what's being replaced here; Task 2's
  live-preview effect is being kept and reused as-is.
- `[8b]` Add a "Save changes (`N`)" button, visible only when the pending-edits map is non-empty,
  that sends every pending edit in one batch to `[8a]`'s `batch-write` action; a "Discard changes"
  action alongside it, per the resolved decision above.

**Interfaces:**
- `[8a]` Produces: `applyBatchWrite(tokensTree, edits: { path: string; value: string; scope:
  "exception" | "brand" }[]): { ok: true,
  tree } | { ok: false, error }` — same result shape as `applyWrite`/`applyResetAll`, so
  `route.ts` handles it identically to the existing actions. Scope resolution lives here, not in
  the editor: `"exception"` writes `path` as-is; `"brand"` resolves to the alias target read
  from the tree at that path.
- `[8b]` Consumes (in `editor.tsx`): for a pending edit on a `FieldDescriptor d`, send
  `{ path: d.path, value, scope }` — no path math in the editor; 8a owns `brand`-to-alias-target
  resolution.

**`[8a]`**
- [ ] Write `applyBatchWrite` + its tests (all-valid, one-invalid-rejects-all, brand-scope
      resolves to the alias target).
- [ ] Run, confirm failing, implement, confirm passing.
- [ ] Wire the route action.
- [ ] `npm run verify`.
- [ ] Checkpoint commit.

**`[8b]`**
- [ ] Wire the pending-edits state (persisting across navigation) + Save/Discard buttons into
      Task 7's detail panel.
- [ ] Wire the scope selection per the open item above — resolve bulk-vs-per-field in 8b's spec
      before implementing, not while implementing.
- [ ] Wire the exception/brand-wide distinction, disabled/hidden per the earlier resolved decision
      when `d.isAlias` is `false`.
- [ ] `npm run verify`; manually: edit two fields on one component with different scopes, confirm
      neither writes to disk until Save is clicked, confirm the "brand" one changes a second
      component that shares the same token, confirm Revert on a pending (unsaved) edit discards
      the staged value, confirm Revert post-Save restores the `tokens.default.json` value, confirm
      switching components and coming back preserves the pending edits, confirm Discard clears
      them.
- [ ] Checkpoint commit.

---

### Task 9: Per-token descriptions, manually saved

User-requested (2026-09-20), independent of liftkit/backlog/research and of Tasks 1-8 —
**branches off `task/design-system-brand-data`, not off this plan's own Track B chain**
(confirm that branch still holds `tokens.json`/`field-descriptors.mjs`/`token-writes.mjs`/
`editor.tsx` before starting; if Task 7's sidebar hasn't landed there, scope this to "All
variables" only — the sidebar view picks up descriptions for free once Task 7 lands, since it
reads the same field data).

**User story:** every variable in `/design-system` shows its current value plus a one-line
"where this is actually used" note. Click in, edit the note, hit Save — descriptions never
auto-save on blur, unlike value edits. Persists across reload, shows in every view.

**Known issue to fix, not just implement around:** `token-writes.mjs`'s `stringifyTokens` only
recognizes a 2-field (`$value`+`$type`) leaf shape and collapses it to one line; adding a 3rd
field (`$description`) needs that matching logic extended, or every described leaf reformats to
multi-line and the "diff shows only the edited line" acceptance check goes false.

**Resolved, not a fix needed:** value-reset/promote-to-default already only ever touch `$value`,
never the whole leaf — a description is never reset or cleared by those actions today. State this
explicitly in the task's own spec as a documented decision, don't leave it as an unstated
accident.

**Spec not yet written** — draft discussion is in this session's history; write the real spec
(scope/file allowlist/acceptance, S-tier per §3) immediately before this task starts, per this
plan's usual rule (specs go stale fast — don't draft ahead of when work actually begins).

---

### Task 10: Dark-theme values shown and editable next to light

User-requested (2026-09-21), independent of Task 4 (app-wide theme toggle) despite both
mentioning "dark"/"light" — unrelated features that happened to get tangled together in an early
draft of Task 4's spec and were split apart once noticed.

**User story:** every `semantic.color` field in `/design-system` shows its dark-theme override
next to its light value on the same row, independently editable with its own Revert/Set-as-default
— today the dark value is invisible, only changeable by hand-editing `tokens.json`.

**Resolved, not a fix needed:** the write path (`applyWrite`/`applyReset`/`applySetAsDefault`/
`applyResetAll`) already handles `dark.*` paths with zero changes — confirmed by reading
`collectLeafPaths`, a generic path walker with no `dark`/`primitive` filtering. Only
`field-descriptors.mjs` (which currently skips `dark.*` entirely) and `editor.tsx`'s UI need
changes.

**Spec written**: `docs/specs/design-system-dark-value-display.md`, ready to relay. Root-brand
only — no child brand has ever defined a `dark` block, scoped out explicitly rather than left an
unstated gap.

---

## Self-Review

**Spec coverage:** liftkit review findings map 1:1 — generative color → Task 1/1b, live preview →
Task 2, `StateLayer` → Task 3, theme switcher (user's explicit add) → Task 4, multi-brand
inheritance + per-token reset (user's explicit add, = `BACKLOG.md` item 14) → Task 5, orphan-token
detection (research finding) → Task 6, per-component sidebar (user's explicit add) → Task 7,
exception-vs-brand-wide staged edits with explicit Save (user's explicit add) → Task 8. No gaps.
Research findings assessed as "overkill for now"
(Storybook-class docs, token versioning/changelog, `prefers-reduced-motion` tokens) are recorded
in `SELF-EVALUATION.md` rather than turned into tasks nobody asked for — deliberately not adding
scope the project doesn't need yet, per this session's own bloat lessons.

**Placeholder scan:** Task 1's tone indices are explicitly flagged as "verify against real values,
don't trust blind" rather than asserted as correct — that's a known open question for the task's
own spec to resolve empirically (via the contrast test), not a placeholder standing in for
missed work. Task 2/3/4 each name the exact file to read before writing code, where this plan
doesn't already know the answer (CSS var naming convention, other components' current hover CSS,
`StudioShell.tsx`/`AppHeader.tsx`'s header convention) — consistent with this session's own lesson about not
drafting specs from assumption.

**Type consistency:** `generateNeutralRamp`/`generateAccentPair` (Task 1) return shapes are
consumed as-is by `applyGenerateFromSeed` (Task 1b) with no renaming. `useThemeMode`'s return
shape (Task 4) is used directly in `StudioShell.tsx` with no renaming.

**Task independence, explicitly — superseded by Tracks & sequencing above:** an earlier version of
this plan claimed every task was "independently shippable and independently revertible" and that
Task 6 could "run whenever, including first." Neither survived scrutiny: five tasks (1b, 2, 5c, 7,
8) touch `editor.tsx`, four of them in the same strict order within Track B; Task 6's entire value
is catching orphans *introduced by* the other token-touching tasks, so running it once, early, and
never again wastes it — it now runs early as a baseline and again as a mandatory closing gate.
Five tasks share `build-tokens.mjs`/`token-writes.mjs` (1, 1b, 5a, 5b, 8a) — Track A's ordering
(1 → 5a → 5b → 3) exists specifically so 5a/5b aren't written against a stale picture of those files. See
**Tracks & sequencing** for the actual required order; nothing in the numbered Task list below
should be read as "any order."

**Tasks 7 and 8 have a hard, explicit dependency chain, unlike most of the rest of this plan:**
Task 8 restructures `editor.tsx`'s commit model (auto-commit-on-blur → staged edits + explicit
Save) *inside the per-component panel Task 7 creates* — Task 8 cannot be written or reviewed
meaningfully before Task 7 exists, and Task 8's own spec explicitly supersedes Task 2's
auto-commit behavior (while keeping Task 2's live-preview mutation mechanism) — Track B sequences
1b → 2 → 7 → 8a → 8b → 5c strictly, not "any order."
