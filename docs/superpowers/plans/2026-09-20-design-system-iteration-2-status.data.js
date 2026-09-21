// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Design System Iteration 2",
  planFile: "docs/superpowers/plans/2026-09-20-design-system-iteration-2.md",
};

const PLAN_TASKS = [
  { id: "1",  name: "Seed-color tonal ramp generator", status: "done", detail: "<code>ecfc7ef</code> · 23/23 tests" },
  { id: "1b", name: "Wire generator into brand authoring + editor", status: "done", detail: "<code>3f3b19d</code>" },
  { id: "2",  name: "Live, direct-DOM preview in the editor", status: "done", detail: "<code>aa60b5c</code>" },
  { id: "3",  name: "Shared hover/press/focus state primitive", status: "done", detail: "<code>40d2fdd</code>" },
  { id: "4",  name: "Dark/light theme switcher", status: "todo", detail: "Not started — independent, only end-user-visible task left" },
  { id: "5a", name: "Brand inheritance: parent resolution + merge", status: "done", detail: "<code>1ddd888</code>" },
  { id: "5b", name: "Brand inheritance: reset-to-parent", status: "done", detail: "<code>5acd34f</code>" },
  { id: "5c", name: "Inherited vs. overridden editor UI", status: "progress", detail: "Spec ready (<code>7944639</code>), full inherited-field-editing support — awaiting execution" },
  { id: "6",  name: "Token orphan-detection test", status: "done", detail: "<code>c2f3733</code> · live gate on every token-touching task" },
  { id: "7",  name: "Per-component sidebar navigation", status: "done", detail: "<code>3f6789b</code> + bugfix rounds <code>842fe89</code>/<code>cfe4c3c</code>" },
  { id: "8a", name: "Batch-write logic + route action", status: "done", detail: "<code>134e40d</code>" },
  { id: "8b", name: "Pending edits, scope choice, explicit Save", status: "done", detail: "<code>650310a</code> + follow-ups <code>4884412</code> · Playwright: 10 passed, 1 fixme" },
  { id: "9",  name: "Per-token descriptions, manually saved", status: "todo", detail: "Spec ready (<code>1d1d61a</code>), not yet handed off" },
];
