# Task tiering (`docs/WEB_APP_WORKFLOW.md` §1–2)

Part of the `app/` workflow — see `docs/WEB_APP_WORKFLOW.md` for the index.

## 1. Classify the task first

- **Trivial** — copy edit, one-line fix, a color/spacing tweak, a well-understood one-file
  change with no real ambiguity.
- **Bounded** — a well-scoped change to an existing flow: a new endpoint, a schema column, a
  fix to existing logic.
- **Architectural** — a new subsystem, or a restructuring that changes how components fit
  together.

When in doubt, pick the heavier tier.

## 2. What each tier does

**Trivial:**
- No spec file, no brainstorming.
- Write a 2-3 sentence instruction, relay it directly to the execution model (musespark via
  OpenCode).
- Done when: `npm run verify` passes, then make a checkpoint commit (§4, `docs/web-app-workflow/execution-loop.md`).

**Bounded:**
- Write one spec file to `docs/specs/` using the template in §3 (`docs/web-app-workflow/spec-template.md`).
- Run the execution loop in §5 (`docs/web-app-workflow/execution-loop.md`).

**Architectural:**
- `superpowers:brainstorming` → `superpowers:writing-plans` first.
- Each task in the resulting plan becomes its own spec file, then runs the execution loop in §5
  exactly like a Bounded task. **Split a large task at a genuine seam** (e.g. testable logic vs.
  untestable UI, or a hard ordering dependency) — not by size alone. Splitting has real value
  (parallelizable, independently revertible, serializable across shared files) but each split
  fragment pays the full template weight and introduces its own seam-bug risk (an
  interface/ownership mismatch between fragments that didn't exist before the split, observed in
  practice). Split when there's a real boundary, not as a default reflex.
- **Every task entry in the plan itself carries a one- or two-sentence user story**, not just the
  spec written for it later — the plan is where scope/sequencing gets decided, so that's also
  where "does this still make sense from the user's side" needs to be checkable, before a task's
  spec exists yet.
- **Every plan gets a companion status page**, created alongside the plan, not after the fact,
  living in `docs/__PLANS/` — separate from the plan doc itself (which stays in
  `docs/superpowers/plans/`) so status pages have one common home regardless of which directory a
  given plan's own `.md` lives in: `docs/__PLANS/<plan-slug>-status.html` (a ~15-line shell loading
  `_shared/plan-status.css`/`.js` — copy an existing one as the starting point, it never changes
  again once created) plus `<plan-slug>-status.data.js` (a plain `PLAN_META`/`PLAN_TASKS` array —
  the only file that changes). Update the data file as part of each task's checkpoint commit, same
  moment the plan doc's own task entry gets collapsed to one line (§5a, `docs/web-app-workflow/execution-loop.md`) —
  same fact, two places, one commit. **Deliberately not live-updating**: a page opened via
  `file://` can't read the filesystem or git on its own, so this is a hand-kept snapshot, not a
  dashboard — don't build a regeneration script or local server for this; the parsing risk (the
  plan's own status prose is inconsistently worded — "Done", "[Task N] — Done", inline in a
  heading) outweighs the benefit of automating something that's already cheap to keep current by
  hand.

`systematic-debugging` and `requesting-code-review`/`receiving-code-review` remain available as
optional tools for any tier, not mandatory gates.
