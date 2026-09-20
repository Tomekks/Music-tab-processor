# Task spec: Seed-color tonal ramp generator (pure logic)

Corresponds to Task 1 of `docs/superpowers/plans/2026-09-20-design-system-iteration-2.md`. Written
against `app/packages/design-system/brands/default/tokens.json`,
`app/packages/design-system/src/contrast.test.mjs`, `app/packages/design-system/package.json`, and
`app/eslint.config.mjs` directly (not the plan's own paraphrase of them — if any of these have
changed since this spec was written, stop and re-read before implementing, per
`WEB_APP_WORKFLOW.md` §3). It also diverges from the plan's stated approach in one concrete way —
read §0 before anything else, since it changes the Files/Interfaces sections below from what the
plan describes.

## 0. Why this spec vendors instead of installing (read first)

The plan says "add `@material/material-color-utilities` as a runtime dependency." That's been
verified **not to work** as scoped: the published package (npm `latest`, `0.4.0`, confirmed via
`npm view`) cannot be `import`ed under plain Node.js ESM — which is exactly how this project runs
tests (`"test": "node --test"` in `package.json`, and `npm run verify`'s unit-test step calls
that). Confirmed empirically (installed it in a scratch dir and reproduced this):

- The package's only entry point (`index.js`) re-exports `dynamiccolor/dynamic_color.js`, which
  transitively imports `dynamiccolor/color_spec_2025.js`, which has
  `import { DynamicColor, extendSpecVersion } from './dynamic_color';` — **missing the `.js`
  extension**. Node's native ESM resolver requires explicit extensions for relative imports and
  throws `ERR_MODULE_NOT_FOUND`. Nine more extensionless relative imports exist elsewhere in the
  package — this isn't a one-off typo.
- The obvious workaround — importing only the specific files this task needs, which don't touch
  the broken code — doesn't work either: the package's `package.json` `"exports"` field defines
  only `"."`, so Node refuses any subpath import with `ERR_PACKAGE_PATH_NOT_EXPORTED`. There's no
  way to reach the working code while avoiding the broken code through the public API.
- No newer version fixes this (`0.4.0` is `dist-tags.latest`); no CommonJS fallback exists
  (`"type": "module"`, ESM-only, so `require()`'s more forgiving extension resolution isn't
  available either).

**This most likely doesn't break the real app** — Next.js's bundler resolves extensionless
imports fine, so a plain `npm install` would probably work for Task 1b's route-handler usage. It
specifically breaks this task's own `node --test generate-ramp.test.mjs`, which is a hard
requirement below. Given that, and given this task only needs 8 of the package's 138 files (the
rest is quantizer/scheme/blend/dynamiccolor code — Material You theming machinery this task has no
use for), **the resolved approach is to vendor exactly those 8 files** (unmodified, license intact)
into this package rather than depend on the broken npm package. This was empirically verified
end-to-end before writing this spec: the exact 8 files below, copied verbatim with their existing
directory structure, import cleanly under plain `node`, produce correct HCT/tonal-palette output,
and lint clean under this repo's actual `eslint.config.mjs` once excluded from linting (§3.1).

