# Task spec: Design-system editor — sidebar navigation ("All variables" + per-component)

Corresponds to Task 7 of `docs/superpowers/plans/2026-09-20-design-system-iteration-2.md`. Written
against the editor as it stands today, confirmed by reading `app/app/design-system/editor.tsx` and
`app/packages/design-system/src/field-descriptors.mjs` directly (not from the plan's own
paraphrase of them — the plan can go stale between being written and a task actually starting; if
either file has changed since this spec was written, stop and re-read before implementing, per
`WEB_APP_WORKFLOW.md` §3).

## 1. Scope

Today, `Editor` (`editor.tsx:200-381`) renders one long page: a header, a "Reset all changes"
control, then every entry in `SECTIONS` (`field-descriptors.mjs:28-40`) in order — the seven flat
semantic sections, then the four `group: "Components"` sections under one "Components" heading —
all visible at once, scroll to find what you want.

This task adds a sidebar with **five entries**, in this exact order (matches `SECTIONS`'
declared `group: "Components"` order, `field-descriptors.mjs:36-39` — the sidebar reuses
`grouped` (§3.2) rather than hand-authoring a second ordered list, so there is exactly one source
of truth for this order):
1. **"All variables"** — renders exactly what the page's content area renders today, unchanged.
   Default/initial view.
2. **Color Field**
3. **Slider**
4. **Segmented Control**
5. **Button**

Selecting one of the four component entries replaces the main content with:
- Only that component's fields (`fieldsFor(key)` — already exists, `editor.tsx:306`), rendered
  via the existing `FieldRow`/`ColorRow`/`SliderRow` with no behavior change.
- One live-rendered instance of the actual component (imported from `@guitar-tabs/design-system`,
  the same package the app itself consumes), using representative sample props, positioned above
  its fields (see §3.2 for exact placement) so a token edit is visible on a real rendered instance
  immediately after `router.refresh()` — not just as a hex/number in a field row.

The sidebar is persistent chrome: it renders in every view, including "All variables," so the
user can navigate away from wherever they are. The header above it (back link, title,
description, "Reset all changes" control, error/feedback text — `editor.tsx:337-368`) is
untouched by this task and stays outside the sidebar/content split, visible in every view exactly
as today. Only the content block currently at `editor.tsx:370-378` is being restructured — see
§3.2's layout note for why §7's "pixel-identical" check is scoped to that content block, not the
whole page.

Files this task may touch:
- `app/app/design-system/editor.tsx`

No other file changes. `.env`/credentials are not involved and out of scope regardless.

## 2. Non-goals

- **No change to the write/commit model.** Fields still auto-commit on blur (`ColorRow`) or after
  the existing 200ms debounce (`SliderRow`), exactly as today. Staged edits + explicit Save is a
  separate, later task (Task 8) that depends on this one — do not start building it here.
- **No change to `field-descriptors.mjs`, `token-writes.mjs`, or
  `app/app/api/design-system/tokens/route.ts`.** This task is a pure `editor.tsx` UI
  restructuring; the data it reads and the API it calls are unchanged.
- **No live-rendered instance for "All variables."** That view is the existing flat page,
  verbatim — it does not get a component preview added to it in this task.
- **No deep-linking / URL state for the selected sidebar entry.** Selection is local component
  state (`useState`), reset on page reload back to "All variables." If deep-linking is wanted
  later, that's a separate, explicitly-scoped addition — don't add `useSearchParams`/routing here
  speculatively.
- **No new component preview abstraction.** Write four small, explicit render branches (one per
  component), not a generic "render any component from its section key" mechanism. There are only
  four components; a generic abstraction here is solving a problem that doesn't exist yet.
- **Don't touch `MetronomeControls.tsx` or any file outside the allowlist**, even if something
  there looks related or improvable while you're in the area.

## 3. Interface / exact changes

### 3.1 New local state, `Editor` component (`editor.tsx:200`)

Add, alongside the existing `error`/`feedback`/`inFlight`/`resetArmed`/`resetBusy` state:

```tsx
type ComponentKey = "component.button" | "component.colorField" | "component.slider" | "component.segmentedControl";
type SelectedView = "all" | ComponentKey;

const [selectedView, setSelectedView] = useState<SelectedView>("all");
```

