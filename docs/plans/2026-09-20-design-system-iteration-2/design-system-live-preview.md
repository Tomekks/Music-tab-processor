# Task spec: Live, direct-DOM preview in the editor (Task 2)

> **Landed:** commit `aa60b5c` — design-system workspace 85/85 passing (relocation confirmed
> green before the editor changes). One real catch during verification: the embedded cleanup's
> `return () => removeProperty(...)` failed typecheck (`removeProperty` returns a string,
> violating `EffectCallback`) — fixed with braced bodies in both the implementation and this spec.
> Archived per `WEB_APP_WORKFLOW.md` §5a.

**Tier: S** — design-system/token/CSS work, no real user data or deploy involved, fully
revertible via `git checkout` on the allowlist below + a rebuild. Full-tier risky-logic embedding
still applies (see the three pieces below) — S only trims narrative, not correctness content.

Corresponds to Task 2 of `docs/plans/2026-09-20-design-system-iteration-2/2026-09-20-design-system-iteration-2.md` (Track
B, after Task 1b — landed `3f3b19d`). Written against `app/app/design-system/editor.tsx`,
`app/packages/design-system/src/build-tokens.mjs`, and `app/app/layout.tsx`, at commit `190d77d`
— if any have changed since, stop and re-read.

## Scope

Adds instant visual feedback (a CSS custom property set on `document.documentElement` as the user
types/drags) before the network round-trip that currently gates any visible change.

**1. Extract `cssVarNameForPath` out of `build-tokens.mjs` into a new pure module.** `editor.tsx`
is `"use client"`; `build-tokens.mjs` imports `node:fs` at module scope, so importing anything
from it into client code fails to bundle. Verified pure (no `fs`/`path`/`url`):
```
$ grep -n "readFileSync\|writeFileSync\|existsSync\|fileURLToPath\|dirname\|join\|resolve(" \
    <(sed -n '20,104p' build-tokens.mjs)
(no output)
```
Move `kebab`, `BARE_COLOR_KEYS`, `LEAF_NAME_MAP`, `colorPropName`, `cssVarNameForPath` (currently
lines ~20-104) verbatim to `app/packages/design-system/src/css-var-naming.mjs` (self-contained,
zero imports). `build-tokens.mjs` then:
```js
import { kebab, BARE_COLOR_KEYS, LEAF_NAME_MAP, colorPropName, cssVarNameForPath } from "./css-var-naming.mjs";
export { cssVarNameForPath };
```
— same pattern as its existing `deepMerge` import. `generateCSS`'s call sites are unchanged.
`build-tokens.test.mjs`'s existing `cssVarNameForPath` import/consistency test is unaffected (same
export path, same behavior, pure relocation) — no new test file needed for the move itself.

**2. `editor.tsx`: `ColorRow`/`SliderRow`** get three additions apiece — live preview, cleanup on
unmount, revert-on-write-failure. `FieldDescriptor`s reaching these two are always
`semantic.*`/`component.*` (`buildFieldDescriptors` excludes `primitive.*`/`dark.*` by design —
`field-descriptors.mjs`'s own comment says so), so `cssVarNameForPath(d.path)!` is never null here.

`runWrite` currently early-returns on failure *before* `router.refresh()`, so nothing resets an
in-flight preview on a failed commit — verified:
```
$ sed -n '249,263p' editor.tsx
  async function runWrite(path: string, value: string) {
    track(path);
    setError(null);
    setFeedback(null);
    try {
      const result = await postAction({ action: "write", path, value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      untrack(path);
    }
  }
```
Fix: `runWrite` returns `Promise<boolean>` (`false` on the error branch, `true` after
`router.refresh()`); `FieldRow`'s `onCommitValue` prop type follows (its body,
`commit={(value) => onCommitValue(d.path, value)}`, already forwards whatever it returns — no
change needed there). `ColorRow`/`SliderRow` await that boolean and revert local state on `false`.

`ColorRow`:
```tsx
function ColorRow({
  d, disabled, commit,
}: { d: FieldDescriptor; disabled: boolean; commit: (value: string) => Promise<boolean> }) {
  const [text, setText] = useState(d.value);
  useEffect(() => {
    const varName = cssVarNameForPath(d.path)!;
    document.documentElement.style.setProperty(varName, text);
    return () => {
      document.documentElement.style.removeProperty(varName);
    };
  }, [text, d.path]);
  const commitIfChanged = async () => {
    if (text !== d.value) {
      const ok = await commit(text);
      if (!ok) setText(d.value);
    }
  };
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void commitIfChanged(); }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) void commitIfChanged();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { setText(d.value); (e.target as HTMLElement).blur(); }
      }}
    >
      <ColorField label={d.label} value={text} onChange={setText} disabled={disabled} />
      {d.isAlias && <p className={cn(CAPTION, "mt-1")}>{d.rawValue}</p>}
    </form>
  );
}
```
The cleanup matters beyond tidiness: `document.documentElement` isn't recreated by Next.js
client-side navigation, so a leftover inline override would silently leak into other routes (e.g.
`/`) until something else overwrites that same property.

