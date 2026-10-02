# Design system workbench (editor IA redesign)

**Status (2026-10-01):** Information architecture and structure wireframe agreed. No code written, no spec yet. Next: baseline screenshots, the remaining wireframes, then specs per slice (see "Next session").

**Context:** `CONTEXT.md` (glossary: this session added Token, Foundation, Component, Variant, State, Override, Mode) · `docs/decisions/0010-brand-management-architecture.md` · current editor: `app/app/design-system/editor/` · wireframes: `wireframes/workbench-structure-v10.wireframe.html` (final structure; v1 is the starting point).

## Goal

Redesign the `/design-system` editor as a daily **workbench** for one user: pick a Component, see all its Variants by States, change values in a right-hand inspector, and save them to the connected brand. Beautiful and easy to navigate, with room for 100–200 items including Variants (probably 30–60 Components). Internal tool, desktop only.

## Decisions (locked in the 2026-10-01 grill)

- **Job:** workbench first. Edits are staged (instant preview, explicit Save/Discard); Save writes to the brand's tokens, which consumers read always-latest.
- **Layout:** top bar over three columns (left sidebar 280, canvas flexes, right inspector 320) with 1px outlines between panels. Desktop only (min about 1024); the inspector collapses below about 1200 and scrolls if tall. No collapsible sections.
- **Chrome vs preview:** the tool's panels keep one fixed neutral look; only the canvas shows the active brand and Mode. (Same reasoning as the earlier decoupling decision.)
- **Top bar:** "Design System" with the brand switcher, the Mode icon button (same as the web app's `ThemeToggle`), a status row ("N unsaved changes", "Not deployed"), Discard (link), Save (the one button).
- **Mode:** one global toggle; light values are edited in light, dark in dark. Child-brand dark values are Overrides that can be switched off and on without losing the stored value (Revert still deletes).
- **Left sidebar:** search field on top (Cmd+K palette over Components, Variants, Tokens, glossary Terms, results labelled by type); then Glossary, then Foundations (one entry; its page holds Color, Space, Radius, Typography incl. text styles, State opacities, Focus ring, Layout); then Components as a flat A–Z list, all shown, the list scrolls, never "load more". Variants are not in the sidebar.
- **Component page:** header, then a Variants by States grid; clicking a cell selects it. Inspector shows that Variant's Tokens (Background/Text with a square color picker right of the value) and the shared Tokens (Padding X|Y in one row, Radius and Font size as number plus slider, Font, Font weight dropdown).
- **Glossary:** a section that renders `CONTEXT.md` read-only (design-system terms only; edit terms in the file).
- **Extension point:** one Component registry (name, Variants, preview, optional category); the inspector is generated from token descriptors, so a new Token needs no UI change.
- **Rollout:** replace `/design-system` in place, after baseline screenshots and a Nielsen heuristics pass on today's editor.
- **Variants:** styles of one Component (primary, secondary, ghost); "iterations" means Variants.
- **Reset features:** reset a single Token to its default, and a "Reset to default" button for all of a Component's Tokens (placed in the inspector header). Both act on the staged edit, so Discard undoes them. What "default" means is still open (question 9).

## Deferred (not in this plan's first pass)

Brands as a top-level section (the switcher stays), per-state color tables, composed-screen previews, per-component changelog, resizable panels, hover definitions on terms, contrast badges, quick-control knobs.

## Later: framework translator (noted 2026-10-01, not in the first pass)

The design system should hold one definition of each Token and Component, with the framework integration (React for the web app, Svelte for Control Center) kept in separate adapters. Today the Tokens already work this way (one `tokens.json`, `build-tokens.mjs` emits the CSS both apps use); Components do not (hand-written React Button in `app/`, separate hand-written Svelte Button in Control Center, both styled by the same variables).

Staged approach, each step only when the previous one starts to hurt:
1. The Component registry carries a spec per Component (Variants, States, which Tokens each part uses), framework-neutral.
2. Per-framework adapters implement the spec by hand, with a conformance test that every spec'd Variant and State exists in each framework.
3. A generator from spec to framework code only if the Component count and framework count justify it.

Trigger to revisit: a new Variant or Component had to be added in two frameworks and one drifted, or a third consumer appears. Likely needs an ADR. This also decides where the workbench can live (its canvas previews use real Components), so settle it before moving the workbench to another framework.

## Open questions

1. Flat A–Z list or two-level categories? (Flat chosen in the wireframe; at 100+ Components consider a category filter.)
2. A "Components overview" page at the top of the list?
3. Where the Override on/off control sits. Recommended: right end of the row, shown only in child brands, field greyed when inherited. (The left dot was tried and dropped.)
4. Selected sidebar item look. Recommended: decide at the styling stage; the wireframe tool can't draw a tinted pill.
5. Hover/pressed look: derived from shared state opacities (read-only here with a link to Foundations, not yet verified in code) or per-Component values (a schema change)? The Focus column is also not drawn yet.
6. Ghost exists on Icon Button only; Button has primary and secondary today.
7. Home for the "Generate from seed colors" tool (probably Foundations, Color). Primitives stay hidden.
8. Whether the undeployed note stays beside Saved, and the exact Mode toggle position.
9. What "default" means for the reset features. Today the code has three: factory defaults (`tokens.default.json`, Main brand only), Revert in a child brand (deletes the Override, falls back to Main), and "set as default". Recommended: in Main, reset to factory default; in a child brand, reset to Main's value (Revert). Needs a glossary term to keep "reset", "revert" and "default" distinct, and a place for the control on each row and in the inspector header (not drawn in the wireframe yet).

## Next session

1. **Orient:** read `app/AGENTS.md` first: this Next.js version differs from training data, so read the relevant guide in `app/node_modules/next/dist/docs/` before writing any code.
2. **Baseline:** run `lsof -i :3000` (stale-server check), start the `app/` dev server, screenshot `/design-system` (light and dark, Main and one child brand), jot a short Nielsen heuristics pass. Both feed the case study.
3. **Wireframes** (`/wireframe`, same folder): Foundations page; child-brand dark mode with the override control; Cmd+K palette; Glossary; unsaved and save-error states. Resolve the open questions above as they come up.
4. **Specs, one per slice, each critiqued before execution** (suggested order): child-brand dark overrides data model (touches brand merging and token writes; confirm against `resolveBrandTree` and `token-writes.mjs` first, and write ADR 0011) → shell (top bar, three columns, registry, sidebar) → Foundations page → Component page and inspector → Cmd+K palette → Glossary → polish pass.
5. **Housekeeping:** `tools/Control_Centre/CONTEXT.md` and `CONTEXT-MAP.md` still say "no code exists yet"; fix separately.

## Notes

- v10's HTML was generated with a small patch to the wireframe template (a vertical divider style) because the installed tool only draws horizontal dividers; the JSON marks those dividers with `direction: "vertical"`. The `wireframe` skill itself is unchanged.
- Skills considered this session: `interface-design` was started but never finished installing, `taste-skill` skipped as a poor fit (landing pages), `frontend-design` not installed. `ui-ux-pro-max` and `wireframe` are the installed ones.
