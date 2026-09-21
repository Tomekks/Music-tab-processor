# Task spec: Wire the seed-color generator into brand authoring + editor (Task 1b)

**Landed:** committed as `3f3b19d` (+4 `applyGenerateFromSeed` cases, `npm run verify` green).

Corresponds to Task 1b of `docs/superpowers/plans/2026-09-20-design-system-iteration-2.md` (Track
B, first task). Written against
`app/packages/design-system/src/generate-ramp.mjs`,
`app/packages/design-system/src/token-writes.mjs`,
`app/packages/design-system/src/token-writes.test.mjs`,
`app/packages/design-system/src/field-descriptors.mjs`,
`app/app/api/design-system/tokens/route.ts`, `app/app/design-system/editor.tsx`, and
`app/packages/design-system/src/contrast.test.mjs`, at commit `c2f3733` — if any of these have
changed since (`git diff c2f3733 -- <file>`), stop and re-read before implementing.

Lets someone pick a neutral seed hex + accent seed hex and regenerate all 18 `semantic.color.*`/
`dark.semantic.color.*` values in one action, instead of hand-editing each leaf.

## 1. Scope

- `token-writes.mjs`: add `applyGenerateFromSeed(tokensTree, neutralSeed, accentSeed)` (§3.1).
- `token-writes.test.mjs`: cases for it, plus the required `VALID_ACTIONS` count update (§3.2).
- `route.ts`: new `"generate-from-seed"` action, `{ neutralSeed, accentSeed }` body; 400s on a
  child brand (§3.3).
- `editor.tsx`: one new section at the top of `Editor`'s JSX — two `ColorField`s + a `Button`
  (§3.4).

Files: `token-writes.mjs`, `token-writes.test.mjs`, `route.ts`, `editor.tsx`. No `.env`/credentials.

## 2. Non-goals

- **`editor.tsx` does not import `generate-ramp.mjs`** (or anything that imports it). It only
  POSTs; `route.ts`/`token-writes.mjs` call the generator server-side — keeps the vendored `~1MB`
  `material-color-utilities` subset out of the client bundle (nothing imports it today; keep it
  that way).
- **Default brand only.** Generating literal values into a child brand's sparse `tokens.json`
  would convert every inherited leaf this task touches into an explicit override, silently
  forking the child from its parent — breaking Task 5's structural (not value-based) inheritance
  model. §3.3's route case 400s if the active brand has a parent (same guard shape as the
  existing `reset-to-parent` case). Multi-brand generation is a future task, not this one.
- No new `$type` or schema change — this only rewrites `$value` on the existing 18 color leaves.
- `contrast.test.mjs`'s `PAIRS` array does not need a new entry — this regenerates values for
  leaves already covered (background/foreground, surface/surfaceText,
  surfaceActive/surfaceActiveText, accent/onAccent), it doesn't add new leaves.
- No `ColorRow`/field-descriptor wrapper for the two seed inputs — they aren't token paths (no
  revert/promote/modified-state), just raw `ColorField`+`Button`.

## 3. Interface / exact changes

### 3.1 `applyGenerateFromSeed` in `token-writes.mjs`

Same result shape as `applyWrite` (`{ok: true, tokens} | ApplyErr`). Three things the sibling
functions don't need that this one does: (a) **fail-closed pre-validation that all 18 target
paths exist** before writing anything — `getLeaf(...).$value = x` on a path that doesn't resolve
throws, and nothing upstream guarantees a complete leaf set at this function's boundary (the
route-level child-brand guard in §3.3 is belt; this is suspenders, matching every sibling
function's own-validate convention); (b) **its own 6-digit-only hex check** — `COLOR_RE` (this
file, existing) accepts 3-digit hex, which the vendored `argbFromHex` also happens to accept, so
that combination wouldn't crash — but this action's own error message and a real color-picker's
output are both 6-digit, so keep the input contract simple and match the message to what's
actually enforced, not reuse `COLOR_RE`/`validateWriteValue`'s more permissive one; (c)
**output validation** — every computed hex is checked against `SEED_COLOR_RE` before the clone
is touched, so generator shape drift fails closed (500, nothing written) instead of corrupting
`$value`s silently (`JSON.stringify` drops `undefined` leaf values without complaint):

