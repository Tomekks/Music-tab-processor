# Task spec: Per-component sidebar navigation (Task 7)

**Tier: S** — single file (`editor.tsx`), design-system/UI work, no real user data or deploy
involved, fully revertible via `git checkout` + a rebuild. Sizable `Scope` below despite S tier —
this is a real UI restructuring with several genuine scope decisions to pin down, not narrative;
S trims ceremony (no 9-section template, no pre-implementation critique round by default), not
the decisions themselves.

**This replaces this file's own previous version — a fresh rewrite, not a patch.** The prior
version was written before Tasks 1b and 2 landed; both touched `editor.tsx` substantially (a new
seed-generation section, `cssVarNameForPath`-driven live preview in `ColorRow`/`SliderRow`,
`runWrite` now returns `Promise<boolean>`), so its cited line numbers and structure no longer
match. Written fresh against `app/app/design-system/editor.tsx` at commit `aa60b5c` (current, 468
lines) — if it has changed since, stop and re-read.

## Scope

Today `editor.tsx`'s `Editor` renders one long flat page. This task adds a sidebar with five
entries — **All variables** (today's full page, unchanged) and the four `component.*` groups
(`Color Field`, `Slider`, `Segmented Control`, `Button` — `SECTIONS`' existing `grouped` array,
already computed in `Editor`, reused verbatim for the sidebar's four entries so the two lists
can't drift) — plus, for a per-component selection, one live-rendered instance of that actual
component with sample props, so a token edit is visible on a real rendered instance instead of
only as a hex/number in a field row.

**Resolved scope decisions (real design calls, made here rather than left for a clarifying
round-trip):**
- **Per-component view excludes the seed-generation section and "Reset all changes."** Both are
  global/brand-wide actions ("regenerate all 18 colors," "reset every modified field") that don't
  make sense scoped to one component's few fields — showing them in a narrow per-component view
  would be misleading about what they actually affect. They stay exclusive to "All variables."
- **`selectedView` is plain local React state, not a URL param.** Every existing action already
  relies on local state (`error`, `feedback`, `inFlight`, ...) surviving `router.refresh()` calls
  without remounting `Editor` — confirmed by reading the existing code, which already depends on
  exactly this. `selectedView` follows the same pattern; no new persistence mechanism needed, and
  a page refresh resetting to "All variables" is acceptable (this is a dev-only internal tool,
  `NODE_ENV === "production"` 404s the whole route already).
- **"All variables" stays a verbatim, unmoved block.** Rather than hoist shared pieces (intro
  text, error/feedback banners) out to a common wrapper and risk the "pixel-identical to today"
  requirement drifting, only the back-link and `<h1>` move outside the new two-column layout as
  page chrome; everything else currently in `Editor`'s return (both intro `<p>`s through the
  closing sections `<div>`) becomes the `selectedView === "all"` branch, untouched. The
  per-component branch gets its own small, independent error/feedback rendering — a few duplicated
  lines, deliberately, over restructuring a block that must stay pixel-identical.
- **Live preview compounds for free.** A per-component field edit already sets the corresponding
  CSS custom property on `document.documentElement.style` (Task 2); the live-rendered component
  instance reads the same custom properties via its existing Tailwind arbitrary-value classes, so
  it updates instantly as a field is edited — no new wiring needed for this, confirmed by reading
  both `ColorRow`'s effect and e.g. `Button.tsx`'s `bg-[var(--component-button-primary-background)]`.
- **No new keyboard/ARIA machinery beyond what's already established.** The sidebar is a plain
  list of buttons with `aria-current="page"` on the active one and the existing `FOCUS_RING` — not
  a `role="tablist"` with arrow-key navigation (that's `SegmentedControl`'s pattern, for a
  different, horizontal-tabs use case; this is vertical navigation between full content swaps, not
  a same-panel tab switch). Native `Tab` order across the five buttons already works.

### Types and state

```tsx
type ComponentSectionKey =
  | "component.colorField"
  | "component.slider"
  | "component.segmentedControl"
  | "component.button";
```
Add `const [selectedView, setSelectedView] = useState<"all" | ComponentSectionKey>("all");` to
`Editor`. `grouped` (`SECTIONS.filter((s) => s.group)`) already exists — build the sidebar's four
entries by mapping it, not a second hardcoded list:
```tsx
const sidebarItems: { key: "all" | ComponentSectionKey; label: string }[] = [
  { key: "all", label: "All variables" },
  ...grouped.map((s) => ({ key: s.key as ComponentSectionKey, label: s.heading })),
];
```

### Layout

Widen `<main>` from `max-w-2xl` to `max-w-4xl` (room for a sidebar). Keep the back-link and
`<h1>` where they are, then wrap everything from the first intro `<p>` onward in a two-column row:
```tsx
<div className="mt-6 flex gap-8">
  <nav aria-label="Design system sections" className="w-44 shrink-0">
    <ul className="flex flex-col gap-1">
      {sidebarItems.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => setSelectedView(item.key)}
            aria-current={selectedView === item.key ? "page" : undefined}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm font-medium",
              FOCUS_RING,
              selectedView === item.key
                ? "bg-surface-active text-surface-active-text"
                : "text-surface-text/80 hover:bg-surface-hover",
            )}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  </nav>
  <div className="min-w-0 flex-1">
    {selectedView === "all" ? (
      <>{/* today's existing body, verbatim, unmoved — from the first intro <p> through the closing sections <div> */}</>
    ) : (
      <ComponentDetailView
        sectionKey={selectedView}
        heading={grouped.find((s) => s.key === selectedView)!.heading}
        fields={fieldsFor(selectedView)}
        disabledPaths={inFlight}
        onCommitValue={runWrite}
        onRevert={runReset}
        onPromote={runPromote}
        error={error}
        feedback={feedback}
      />
    )}
  </div>
</div>
```
`grouped.find((s) => s.key === selectedView)!` — safe: `selectedView` can only be a value from
`sidebarItems`, which is itself built from `grouped`, so the lookup always succeeds when
`selectedView !== "all"`.

### `ComponentDetailView` (new, local to `editor.tsx`)

Reuses `FieldRow` unchanged for the field list; adds one bordered live-preview area above it
(single flat border, not nested boxes — matches `DESIGN.md`'s "no card-nesting"):
```tsx
function ComponentDetailView({
  sectionKey,
  heading,
  fields,
  disabledPaths,
  onCommitValue,
  onRevert,
  onPromote,
  error,
  feedback,
}: {
  sectionKey: ComponentSectionKey;
  heading: string;
  fields: FieldDescriptor[];
  disabledPaths: Set<string>;
  onCommitValue: (path: string, value: string) => Promise<boolean>;
  onRevert: (path: string) => void;
  onPromote: (path: string) => void;
  error: string | null;
  feedback: string | null;
}) {
  return (
    <section aria-label={heading}>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <div className="mt-3 rounded-md border border-border p-4">
        <ComponentPreview sectionKey={sectionKey} />
      </div>
      <div className="mt-4 divide-y divide-border">
        {fields.map((d) => (
          <FieldRow
            key={`${d.path}:${d.value}`}
            d={d}
            disabled={disabledPaths.has(d.path)}
            onCommitValue={onCommitValue}
            onRevert={onRevert}
            onPromote={onPromote}
          />
        ))}
      </div>
      {feedback && (
        <p aria-live="polite" className="mt-3 text-sm text-surface-text/70">{feedback}</p>
      )}
      {error && (
        <p aria-live="polite" role="alert" className="mt-3 text-sm text-red-500">{error}</p>
      )}
    </section>
  );
}
```

### `ComponentPreview` (new, local to `editor.tsx`)

Four small branches, not a generic "renders any component" abstraction (plan's own instruction —
YAGNI until a fifth component exists). Sample props are static/non-functional except
`SegmentedControl`, which needs real local state to demonstrate its own persistent-selection
behavior:
```tsx
function ComponentPreview({ sectionKey }: { sectionKey: ComponentSectionKey }) {
  const [demoTab, setDemoTab] = useState<"a" | "b">("a");
  switch (sectionKey) {
    case "component.colorField":
      return <ColorField label="Sample" value="#4a90d9" onChange={() => {}} />;
    case "component.slider":
      return <Slider label="Sample" value={50} min={0} max={100} step={1} onChange={() => {}} />;
    case "component.segmentedControl":
      return (
        <SegmentedControl
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
          value={demoTab}
          onChange={setDemoTab}
          ariaLabel="Sample"
        />
      );
    case "component.button":
      return (
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => {}}>Primary</Button>
          <Button variant="secondary" onClick={() => {}}>Secondary</Button>
        </div>
      );
  }
}
```
Add `SegmentedControl` to the existing `import { Button, ColorField, Slider } from
"@guitar-tabs/design-system";` line.

## File allowlist

- `app/app/design-system/editor.tsx`

No other file changes — confirmed by reading `field-descriptors.mjs`, `token-writes.mjs`, and the
API route: nothing about this task needs a new export or a schema/interface change anywhere else.
No `.env`/credentials, no new npm dependency.

## Acceptance criteria

- `npm run verify` passes. No automated test for this task (pure UI restructuring, no DOM harness
  in this project, same reasoning prior UI-only tasks used).
- `git diff --stat` shows only `editor.tsx`.
- **Human checkbox** (not an execution-model criterion): open `/design-system`. Confirm "All
  variables" (the default) is pixel-identical to today's page content, just with the new sidebar
  alongside it. Click each of the four component entries: confirm its field list matches what
  that section showed in the flat page, its live component instance renders, and editing one of
  its fields updates the live instance instantly. Switch between "All variables" and a component
  view and back: confirm nothing crashes and in-flight edits don't silently corrupt state. If any
  field was edited during this check, revert it via its own Revert button and confirm `git status`
  shows no `tokens.json` modification before committing (same reason as every other manual check
  in this plan that exercises a real writing route).
- Self-check before reporting: file list and every claim above against what's on disk and what
  `npm run verify` printed.
- Checkpoint commit made.