`ComponentKey` values are exactly the four `SECTIONS` entries whose `group === "Components"`
(`field-descriptors.mjs:36-39`) — don't invent new keys; reuse the existing section keys so
`fieldsFor(key)` (`editor.tsx:306`) keeps working unchanged.

### 3.2 Sidebar + layout

Add a sidebar element rendering five items: a static `"All variables"` label plus
`grouped.map((s) => s.heading)` (`grouped` already exists, `editor.tsx:308`, and already holds
exactly the four component sections in `field-descriptors.mjs`'s declared `SECTIONS` order —
`colorField`, `slider`, `segmentedControl`, `button` — reuse it, don't hand-write a second list of
component names; this is also why §1's ordering matches `grouped`'s order). Clicking an item sets
`selectedView` to `"all"` or that section's `key`. Mark the active item (`aria-current="page"`) so
it's visually clear which view is showing — this is a real usability requirement, not decoration:
a sidebar with no active-state indicator defeats its own purpose.

Render it as a `<nav aria-label="Sections">` containing `<button type="button">` items, not
`<a>`/`Link` — there's no URL per view (§2 explicitly rules out deep-linking), so a button that
sets local state is the honest element, not a link to nowhere.

**Layout:**
- Widen the outer `<main>` (`editor.tsx:336`) from `max-w-2xl` to `max-w-4xl` — enough for a
  `~192px` sidebar column plus gap plus a content column close to the old `672px` reading width,
  without cramping either. The header above the sidebar/content split (back link, title,
  description, reset control, error/feedback) now renders inside this wider container too — a
  minor, one-time width change to existing header text, not a behavior change; call it out in the
  manual check (§7) so it isn't mistaken for a regression.
- Below the header, replace the single content `<div>` (`editor.tsx:370-378`) with a
  `flex flex-col gap-8 sm:flex-row` row: the `<nav>` first (`sm:w-48 sm:shrink-0 sm:sticky
  sm:top-8 sm:self-start`), then a `min-w-0 flex-1` content column holding whichever branch §3.3
  renders. Below the `sm:` breakpoint they stack vertically (nav above content) — no separate
  collapse/hamburger mechanism; this is a dev-tooling page, not end-user product surface, so a
  simple stack is enough.
- No new hardcoded colors — active/inactive nav-item styling must come from the same
  CSS-custom-property-driven Tailwind arbitrary-value convention the file already uses (see
  `MUTED_ACTION`, `editor.tsx:34-41`), not new literal values.

### 3.3 Main content branch

Inside the `flex-1` content column from §3.2, branch on `selectedView`:

```tsx
const headingFor = (key: ComponentKey) => grouped.find((s) => s.key === key)?.heading ?? key;

// ...inside the content column:
{selectedView === "all" ? (
  <div className="flex flex-col gap-8">
    {flat.map((s) => renderSection(s.key, "h2", s.heading))}
    <section aria-label="Components">
      <h2 className="text-lg font-semibold">Components</h2>
      <div className="mt-2 flex flex-col gap-6">
        {grouped.map((s) => renderSection(s.key, "h3", s.heading))}
      </div>
    </section>
  </div>
) : (
  <ComponentDetailView sectionKey={selectedView}>
    {renderSection(selectedView, "h2", headingFor(selectedView))}
  </ComponentDetailView>
)}
```

`headingFor` falls back to the raw `key` rather than a non-null assertion — `ComponentKey`'s type
already guarantees a match exists in `grouped`, so this only matters if §9's first stop-condition
(SECTIONS shape drift) has silently gone unheeded; a readable fallback beats a runtime throw or a
`!` assertion for that edge.

The `"all"` branch's inner content is a **verbatim copy** of what's there today (moved from the
`mt-6 flex flex-col gap-8` wrapper, now living on the flex row from §3.2, into this inner `div`)
— don't refactor `renderSection`, `flat`, or `grouped` while moving this code; that's the "no
behavior change" requirement in §1 and §8 below made concrete, and why §7's "pixel-identical"
check is scoped to this inner content (same sections, same order, same `FieldRow`s), not the
whole page (which now also has the persistent sidebar from §3.2).

