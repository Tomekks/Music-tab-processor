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

## 0. User story

You're editing tokens in a component panel — say, Button. You change the primary background
color and bump the padding. Both update the live preview instantly, but nothing writes to disk
yet. For each change, you pick whether it applies only to this component (Exception) or to every
component that shares that token (Brand-wide) — a new edit defaults to whatever the bulk toggle
is currently set to (flipping one field's own override doesn't change that default for the next
field you edit). You click "Save changes (2)" and both land together, or "Discard changes" to
throw them away without asking. Switching to another component and back doesn't lose your unsaved
edits. If two of your pending changes would collide — both trying to go brand-wide to the same
shared token — Save refuses and tells you exactly which two conflict (by field *and* section, so
"Radius" in Color Field isn't confused with "Radius" in Button), instead of silently keeping only
one.

## 1. Context (read, don't re-derive)

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

## 2. Scope

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
    // A non-alias field can never go "brand" (nothing to cascade to) — force
    // "exception" here, don't just trust bulkScope. Without this, setting the
    // bulk default to Brand-wide and then editing any literal (non-alias)
    // field stages a "brand" edit that 8a's all-or-nothing batch-write would
    // reject at Save time, failing the whole batch over one field that
    // should never have had the option.
    const d = descriptors.find((x) => x.path === path);
    const scope = existing?.scope ?? (d?.isAlias ? bulkScope : "exception");
    next.set(path, { value, scope });
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
// Labels are qualified with their section heading (SECTIONS lookup on
// d.section) because two colliding fields are very plausibly named the
// same thing in different components — e.g. "Radius" in Color Field vs.
// "Radius" in Button — and an unqualified "Radius and Radius" message
// wouldn't tell the user which two fields it's even talking about.
function sectionHeading(sectionKey: string): string {
  return SECTIONS.find((s) => s.key === sectionKey)?.heading ?? sectionKey;
}
function pendingCollisions(): { targetPath: string; labels: string[] }[] {
  const byTarget = new Map<string, string[]>();
  for (const [path, edit] of pendingEdits) {
    if (edit.scope !== "brand") continue;
    const d = descriptors.find((x) => x.path === path);
    if (!d?.isAlias) continue; // defensive; UI never offers "brand" for a non-alias field
    const target = d.rawValue.slice(1, -1);
    const label = `${d.label} (${sectionHeading(d.section)})`;
    byTarget.set(target, [...(byTarget.get(target) ?? []), label]);
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

Add optional props — when absent (the `"all"` branch's `renderSection` call site, line 528), the
row's behavior is byte-for-byte what it is today:

```tsx
pending?: PendingEdit;
onStage?: (path: string, value: string) => void;
onDiscardPending?: (path: string) => void;
onSetScope?: (path: string, scope: "exception" | "brand") => void;
```

`FieldRow`'s existing `disabled: boolean` prop (already required, not new) gets one new input at
its `ComponentDetailView` call site: **`disabled={disabledPaths.has(d.path) || saveBusy}`** — a
row's own Discard/Revert/scope-override must be inert while a save is in flight, or clicking
Discard on a field whose value is mid-POST clears the pending map while the in-flight request is
still writing the value that was just discarded (a real race, not a hypothetical — the POST body
was already built from `pendingEdits` before the click). `renderSection`'s call site (the `"all"`
branch) is unaffected — it has no `saveBusy` concept.

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
  `const baseline = pending?.value ?? d.value;` and passes it down. **This "every internal use"
  explicitly includes the render-adjust sync check** (`ColorRow`'s `syncedSource !== d.value` at
  line 89, `SliderRow`'s equivalent at line 153) — **not just the initial `useState` seed.** This
  is what makes both of the following actually work, not just navigation-persistence:
  - **Survives navigating away and back**: switching `selectedView` unmounts/remounts
    `ComponentDetailView` (and its `FieldRow`s), so `ColorRow`/`SliderRow`'s own
    `useState(d.value)` seed would otherwise reset to the disk value on remount — seeding from
    `baseline` instead restores the staged value.
  - **Discard actually clears the row and the live preview.** Discarding a pending edit removes
    it from `pendingEdits` but never touches `d.value` (nothing was written to disk) and triggers
    no `router.refresh()` — so if the sync check still compared against `d.value`, the row (and
    Task 2's live-DOM-preview effect, which reads the row's own `text`/`num` state) would keep
    showing the discarded value indefinitely, with no remount to reset it. Comparing against
    `baseline` instead means the moment `pendingEdits` no longer has an entry for this path,
    `baseline` drops back to `d.value` and the existing sync-adjust logic (unchanged otherwise)
    picks that up on its own — same mechanism, corrected input, no new code path needed.
  Every call site outside staged mode passes `d.value` as `baseline` (unchanged behavior, confirm
  this explicitly in the diff, don't let it silently become `d.value` everywhere by accident).
- **`ColorRow`'s Escape handler (line 119–124 today) needs one new optional prop:
  `onCancelPending?: () => void`.** Today, Escape resets the text box to `d.value` and blurs —
  under staged mode this is wrong: it visually resets the field but leaves the stale value sitting
  in `pendingEdits`, which Save would still write. `FieldRow` passes
  `onCancelPending={pending ? () => onDiscardPending!(d.path) : undefined}` (only when a pending
  edit actually exists for this row). `ColorRow`'s Escape branch becomes: if `onCancelPending` is
  set, call it (discarding drops `baseline` back to `d.value`, which the render-adjust sync from
  the point above then picks up on its own — no separate `setText` call needed); otherwise, today's
  `setText(baseline)` (not `setText(d.value)` — same rename as everywhere else). `SliderRow` has no
  Escape handling today and doesn't need one added by this spec — not a gap this task introduces.
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

## 3. Non-goals

- No change to `renderSection`/"All variables"'s own `FieldRow` calls — they keep calling
  `onCommitValue={runWrite}`, no `pending`/`onStage` props, unchanged behavior.
- No confirm dialog on navigating between components with pending edits (per the plan's resolved
  decision — pending edits persist silently, only Save/Discard clear them).
- No child-brand handling (Task 5c's concern, unaffected by this spec).
- No debounce/timing change to `ColorRow`/`SliderRow` — only what "commit" does changes, not when.

## 4. File allowlist

- `app/app/design-system/editor.tsx`
- `app/e2e/design-system/staged-save.spec.ts` (new)

`app/playwright.config.ts`, `app/playwright.design-system.config.ts`, and the
`test:e2e:design-system` script in `app/package.json` already exist (landed separately, ahead of
this spec) — not this task's to create or modify; if any of them looks wrong for this spec's needs,
stop and say so rather than changing them inline.

No `.env`/credentials, no new npm dependency, no `tokens.json`/`tokens.default.json` edits by this
spec itself (the manual check below writes to it, same as every prior UI task's check).

## 5. Acceptance criteria

- `npm run verify` passes.
- `git diff --stat` shows only `editor.tsx` plus the new Playwright spec below.
- **Required: `app/e2e/design-system/staged-save.spec.ts`, run via `npm run test:e2e:design-system`**
  (its own config, `playwright.design-system.config.ts` — a `next dev` server on `:3002`, separate
  from the main `playwright.config.ts`'s production-build server, so this run never pays for a
  full `npm run build`; per `docs/WEB_APP_WORKFLOW.md` §3's Playwright rule — this task is
  interaction behavior end to end, not visual judgment, so it does not get a human-checkbox-only
  check). Use real field pairs already in `tokens.json` rather than inventing paths, so the spec
  exercises the actual cascade logic:
  - `component.colorField.radius` and `component.button.radius` both alias `semantic.radius.base`
    (confirmed via the tree — `grep -n '"radius"' app/packages/design-system/brands/default/tokens.json`
    if re-verifying). Both are `dimension` fields → render as `SliderRow`, labeled "Radius" in
    their respective sections.
  - `component.colorField.border` and `component.slider.trackColor` both alias
    `semantic.color.border`. `color` fields → render as `ColorRow`, labeled "Border" and
    "Track color".
  - Test cases, each a real interaction, not a mock:
    1. Open the Color Field section, edit "Radius" via its slider. Assert a "Save changes (1)"
       button appears and `tokens.json` on disk is unchanged (no `POST` observed, or read the file
       directly if running against a local checkout — implementer's choice, state which).
    2. Click "Discard changes". Assert the Save bar disappears and the field shows its original
       value.
    3. Edit "Radius" again, set its scope to Brand-wide (per-field override control), click
       "Save changes". Assert the request succeeds, then navigate to the Button section and assert
       its "Radius" field now shows the same new value (the cascade — both alias the same target).
    4. Revert the change afterward (via the now-real disk-level Revert) so the spec is idempotent
       across runs — don't leave `tokens.json` modified between test runs.
    5. Edit "Radius" in Color Field AND "Radius" in Button, both scoped Brand-wide, in the same
       pending batch (navigate between them — pending edits persist, per §2). Click Save. Assert
       it's rejected with a message naming both fields, and assert neither wrote to disk.
    6. Discard both, confirming a clean end state.
  - **Fail-fast precondition, before any of the above:** assert `tokens.json` has no uncommitted
    diff at the start of the spec (e.g. a `beforeAll` reading the file and comparing against the
    committed value via a bundled copy, or shelling `git diff --quiet -- <path>` — implementer's
    choice) and fail with a clear message rather than letting leftover dirt from a prior manual
    check produce confusing mid-test assertion failures. This project has hit exactly this residue
    class twice already (Task 7's own manual check, and again during this task's review) — don't
    let it silently corrupt a third round.
  - This spec's `webServer` (`:3002`) requires no manual `npm run dev` running concurrently — see
    `docs/WEB_APP_WORKFLOW.md` §6's caveat; state this in the report if it's hit.
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- `tokens.json` restored to committed state after both the Playwright run and any manual
  exploration; checkpoint commit (not pushed).

## 6. Stop-conditions

- If `editor.tsx`'s current shape (line numbers, `ColorRow`/`SliderRow`/`FieldRow` signatures,
  `postAction`'s body type) has drifted from what §1 describes, stop and confirm rather than
  reconciling silently.
- If threading `baseline` through `ColorRow`/`SliderRow` requires restructuring either component
  beyond a prop rename + the render-adjust comparisons already in place, stop and ask — this spec
  assumes it's a rename, not a rewrite.
- If the collision-blocking message in `runSaveAll` can't cleanly identify both colliding fields
  by label (e.g. a path with no matching descriptor), stop and ask rather than guessing a fallback
  label.

---
**Landed:** commits `650310a`/`4884412` (Iteration 2, Task 8b). Staged-save flow confirmed in active use throughout this session's Tasks 9/10 work and their e2e suites.