Two related corrections to the plan's Tech Stack note, confirmed via `npm view
@material/material-color-utilities`: the package is **Apache-2.0**, not MIT as the plan states;
its unpacked size is **~1MB across 138 files**, not "~30KB" (irrelevant now since it's not being
installed, but the plan's characterization was wrong and shouldn't propagate).

## 1. Scope

Add a pure-logic module that generates a full light+dark neutral/surface color ramp and a
light/dark-invariant accent pair from seed hex colors, replacing what would otherwise be
hand-picked values in `tokens.json`. This task produces the generator and its tests only — no
`tokens.json` change, no editor UI, no API route. Wiring it into brand authoring is Task 1b.

Files this task may touch:
- `app/packages/design-system/src/generate-ramp.mjs` (new)
- `app/packages/design-system/src/generate-ramp.test.mjs` (new)
- `app/packages/design-system/src/vendor/material-color-utilities/**` (new — vendored files, §3.1)
- `app/eslint.config.mjs` (one-line addition — exclude the vendor directory from lint, §3.1)

**Not** `app/packages/design-system/package.json` — no new npm dependency, per §0. If you find
yourself wanting to add one, stop; that means §0's premise no longer holds and this spec is stale.

`.env`/credentials are not involved and out of scope regardless.

## 2. Non-goals

- **No wiring into `tokens.json`, the editor, or the API route.** That's Task 1b. This task
  produces two importable functions and nothing else observable from outside this module.
- **No modification of any vendored file's logic.** Every file under `vendor/material-color-
  utilities/` is a byte-for-byte copy from the upstream npm package (version pinned, §3.1) —
  don't "clean up," reformat, or fix anything in them, even something that looks like a real bug.
  If you find one, note it in your report; don't patch it silently. (Constraint: patching would
  make future upgrades — re-copying a newer version — non-mechanical.)
- **No general-purpose color-science module.** This task exposes exactly two functions
  (`generateNeutralRamp`, `generateAccentPair`) with the fixed shapes in §3.2 — not a generic
  "generate any tonal palette" API surface nobody asked for.
- **No input validation/error handling for malformed seed hex strings.** Consistent with this
  package's existing style (`resolve.mjs` throws naturally on bad input rather than defensively
  checking) — an invalid hex will throw from inside the vendored `argbFromHex`, and that's fine.
  The eventual caller (Task 1b's `ColorField`) already only ever supplies valid hex.
- **Don't touch `contrast.test.mjs`.** Its `luminance`/`ratio` helpers are duplicated (not
  imported) into this task's test file — see §3.3 for why extracting them was considered and
  rejected here.

## 3. Interface / exact changes

### 3.1 Vendor the 8 needed files from `@material/material-color-utilities@0.4.0`

Reproducible procedure (verified working during spec-writing):

1. In a throwaway directory (**not** this repo — e.g. your own scratch/temp dir), run
   `npm init -y && npm install @material/material-color-utilities@0.4.0` — pin the exact version
   so what you vendor matches what was verified.
2. Copy these 8 files from that install's `node_modules/@material/material-color-utilities/` into
   this repo at `app/packages/design-system/src/vendor/material-color-utilities/`, **preserving
   the directory structure exactly** (this matters: their relative imports, e.g. `../utils/
   color_utils.js`, already resolve correctly as long as the folder layout is unchanged — no
   import rewriting needed):
   - `hct/hct.js`
   - `hct/cam16.js`
   - `hct/hct_solver.js`
   - `hct/viewing_conditions.js`
   - `utils/color_utils.js`
   - `utils/string_utils.js`
   - `utils/math_utils.js`
   - `palettes/tonal_palette.js`
   - Also copy `LICENSE` (Apache-2.0 full text) to the vendor root.
3. Delete the throwaway npm install — nothing about it belongs in this repo.
4. Add `app/packages/design-system/src/vendor/README.md` with this exact content:

   ```md
   # Vendored: material-color-utilities

   Files under `material-color-utilities/` are unmodified copies from the npm package
   `@material/material-color-utilities@0.4.0` (Apache-2.0, upstream:
   https://github.com/material-foundation/material-color-utilities), vendored instead of
   installed as a dependency because the package cannot be `import`ed under plain Node.js ESM
   (see `docs/specs/design-system-generate-ramp.md` §0 for the full reason). Only the 8 files
   this package's `generate-ramp.mjs` actually needs are included — the rest of the upstream
   package (color extraction from images, dynamic theming schemes, quantizers) isn't used here.

   Each file carries its own original Apache-2.0 license header. `LICENSE` here is the upstream
   package's full license text, copied alongside per Apache-2.0 §4. No files have been modified
   from upstream — to upgrade, re-run the vendoring procedure in the spec above against a newer
   version and diff.
   ```

5. Add one entry to `app/eslint.config.mjs`'s existing `globalIgnores([...])` array (it already
   ignores `.next/**`, `out/**`, `build/**`, `next-env.d.ts` — add this as a fifth):
   ```js
   // Vendored, unmodified third-party source (see its own README) -- not ours to hold to
   // this repo's style/complexity rules.
   "packages/design-system/src/vendor/**",
   ```
   Without this, `npm run lint` produces 3 warnings from the vendored files (a nested-depth and
   two complexity warnings in `hct_solver.js`/`viewing_conditions.js`) — harmless (this repo's
   `complexity`/`max-depth` rules are `"warn"`, not `"error"`, so they wouldn't fail `verify`
   either way) but pointless noise on code nobody here will ever refactor.

### 3.2 `generate-ramp.mjs`

```js
// generate-ramp.mjs
import { Hct } from "./vendor/material-color-utilities/hct/hct.js";
import { TonalPalette } from "./vendor/material-color-utilities/palettes/tonal_palette.js";
import { argbFromHex, hexFromArgb } from "./vendor/material-color-utilities/utils/string_utils.js";

function tone(palette, t) {
  return hexFromArgb(palette.tone(t));
}

// Tone indices below were verified during spec-writing against 3 seed hues (this brand's
// actual current neutral seed #faf9f5, a cool neutral #eef1f5, and this brand's actual current
// accent #ae97f7 used as a stress-test neutral seed) and 3 accent seeds (#ae97f7, #e0524d,
// #3d7a5c) -- every background/foreground, surface/surfaceText, surfaceActive/surfaceActiveText,
// and accent/onAccent pair produced hits at least 7.4:1, comfortably above the 4.5:1 floor. Not
// guesswork -- implement as given. If your own tests (written first, per §7) disagree with this,
// that's a signal to check your implementation against this exact code, not to re-derive new
// tone indices from scratch.
export function generateNeutralRamp(seedHex) {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const neutral = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, 8));
  return {
    light: {
      background: tone(neutral, 99),
      foreground: tone(neutral, 10),
      border: tone(neutral, 90),
      surface: tone(neutral, 98),
      surfaceText: tone(neutral, 10),
      surfaceHover: tone(neutral, 94),
      surfaceActive: tone(neutral, 10),
      surfaceActiveText: tone(neutral, 99),
    },
    dark: {
      background: tone(neutral, 11),
      foreground: tone(neutral, 92),
      border: tone(neutral, 22),
      surface: tone(neutral, 32),
      surfaceText: tone(neutral, 99),
      surfaceHover: tone(neutral, 38),
      surfaceActive: tone(neutral, 99),
      surfaceActiveText: tone(neutral, 13),
    },
  };
}

export function generateAccentPair(seedHex) {
  const hct = Hct.fromInt(argbFromHex(seedHex));
  const accentPalette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);
  return {
    accent: tone(accentPalette, 70),
    onAccent: tone(accentPalette, 10),
  };
}
```

**Note on `onAccent`:** this makes `onAccent` a dark tone of the *same hue* as `accent` (e.g. a
seed of `#ae97f7` produces `onAccent: "#20005e"`, a dark violet — not today's flat
`primitive.color.ink` `#141413`). This is a deliberate, correct behavior of the generator, not a
bug: `DESIGN.md`'s "Color roles" section only requires `onAccent` be "a contrast-safe answer" for
filled-background use, not that it be neutral — today's flat ink value is a hand-picked
convenience from when there was only one accent, not a stated design rule. A hue-tinted
`onAccent` is the more principled choice once accent is seed-generated. Flagging this so it isn't
mistaken for scope creep or a regression when Task 1b's manual eyeball check (which this task
doesn't perform — no visual output exists yet) looks at it.

### 3.3 `generate-ramp.test.mjs`

Follow `contrast.test.mjs`'s existing style exactly (plain `node:test`, no `describe` blocks,
table-driven `PAIRS`-style assertions) — **duplicate**, don't import, its `luminance`/`ratio`
helpers (8 lines total): this task's file allowlist (§1) doesn't include modifying
`contrast.test.mjs`, and extracting a shared `contrast-math.mjs` for two 4-line functions is more
machinery than the duplication it removes. (The plan flagged this as "a real call to make at spec
time, not decided here" — this is that call, made explicitly so it isn't silently deferred again.)

```js
import test from "node:test";
import assert from "node:assert/strict";
import { generateNeutralRamp, generateAccentPair } from "./generate-ramp.mjs";

function luminance(hexColor) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hexColor.slice(i + 1, i + 3), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const NEUTRAL_SEEDS = {
  "warm neutral (this brand's actual paper)": "#faf9f5",
  "cool neutral": "#eef1f5",
  "saturated (this brand's actual accent, stress-testing high chroma as a neutral seed)": "#ae97f7",
};

for (const [label, seedHex] of Object.entries(NEUTRAL_SEEDS)) {
  const ramp = generateNeutralRamp(seedHex);
  for (const theme of ["light", "dark"]) {
    const t = ramp[theme];
    const pairs = [
      ["background/foreground", t.background, t.foreground],
      ["surface/surfaceText", t.surface, t.surfaceText],
      ["surfaceActive/surfaceActiveText", t.surfaceActive, t.surfaceActiveText],
    ];
    for (const [name, a, b] of pairs) {
      test(`${label} [${theme}] ${name} meets WCAG AA (4.5:1)`, () => {
        const r = ratio(a, b);
        assert.ok(r >= 4.5, `${a} on ${b} is ${r.toFixed(2)}:1, below 4.5:1`);
      });
    }
  }
}

const ACCENT_SEEDS = ["#ae97f7", "#e0524d", "#3d7a5c"];
for (const seedHex of ACCENT_SEEDS) {
  test(`accent/onAccent for seed ${seedHex} meets WCAG AA (4.5:1)`, () => {
    const { accent, onAccent } = generateAccentPair(seedHex);
    const r = ratio(accent, onAccent);
    assert.ok(r >= 4.5, `${accent} on ${onAccent} is ${r.toFixed(2)}:1, below 4.5:1`);
  });
}

test("generateNeutralRamp returns all 8 NeutralTones keys for both themes", () => {
  const ramp = generateNeutralRamp("#faf9f5");
  const keys = [
    "background", "foreground", "border", "surface",
    "surfaceText", "surfaceHover", "surfaceActive", "surfaceActiveText",
  ];
  for (const theme of ["light", "dark"]) {
    for (const key of keys) {
      assert.equal(typeof ramp[theme][key], "string", `${theme}.${key} missing or not a string`);
      assert.match(ramp[theme][key], /^#[0-9a-f]{6}$/, `${theme}.${key} is not a #rrggbb hex string`);
    }
  }
});

test("generateAccentPair returns accent and onAccent as #rrggbb hex strings", () => {
  const { accent, onAccent } = generateAccentPair("#ae97f7");
  assert.match(accent, /^#[0-9a-f]{6}$/);
  assert.match(onAccent, /^#[0-9a-f]{6}$/);
});
```

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| A seed hue where the default tone indices (§3.2) don't hit 4.5:1 for some pair | Not expected — verified against 3 diverse seeds with 2.9:1+ of margin above the floor (lowest observed: 7.44:1, the green accent seed's accent/onAccent pair — re-verified empirically 2026-09-20 during spec review; an earlier draft's 8.42 figure was wrong). If your own tests find a real failing seed, that's a genuine finding: report the seed and the failing pair, don't silently adjust tone indices to paper over it without understanding why that seed differs from the three verified here. |
| A vendored file needs a newer upstream version later (e.g. a real bug is found in the vendored math) | Out of scope for this task — re-running the vendoring procedure (§3.1) against a newer `@material/material-color-utilities` version is a future task's concern, not this one's. |

## 5. Forbidden patterns

- No bare `except`/swallowed errors (n/a — pure functions, no try/catch needed here).
- No hardcoded colors in the *generator's own logic* beyond the tone indices in §3.2, which are
  the actual point of this task (they're indices into an algorithmically-derived palette, not
  literal hex values). Vendored files (§3.1) are exempt — they're unmodified upstream code, not
  new code this task is writing.
- No touching `.env`/credentials.
- **No new npm dependency** — per §0, this is the one thing that changed from the plan's original
  framing. If `package.json` needs to change for this task, something has gone wrong; stop.

## 6. File allowlist

- `app/packages/design-system/src/generate-ramp.mjs` (new)
- `app/packages/design-system/src/generate-ramp.test.mjs` (new)
- `app/packages/design-system/src/vendor/material-color-utilities/**` (new)
- `app/packages/design-system/src/vendor/README.md` (new)
- `app/eslint.config.mjs` (one-line addition to `globalIgnores`)

## 7. Acceptance criteria

- Write `generate-ramp.test.mjs` (§3.3) first, run it, confirm it fails (the module doesn't exist
  yet) — TDD, per this project's convention, not a formality to skip because the tone indices are
  pre-verified above.
- After vendoring (§3.1) and before implementing: smoke-check the *copy*, not just the procedure —
  run `node --input-type=module -e "import('./app/packages/design-system/src/vendor/material-color-utilities/palettes/tonal_palette.js')"` (from the repo root) and confirm it loads.
  A silent copy mistake (wrong nesting, truncated file) must surface here, not three steps later.
- Implement `generate-ramp.mjs` (§3.2) and the vendoring (§3.1); run
  `node --test app/packages/design-system/src/generate-ramp.test.mjs`, confirm all tests pass.
- `npm run verify` passes in full — typecheck (the vendored `.js`/this task's `.mjs` files aren't
  matched by `tsconfig.json`'s `include`, which only covers `.ts`/`.tsx`/`.mts`, so typecheck
  doesn't touch any of this task's files either way — confirmed, not assumed), lint (confirm the
  `eslint.config.mjs` ignore entry actually suppresses the vendor-directory warnings — run
  `npx eslint packages/design-system/src/vendor/` directly and confirm it reports the directory as
  fully ignored, not just quiet by coincidence), and all existing + new `node --test` tests —
  especially `contrast.test.mjs`, unmodified and still passing (this task doesn't touch
  `tokens.json`, so it can't regress this by construction, but run it anyway).
- `git diff --stat` shows only the files in §6 as changed/new.

## 8. Definition of done

- `npm run verify` passes.
- `git diff --stat` matches §6's file allowlist.
- Checkpoint commit made (per `WEB_APP_WORKFLOW.md` §4).

## 9. Stop-conditions

- If `@material/material-color-utilities` has published a version past `0.4.0` by the time this
  task actually runs, **stop and ask** rather than assuming the ESM-import bug (§0) is still
  present — re-verify against the current `latest` before deciding whether vendoring is still
  necessary; don't skip straight to vendoring on the strength of this spec's now-possibly-stale
  finding.
- If copying the 8 files in §3.1 pulls in an import this spec didn't account for (i.e. one of
  them imports something outside the 8-file set), **stop and ask** rather than silently vendoring
  additional files — that would mean this spec's dependency-graph verification was incomplete.
- If any of the three verified seed hues (§3.2) actually fails a contrast test once implemented,
  **stop and ask** rather than adjusting tone indices unsupervised — see §4's bad-case row.
