# Task spec: Per-token descriptions, manually saved (Task 9)

**Tier: S** — dev-only editor surface, no real user data, fully revertible via `git checkout`.
User-requested, independent of liftkit/backlog/research and of Tasks 1-8's own feature logic —
shares `editor.tsx`'s `FieldRow` with Tasks 8b and 5c at the file level, but not at the logic
level (a description isn't a token value — no scope, no staging, no inheritance concept). **§2.4
has been re-verified against the current, real post-8b/5c `editor.tsx`** (933 lines, `49cd7ad`) —
both Task 8b and Task 5c have now landed, so this is no longer "re-read fresh before
implementing," it's already current as of this revision. §2.1–§2.3 (`token-writes.mjs`,
`field-descriptors.mjs`, `route.ts`) were never affected by either.

**Correction to this task's earlier framing:** it was originally scoped as branching off
`task/design-system-brand-data` on the assumption that branch was ahead of this one. Verified via
`git merge-base --is-ancestor task/design-system-brand-data docs/design-system-iteration-2-plan`
(exit 0) — the reverse is true: this plan's own branch already contains everything
`design-system-brand-data` has, plus Tasks 1-8 and the Playwright dev-mode config Task 8's own
review added. This task is just the next spec on this branch, not a separate one.

## 0. User story

You open `/design-system`. Every variable — accent color, spacing, radius, each button token —
shows its current value plus a one-line note saying where it's actually used, e.g. under accent:
"active tab text, selected song row, focus rings." If a note is missing or wrong, you click into
it, type a better explanation, and hit Save. Nothing happens until you click Save — unlike value
edits, it never auto-saves when you click away. Once saved, the note survives a reload and shows
up in every view — "All variables" and the per-component sidebar alike.

## 1. Context (read, don't re-derive)

- `buildFieldDescriptors` (`field-descriptors.mjs:67`) already skips `dark.*` and `primitive.*`
  paths entirely (`path.startsWith("primitive.") || path.startsWith("dark.")` → `continue`,
  line 72) — a `dark.*` leaf never gets a `FieldDescriptor` and is never rendered by the editor at
  all. **This resolves the "does a themed leaf need its own description" question from earlier
  discussion: it doesn't — there's no UI surface for one to attach to.** No dark-leaf handling
  needed anywhere in this spec.
- `stringifyTokens` (`token-writes.mjs:51`) serializes every `{$value, $type}` leaf onto one line
  via a regex (`EXPANDED_LEAF_RE`, line 39) matched against `JSON.stringify`'s 4-line expanded
  form. **Adding a third field (`$description`) without updating this regex breaks it** — a
  described leaf would no longer match the 2-field pattern and would fall back to the untouched
  4-line expansion, reformatting every described leaf (and, worse, silently *not* reformatting
  undescribed ones, producing an inconsistent mix) instead of the clean single-line diff this
  feature needs. §2.1 embeds the fix.
- `applyReset` (`token-writes.mjs:186`) and `applySetAsDefault` (`token-writes.mjs:225`) both
  write only `.$value` on the target leaf object — `getLeaf(tokens, path).$value = ...` — never
  the whole leaf. **A description is never touched by either action, already, today, with no
  code change needed.** State this as a resolved decision in the diff (e.g. a code comment where
  `applySetDescription` is added), not left as an unstated accident someone "fixes" later.
- `tokens.default.json`'s leaves don't need a `$description` at all — `applySetAsDefault` never
  reads or writes one, and the defaults file has no UI surface of its own. Only `tokens.json`
  (the live brand file) carries descriptions.

## 2. Scope

### 2.1 `token-writes.mjs`

**Schema.** Optional `$description` (string) on any leaf, alongside `$value`/`$type`. This is
DTCG-native (Tokens Studio and similar tools already read `$description`); the build walker
(`build-tokens.mjs`) only ever reads `$value`, so generated CSS is unaffected — confirm this by
grepping `build-tokens.mjs` for `$description` before implementing (expect zero matches;
`$description` should never need to appear there).

**`stringifyTokens`'s regex needs a real fix, not a workaround.** Replace the plain-string
`.replace(EXPANDED_LEAF_RE, '{ "$value": $2, "$type": $3 }')` with a regex that optionally
captures a third field, and a replacer *function* (not a string) so the two shapes (2-field,
3-field) produce different output:

```js
const EXPANDED_LEAF_RE =
  /{\n([ \t]*)"\$value": ((?:"(?:[^"\\\n]|\\.)*"|-?\d+(?:\.\d+)?)),\n\1"\$type": ("(?:[^"\\\n]|\\.)*")(?:,\n\1"\$description": ("(?:[^"\\\n]|\\.)*"))?\n[ \t]*}/g;

export function stringifyTokens(tree) {
  return (
    JSON.stringify(tree, null, 2).replace(
      EXPANDED_LEAF_RE,
      (_match, _indent, value, type, description) =>
        description
          ? `{ "$value": ${value}, "$type": ${type}, "$description": ${description} }`
          : `{ "$value": ${value}, "$type": ${type} }`,
    ) + "\n"
  );
}
```