`ComponentDetailView` receives the already-rendered fields section as `children` — built by
calling `renderSection` here, inside `Editor`, where it already has the closures it needs
(`inFlight`, `runWrite`, `runReset`, `runPromote` via `fieldsFor`) — rather than
`ComponentDetailView` itself needing those closures. See §3.4 for why that matters.

### 3.4 `ComponentDetailView` (new, same file, module level)

Define `ComponentDetailView`, its `PREVIEWS` lookup, and all four preview components at **module
level** in `editor.tsx` — the same level as `ColorRow`/`SliderRow`/`FieldRow` above
(`editor.tsx:64-198`), **not** nested inside `Editor`. This matters: if any of these were defined
inside `Editor`'s function body, React would treat them as a new component type on every `Editor`
render (e.g. every `router.refresh()`), remounting them and wiping their local `useState` — a
`SliderPreview` mid-drag would snap back to its initial value whenever any field anywhere
committed. Because `ComponentDetailView` takes its fields section as `children` (§3.3) instead of
closing over `Editor`'s state itself, it has no reason to be defined inside `Editor` in the first
place — module level is both correct and simpler.

```tsx
function ButtonPreview() {
  return (
    <div className="flex gap-3">
      <Button variant="primary" onClick={() => {}}>Primary</Button>
      <Button variant="secondary" onClick={() => {}}>Secondary</Button>
    </div>
  );
}

function ColorFieldPreview() {
  const [value, setValue] = useState("#ae97f7");
  return <ColorField label="Preview" value={value} onChange={setValue} />;
}

function SliderPreview() {
  const [value, setValue] = useState(50);
  return <Slider label="Preview" value={value} onChange={setValue} min={0} max={100} step={1} />;
}

function SegmentedControlPreview() {
  const [value, setValue] = useState("a");
  return (
    <SegmentedControl
      ariaLabel="Preview"
      value={value}
      onChange={setValue}
      options={[
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
      ]}
    />
  );
}

const PREVIEWS: Record<ComponentKey, ComponentType> = {
  "component.colorField": ColorFieldPreview,
  "component.slider": SliderPreview,
  "component.segmentedControl": SegmentedControlPreview,
  "component.button": ButtonPreview,
};

function ComponentDetailView({
  sectionKey,
  children,
}: {
  sectionKey: ComponentKey;
  children: ReactNode;
}) {
  const Preview = PREVIEWS[sectionKey];
  return (
    <div className="flex flex-col gap-8">
      <Preview />
      {children}
    </div>
  );
}
```

`ComponentDetailView` does **not** render its own heading — `renderSection` (passed in as
`children`, see below) already renders one (`<h2>{heading}</h2>` via its `Title` element,
`editor.tsx:314-318`). Rendering a second `<h2>{heading}</h2>` inside `ComponentDetailView` would
duplicate it. The heading shown is therefore the one `renderSection` produces, not a
separately-styled one — that's intentional, not a downgrade: it keeps this view's heading
identical in markup/style to every other section heading on the page, consistent with "no
behavior change" beyond what §1 scoped.

Import `Button`, `ColorField`, `Slider`, `SegmentedControl` from `@guitar-tabs/design-system` —
`editor.tsx` already imports `Button`, `ColorField`, `Slider` from there (`editor.tsx:6`); add
`SegmentedControl` to that same import. Also add
`import type { ComponentType, ReactNode } from "react";` — `editor.tsx` currently only imports
hooks from `"react"` (`editor.tsx:3`), and `React.ReactNode`/`JSX.Element` as bare globals are
fragile across React type-package versions; importing the concrete types avoids that.

`children` — the section's fields, complete with its own heading — comes from `renderSection`'s
existing per-field rendering (`FieldRow`, `editor.tsx:141-198`), called in `Editor` and passed
down (§3.3); don't duplicate that logic inside `ComponentDetailView`.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A field is edited (blur/debounce commits, `router.refresh()` fires) while a component's detail view is open | `selectedView` must not reset to `"all"` — the user stays on the component they were editing. Expected mechanism: `router.refresh()` re-fetches the Server Component's data without remounting the `"use client"` `Editor` tree (no key/tree-shape change here), so `useState` — including `selectedView` — survives untouched; no special handling should be needed. **Verify this empirically anyway** (open a component view, edit a field, confirm the sidebar selection is still there after the refresh) — if it doesn't survive, stop and ask before adding workaround state, since that would mean this specific app diverges from the generic Next.js behavior, not that the generic behavior is wrong. |
| `inFlight`/error state from an edit in one component view | Unaffected by this task — it's the same global `inFlight`/`error`/`feedback` state as today, just now potentially referring to a field not currently visible if the user switched views mid-request. Don't add new per-view state for this; out of scope. |

