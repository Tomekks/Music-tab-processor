# Prep notes: Task 5 — editor UI generalize beyond "the default brand"

**Status: NOT a ready spec.** This is a skeleton + findings-so-far, written ahead of its actual
dependencies (Tasks 2/3/4) landing, per an explicit decision to do prep/thinking now and write the
real tech spec later. **Do not relay this to an execution model.** A future session should read this,
re-run the audit against whatever `editor.tsx` looks like once 2/3/4 have actually shipped, and turn
it into a real spec following `docs/web-app-workflow/spec-template.md` — most of what's below will
need re-verifying, not just copying forward.

## Why this can't be a real spec yet

Task 5's whole job is auditing `editor.tsx` for anything that still assumes a single, fixed brand.
The three specs ahead of it in the queue (`design-system-brand-write-scoping.md`,
`design-system-brand-crud.md`, `design-system-brand-deploy-status.md`) are about to add a meaningful
amount of *new* code to that exact file — the New/Duplicate/Delete controls, the undeployed-changes
badge, the banner. None of that exists yet. Auditing today's file can't catch brand-assumption bugs in
code that hasn't been written — a real Task 5 spec has to be written against the file *after* those
three land, not before. Writing it now would mean re-doing the audit anyway once they ship, which is
the same reason the plan originally marked this task "blocked on 1, 2, 3, 4."

## What today's audit already found (still true, worth carrying forward)

Read `app/app/design-system/editor.tsx` (1108 lines) and
`app/packages/design-system/src/field-descriptors.mjs` fresh for this. Findings:

- **The one hardcoded string the plan called out is already fixed.** Task 1's own spec required
  changing `"Live brand values for the default brand."` to name the actually-selected brand — confirmed
  done: it now reads `` `Live brand values for ${humanize(selectedBrand)}.` ``. Nothing left to do
  there.
- **`isInheritedFromParent`, `isChildBrand`, `parentName` are all computed fresh per-brand, with no
  hardcoded brand name anywhere in the calculation.** `isInheritedFromParent` comes from
  `field-descriptors.mjs:111` (`ownTree !== null && getLeaf(ownTree, path) === null`) — purely a
  function of whichever brand's own sparse tree was passed in, nothing about it assumes "the child
  brand" means one specific slug. `isChildBrand`/`parentName` are props threaded from `page.tsx`,
  derived from `resolveBrandTree`'s `parentBrandDir`, same story. **No other hardcoded "default"/"Main"
  assumption was found in a pass over the file** (grepped for `isInheritedFromParent`, `isChildBrand`,
  `parentName`, `default`, `"Main"` — nothing else turned up).
- **The plan's own flagged risk is real and still open, but it's a testing gap, not a code bug.**
  `Editor` already gets a full unmount/remount on every brand switch (`key={selectedBrand}` in
  `page.tsx`, shipped with Task 1) specifically so no state leaks across a switch — this mechanism has
  only ever been exercised switching between `default` and the single existing child, `demo-child`.
  It's never been exercised switching between *two different child brands* in the same session,
  because a second child brand has never existed until now. The plan's own text: "the one real risk
  worth testing explicitly is whether the inherited/overridden UI ... actually holds up correctly when
  you switch between two different child brands in the same browser session, not just load one in
  isolation." Once Task 2/3 (create/duplicate) ship, this becomes trivially testable for real (create
  a second child brand, switch between it and `demo-child`, assert the inherited/overridden captions
  and Revert-to-parent both reflect the newly-selected brand correctly) — before that, it would've
  needed a second hand-authored fixture brand just for the test, which is a worse test (fixture-only,
  never exercised through the real creation path).

## What must be re-audited once 2/3/4 land (can't be done yet)

- The New/Duplicate/Delete inline controls (`design-system-brand-crud.md`'s addition) — check their
  copy for any accidental "this brand" vs. a hardcoded name, and whether they read correctly when
  `selectedBrand` is a child brand vs. root.
- The undeployed-changes badge/banner (`design-system-brand-deploy-status.md`'s addition) — same
  check.
- A fresh full-file grep for `"default"`/`"Main"`/brand-name-shaped string literals, since line numbers
  and possibly new copy will have shifted after three specs' worth of edits land.

## Skeleton for the real spec (sections per spec-template.md — fill in for real once unblocked)

0. **User story** — likely something like: "you switch between any two brands, including two
   different child brands, and every caption/label/button you see is unambiguously about the brand
   you're currently looking at — never a stale assumption from whichever brand you were on before, or
   a hardcoded reference to Main."
1. **Context** — re-read `editor.tsx` fresh at that point; re-confirm the findings above still hold;
   read the actual shipped New/Duplicate/Delete + badge/banner code for the first time.
2. **Scope** — likely small: any remaining copy fixes found by the fresh audit, plus the new
   cross-child-brand-switch e2e case.
3. **Non-goals** — Task 6 (deferred), any UI restructuring beyond copy/label correctness.
4. **Bad-case behavior** — TBD once the actual audit findings are known.
5. **Forbidden patterns** — standard (no bare except, no `.env`, no new dependency — this is a
   copy-fix task, shouldn't need one).
6. **File allowlist** — `editor.tsx` at minimum; possibly `field-descriptors.mjs` if something there
   also needs generalizing (not expected, but confirm on the fresh read).
7. **Acceptance criteria** — `npm run verify` + a new/extended e2e case covering the two-different-
   child-brands switch described above; human checkbox only if a genuinely subjective copy/visual
   judgment call remains (unlikely for a task this size).
8. **Stop-conditions** — if the fresh audit finds something bigger than "copy fixes + one test"
   (i.e. the plan's own "Trivial-to-Bounded" sizing turns out wrong), stop and re-scope rather than
   force it into this size.
