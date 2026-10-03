# Design system workbench (editor IA redesign)

**Status (2026-10-03):** Grill done: framework (ADR 0011), controls, descriptions, slices (see "Decisions (2026-10-03 grill)"). No code yet. Next: redraw the Foundations wireframe from real tokens (fix the vertical-divider render), then a spec for slice 1.

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
- **Glossary:** a section that renders `CONTEXT.md` (13 terms today, grouped as in the file). Superseded 2026-10-03: terms are editable in the workbench. A pencil icon turns a term into prefilled input fields (definition and "Avoid"); the pencil becomes "Save" and an "x" cancels. "+ Add term" in the header opens a blank term (name, group, definition, Avoid) at the end of its group. Edits and additions are staged like token edits (they count in "N unsaved changes", Save writes `CONTEXT.md`, Discard undoes them). Wireframe: `wireframes/glossary-v1` (from `gen_glossary.py`); term names are compact, with tight spacing; the right inspector column is hidden on this page. Saving rewrites only the edited or added term's lines in `CONTEXT.md`; a test must show every other byte is unchanged. Renaming and deleting terms: not in the first version (renaming would break references).
- **Extension point:** one Component registry (name, Variants, preview, optional category); the inspector is generated from token descriptors, so a new Token needs no UI change.
- **Rollout:** replace `/design-system` in place, after baseline screenshots and a Nielsen heuristics pass on today's editor.
- **Variants:** styles of one Component (primary, secondary, ghost); "iterations" means Variants.
- **Reset features:** reset a single Token to its default, and a "Reset to default" button for all of a Component's Tokens (placed in the inspector header). Both act on the staged edit, so Discard undoes them. What "default" means is still open (question 9).

## Decisions (2026-10-03 grill)

Framework and architecture: `docs/decisions/0011-design-system-workbench-framework.md`.

