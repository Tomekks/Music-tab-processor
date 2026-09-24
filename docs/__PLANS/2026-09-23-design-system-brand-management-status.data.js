// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Design System: Brand Management",
  planFile: "docs/superpowers/plans/2026-09-23-design-system-brand-management.md",
};

const PLAN_TASKS = [
  { id: "1", name: "Brand switcher (list + select)", status: "done", detail: "<code>95caf0b</code> · 3 new unit tests, 6 new e2e, human visual checkbox passed via screenshot" },
  { id: "2", name: "Create brand: New", status: "todo", detail: "Batched with 3, 4 into one spec (low seam-risk, see plan's Sequencing note)" },
  { id: "3", name: "Create brand: Duplicate", status: "todo", detail: "Batched with 2, 4 into one spec" },
  { id: "4", name: "Delete brand", status: "todo", detail: "Batched with 2, 3 into one spec" },
  { id: "4.5", name: "editor.tsx modular split", status: "todo", detail: "docs/BACKLOG.md #32 -- blocked on 2, 3, 4 landing so the split reflects the file's final shape" },
  { id: "5", name: "Editor UI: generalize beyond \"the default brand\"", status: "todo", detail: "Blocked on: 1, 2, 3, 4, 4.5" },
  { id: "6", name: "Deferred: simultaneous multi-brand CSS for live apps", status: "todo", detail: "Deliberately deferred until a real second consumer (e.g. the control panel) exists -- not scheduled" },
];
