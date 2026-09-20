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

This task adds a sidebar with **five entries**:
1. **"All variables"** — renders exactly what the page renders today, unchanged. Default/initial
   view.
2. **Button**
3. **Color Field**
4. **Slider**
5. **Segmented Control**

Selecting one of the four component entries replaces the main content with:
- Only that component's fields (`fieldsFor(key)` — already exists, `editor.tsx:306`), rendered
  via the existing `FieldRow`/`ColorRow`/`SliderRow` with no behavior change.
- One live-rendered instance of the actual component (imported from `@guitar-tabs/design-system`,
  the same package the app itself consumes), using representative sample props, positioned above
  or beside its fields so a token edit is visible on a real rendered instance immediately after
  `router.refresh()` — not just as a hex/number in a field row.

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

### 3.2 Sidebar

Add a sidebar element rendering five items: a static `"All variables"` label plus
`grouped.map((s) => s.heading)` (`grouped` already exists, `editor.tsx:308`, and already holds
exactly the four component sections in the right order — reuse it, don't hand-write a second list
of component names). Clicking an item sets `selectedView` to `"all"` or that section's `key`.
Mark the active item (`aria-current="page"` or equivalent) so it's visually clear which view is
showing — this is a real usability requirement, not decoration: a sidebar with no active-state
indicator defeats its own purpose.

### 3.3 Main content branch

Replace the current unconditional render (`editor.tsx:370-378`, the `flat.map(...)` +
`<section aria-label="Components">...grouped.map(...)</section>` block) with:

```tsx
{selectedView === "all" ? (
  <div className="mt-6 flex flex-col gap-8">
    {flat.map((s) => renderSection(s.key, "h2", s.heading))}
    <section aria-label="Components">
      <h2 className="text-lg font-semibold">Components</h2>
      <div className="mt-2 flex flex-col gap-6">
        {grouped.map((s) => renderSection(s.key, "h3", s.heading))}
      </div>
    </section>
  </div>
) : (
  <ComponentDetailView sectionKey={selectedView} fields={fieldsFor(selectedView)} /* ...pass whatever renderSection/FieldRow needs */ />
)}
```

The `"all"` branch is a **verbatim copy** of what's there today — don't refactor `renderSection`,
`flat`, or `grouped` while moving this code; that's the "no behavior change" requirement in §1
and §8 below made concrete.

### 3.4 `ComponentDetailView` (new, same file)

A new function component in `editor.tsx`, taking the selected section's fields and rendering:
1. A heading (the section's `heading`, e.g. `"Button"`).
2. The live-rendered instance — one `switch`/`if` branch per `ComponentKey`, using local demo
   state so the instance is interactive and doesn't throw on missing required props:

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
```

Import `Button`, `ColorField`, `Slider`, `SegmentedControl` from `@guitar-tabs/design-system` —
`editor.tsx` already imports `Button`, `ColorField`, `Slider` from there (`editor.tsx:6`); add
`SegmentedControl` to that same import.

3. Below the preview: the section's fields, using `renderSection`'s existing per-field rendering
   (`FieldRow`, `editor.tsx:141-198`) — reuse that function/component as-is; don't duplicate its
   logic inside `ComponentDetailView`.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A field is edited (blur/debounce commits, `router.refresh()` fires) while a component's detail view is open | `selectedView` must not reset to `"all"` — the user stays on the component they were editing. (Confirm: does `router.refresh()` remount `Editor`, losing `useState`? If it does, `selectedView` needs to survive that — e.g. lift it no further than it already is, since `Editor` itself isn't remounted by `router.refresh()`, only its props/children are re-fetched. Verify this empirically before assuming either way.) |
| `inFlight`/error state from an edit in one component view | Unaffected by this task — it's the same global `inFlight`/`error`/`feedback` state as today, just now potentially referring to a field not currently visible if the user switched views mid-request. Don't add new per-view state for this; out of scope. |

## 5. Forbidden patterns

- No bare `except`/swallowed errors (n/a in this TSX-only change, stated for template
  completeness).
- No hardcoded colors/spacing — the four preview components already consume only CSS custom
  properties; don't introduce a literal hex/px value anywhere in `ComponentDetailView` or the
  sidebar markup.
- No touching `.env`/credentials.
- No new dependencies.

## 6. File allowlist

- `app/app/design-system/editor.tsx` only.

## 7. Acceptance criteria

- `npm run verify` passes (typecheck, lint, the existing 45+ `node --test` tests — none of which
  touch `editor.tsx`, so this task cannot break them by construction, but run it anyway).
- Manual check (no automated test exists for `editor.tsx` — no DOM/RTL harness in this project,
  same reasoning used for other UI-only tasks in this plan): open `/design-system`, confirm:
  - Default view is "All variables," pixel-identical to today's page.
  - Clicking each of the four component names shows only that component's fields + a live
    instance of it.
  - Editing a field in a component's detail view updates both the field row and the live instance
    after `router.refresh()`.
  - The active sidebar item is visually distinguishable from the inactive ones.

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` shows only `app/app/design-system/editor.tsx`.
- Manual check above passed.
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).

## 9. Stop-conditions

- If `field-descriptors.mjs`'s `SECTIONS`/`grouped`/`flat` shape has changed since this spec was
  written (i.e. doesn't match §3.2/§3.3's description of `editor.tsx:306-308`), **stop and ask**
  rather than adapting silently — that's exactly the kind of stale-assumption gap this project's
  process exists to catch (see this plan's own note about the Fretboard-playhead spec written
  against stale code).
- If achieving "pixel-identical 'All variables' view" turns out to require restructuring
  `renderSection`/`flat`/`grouped` rather than a straight extraction, **stop and ask** before
  doing that restructuring — it would expand this task's blast radius beyond what §1 scoped.
- If any required prop for a preview component (§3.4) isn't obvious from its current `.tsx` file,
  **stop and ask** rather than guessing a value — don't invent sample data that could look wrong
  or misleading in the live preview.
