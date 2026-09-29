# Context Map

## Contexts

- [Design System](./CONTEXT.md): the multi-brand token system and its brand-management UI. Physically lives under `app/packages/design-system` today; this file's own location (repo root) is a holdover from before this map existed — left as-is since the design system's code hasn't moved yet either (eventual destination: `tools/`, alongside `tools/backlog-board`).
- [Planning methodology](./docs/CONTEXT.md): the Backlog → Plan → Task → Spec vocabulary this repo already uses for any nontrivial change, independent of any one tool that visualizes it.
- [Control Center](./tools/Control_Centre/CONTEXT.md): the local admin app that aggregates native modules and links out to integrated tools. No code exists yet (planning stage, `docs/plans/2026-09-24-control-center/`) — this file is created early, lazily-thin, because the Native module / Integrated tool distinction is load-bearing vocabulary for that plan.

## Relationships

- **Planning methodology → Design System**: Design System work is planned and speced using Planning-methodology vocabulary (e.g. `docs/plans/2026-09-23-design-system-brand-management/`), same as any other domain in this repo.
- **Control Center → Design System**: Design System is an Integrated tool from Control Center's perspective — Control Center links out to its existing UI (`app/app/design-system`), it doesn't rebuild it. Control Center also consumes the Design System's generated CSS output directly for its own visual styling.
- **Control Center → Planning methodology**: Control Center's own build is itself a Plan (`docs/plans/2026-09-24-control-center/`); its eventual "Oversight" native module is a *visualization* of Planning-methodology concepts (Plan/Task/Spec), not a new domain of its own.
