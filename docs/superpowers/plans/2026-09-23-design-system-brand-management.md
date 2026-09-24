# Design system: brand management

**Context:** `CONTEXT.md` (glossary) · `docs/adr/0001-brand-management-architecture.md` (the locked decisions this plan builds on).

## Goal

Give the design system real, user-facing brand management — create, switch, edit-without-leaking, delete — on top of the already-shipped inheritance mechanism (Tasks 5a/5b/5c), so it can serve more than one project's look from one tool.

## Decisions (grill session, locked — see ADR 0001)

Flat hierarchy, no chains — every brand resets against Main, however it was created. New = empty sparse tree (live-inherits from Main forever). Duplicate = every field frozen as an explicit override at the source's current values, at any brand including Main, with no ongoing link back to that source. Main can never be deleted. No versioning, no multi-format export, no editor rewrite — CSS-only, always-latest.

## Explicitly out of scope for this plan

- **Cross-repo distribution** (how a future SvelteKit/movie-site project actually fetches a brand's CSS) — needs its own brainstorm/grill session, per your own call.
- **Extracting the design system into its own standalone repo** — eventual, not now.
- **Slider/control UX cleanup** — already tracked as `docs/BACKLOG.md` #32, unrelated to brand management itself.

## Tasks

### Task 1 — Brand switcher (list + select)

*User story: as the person maintaining brands, I can see every existing brand and pick which one I'm currently viewing/editing, instead of hand-editing `active-brand.json`.*

New `list-brands` read action (enumerates `brands/*` directories); editor UI gets a brand picker alongside today's section sidebar. Selecting a brand threads its slug through every existing API call instead of always resolving root-only. Deliberately **does not** touch `active-brand.json` or what the live web app renders — that's Task 6, a separate concern (which brand you're *editing* vs. which brand a *deployed app* loads are different questions).

**Size: Bounded.** Real but contained — one new read action, state + a picker component, and threading a `brand` parameter through calls that currently assume root.

### Task 2 — Create brand: New

*User story: as the brand maintainer, I click "New brand," name it, and get an empty brand that inherits everything from Main until I touch a field myself.*

New `create-brand` action (`{ mode: "new", name }`): validates the name (slug format, uniqueness against existing brand directories), writes an empty `{}` `tokens.json`, refreshes the brand list, auto-selects the new brand.

**Size: Bounded.** Mostly plumbing on top of the existing sparse-tree model — the interesting part is name validation and directory creation, not new resolution logic.

### Task 3 — Create brand: Duplicate

*User story: as the brand maintainer, I click "Duplicate" on any brand — Main included — name the copy, and get a brand that starts exactly where the source is today, fully independent from that instant on.*

Same `create-brand` action, `{ mode: "duplicate", name, source }`: resolves the source brand's full merged tree (reusing `resolveBrandTree`), writes every leaf as an explicit override in the new brand's `tokens.json` — a fully-populated tree, not sparse. One real open question for the spec to settle: does a duplicated alias field (e.g. `component.button.radius: {semantic.radius.base}`) freeze as the **resolved literal** value, or keep the alias string pointing at the new brand's own `semantic.radius.base`? Frozen-literal matches "fully independent," and is the plan's default assumption — flag it explicitly in the spec rather than leaving it implicit.

**Size: Bounded.** The mechanism is a straightforward resolve-then-write-everything; the alias-freezing question above is the one design decision worth a sentence in the spec, not a blocker.

### Task 4 — Delete brand

*User story: as the brand maintainer, I delete a brand I no longer need and everything about it disappears — no leftover files, no dangling selection, and I can't delete Main by mistake.*

New `delete-brand` action: refuses on Main (hard guard, not just a UI-disabled button — the API itself must reject it), recursively removes the brand's directory, refreshes the brand list, falls back to Main if the deleted brand was the one currently selected in the editor. UI confirmation step before the destructive call (this is real, unrecoverable data loss for that brand's overrides).

**Size: Bounded.** Filesystem deletion + guard rails + a confirm step — no new resolution logic.

### Task 4.5 — `editor.tsx` modular split (`docs/BACKLOG.md` #32)

*User story: as whoever works in this file next (Task 5's audit, or the future editor UI/UX plan), I can find and change one concern — a field row, the brand switcher, a write handler — without holding the other three in my head at the same time.*

Flagged in the backlog after Task 10: `FieldRow` has grown to ~12 props branching on staged-vs-immediate writes, child-brand inheritance, dark-value display, and per-token descriptions, and `editor.tsx` itself is pushing 1,100+ lines even before Tasks 2/3/4 add the New/Duplicate/Delete controls and deploy-status banner. Split into a folder, not more top-level files: `editor/index.tsx` (state + composition + the render shell — `page.tsx`'s `import ... from "./editor"` needs no change, since `"./editor"` resolves to `"./editor/index.tsx"` automatically), `editor/field-row.tsx` (`FieldRow` and its directly-related sub-pieces), `editor/brand-switcher.tsx` (the brands `<nav>`, badges, New/Duplicate/Delete controls, deploy-status banner — the single area every one of Tasks 2/3/4's specs touches, so also the area that will have grown the most by the time this lands), and `editor/actions.ts` (the write/reset/save handlers, `postAction`, `ApiResult`, `PendingEdit`).

**Size: Bounded.** Pure reorganization — no behavior change, no new logic. The risk is entirely mechanical (import wiring, prop threading across the new file boundaries), not conceptual.

### Task 4.7 — Decouple test fixtures from the real `brands/` directory

*User story: as the brand maintainer, deleting any brand I own (including one I forgot was there) never breaks the test suite, because tests never depend on a permanent brand existing in the same real, user-visible directory as my own data.*

Discovered while verifying Task 4.5: creating a real brand ("heyhey") through the UI broke two tests that assumed a fixed, closed brand list — an assumption that directly contradicts the app's own rule (every brand except Main is freely creatable/deletable, down to zero). The narrow instances were fixed in commit `1ab56cd`, but `demo-child` itself — a checked-in fixture living in the same live, user-deletable `brands/` directory as real data — is still relied on as "permanent" by several other test files (`dark-values.spec.ts`, `inherited.spec.ts`, `descriptions.spec.ts`, and likely others). Fix: those tests create and clean up their own temporary child-brand fixture, the same pattern `brand-crud.spec.ts`'s own tests already use (`__test-tmp-*` brands, created and destroyed per test) — not a permanent fixture anywhere in `brands/`.

**Size: Bounded.** Mechanical rewrite of each affected test's setup/teardown; no application code changes expected.

### Task 5 — Editor UI: generalize beyond "the default brand"

*User story: as the brand maintainer, everything I see and edit while a non-Main brand is selected is unambiguously that brand's own state, with nothing hardcoded to assume Main is the only brand that exists.*

The editor's own copy currently says "Live brand values for **the default brand**," written before real multi-brand switching existed. Audit `editor.tsx` for anything assuming a single, fixed brand (that string, any brand-name-in-a-comment, the inherited/overridden caption logic) and generalize it now that Task 1 lets you actually switch between brands mid-session — something the inheritance mechanism has only ever been tested against via the single, static `demo-child` fixture, never live switching.

**Size: Trivial-to-Bounded.** Mostly copy fixes; the one real risk worth testing explicitly is whether the inherited/overridden UI (`isInheritedFromParent`, Revert-to-parent) actually holds up correctly when you switch between two *different* child brands in the same browser session, not just load one in isolation.

### Task 6 — Deferred: simultaneous multi-brand CSS for live consuming apps

*User story: as a developer, I can point a specific route or app at a specific brand's tokens without rebuilding the whole project's active brand, so the web app and a future control panel can each show their own look at the same time.*

`buildActiveBrand()` today generates exactly one CSS file for exactly one "active" brand, applied globally to `:root` — a build-time, all-or-nothing swap. This task would extend `generateCSS` to emit every real brand's CSS in one file, each scoped under `[data-brand="<slug>"]` instead of only Main under `:root` — mirroring the pattern already proven for light/dark theming (`[data-theme="dark"]`).

**Size: Architectural.** This changes the shape of the build pipeline's core output — every existing consumer currently assumes "there is one active brand" — and deserves its own careful spec and review, not a quick add-on. **Recommend deferring this task until the control panel (or another real second consumer) actually exists** — building runtime brand-scoping speculatively, before there's a second surface to prove it against, is exactly the kind of premature machinery this project's own `AGENTS.md` proportionality note warns against.

## Sequencing

1 → 2 → 3 → 4 → 4.5 → 5, in order (each depends on the brand switcher existing to be testable end-to-end; 4.5 depends on 2/3/4's new UI landing first, so its split reflects the file's real final shape instead of needing a second pass). 4.7 is independent of that chain — it's a test-hygiene fix, not a feature — but should land before Task 5's audit if practical, since 5 also touches test files that may be affected. 6 is independent and deferred — pick it up separately when a real second consumer exists, not as part of this pass.

## Verification shape (every task)

`npm run verify` + a new Playwright case (or cases) in its own `app/e2e/design-system/brand-management.spec.ts`, following this project's existing real-write discipline (assert clean `tokens.json`/brand directories before each run, restore after — same pattern as `staged-save.spec.ts`/`dark-values.spec.ts`/`descriptions.spec.ts`). Human visual checkbox once per task-batch, not per task. Checkpoint commit + spec archive per task, per this repo's own `docs/WEB_APP_WORKFLOW.md` workflow.

## Success

Every task above shippable and independently testable; a brand can be created two ways, edited without leaking, and deleted cleanly, entirely through the UI — no hand-editing `active-brand.json` or brand directories required for any of it.

## Note for the next plan

Everything in this plan is CRUD/infrastructure — creating, editing, and deleting a brand's token
*values*, never what those values should actually *be*. The next planning pass after this one lands
is expected to be about the design system's own visual/UX quality (real color palettes, typography
pairings, UX guidance for the editor itself) rather than more plumbing. When that starts: the
`ui-ux-pro-max` skill is installed locally (`.claude/skills/ui-ux-pro-max/`) — a searchable database
of UI styles, color palettes, font pairings, and UX guidelines (`search.py "<query>" --domain
style|color|typography|ux|...`). Worth consulting then, not before — nothing in Tasks 1-6 above
involves a visual design decision it would inform.
