---
status: accepted
---

# Brand management: flat hierarchy, reuse existing inheritance, CSS-only always-latest distribution

The design system needs user-facing brand management (create, switch,
delete) so it can serve multiple independent projects (a future control
panel, a SvelteKit rebuild, a movie/TV site), not just this one app. We
decided to build this as **UI on top of the already-shipped inheritance
mechanism** (sparse child `tokens.json`, live resolution against Main),
not a replacement — every brand is flat under Main, one level, no chains
of brand-of-a-brand.

## Considered options

- **Live-tracking chains** (duplicating a brand makes the new one reset
  against *that* brand, not Main) — rejected: reopens brand-deletion as a
  real problem (what happens to descendants of a deleted brand) for a
  capability nobody described needing.
- **Always-populated brands with click-to-reset** (drop sparse/live
  inheritance entirely, generalize Main's own `tokens.default.json` +
  `applyReset` pattern to every brand) — considered as a simplification,
  ultimately rejected in favor of keeping the shipped, tested mechanism
  as-is.
- **Versioned/pinned distribution** — rejected for now: real infrastructure
  (semver, a registry) that's pure overhead until a consumer actually needs
  to not break on an unrelated edit.
- **Multi-format export** (JSON/Rust structs alongside CSS) — rejected
  until a genuinely non-web consumer exists; CSS custom properties already
  cover every web-based consumer regardless of framework.

## Consequences

- New and Duplicate brand actions are thin UI over existing primitives
  (`applyBatchWrite` for Duplicate's snapshot copy, an empty sparse tree for
  New) — no changes needed to `resolveBrandTree`, `applyResetToParent`, or
  the override-tracking model.
- A Main edit auto-propagates to every New-style brand that hasn't touched
  that field, but never to a Duplicate-style brand (frozen at creation) —
  this asymmetry is intentional, not a bug, and needs to be visible in the
  UI so it isn't mistaken for one later.
- The design system is expected to move to its own standalone repo
  eventually, with `guitar_tab_processor` becoming one more consumer.
  Nothing in this decision blocks that move (CSS output is already
  portable); the actual extraction is separate, future work.
