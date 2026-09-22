// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Home Critique Fixes (/)",
  planFile: "docs/superpowers/plans/2026-09-21-home-critique-fixes.md",
};

const PLAN_TASKS = [
  { id: "0",   name: "Foundation: semantic tokens + theme font", status: "todo", detail: "Spec written, not yet handed off" },
  { id: "H",   name: "Detector hygiene (ignore static public pages)", status: "todo", detail: "Spec written, lands after 0" },
  { id: "1+4", name: "Toolbar split + shortcut discovery", status: "todo", detail: "Blocked on: 0" },
  { id: "3",   name: "Fretboard playback-state color", status: "todo", detail: "Blocked on: 0, 1+4" },
  { id: "2",   name: "Loop pill on every tab", status: "todo", detail: "Blocked on: 3" },
  { id: "5",   name: "Sidebar independence + mobile drawer", status: "todo", detail: "Blocked on: 2" },
  { id: "6",   name: "Ascii playback banner", status: "todo", detail: "Blocked on: 5" },
  { id: "7",   name: "Single orientation control", status: "todo", detail: "Blocked on: 6" },
  { id: "8a",  name: "Tempo input honesty", status: "todo", detail: "Blocked on: 7" },
  { id: "8b",  name: "Empty and sidebar states", status: "todo", detail: "Blocked on: 8a" },
  { id: "8c",  name: "Control polish", status: "todo", detail: "Blocked on: 8b" },
  { id: "C",   name: "Closing re-critique (11 -> ?)", status: "todo", detail: "Blocked on: 8c" },
];