```js
const SEED_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const NEUTRAL_KEYS = [
  "background", "foreground", "border", "surface",
  "surfaceText", "surfaceHover", "surfaceActive", "surfaceActiveText",
];

/**
 * @param {object} tokensTree live tokens.json tree (not mutated)
 * @param {string} neutralSeed 6-digit hex, e.g. "#faf9f5"
 * @param {string} accentSeed 6-digit hex, e.g. "#ae97f7"
 * @returns {{ok: true, tokens: object} | ApplyErr}
 */
export function applyGenerateFromSeed(tokensTree, neutralSeed, accentSeed) {
  if (!SEED_COLOR_RE.test(neutralSeed) || !SEED_COLOR_RE.test(accentSeed)) {
    return {
      ok: false,
      status: 400,
      error: `expected 6-digit hex colors like #rrggbb, got ${JSON.stringify(neutralSeed)} / ${JSON.stringify(accentSeed)}`,
    };
  }
  const ramp = generateNeutralRamp(neutralSeed);
  const { accent, onAccent } = generateAccentPair(accentSeed);
  for (const hex of [...Object.values(ramp.light), ...Object.values(ramp.dark), accent, onAccent]) {
    if (typeof hex !== "string" || !SEED_COLOR_RE.test(hex)) {
      return {
        ok: false,
        status: 500,
        error: `generator produced a non-hex value ${JSON.stringify(hex)} -- not writing anything (see stop-conditions)`,
      };
    }
  }
  const writes = [
    ...NEUTRAL_KEYS.map((key) => [`semantic.color.${key}`, ramp.light[key]]),
    ["semantic.color.accent", accent],
    ["semantic.color.onAccent", onAccent],
    ...NEUTRAL_KEYS.map((key) => [`dark.semantic.color.${key}`, ramp.dark[key]]),
  ];
  for (const [path] of writes) {
    if (!getLeaf(tokensTree, path)) {
      return {
        ok: false,
        status: 400,
        error: `"${path}" is missing from this brand's tokens.json -- generate-from-seed requires the full default-brand leaf set, not a sparse child brand`,
      };
    }
  }
  const tokens = structuredClone(tokensTree);
  for (const [path, hex] of writes) {
    getLeaf(tokens, path).$value = hex;
  }
  return { ok: true, tokens };
}
```

Import `generateNeutralRamp`/`generateAccentPair` from `./generate-ramp.mjs`. Place after
`applyResetToParent`. Add `"generate-from-seed"` to `VALID_ACTIONS`.

### 3.2 `token-writes.test.mjs`

- Add a dedicated fixture with all 18 leaves populated (`semantic.color.*`'s 10 keys,
  `dark.semantic.color.*`'s 8 keys) — the existing `tokensTree()` fixture only has 2 color leaves
  and no `dark` block, so it cannot exercise this function; don't reuse it for these cases.
- Cases: valid seeds populate all 18 leaves; a 3-digit hex seed 400s; a tree missing a required
  leaf 400s naming that path (proves the fail-closed check, §3.1(a)); input not mutated
  (`structuredClone` check, same pattern as every other `apply*` test).
- Update the existing count assertion — `VALID_ACTIONS` is now **six**, not five:
  ```js
  test("VALID_ACTIONS lists exactly the six known actions", () => {
    assert.deepEqual(
      [...VALID_ACTIONS].sort(),
      ["generate-from-seed", "reset", "reset-all", "reset-to-parent", "set-as-default", "write"],
    );
  });
  ```

### 3.3 `route.ts`

Add `neutralSeed?: unknown; accentSeed?: unknown;` to the request-body type cast (currently only
declares `action`/`path`/`value`). Replace both hardcoded `badRequest("action must be one of: ...")`
call sites with one derived message (removes a duplication this task would otherwise perpetuate
for the next action Task 8a adds):

```ts
const ACTION_LIST_ERROR = `action must be one of: ${VALID_ACTIONS.join(", ")}`;
// ...both existing badRequest("action must be one of: ...") calls become:
return badRequest(ACTION_LIST_ERROR);
```

New case — same read→apply→write→rebuild shape as `write`, plus the child-brand guard (mirrors
`reset-to-parent`'s existing `parentBrandDir` check exactly):

```ts
case "generate-from-seed": {
  if (typeof neutralSeed !== "string" || typeof accentSeed !== "string") {
    return badRequest('"generate-from-seed" requires "neutralSeed" and "accentSeed" to be strings');
  }
  const { parentBrandDir } = resolveBrandTree(brandDir);
  if (parentBrandDir) {
    return badRequest('"generate-from-seed" is not valid for a child brand — generate on its parent brand instead');
  }
  const result = applyGenerateFromSeed(readJson("tokens.json"), neutralSeed, accentSeed);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  atomicWriteString(join(brandDir, "tokens.json"), stringifyTokens(result.tokens));
  buildActiveBrand();
  return Response.json({ ok: true });
}
```

Add `applyGenerateFromSeed` to the `token-writes.mjs` import. The route's existing
`NODE_ENV === "production"` 404 guard already covers this new case for free — same handler, no
change needed there.

### 3.4 `editor.tsx`

New section, placed right after the two intro `<p>` tags and before the "Reset all changes" row.
Two `ColorField`s + a `Button`:

- **Initial values**: read from the already-loaded `descriptors` prop, not a hardcoded literal —
  find the entries where `path === "semantic.color.background"` and `path === "semantic.color.accent"`
  and seed each `useState<string>` from that descriptor's `.value` (both paths are always present
  in `descriptors`, per `field-descriptors.mjs`'s section list — no fallback needed). Note: the
  neutral default is a *derived* tone-99 output re-fed as a seed, not the original seed, so
  regenerating unchanged seeds is not exactly idempotent (HCT requantization + the chroma-8 clamp
  drift slightly each round-trip) — don't use generate-twice-diff as an identity check.
- **Busy state**: a dedicated `generateBusy` boolean (own `useState`, same on/off pattern as
  `resetBusy`) — not shared with `resetBusy` or the per-path `inFlight` set, since this is an
  unrelated action and sharing would couple their disabled states.
- On click: `postAction({ action: "generate-from-seed", neutralSeed, accentSeed })`, then
  `router.refresh()` on success, setting `feedback` to `"Regenerated 18 colors from new seeds"`
  (same pattern as `runResetAll`'s count message) and using the existing `error` state for
  failures.
- **No brand-conditional rendering** — `Editor` receives only `descriptors`, no brand context;
  the route 400 is the entire child-brand UX for this task. Don't plumb brand props for this.
- **Client-side gating**: the Generate button is disabled unless both seeds match
  `/^#[0-9a-fA-F]{6}$/` (a client-side mirror of `SEED_COLOR_RE`, not a second source of truth —
  the server still validates). This avoids a doomed round-trip on every typo.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `neutralSeed`/`accentSeed` not a 6-digit `#rrggbb` hex (including valid-but-short `#fff`) | 400 from `applyGenerateFromSeed`, §3.1. |
