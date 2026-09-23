// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Design System: Brand Management",
  planFile: "docs/superpowers/plans/2026-09-23-design-system-brand-management.md",
};

const PLAN_TASKS = [
  { id: "1", name: "Brand switcher (list + select)", status: "todo", detail: "Not yet handed off" },
  { id: "2", name: "Create brand: New", status: "todo", detail: "Blocked on: 1" },
  { id: "3", name: "Create brand: Duplicate", status: "todo", detail: "Blocked on: 1" },
  { id: "4", name: "Delete brand", status: "todo", detail: "Blocked on: 1" },
  { id: "5", name: "Editor UI: generalize beyond \"the default brand\"", status: "todo", detail: "Blocked on: 1, 2, 3, 4" },
  { id: "6", name: "Deferred: simultaneous multi-brand CSS for live apps", status: "todo", detail: "Deliberately deferred until a real second consumer (e.g. the control panel) exists -- not scheduled" },
];
