// The only file that changes when a task's status changes. Kept current as
// part of each task's checkpoint commit -- open (or refresh) the sibling
// -status.html to see it.
const PLAN_META = {
  title: "Home Critique Fixes (/)",
  planFile: "docs/superpowers/plans/2026-09-21-home-critique-fixes.md",
};

const PLAN_TASKS = [
  { id: "0",   name: "Foundation: semantic tokens + theme font", status: "done", detail: "<code>3763bf1</code>/<code>5c8d8fd</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "H",   name: "Detector hygiene (ignore static public pages)", status: "done", detail: "<code>3983306</code> (bundled into spec 3's commit) · deployed via PR #23/#24, 2026-09-22" },
  { id: "1+4", name: "Toolbar split + shortcut discovery", status: "done", detail: "<code>0df7fae</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "3",   name: "Fretboard playback-state color", status: "done", detail: "<code>3983306</code>/<code>5eef051</code>/<code>a2b155b</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "2",   name: "Loop pill on every tab", status: "done", detail: "<code>cbe24e3</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "5",   name: "Sidebar independence + mobile drawer", status: "done", detail: "<code>05bb18b</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "6",   name: "Ascii playback banner", status: "done", detail: "<code>68d81c0</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "7",   name: "Single orientation control", status: "done", detail: "<code>b985667</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "8a",  name: "Tempo input honesty", status: "done", detail: "<code>fc724f5</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "8b",  name: "Empty and sidebar states", status: "done", detail: "<code>b887ea9</code>/<code>4884412</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "8c",  name: "Control polish", status: "done", detail: "<code>b505ed7</code>/<code>aa4a934</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "8d",  name: "Controls consolidation + wrap fallback (added mid-plan, not in original scope)", status: "done", detail: "<code>54dd73f</code>/<code>6633159</code> · deployed via PR #23/#24, 2026-09-22" },
  { id: "C",   name: "Closing re-critique (11 -> ?)", status: "skipped", detail: "Will not be done — decided 2026-09-23, no re-critique output was ever produced" },
];