- **Build:** a new standalone SvelteKit app on a new route/folder beside the old editor; the old editor stays until the owner decides the new one is better. Reuses the `.mjs` package layer.
- **Wireframes:** show only real components (Button, Color Field, Icon Button, Segmented Control, Slider) and Foundations generated from `tokens.json`. The earlier Foundations draft is now `wireframes/foundations-v5` from the real tokens; render with `wireframes/build.py` (the stock template draws vertical dividers wrong).
- **Controls:** Framer-style (docs read 2026-10-03): one control spec per token (type, min, max, step, unit, hidden-when, description). Number input primary, slider secondary and only for bounded values; native color picker plus hex field (no token uses alpha); weight as a dropdown; the Override toggle is the one boolean. Space and radius stay single inputs.
- **Descriptions:** stored in each token's `$description` in the Main brand's `tokens.json` (16 of 86 have one today), shared by child brands, editable in the inspector. A separate generated, read-only "Used by" list: an expandable list of Component + Variant rows; clicking one opens that Component page with the Variant selected. Built from the token alias graph (which component tokens point at this one, so Component and Variant come from the token path); direct references in code (e.g. the Button hover mix reading `--color-accent`) show as non-clickable "code" rows, as `token-usage.test.mjs` finds them.
- **Behavior (wireframe review 2026-10-03; static wireframes can't show these):** (1) the shell fills the window; the top bar and both sidebars stay in view while the canvas scrolls. (2) Each column scrolls inside itself when its content is taller than the window; the page never scrolls as a whole. (3) Staged (unsaved) edits belong to the workbench, not to a page: moving to another page leaves them in place and the "N unsaved changes" count stays true until Save or Discard. (4) Explanatory text sits under a "?" icon (lucide `circle-help`) that shows on hover; headings have no long captions. Token rows keep their one-line use text (it is the token description).
- **Save feedback and editing aids (2026-10-03):** after Save the workbench re-reads the file; the status slot shows "Saved N tokens HH:MM" for 5 s, fades out, then is empty when everything is saved or shows "N unsaved changes" if other edits remain (an error does not fade: edits stay staged and the reason stays visible - my assumption, confirm). Clicking "N unsaved changes" opens a before/after list with Discard per line. Cmd+Z / Shift+Cmd+Z undo and redo staged edits. Color control: a square swatch showing the value sits next to the hex input; clicking it opens the picker (as in other design tools). Edited rows get a marker dot. Later, not now: hover a token to highlight where it appears in the preview (after slice 2); light and dark values side by side (kept separate for now, revisit).
- **Child brand wireframe:** `wireframes/child-brand-dark-v2` (Main brand: `foundations-v5`; both generated from the real tokens by `wireframes/gen_foundations.py`). In a child brand, every row has a "From Main" toggle at the right end under one column heading: on = follows Main (greyed value), off = the brand's own value (editable). A Revert link sits just left of the toggle on overridden rows only; Revert deletes the Override, while turning From Main back on inherits without losing the stored value. The inspector repeats a From Main toggle for Light and Dark. Open question 9: in Main, reset = factory default; in a child brand, reset = Revert to Main. All tokens are shown (no "N more rows"); the canvas header (crumbs, title, jump links, column heading) is sticky while the sections scroll. Tokens without a description show "(no description yet)" (6 of 15 colors today; 16 of 86 tokens overall have one).
- **Wireframe review 3 (2026-10-03):** token and row descriptions sit under a lucide `info` icon (hover shows, click opens it to edit; an empty icon means no description yet), in rows and next to the inspector title; section help stays the `?` icon (`circle-help`). Font fields are 200 px wide. `layout.sidebarWidth` gets a unit switch: one value with a `px` / `%` dropdown. `px` is a fixed width (as today); `%` is a share of the window width, so the sidebar resizes with the window. This adds a unit choice to the token schema (the system already has a `percentage` type), so it needs its own spec (risk trigger); open detail: min/max limits for `%`, add only if a real need shows up. Applies to both Main (`foundations-v5`) and child-brand (`child-brand-dark-v2`) wireframes.
- **Command palette wireframe:** `wireframes/command-palette-v2` (built by `gen_palette.py`), two states. Cmd+K from anywhere, or clicking the sidebar search. One search box over Components, Variants, Tokens and Glossary terms, grouped in that order, each result labelled with its type, all matches shown in a list that scrolls inside the palette. Search also matches token descriptions, not only names (so "dividers" finds `semantic.color.border`). Token results show the swatch or value and, in a child brand, a "From Main" or "Own value" marker. Before typing, the palette shows the unsaved changes (with was/now), or nothing if there are none. No "Recent" list (dropped to keep the build light). Enter opens: Component or Variant goes to the Component page (Variant selected), Token goes to its page with the token selected in the inspector, Term goes to the Glossary at that term. Up/down move, Esc closes; the page behind and unsaved changes stay as they were. Later: a few actions (Save, Discard all, Toggle dark mode, Switch brand, Create brand from seed colors), after slice 5. Slice 5 does its prior-art check on Svelte command-palette libraries first.
- **Save safety (2026-10-03):** Save first checks that each file it will write (`tokens.json`, `CONTEXT.md`) is unchanged since the workbench loaded it. If it changed (git, another session), Save stops, names the file, and offers reload or review; staged edits are never silently overwritten. Built into slice 1's save path for tokens and extended to terms. Glossary: terms mentioned inside a definition render as links to that term (no stored data).
- **Save and error states wireframe:** `wireframes/save-states-v1` (from `gen_states.py`). The top bar status slot has seven states: (1) nothing changed: empty, no Save or Discard; (2) unsaved: "N unsaved changes" (click opens the changes list) with Discard and Save; (3) saving: Save disabled and reads "Saving..." so a second click cannot start a second write; (4) just saved: "Saved N tokens HH:MM" for 5 s, then fades to state 1 or 2; (5) discarded: "Discarded N changes" with Undo for 5 s; (6) save failed: saves are all or nothing (write, then re-read to confirm), so the message says nothing was written; it stays until dismissed or a retry works, edits stay staged, Retry save; (7) file changed on disk: Save stops, nothing is overwritten, with Review changes and Reload (Reload loads the new file, keeps staged edits on top, and flags any token whose file value also changed). The changes list shows token and term edits with was/now (color tokens show a swatch beside each hex), a Discard per line, a "Save all" button, and each row jumps to its place. Edited rows get a dot. Moving between pages keeps edits staged; closing or reloading the tab shows the browser's own "Leave site?" warning when something is unsaved.
- **Projects (decided 2026-10-03, its own slice after slice 4):** a Project is anything that reads one Brand's CSS (today the web app and Control Center; later other sites). Today one file, `app/packages/design-system/active-brand.json`, picks the brand for everything. Replace it with a small list of projects, each with its brand and where its CSS is written. It is set in the workbench, under the Brand (not a global page): a brand shows which projects use it, and an Edit control changes the connection, so nobody has to type commands to an AI. The top-bar brand switcher still means "which brand I am editing", separate from which brand a project uses; the preview shows a project with the brand being edited. "Not deployed" becomes a per-project status (decide with this slice). The change touches build scripts and config, so ask first; needs its own spec and a wireframe.

- **Typography:** show the current font with its editable attributes (family, weight, size, description). A full font picker and wiring saved fonts into the real app come later.
- **Kept from the old editor:** staged edits with Save/Discard, brand create/duplicate/delete, child inheritance with Override and Revert, seed-color brand creation, single-token reset. Not in v1: reset-all, set-as-default, batch-write, the exception-vs-brand scope. The "Not deployed" status: decide later. A contrast checker was never in the old UI; deferred.
- **Experiments** (global components in progress, approved for all brands later): after the MVP.

## Slices (user story each)

1. Change a color and see it: pick a color on a real component, see it in the preview, save, see it in localhost. (Shell, preview route, color picker, staged Save/Discard, `default` brand only; save path built test-first.)
2. Understand and tune any token: read what it is for and where it is used, edit with the right control, in light or dark. (Foundations page, all control types, descriptions, Used by, Mode toggle.)
3. Typography: see and change the current fonts and their attributes.
4. Brands: create from seed colors, override dark values, undo any override (ADR for the dark-override data model).
5. Find things: Cmd+K search; the Glossary as its own small task.

## Trial rule: prior-art check per slice (2026-10-03)

Before each slice's spec: a short research pass on raw primary sources (no summaries) for existing solutions. The spec gets one line: "found X, adapt it" or "nothing found: owner decides". A library that fits is used; hand-written code needs a stated reason. A throwaway code spike (in `research/`) only where the slice rests on an unverified technical assumption (slice 1: preview window, forced hover states, save path from outside Next). Keep a short log under each slice: what was searched, what was found, what it saved, any miss.

**Review gate:** after slices 1 and 2, run `/grill-with-docs` on that log to decide whether and how this becomes part of the workflow (`docs/rules/process.md`, which stays untouched until then and until 3 real tasks have run after the lean-process gate). Goal: higher quality, fewer bugs, well engineered but not overengineered.

### Prior-art log

- **Slice 1 (2026-10-03):** searched Storybook pseudo-states addon (raw README) and Framer property controls. Found: the forced-state technique (class-copy of `:hover`/`:active` rules), adapted not installed. Nothing found for a standalone token editor previewing real React components. Spike PASSED: overrides in an iframe, forced Hover/Pressed, regenerated CSS reaches the page. Saved: guessing at the preview mechanism, plus two bugs found before any build (rule order, transition lag). Findings that change slice 1: primary Button hover/pressed mix from `--color-accent` not the component token; `buildActiveBrand()` only rebuilds the active brand. Details: `research/workbench-slice1-spike/NOTES.md`.

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
4. **Specs, one per slice, each critiqued before execution** (suggested order): child-brand dark overrides data model (touches brand merging and token writes; confirm against `resolveBrandTree` and `token-writes.mjs` first, and write ADR 0012; 0011 is the framework decision) → shell (top bar, three columns, registry, sidebar) → Foundations page → Component page and inspector → Cmd+K palette → Glossary → polish pass.
5. **Housekeeping:** `tools/Control_Centre/CONTEXT.md` and `CONTEXT-MAP.md` still say "no code exists yet"; fix separately.

## Notes

- v10's HTML was generated with a small patch to the wireframe template (a vertical divider style) because the installed tool only draws horizontal dividers; the JSON marks those dividers with `direction: "vertical"`. The `wireframe` skill itself is unchanged.
- Skills considered this session: `interface-design` was started but never finished installing, `taste-skill` skipped as a poor fit (landing pages), `frontend-design` not installed. `ui-ux-pro-max` and `wireframe` are the installed ones.
