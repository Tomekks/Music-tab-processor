# Context: Control Center

A single-user, local admin web app that aggregates control over this project's
key parts — replacing "ask an AI to run a terminal command" with real buttons.
The app is built (see `STATUS.md`); this file holds the vocabulary settled during
planning (`docs/plans/2026-09-24-control-center/`) since it's load-bearing for
every module's design.

## Language

**Native module**:
A capability with no UI anywhere else — Control Center *is* its only
interface (e.g. Pipeline controls, Unit tests). Built as a self-contained
route folder: its own page, its own components, its own server-side command
runner. Never reaches into another module's internals.
_Avoid_: Feature, page (both still used loosely in conversation; "module" is
the precise term once code exists)

**Integrated tool**:
Something that already has its own working UI elsewhere. Control Center
links out to it (new browser tab) rather than rebuilding it — e.g. Design
System (`app/app/design-system`, on the `app/` dev server).
_Avoid_: Embedded tool, plugin (no embedding/iframing happens — always a
plain link)

**Module registry**:
The single shared list of which modules exist and what to call them in the
nav. Adding a module means one new route folder plus one line here; nothing
else changes.

**Manifest** _(pipeline-specific)_:
A small, hand-maintained structured file (e.g. `pipeline/manifest.json`)
giving Control Center the exact, safe command for each pipeline stage —
because each stage's own `STATUS.md` only documents its run command as
prose, which isn't safe to execute directly. Kept in sync by hand, same
discipline as `STATUS.md` itself.
