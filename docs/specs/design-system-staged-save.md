# Task spec: Pending edits, scope choice, explicit Save (Task 8b)

**Tier: S** — single file (`editor.tsx`), dev-only UI, no real user data, fully revertible via
`git checkout`. Larger `Scope` than most S-tier specs in this plan — this genuinely is the
highest-complexity merge point in the plan (the plan's own words) — but it doesn't split further:
the pending-edit `Map`, the Save action, and the per-field scope override are one seam (staged
writes), not several; splitting "state plumbing" from "scope UI" would mean the first half plumbs
a `scope` field nobody sets yet, an artificial cut, not a real boundary (per this project's own
"split at a genuine seam, not by size" rule).

Written fresh against `app/app/design-system/editor.tsx` (668 lines, last touched `cfe4c3c`) and
`docs/specs/design-system-batch-write.md` (Task 8a, landed `134e40d`) — if either has changed
since, stop and re-read before implementing.

## 0. Context (read, don't re-derive)

- **This only changes the per-component panel (`ComponentDetailView`, Task 7's UI), never "All
  variables."** `renderSection`/`FieldRow` calls in the `"all"` branch (lines 640, 644, all via
  `key={d.path}` at line 528) keep calling `onCommitValue={runWrite}` exactly as today — an
  immediate server write on blur/debounce. "All variables" not reflecting an unsaved per-component
  edit is expected, not a bug — Task 7/8's own scope rule ("All variables stays a verbatim, unmoved
  block") already established this, applies here too.
- 8a (`134e40d`) already provides `applyBatchWrite`/the `"batch-write"` route action:
  `{ edits: { path, value, scope: "exception" | "brand" }[] }`, all-or-nothing, `"brand"` resolves
  server-side to the leaf's alias target. This spec only has to build the client side that calls it.
- **F6 handoff from 8a's spec:** two pending edits whose `"brand"` scope resolves to the *same*
  target path silently last-wins server-side. 8a correctly can't resolve that — this spec must
  detect and block it client-side before Save, not just document the risk.
- `d.rawValue` is the leaf's literal `$value` (e.g. `"{semantic.color.accent}"`); `d.isAlias` is
  `rawValue.startsWith("{")` (both already on `FieldDescriptor`, used today at lines 127/207).
  Target path for a `"brand"` edit: `d.rawValue.slice(1, -1)`.

## 1. Scope

### New Editor-level state (add alongside the existing `useState` block, ~line 367)

```tsx
type PendingEdit = { value: string; scope: "exception" | "brand" };
const [pendingEdits, setPendingEdits] = useState<Map<string, PendingEdit>>(() => new Map());
const [bulkScope, setBulkScope] = useState<"exception" | "brand">("exception");
const [saveBusy, setSaveBusy] = useState(false);
```

`pendingEdits` is keyed by the *originating* field path (`d.path`), holds every unsaved edit
across all four components at once — not reset when `selectedView` changes (it's `Editor`-level
state; switching sections doesn't unmount `Editor`, same reasoning `selectedView` itself already
relies on). `bulkScope` is only the **default** scope assigned when an edit is *first* staged —
changing it later doesn't retroactively change already-staged edits (see `stageEdit` below); each
staged edit can be overridden individually afterward (§ Per-field scope override).

### Staging, discarding, collision-checking (new functions in `Editor`)

```tsx
function stageEdit(path: string, value: string) {
  setPendingEdits((prev) => {
    const next = new Map(prev);
    const existing = next.get(path);
    next.set(path, { value, scope: existing?.scope ?? bulkScope });
    return next;
  });
}
function setPendingScope(path: string, scope: "exception" | "brand") {
  setPendingEdits((prev) => {
    const existing = prev.get(path);
    if (!existing) return prev;
    const next = new Map(prev);
    next.set(path, { ...existing, scope });
    return next;
  });
}
function discardPendingEdit(path: string) {
  setPendingEdits((prev) => {
    if (!prev.has(path)) return prev;
    const next = new Map(prev);
    next.delete(path);
    return next;
  });
}
function discardAllPending() {
  setPendingEdits(new Map());
}

// F6: two pending "brand" edits resolving to the same alias target would
// silently last-wins server-side (8a spec, F6) — block Save instead.
function pendingCollisions(): { targetPath: string; labels: string[] }[] {
  const byTarget = new Map<string, string[]>();
  for (const [path, edit] of pendingEdits) {
    if (edit.scope !== "brand") continue;
    const d = descriptors.find((x) => x.path === path);
    if (!d?.isAlias) continue; // defensive; UI never offers "brand" for a non-alias field
    const target = d.rawValue.slice(1, -1);
    byTarget.set(target, [...(byTarget.get(target) ?? []), d.label]);
  }
  return [...byTarget.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([targetPath, labels]) => ({ targetPath, labels }));
}
```

### Save

```tsx
async function runSaveAll() {
  if (pendingEdits.size === 0) return;
  const collisions = pendingCollisions();
  if (collisions.length > 0) {
    setError(
      collisions
        .map((c) => `${c.labels.join(" and ")} both target ${c.targetPath} as brand-wide edits — change one to Exception scope first.`)
        .join(" "),
    );
    return;
  }
  setSaveBusy(true);
  setError(null);
  setFeedback(null);
  try {
    const edits = [...pendingEdits.entries()].map(([path, e]) => ({ path, value: e.value, scope: e.scope }));
    const result = await postAction({ action: "batch-write", edits });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPendingEdits(new Map());
    setFeedback(`Saved ${edits.length} field${edits.length === 1 ? "" : "s"}`);
    router.refresh();
  } finally {
    setSaveBusy(false);
  }
}
```

**`postAction`'s type must widen** (line 51): `body: Record<string, string>` →
`body: Record<string, unknown>` — `edits` is an array of objects, not a string. `JSON.stringify`
already handles this correctly; only the TypeScript parameter type is too narrow today. No other
call site (`runWrite`, `runReset`, etc.) needs a change — they still pass all-string bodies, which
still satisfy the widened type.

### Per-field scope override + Discard, in `FieldRow` (lines 212–269)

Add optional props — when absent (every call in the `"all"` branch, lines 527/343… wait, see
below), behavior is byte-for-byte what it is today:

```tsx
pending?: PendingEdit;
onStage?: (path: string, value: string) => void;
onDiscardPending?: (path: string) => void;
onSetScope?: (path: string, scope: "exception" | "brand") => void;
```

- **Staged mode is "on" for a row iff `onStage` is passed** (i.e., only from
  `ComponentDetailView`). In staged mode, the `commit` callback given to `ColorRow`/`SliderRow`
  becomes `(value) => { onStage!(d.path, value); return Promise.resolve(true); }` instead of
  `(value) => onCommitValue(d.path, value)` — the row's own debounce/blur timing is **unchanged**,
  only what firing "commit" *does* changes (per Task 8's plan text: this supersedes Task 2's
  auto-commit-to-server, keeps Task 2's live-DOM-preview effect and existing debounce mechanics
  as-is).
- **`ColorRow`/`SliderRow` need one new prop: `baseline: string`.** Every internal use of `d.value`
  for comparison/sync/rollback purposes (lines 78, 88 area, 89–92, 101, 103, 121, 143–144, 153–157,
  200) becomes `baseline` instead — `d` is still used for `d.path`/`d.$type`/`d.isAlias`/
  `d.rawValue`/`d.label`, just not for "what's the current committed value." `FieldRow` computes
  `const baseline = pending?.value ?? d.value;` and passes it down. This is what makes a pending
  edit **survive navigating away and back**: switching `selectedView` unmounts/remounts
  `ComponentDetailView` (and its `FieldRow`s), so `ColorRow`/`SliderRow`'s own `useState(d.value)`
  seed would otherwise reset to the disk value on remount — seeding from `baseline` instead
  restores the staged value. Every call site outside staged mode passes `d.value` as `baseline`
  (unchanged behavior, confirm this explicitly in the diff, don't let it silently become `d.value`
  everywhere by accident).
- **Button row visibility** (line 245 today: `{d.isModified && (...)}`) becomes
  `{(d.isModified || pending) && (...)}` — a pending-only edit (not yet on disk) still needs a way
  to undo it. **"Revert" button's handler**: if `pending` is set, it calls `onDiscardPending!(d.path)`
  (clears the staged value, restores the row to the disk value) regardless of `d.isModified`;
  otherwise unchanged (`onRevert(d.path)` → today's real `applyReset` call). **"Set as default"
  stays gated on `d.isModified` alone** — promoting an unsaved value to the defaults file makes no
  sense; only show it once a save has actually landed.
- **Per-field scope override**, rendered only when `pending && d.isAlias` (a non-alias field has
  nothing to cascade to — this spec resolves the "disabled vs. hidden" question left open in the
  plan: **hidden**, not a disabled control with a tooltip; a plain caption line
  `(exception only — not linked to a shared token)` under the value for a non-alias field with a
  pending edit is enough, cheaper than a disabled `SegmentedControl` nobody can use):
  ```tsx
  {pending && d.isAlias && (
    <SegmentedControl
      options={[{ value: "exception", label: "Exception" }, { value: "brand", label: "Brand-wide" }]}
      value={pending.scope}
      onChange={(v) => onSetScope!(d.path, v as "exception" | "brand")}
      ariaLabel={`Scope for ${d.label}`}
    />
  )}
  ```

### `ComponentDetailView` (lines 313–361)

Thread `pendingEdits: Map<string, PendingEdit>`, `onStage`, `onDiscardPending`, `onSetScope` down
to each `FieldRow` (`pending={pendingEdits.get(d.path)}`), in place of the current unconditional
`onCommitValue={onCommitValue}` — swap that prop for `onStage={onStage}` (staged mode is now
unconditional inside this view; `onCommitValue`/`onRevert`/`onPromote` stay as props too, since
`onRevert`/`onPromote` are still needed for the non-pending, disk-level path described above).

### Save bar (new, rendered in `Editor`'s per-component branch — lines 649–663 — above
`ComponentDetailView`, not inside it, since the pending count spans all four components, not just
the one currently shown)

```tsx
{pendingEdits.size > 0 && (
  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
    <SegmentedControl
      options={[{ value: "exception", label: "Exception" }, { value: "brand", label: "Brand-wide" }]}
      value={bulkScope}
      onChange={(v) => setBulkScope(v as "exception" | "brand")}
      ariaLabel="Default scope for new edits"
    />
    <Button variant="primary" disabled={saveBusy} onClick={runSaveAll}>
      {saveBusy ? "Saving…" : `Save changes (${pendingEdits.size})`}
    </Button>
    <Button variant="secondary" disabled={saveBusy} onClick={discardAllPending}>
      Discard changes
    </Button>
  </div>
)}
```

Only shown on a per-component view (matches Task 8's own scope: "for edits made inside a Task 7
component panel") — not on "All variables," even if pending edits exist from another component;
that's a deliberate scoping choice, not an oversight — state it as such if asked.

## 2. Non-goals

- No change to `renderSection`/"All variables"'s own `FieldRow` calls — they keep calling
  `onCommitValue={runWrite}`, no `pending`/`onStage` props, unchanged behavior.
- No confirm dialog on navigating between components with pending edits (per the plan's resolved
  decision — pending edits persist silently, only Save/Discard clear them).
- No child-brand handling (Task 5c's concern, unaffected by this spec).
- No debounce/timing change to `ColorRow`/`SliderRow` — only what "commit" does changes, not when.

## 3. File allowlist

- `app/app/design-system/editor.tsx` only.

No `.env`/credentials, no new npm dependency, no `tokens.json`/`tokens.default.json` edits by this
spec itself (the manual check below writes to it, same as every prior UI task's check).

## 4. Acceptance criteria

- `npm run verify` passes. No automated test for this task (pure UI state, no DOM harness in this
  project, same reasoning every prior UI-only task in this plan used).
- `git diff --stat` shows only `editor.tsx`.
- **Human checkbox** (per the plan's own Task 8b list — not an execution-model criterion): open a
  component view, edit two fields with different scopes (one Exception, one Brand-wide); confirm
  neither writes to disk until Save is clicked (`git status` clean on `tokens.json` while pending);
  confirm the Brand-wide edit changes a second component sharing that token after Save; confirm
  clicking Revert on a pending (unsaved) edit discards the staged value without a server call;
  confirm Revert on an already-saved (disk-modified) field still does a real reset; confirm
  switching components and back preserves pending edits; confirm Discard clears them all; confirm
  staging two Brand-wide edits that resolve to the same target blocks Save with a clear message
  naming both fields.
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- `tokens.json` restored to committed state after the manual check; checkpoint commit (not pushed).

## 5. Stop-conditions

- If `editor.tsx`'s current shape (line numbers, `ColorRow`/`SliderRow`/`FieldRow` signatures,
  `postAction`'s body type) has drifted from what §1 describes, stop and confirm rather than
  reconciling silently.
- If threading `baseline` through `ColorRow`/`SliderRow` requires restructuring either component
  beyond a prop rename + the render-adjust comparisons already in place, stop and ask — this spec
  assumes it's a rename, not a rewrite.
- If the collision-blocking message in `runSaveAll` can't cleanly identify both colliding fields
  by label (e.g. a path with no matching descriptor), stop and ask rather than guessing a fallback
  label.
