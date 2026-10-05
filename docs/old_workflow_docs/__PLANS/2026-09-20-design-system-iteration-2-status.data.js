// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Design System Iteration 2",
  planFile: "docs/plans/2026-09-20-design-system-iteration-2/2026-09-20-design-system-iteration-2.md",
};

// Test counts are new-tests-added-by-this-task: the cumulative suite total
// was measured directly (a worktree checked out at each landing commit,
// `node --test` run for real, not a source-line grep — a grep-based first
// pass undercounted badly wherever a test file generates cases in a loop,
// e.g. generate-ramp.test.mjs runs 23 tests from source that greps as ~2-4
// literal `test(` calls) and diffed against the true PRIOR commit in real
// landing order, which is NOT plan-numeric order — Track A (1 -> 5a -> 5b ->
// 3 -> 6) landed before Track B's 1b, confirmed via `git log`. Reconciles
// against `npm run verify`'s own total (98, current) within 1: summing every
// delta below plus the pre-plan baseline (45) gives 99, not 98 -- Task 7's
// landing showed a net -1 (85 -> 84 tests), likely one test consolidated or
// renamed during that commit rather than a task miscounted here; noted
// rather than silently absorbed into a wrong number somewhere.
const PLAN_TASKS = [
  { id: "1",  name: "Seed-color tonal ramp generator", status: "done", detail: "<code>ecfc7ef</code> · 23 new tests" },
  { id: "1b", name: "Wire generator into brand authoring + editor", status: "done", detail: "<code>3f3b19d</code> · 4 new tests" },
  { id: "2",  name: "Live, direct-DOM preview in the editor", status: "done", detail: "<code>aa60b5c</code> · UI only, no new tests" },
  { id: "3",  name: "Shared hover/press/focus state primitive", status: "done", detail: "<code>40d2fdd</code> · 3 new tests" },
  { id: "4",  name: "Dark/light theme switcher", status: "done", detail: "<code>e0ac89e</code> · UI + 3 Playwright, 98/98 + 4/4 e2e, human visual checkbox passed — closed" },
  { id: "5a", name: "Brand inheritance: parent resolution + merge", status: "done", detail: "<code>1ddd888</code> · 3 new tests" },
  { id: "5b", name: "Brand inheritance: reset-to-parent", status: "done", detail: "<code>5acd34f</code> · 5 new tests" },
  { id: "5c", name: "Inherited vs. overridden editor UI", status: "done", detail: "<code>49cd7ad</code>/<code>08df1aa</code>/<code>8bae5bf</code> · 7 new tests, 15/1-skip e2e — independently re-verified" },
  { id: "6",  name: "Token orphan-detection test", status: "done", detail: "<code>c2f3733</code> · 2 new tests, live gate on every token-touching task" },
  { id: "7",  name: "Per-component sidebar navigation", status: "done", detail: "<code>3f6789b</code> + bugfix rounds <code>842fe89</code>/<code>cfe4c3c</code> · UI only, no new unit tests" },
  { id: "8a", name: "Batch-write logic + route action", status: "done", detail: "<code>134e40d</code> · 7 new tests" },
  { id: "8b", name: "Pending edits, scope choice, explicit Save", status: "done", detail: "<code>650310a</code> + follow-ups <code>4884412</code> · 0 new unit tests, 10 Playwright (1 fixme)" },
  { id: "9",  name: "Per-token descriptions, manually saved", status: "done", detail: "<code>7482d25</code>/<code>020d8c8</code> · 6 new tests, 4 new e2e, 6 real seeded descriptions, human visual checkbox passed via screenshot" },
  { id: "10", name: "Dark-theme values shown next to light", status: "done", detail: "<code>787ad88</code> · 3 new tests, 4 new e2e, human visual checkbox passed via screenshot" },
];
