# Task spec: Design-system editor follow-up fixes (sidebar feedback batch)

**Tier: S** — single file (`editor.tsx`), dev-only UI, fully revertible via `git checkout`.
Source: human QA feedback on the staged Task 7 build (2026-09-21), diagnosed against
`editor.tsx` at commit `3f6789b` before writing. Issues 1–6 below are the reporter's
numbering; issue 4 (colour picker) is explicitly out of this spec — it changes the shared
`ColorField` component, not `editor.tsx`, and gets its own decision/spec.

## 0. Diagnosis summary (why this spec contains what it does)

- **Issue 1 (sidebar active/hover missing on component entries, "All variables" fine): NO static
  root cause found — deliberately not "fixed" here.** Verified by reading the code: `cn` is a
  plain string joiner (`app/lib/cn.ts`, no tailwind-merge to eat classes); sidebar keys match
  `SECTIONS` exactly (`component.colorField` etc.); nav highlight and content branch read the
  same `selectedView` in the same render, so content-switching-without-highlight is impossible
  in one render pass. Remaining suspects (stale HMR CSS on the reporter's dev server, or a
  theme-scope difference between the two screenshots) are runtime-only. §3 handles this as a
  gated diagnostic, not a blind code change.
- **Issue 2 (sliders flaky mid-drag): real mechanism found.** `FieldRow` is keyed
  `` `${d.path}:${d.value}` ``, so a debounce-commit → `router.refresh()` → new `d.value`
  unmounts the `<input type="range">` mid-gesture and the drag dies. Fix in §1.
- **Issue 3 (Revert/Set-as-default on all rows after one edit): NOT a code bug — leftover
  manual-test edits.** `git diff` on `tokens.json` (2026-09-21) shows exactly three uncommitted
  literal overrides: `segmentedControl.gap` → `"64px"`, `button.paddingX` → `"24px"`,
  `button.radius` → `"13px"` — all consistent with slider-drag residue from Task 7's own manual
  check, never reverted. `isModified` is server-computed per path; a single-path write cannot
  light up other rows. No code change; human cleanup step in §2.
- **Issue 5 (preview Slider frozen): root cause confirmed — and its twin.** Preview
  renders `<Slider value={50} onChange={() => {}} />` — a controlled input with a no-op
  handler is frozen by React definition. Same defect class in the ColorField preview:
  `<ColorField value="#4a90d9" onChange={() => {}} />` visibly ignores typed hex. Both get
  demo state. (The frozen Slider likely also accounts for some "doesn't slide at all"
  reports under issue 2 — the reporter may have dragged the preview thinking it was live.)
- **Issue 6 ("Preview" heading): trivial, decided here** — `h3`, `text-sm font-semibold`,
  muted; matches `CAPTION` tone without inventing a new style.

## 1. Scope (`editor.tsx` only)

