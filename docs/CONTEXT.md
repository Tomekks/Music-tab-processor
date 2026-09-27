# Context: Planning Methodology

The Backlog → Plan → Task → Spec vocabulary this repo uses to scope and track any
nontrivial change. Predates and is independent of any tool that visualizes it
(including the in-progress Control Center) — this is the process itself, not
a feature of one app.

## Language

**Backlog**:
A pool of raw, unscheduled ideas, not yet committed to execution.
_Avoid_: Icebox, wishlist

**Plan**:
A project currently being executed; several can be open at once. Lives at
`docs/plans/<plan-slug>/<plan-slug>.md`, with its own tasks' specs alongside it.
_Avoid_: Epic, initiative

**Task**:
One unit of work inside a Plan, 1:1 with a Spec.
_Avoid_: Ticket, story

**Spec**:
The precise, mechanical instruction for one Task — exact inputs/outputs, file
locations, a concrete "done when" checklist. Lives beside its Plan
(`docs/plans/<plan-slug>/<task-slug>.md`), or flat in `docs/plans/specs/` when
it has no parent Plan (a Bounded-tier change).
_Avoid_: Ticket, issue

**Task status**:
Five states, in order: `spec missing` → `ready` (spec confirmed) → `in progress`
→ `done`, with `not finished` as a side-branch off `in progress` (work started,
then stopped before completion).

**Stage contract** _(not yet built, backlogged)_:
The defined input/output shape a pipeline stage requires, which any tool
plugged into that stage must satisfy to be safely swappable.
_Avoid_: Interface, API contract
