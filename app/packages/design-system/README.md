# @guitar-tabs/design-system

The token/component source of truth for `app/`'s UI, and eventually a second project (the
control panel) and beyond. Full architecture:
`docs/superpowers/specs/2026-09-19-design-system-design.md`. Build order:
`docs/superpowers/plans/2026-09-19-design-system.md`.

**Don't hand-edit `tokens.json` and `tokens.default.json` independently.**
`brands/default/tokens.json` is the live, current values; `tokens.default.json` is the factory
reset target. They're meant to be kept in sync through the in-app editor (once it exists) or
deliberate, matching edits to both — not casual one-off changes to just one.

Status as of this file: brand data only (colors, spacing, typography as JSON). No build script,
no components, no editor yet — see the plan above for what's next and in what order.