- **Preview demo state (issue 5 + twin).** Mirror the existing `demoTab` pattern:
  `const [demoSlider, setDemoSlider] = useState(50)` feeding the preview `<Slider ...>,
  and `const [demoColor, setDemoColor] = useState("#4a90d9")` feeding the preview
  `<ColorField ...>`. Local-only, writes nothing. (The `key={sectionKey}` reset from Task 7
  stays as-is.)
- **"Preview" heading (issue 6).** Small muted `h3` reading "Preview" directly above the
  preview box in `ComponentDetailView`.
- **Drag-safe field rows (issue 2).** Same pattern in both rows: remove value-keyed
  remounting (`key={d.path}` at BOTH render sites) and adopt external values via effect —
  own-commit equality makes post-commit adopts no-ops, external revert/reset adopts:
  - `ColorRow`: `useEffect(() => { setText(d.value); }, [d.value])`, skipped while the row's
    own input is focused (focus ref; focused ⇒ keystrokes win). Blur-commit path and failed-
    commit `if (!ok) setText(d.value)` unchanged.
  - `SliderRow`: `useEffect(() => { const v = parseFloat(d.value);
    if (Number.isFinite(v)) setNum(v); }, [d.value])`, skipped while a drag is in progress
    (pointer-down/up ref on the input — mandated; the debounce timer is NOT a valid "hands
    on" signal since it is never reset to null after firing). One mechanism, commented.
  - Accepted edge: an external change landing mid-drag adopts and the thumb jumps. Rare,
    single-user tool, correct-data-wins — not worth a pending-edit model here (Task 8's job).
- **Issue 3: no code change.** Covered by the human pre-step in §2.

## 2. Human pre-steps (not execution-model work)

1. **Clean the baseline FIRST** (else issue 3 re-triggers and pollutes every other check):
   in `/design-system` "All variables", click Revert on the three modified rows
   (`segmentedControl.gap`, `button.paddingX`, `button.radius`) — or approve `git checkout --
   app/packages/design-system/brands/default/tokens.json` — then confirm `git status` shows
   no `tokens.json` diff AND no Revert buttons remain. If buttons still blanket-show on a
   clean tree, STOP (see §5) — that would be a real bug contradicting §0's verdict.
2. **Issue 1 diagnostic gate → RESOLVED 2026-09-21: scope-dead utilities, not state.**
   Fresh-restart retest still showed no highlight on any entry, which killed the HMR theory
   and forced a scope read: the sidebar used `bg-surface-active` / `text-surface-active-text`
   / `text-surface-text/80` / `hover:bg-surface-hover`, but `--color-surface-*` vars exist
   only under `[data-theme]` scopes (verified in `design-tokens.generated.css`), while
   `/design-system` renders outside StudioShell's `data-theme` div (base `:root` scope —
   `page.tsx` returns bare `<Editor>`). Every state class resolved to transparent; clicking
   always worked, the paint could never appear. The Task 7 spec picked `surface*` classes
   because the rest of the app lives under dark scope — nobody checked this route's scope.
   Fix (same file, no scope change): active → `bg-foreground text-background`, idle →
   `text-foreground/80` + a foreground wash
   (`hover:bg-[color-mix(in_srgb,var(--foreground)_var(--state-hover-opacity),transparent)]`,
   same construct as the shipped muted-text classes). All are bare `:root` tokens, so they
   paint in every scope. The earlier screenshot's working "All" pill remains unexplained
   (possibly a devtools-forced theme attribute that session) — named here, not blocking.

## 3. File allowlist

- `app/app/design-system/editor.tsx` (modify — the ONLY code file).
- `docs/specs/design-system-editor-fixes.md` (this file — already written).

Do NOT touch `tokens.json`/`tokens.default.json` content, the API route, any component file,
`package.json`, or `.env`/credentials. No new npm dependency.

## 4. Acceptance criteria

- `npm run verify` passes.
- `git diff --stat` shows only `editor.tsx`.
- Manual, clean baseline (§2 done first): drag a Button padding slider continuously for >1s —
  thumb tracks without dying mid-drag; release commits once. Revert one row — only that row's
  buttons disappear. Preview Slider drags freely, preview ColorField accepts typed hex —
  both write nothing (`git status` clean after touching either). Each per-component view
  shows a "Preview" heading.
- Issue 1 resolved per §2's gate (either closed-as-stale or evidence reported, never a blind edit).
- `tokens.json` restored to committed state afterwards; checkpoint commit (don't push).
- Self-check report claims against disk/output before reporting.

## 5. Stop-conditions

- If §2 step 1 shows blanket Revert buttons on a provably clean tree, stop — §0's verdict is
  wrong. First check: `git diff` on `tokens.json` (should be empty) against which paths claim
  `isModified` — that split distinguishes a descriptor-computation bug from a render bug
  before any further diagnosis.
- If §2 step 2 still shows no highlight after a fresh restart AND the class attribute LACKS
  `bg-surface-active`, stop — the served bundle disagrees with the committed source; do not
  edit until the discrepancy is explained.
- If the focus-guard or drag-guard in §1 can't be built without restructuring `ColorRow` /
  `SliderRow` beyond a small effect + ref, stop and ask rather than rewriting both components'
  commit paths.
- Rollback: `git checkout -- app/app/design-system/editor.tsx`.
