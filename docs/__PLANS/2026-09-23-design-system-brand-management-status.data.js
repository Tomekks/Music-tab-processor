// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Design System: Brand Management",
  planFile: "docs/superpowers/plans/2026-09-23-design-system-brand-management.md",
};

const PLAN_TASKS = [
  { id: "1", name: "Brand switcher (list + select)", status: "done", detail: "<code>95caf0b</code> · 3 new unit tests, 6 new e2e, human visual checkbox passed via screenshot" },
  { id: "1.5", name: "Rider: editor writes target the selected brand", status: "done", detail: "<code>fb6da24</code> · discovered during 2/3/4 brainstorming; docs/specs/design-system-brand-write-scoping.md · 1 new e2e case, no unit test needed" },
  { id: "2", name: "Create brand: New", status: "done", detail: "<code>9de4f55</code> · batched with 3, 4 into one spec (docs/specs/design-system-brand-crud.md)" },
  { id: "3", name: "Create brand: Duplicate", status: "done", detail: "<code>9de4f55</code> · theme-varying-alias exemption found during spec review, see spec §1" },
  { id: "4", name: "Delete brand", status: "done", detail: "<code>9de4f55</code> · soft delete (rename to .trash-*), recoverable by hand" },
  { id: "4.5", name: "editor.tsx modular split", status: "done", detail: "<code>6816a39</code> · docs/BACKLOG.md #32 · Editor complexity 20 -> 17, full e2e suite 34/34 re-run, zero test-file diffs" },
  { id: "4.6", name: "Rider: undeployed-changes indicator", status: "todo", detail: "docs/specs/design-system-brand-deploy-status.md -- needs a fresh read against post-4.5 file layout before executing; not yet started" },
  { id: "4.7", name: "Decouple test fixtures from real brands/", status: "todo", detail: "Discovered verifying 4.5 (<code>1ab56cd</code> fixed the immediate breakage); demo-child itself still relied on as permanent by several test files" },
  { id: "5", name: "Editor UI: generalize beyond \"the default brand\"", status: "todo", detail: "Blocked on: 4.5 (done); should land after 4.7 too, since it touches test files 4.7 also affects" },
  { id: "6", name: "Deferred: simultaneous multi-brand CSS for live apps", status: "todo", detail: "Deliberately deferred until a real second consumer (e.g. the control panel) exists -- not scheduled" },
];