This relies on `$description` being the object's *last* key when present, so
`JSON.stringify(tree, null, 2)` always emits it in `$value`, `$type`, `$description` order — true
as long as the leaf is always constructed with keys added in that order (§2.2's
`applySetDescription` must follow this — see below).

**`applySetDescription`, following the existing `apply*` functions' shape exactly:**

```js
const DESCRIPTION_MAX_LENGTH = 200;

/**
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {string} path
 * @param {string} description empty string clears an existing description
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applySetDescription(tokensTree, path, description) {
  const leaf = getLeaf(tokensTree, path);
  if (!leaf) {
    return { ok: false, status: 400, error: `"${path}" is not a known token path` };
  }
  if (typeof description !== "string") {
    return { ok: false, status: 400, error: '"description" must be a string' };
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer (got ${description.length})`,
    };
  }
  const tokens = structuredClone(tokensTree);
  const target = getLeaf(tokens, path);
  if (description === "") {
    delete target.$description;
  } else {
    // Assign as a new property, not an update to an existing key, so it's
    // always the last key JSON.stringify emits — stringifyTokens's regex
    // above depends on $value, $type, $description appearing in that order.
    delete target.$description;
    target.$description = description;
  }
  return { ok: true, tokens };
}
```

Empty string clears an existing description (a real, sanctioned path — the user story's "click
in, edit" covers *replacing* a wrong note; clearing one back to empty needs to work the same way,
not require the row's raw JSON to be hand-edited).

Add `"set-description"` to `VALID_ACTIONS` (`token-writes.mjs:7`), appended, not reordered — same
convention Task 8a's spec used.

### 2.2 `field-descriptors.mjs`

Add `description: leaf.$description ?? ""` to the object built in `buildFieldDescriptors`
(alongside `rawValue` at line 86, `isModified` at 87, `isAlias` at 88), and
`@property {string} description` to the `FieldDescriptor` typedef (alongside `isAlias` at line
24).

### 2.3 `route.ts`

New `"set-description"` action, same pattern as `"set-as-default"` (`route.ts:131`):

```ts
case "set-description": {
  if (typeof path !== "string" || typeof description !== "string") {
    return badRequest('"set-description" requires "path" and "description" to be strings');
  }
  const result = applySetDescription(readJson("tokens.json"), path, description);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
  // Deliberately no buildActiveBrand() here — a description never affects
  // generated CSS (see §1); calling it would just be a wasted rebuild.
  return Response.json({ ok: true });
}
```

Add `description` to the destructured request body and its type (alongside `edits` from Task 8a);
import `applySetDescription` alongside the other `token-writes.mjs` imports.

### 2.4 `editor.tsx` — re-verified against post-8b/5c code (933 lines, `49cd7ad`)

`FieldRow` (line 226) now carries far more than it did when this section was first drafted — 8b
added `pending`/`onStage`/`onDiscardPending`/`onSetScope`, 5c added `isChildBrand`/`parentName`/
`onResetToParent`. None of that changes this task's own logic (description saves stay fully
independent of value staging and brand inheritance — a description isn't a token value, it has
no scope/inherited concept), it only changes *where* `DescriptionRow` renders relative to the
other conditional blocks already in `FieldRow`'s return. Render it **last**, after the existing
`isChildBrand` caption, the alias scope-override control, and the non-alias caption (in that
order, inside the same `<div className="min-w-0 flex-1">` — currently ends around line 311, right
before the button-row's closing) — unconditionally, regardless of `isChildBrand`/`pending`/
`d.isAlias`, so it always lands in the same visual spot no matter which of those other blocks are
present for a given field:

```tsx
function DescriptionRow({
  d,
  onSave,
}: {
  d: FieldDescriptor;
  onSave: (path: string, description: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(d.description);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setText(d.description);
  }, [d.description]);
  const dirty = text !== d.description;
  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        placeholder="Where is this used?"
        aria-label={`Description for ${d.label}`}
        className={cn(CAPTION, "min-w-0 flex-1 border-b border-transparent bg-transparent focus:border-border", FOCUS_RING)}
      />
      {dirty && (
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(d.path, text);
            setSaving(false);
          }}
          className={MUTED_ACTION}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
```

The `useEffect` sync (not a render-adjust, since there's no drag/focus timing concern like
`ColorRow`/`SliderRow` — a plain text input with no debounce) means a successful save (which
triggers `router.refresh()`, updating `d.description`) collapses the Save button back to hidden,
same as the dirty-check implies.

**`Editor`-level:**

```tsx
async function runSetDescription(path: string, description: string): Promise<boolean> {
  const result = await postAction({ action: "set-description", path, description });
  if (!result.ok) {
    setError(result.error);
    return false;
  }
  router.refresh();
  return true;
}
```

Thread `onSetDescription={runSetDescription}` into `FieldRow` at **both** its call sites — the
`"all"` branch's `renderSection` and the per-component `ComponentDetailView` — and render
`<DescriptionRow d={d} onSave={onSetDescription} />` inside `FieldRow`, after `{control}`.

## 3. Seeding real descriptions

**Scope decision, not left implicit:** seed real, audited descriptions for **6 `semantic.color.*`
leaves only** — `accent`, `background`, `foreground`, `border`, `surface`, `surfaceText` — the
highest-traffic, most-referenced tokens, found via a real grep audit of `app/` (cite the exact
`grep`/`rg` command and matched call sites in the report — no invented descriptions). **The
remaining ~46 non-dark leaves ship with no description**, not a placeholder string. This is a
deliberate scope cut, not a shortcut: the user story itself describes the empty/wrong case as the
normal path ("if a note is missing or wrong, you click into it... and hit Save") — the feature is
designed to be filled in through its own UI over time, so auditing and hand-writing all ~52 up
front is real work the feature doesn't actually need done up front to be useful. Six seeded
examples prove the mechanism end-to-end; the rest are the user's own job, by design.

## 4. Non-goals

- No description field on `tokens.default.json` leaves (§1).
- No dark-theme description handling (§1 — `dark.*` has no editor UI at all).
- No integration with Task 8's pending-edit/staged-save model — description saves are always
  immediate, their own action.
- No seeding beyond the 6 leaves named in §3.

## 5. File allowlist

- `app/packages/design-system/src/token-writes.mjs`
- `app/packages/design-system/src/token-writes.test.mjs`
- `app/packages/design-system/src/field-descriptors.mjs`
- `app/app/api/design-system/tokens/route.ts`
- `app/app/design-system/editor.tsx`
- `app/packages/design-system/brands/default/tokens.json` (the 6 seeded descriptions only — no
  value changes)
- `app/e2e/design-system/descriptions.spec.ts` (new)

No `.env`/credentials, no new npm dependency.

## 6. Acceptance criteria

- `npm run verify` passes, including new `token-writes.test.mjs` cases: `applySetDescription`
  valid write, unknown path, over-200-chars, non-string, empty-string clears an existing
  description; a `stringifyTokens` case with a 3-field leaf round-trips to one line (confirms the
  regex fix directly, not just indirectly through the write path).
- `git diff --stat` matches the allowlist exactly.
- **Required: `app/e2e/design-system/descriptions.spec.ts`, run via
  `npm run test:e2e:design-system`** (per `docs/WEB_APP_WORKFLOW.md` §3's Playwright rule — this
  is interaction behavior, not visual judgment). Cover: edit a description, confirm the Save
  button only appears once the text differs from the current value, click Save, reload the page,
  confirm the new description persisted; confirm the same field's description reads identically
  in both "All variables" and its per-component panel entry; confirm clicking away *without*
  Save does not persist the edit (reload shows the old value). Same fail-fast precondition as
  Task 8b's spec: assert `tokens.json` has no uncommitted diff before the spec's own edits begin,
  and restore it via the real Save-based Revert path (empty-string save) or `git checkout` at the
  end — don't leave the 6 seeded descriptions overwritten by test residue.
- Self-check before reporting, per `docs/WEB_APP_WORKFLOW.md` §5 step 4's evidence format.
- `tokens.json` diff (after the Playwright run's own cleanup) shows only the 6 seeded
  descriptions — checkpoint commit (not pushed).

## 7. Stop-conditions

- If `editor.tsx` has changed since this spec's last revision (933 lines, `49cd7ad`), stop and
  confirm the actual current shape before wiring `FieldRow`'s two call sites — don't guess at
  what changed.
- If any of the 6 seed leaves' real usage can't be confidently found via grep (e.g. it's used only
  through a dynamic class name or CSS variable indirection that doesn't grep cleanly), stop and
  ask rather than writing a guessed description — the spec's whole point is these must be real,
  audited notes.
- If `stringifyTokens`'s regex fix doesn't cleanly round-trip an existing *undescribed* leaf
  (i.e. the 2-field case regresses), stop — that would corrupt every other leaf in `tokens.json`
  on the next write, not just the ones this task touches.

---
**Landed:** commits `7482d25`/`020d8c8`; deployed pending push. 6 new token-writes.test.mjs cases, 4 new e2e cases (app/e2e/design-system/descriptions.spec.ts), 6 real seeded descriptions (accent, background, foreground, border, surface, surfaceText -- each verified via grep against real call sites, see commit body), `npm run verify:full` PASS, human visual checkbox passed via screenshot.