| Active brand has a parent (a child brand) | 400 from `route.ts` before `applyGenerateFromSeed` is even called, §3.3/§2. |
| `tokensTree` is missing one of the 18 target paths | 400 naming the first missing path, §3.1(a) — shouldn't happen for the default brand today (covered by the existing "tokens.json/tokens.default.json contain the same paths" test), but fails closed rather than throwing if it ever does. |
| Generator computes a non-`#rrggbb` value (shape drift, upstream bug) | 500 from `applyGenerateFromSeed`, nothing written, §3.1(c). |
| Generated ramp passes `npm run verify` but looks visually wrong (hue drift, muddiness) | Do not checkpoint-commit — the manual eyeball check (§7) is the real gate; automated contrast passing is necessary, not sufficient. |

## 5. Forbidden patterns

- No hardcoded colors/spacing (seed-field initial values come from `descriptors`, §3.4 — not a
  literal).
- No touching `.env`/credentials, no new npm dependencies.
- No client-side import of `generate-ramp.mjs` or its vendor subtree (§2).

## 6. File allowlist

- `app/packages/design-system/src/token-writes.mjs`
- `app/packages/design-system/src/token-writes.test.mjs`
- `app/app/api/design-system/tokens/route.ts`
- `app/app/design-system/editor.tsx`

## 7. Acceptance criteria

- `npm run verify` passes (includes `npm test --workspace @guitar-tabs/design-system`, so this
  also is the mandatory Task 6 orphan-detection closing-gate re-run for this token-touching task —
  if `token-usage.test.mjs`'s `actualOrphans` changes from its current 6-entry `KNOWN_ORPHANS`,
  report it as a finding rather than silently editing that list). Expected outcome is zero
  movement: `primitive.*` leaves are unconditionally exempt from the orphan check, and every
  rewritten `semantic.*` leaf keeps its path (so component-alias and CSS-var references still
  count) — a green run confirms this; any movement is a real anomaly, not an expected side
  effect.
- `git diff --stat` matches §6.
- Manual: generate from 2-3 different seed pairs in the running editor; confirm both
  `data-theme="light"` and `"dark"` (toggle via devtools) read correctly and look right by eye,
  not just contrast-compliant (§4); child-brand check: temporarily point
  `app/packages/design-system/active-brand.json` at `demo-child`, attempt a generate, confirm a
  400 (not a silent write), then restore the pointer without saving.

## 8. Definition of done

- `npm run verify` passes; `git diff --stat` matches §6.
- Manual eyeball check (§4/§7) passed — checkpoint commit happens only after this, not immediately
  on `verify` passing.
- Self-check per `WEB_APP_WORKFLOW.md` §3 before reporting: file list, test count (existing +
  4 new `applyGenerateFromSeed` cases — or equivalent coverage if a case was legitimately split —
  + 1 updated `VALID_ACTIONS` assertion), and the manual check's outcome actually match what's on
  disk/what ran.
- Checkpoint commit made.

## 9. Stop-conditions

- If `generate-ramp.mjs`'s return shapes (`generateNeutralRamp`'s `{light, dark}` keys,
  `generateAccentPair`'s `{accent, onAccent}`) differ from §3.1's `NEUTRAL_KEYS` list, **stop** —
  the write loop depends on them matching exactly.
- If `route.ts`'s action-dispatch structure, body-cast shape, or the two `badRequest` action-list
  call sites have changed, **stop and ask** before inserting §3.3's changes.
- If `field-descriptors.mjs`'s `FieldDescriptor.value` no longer holds the resolved (not raw)
  value, **stop** — §3.4's seed-default sourcing depends on it.
- Any other ambiguity — ask rather than guess.