Separately, note (not a required behavior change): `FieldRow`'s existing
`key={`${d.path}:${d.value}`}` (`editor.tsx:322`) remounts a field row whenever its value changes
after a commit — pre-existing behavior, unrelated to this task. In a per-component view the user
is looking directly at the row they just edited, so a brief remount (cursor/focus reset) is more
noticeable than on the long flat page, but it's not a regression this task introduces and it's
not in scope to fix here.

## 5. Forbidden patterns

- No bare `except`/swallowed errors (n/a in this TSX-only change, stated for template
  completeness).
- No hardcoded colors/spacing in **styling** — the four preview components already consume only
  CSS custom properties for their own appearance; don't introduce a literal hex/px value in any
  `className`/inline style in `ComponentDetailView`, the sidebar markup, or the preview
  components. **Exception:** a preview's own demo props/state — `ColorFieldPreview`'s
  `useState("#ae97f7")`, `SliderPreview`'s `min`/`max`/`step`, `SegmentedControlPreview`'s
  `"a"`/`"b"` option values — are fine. They're arbitrary interaction-demo data, never rendered as
  a token value or as styling; not what this rule guards against.
- No touching `.env`/credentials.
- No new dependencies.

## 6. File allowlist

- `app/app/design-system/editor.tsx` only.

## 7. Acceptance criteria

- `npm run verify` passes (typecheck, lint, the existing 45+ `node --test` tests — none of which
  touch `editor.tsx`, so this task cannot break them by construction, but run it anyway).
- Manual check (no automated test exists for `editor.tsx` — no DOM/RTL harness in this project,
  same reasoning used for other UI-only tasks in this plan): open `/design-system`, confirm:
  - Default view is "All variables"; its content column (the fields/sections, §3.3) is
    pixel-identical to today's page's content. The page as a whole now also shows the persistent
    sidebar and a wider header (§3.2) — expected, not a regression.
  - Clicking each of the four component names shows only that component's fields + a live
    instance of it, in sidebar order: Color Field, Slider, Segmented Control, Button (§1).
  - Editing a field in a component's detail view updates the field row immediately (existing
    auto-commit behavior, unchanged) and, after `router.refresh()`, the live instance's rendering
    reflects the edit via CSS custom properties (e.g. a background-color edit visibly changes the
    preview `Button`'s color). The preview's own local demo interaction state (e.g.
    `SliderPreview`'s dragged value) is independent of the token and is not expected to track it.
  - The active sidebar item is visually distinguishable from the inactive ones (`aria-current`
    plus a visible style difference, not `aria-current` alone).

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` shows only `app/app/design-system/editor.tsx`.
- Manual check above passed.
- Self-check (per `WEB_APP_WORKFLOW.md` §3): before reporting back, confirm the manual-check
  claims above against what actually renders, not just against what `npm run verify` printed.
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).

## 9. Stop-conditions

- If `field-descriptors.mjs`'s `SECTIONS`/`grouped`/`flat` shape has changed since this spec was
  written (i.e. doesn't match §3.2/§3.3's description of `editor.tsx:306-308`), **stop and ask**
  rather than adapting silently — that's exactly the kind of stale-assumption gap this project's
  process exists to catch (see this plan's own note about the Fretboard-playhead spec written
  against stale code).
- If achieving a pixel-identical "All variables" **content column** (§7 — the fields/sections
  inside the content area, not the sidebar/header layout changes §3.2 already specifies) turns
  out to require restructuring `renderSection`/`flat`/`grouped` rather than a straight extraction,
  **stop and ask** before doing that restructuring — it would expand this task's blast radius
  beyond what §1 scoped.
- If any required prop for a preview component (§3.4) isn't obvious from its current `.tsx` file,
  **stop and ask** rather than guessing a value — don't invent sample data that could look wrong
  or misleading in the live preview.