**Accepted, documented tradeoff (not fixed):** if a user re-focuses the field and types more
*during* an in-flight failed commit's ~sub-second POST, the failure path's `setText(d.value)`
overwrites those newer keystrokes too — pre-existing code had no revert at all, so this is a
narrow regression surface introduced by the fix, not present before it. Accepted as-is: it needs
both a failure and a re-focus-and-type inside a small window, and the error banner makes the
cause visible when it happens. Not worth a second piece of guard state for this window.

`SliderRow` — same three additions, debounced commit's revert re-parses `d.value` the same way
the initial `num` state already does:
```tsx
function SliderRow({
  d, range, disabled, commit,
}: { d: FieldDescriptor; range: Range; disabled: boolean; commit: (value: string) => Promise<boolean> }) {
  const initial = parseFloat(d.value);
  const [num, setNum] = useState(Number.isFinite(initial) ? initial : range.min);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const varName = cssVarNameForPath(d.path)!;
    document.documentElement.style.setProperty(varName, `${num}${UNIT[d.$type]}`);
    return () => {
      document.documentElement.style.removeProperty(varName);
    };
  }, [num, d.path, d.$type]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <>
      <Slider
        label={d.label} value={num} min={range.min} max={range.max} step={range.step}
        disabled={disabled}
        onChange={(n) => {
          setNum(n);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(async () => {
            const ok = await commit(`${n}${UNIT[d.$type]}`);
            if (!ok) {
              const reverted = parseFloat(d.value);
              setNum(Number.isFinite(reverted) ? reverted : range.min);
            }
          }, 200);
        }}
      />
      {d.isAlias && <p className={cn(CAPTION, "mt-1")}>{d.rawValue}</p>}
    </>
  );
}
```

On write success: `router.refresh()` re-fetches `descriptors`; `FieldRow`'s existing
`key={`${d.path}:${d.value}`}` changes, forcing a full remount — new initial state already
matches the committed value, and the effect re-applies the now-authoritative property. No
special-case code needed for this path.

**Confirmed out of scope, verified not guessed:** no live preview outside `/design-system` — its
root layout (`app/layout.tsx`) sets no `data-theme` anywhere and `/design-system` has no
`StudioShell` wrapper, so `document.documentElement` is the nearest theme-scoping ancestor on
that route (the main `/` route sets `data-theme="dark"` on an inner `<div>` inside `StudioShell`
instead, which would locally override a `documentElement`-level preview — out of scope, this
task's check is confined to `/design-system`). No change to the seed-generation section (Task
1b) — those `ColorField`s aren't `ColorRow` instances. No automated test for the `useEffect`/DOM
behavior itself — no browser/DOM harness in this project; the manual check below is the real gate.

## File allowlist

- `app/packages/design-system/src/css-var-naming.mjs` (new)
- `app/packages/design-system/src/build-tokens.mjs`
- `app/app/design-system/editor.tsx`

No `.env`/credentials, no new npm dependency, no hardcoded CSS variable names.

## Acceptance criteria

- `npm run verify` passes (includes `build-tokens.test.mjs`'s existing consistency test,
  unaffected by the pure relocation).
- `git diff --stat` matches the file allowlist above.
- **Human checkbox** (not an execution-model criterion): open `/design-system`, drag a slider and
  type in a color field, confirm each appears on the page instantly, before the debounce/blur
  commits it. Cause a write to fail (stop the dev server briefly, or submit a value the validator
  rejects) and confirm the field visibly reverts. Make an uncommitted edit, navigate to `/`,
  confirm nothing there looks different. **Then revert every field touched during this check via
  its own Revert button and confirm `git status` shows no `tokens.json` modification before
  committing** — this check exercises real writes to disk, same as any other action in this
  editor; leaving them committed would sweep an unintended `tokens.json` change into the
  checkpoint commit.
- Self-check before reporting: file list and every claim above against what's actually on disk
  and what `npm run verify` printed.
- Checkpoint commit made.
