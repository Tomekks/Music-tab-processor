# Spec 0 — Foundation tokens + theme font

Tier: Bounded, because it touches the design-system brand files, generated CSS, and global typography feeding every downstream component — fully revertible (`git checkout` + rebuild) but wider than Trivial.

## 0. User story (approved)

As a player, I see the app's theme typeface everywhere instead of a system fallback, and loop and playback colors follow my light/dark theme. As a maintainer running `detect`, I see only real findings, so its end-of-task runs stay meaningful.

## 1. Scope

Exact files (also the allowlist — §6):

* `app/packages/design-system/brands/default/tokens.json` — add §3 tokens.
* `app/packages/design-system/brands/default/tokens.default.json` — identical matching edits (package README: the two stay in sync through deliberate matching edits, never one alone).
* `app/packages/design-system/brands/default/DESIGN.md` — document the new `playback` tier: why each token exists (one line each, §3 rationale).
* `app/packages/design-system/src/token-usage.test.mjs` — add the three new paths to `KNOWN_ORPHANS` with reason `wired up in specs 1+4/2/3` (the file's own comment sanctions this; each consuming spec's acceptance removes its tokens from the set — orphan status is temporary and tracked, not silent). Dark overrides need no separate entries: the test normalizes `dark.*` orphans to their base path before comparing (amendment 2026-09-21 — the one permitted test correction, see §4/§9).
* `app/app/globals.css` — line 7 → `font-family: var(--font-sans, var(--font-geist-sans)), Arial, Helvetica, sans-serif;` (token-first; the nested fallback exists because `@theme inline` emission of `--font-sans` as a runtime property is unverified — the chain resolves correctly whether or not it is emitted, degrading to the Geist passthrough the token itself names, then legacy Arial).
* `app/packages/design-system/src/build-tokens.test.mjs` — refresh the two frozen expected-CSS fixtures (`EXPECTED`, `DEMO_CHILD_EXPECTED`) to include the four §3 tokens and their theme output (amendment 2026-09-21 — fixture refresh only, see §4/§9).
* `.env`/credentials: excluded, untouched.

Regenerate (never hand-edit): `app/design-tokens.generated.css` via `npm run tokens:build`.

## 2. Non-goals

* No component restyling — nothing consumes the new tokens yet (specs 1+4/2/3 do that). Zero visual change except body/button typeface.
* No new primitives and no new palette: `playbackActive` tokenizes the exact literal currently rendered (zero-change); `loopRange` aliases the existing accent.
* No `component.*` blocks (specs 1+4 consume the existing `component.button.*` roles instead — no parallel button color system), no editor UI, no Figma changes.
* No `focusRing` token: `semantic.focus.ringColor` (`--focus-ring-color`) already owns that role — use it.
* No `contracts/`, no Turso schema, no publish path. Detector hygiene lives in `detector-hygiene.md`, not here.

## 3. Interface — exact tokens

Naming follows `src/css-var-naming.mjs` (verified by reading — never guessed). Generator semantics verified in `src/build-tokens.mjs`: `semantic.color` leaves emit resolved literals in `:root`; `[data-theme]` blocks cover **exactly** the keys under `dark.semantic.color`; `component.*` var-aliasing does **not** apply to `semantic.*` leaves — so every alias below whose target varies by theme carries an explicit dark override. No exceptions to this rule.

| Token path | `$type` | Light `$value` | Dark override | Emitted var | Why it exists |
|---|---|---|---|---|---|
| `semantic.color.playbackActive` | color | `#141413` | `#ededed` | `--color-playback-active` | Active-step ring, currently hardcoded `var(--foreground)` at the call site with no semantic name. Ring-only by decision (mini-grid dots invert poorly; Sheet's inverted-note treatment stays as-is) — no fill token exists |
| `semantic.color.loopRange` | color | `{primitive.color.accent}` | — inherits (accent itself carries no dark entry; same treatment is legitimate, not a gap) | `--color-loop-range` | Loop identity; replaces two ad-hoc loop `color-mix()` literals (SheetDiagram:254, DetailToolbar:47). FretboardDiagram:218 is the out-of-scope card border, not a loop mix |
| `semantic.state.loopRangeOpacity` | percentage | `18%` | n/a (`state` has no dark mechanism by design) | `--state-loop-range-opacity` | The 18% currently hardcoded in those two mixes, tokenized so opacity is owned too |

Standardized overlay pattern (the only sanctioned wash going forward):
`color-mix(in srgb, var(--color-loop-range) var(--state-loop-range-opacity), transparent)`.

Unresolved-`{...}` in emitted CSS means a bad value, never a resolver bug — fix the value.

## 4. Bad-case behavior

| Case | Required behavior |
|---|---|
| `tokens.json` without matching `tokens.default.json` edit | Forbidden — both change identically in one commit; `git diff --stat` must show both with matching hunks |
| Unresolvable `{path}` | build + validation tests fail; fix the value |
| New token unreferenced (orphan test) | Covered by the three `KNOWN_ORPHANS` base-path entries added here (dark overrides normalize to base paths — no separate `dark.*` entries); if the test still fails, a genuinely new orphan appeared — investigate, don't extend the list silently |
| Frozen golden CSS predating the new tokens (`build-tokens.test.mjs`) | Refresh the two expected strings with the real generator output after checking it against §3 (insertions only: the three tokens' vars in `:root`/`@theme inline`/theme blocks); never touch the generator, resolver, or test assertions |
| Hand-edit of `design-tokens.generated.css` | Revert; it regenerates and is gitignored |
| Editor used instead of file edits | Allowed, but the manual check then touches a writing route: revert-and-rebuild included in the check (WEB_APP_WORKFLOW.md §3) |

## 5. Forbidden patterns

No hardcoded hex outside the one zero-change literal; no touching `build-tokens.mjs`, `resolve.mjs`, `css-var-naming.mjs`, `contrast.test.mjs` expectations, or test assertions; no credentials/`.env`; no component restyling to "preview" tokens.

## 6. File allowlist

`app/packages/design-system/brands/default/tokens.json`, `tokens.default.json`, `DESIGN.md`, `app/packages/design-system/src/token-usage.test.mjs` (orphan list + dark-path normalization only), `app/packages/design-system/src/build-tokens.test.mjs` (expected-CSS fixtures only), `app/app/globals.css`. Generated: `app/design-tokens.generated.css`.

## 7. Acceptance criteria

* `npm run verify` passes from `app/` — quote the tail (covers the package suite incl. `token-usage`, `tokens-validation`, `build-tokens`).
* Exact generated-output assertion (replaces grep — paste command + output; all must hold):
  `node -e "const fs=require('fs');const css=fs.readFileSync('app/design-tokens.generated.css','utf8');const need=['--color-playback-active: #141413','--color-loop-range: #ae97f7','--state-loop-range-opacity: 18%','[data-theme=\"dark\"]'];for(const s of need){if(!css.includes(s))throw new Error('missing: '+s)}const dark=css.split('[data-theme=\"dark\"]')[1];if(!dark.includes('--color-playback-active: #ededed'))throw new Error('missing dark playbackActive');if(/\\{[a-z]+\\.[a-z]/i.test(css))throw new Error('unresolved ref');console.log('TOKENS_ASSERT: PASS')"`
* Runtime font proof ( staged `dev` or `stage` server + ad-hoc Chromium — same harness as the critique evidence pass; no committed test file for a visual-only change): `getComputedStyle(document.body).fontFamily` contains `Geist`, recorded beside the command. If it contains only Arial, the `--font-sans` emission assumption failed — stop and report, don't restyle around it.
* No committed Playwright spec (nothing interactive changes) — and no manual one-liner duplicating what the assertion above already proves.
* Human checkbox (sitting A pool, `npm run stage`, route `/` — `/studio` redirects there, no separate check): theme face in light **and** dark; nothing else visibly changed.

## 8. Definition of done

`verify` green + `diff --stat` matches §6 + token assertion PASS + runtime font evidence recorded + human checkbox recorded + self-check (every claim beside its command/output) + checkpoint commit.

## 9. Stop-conditions

* Unresolved refs, token-file drift, or orphan-test failure beyond the three listed → stop, fix values/sync, never the generator. Test logic is frozen except (a) the dark-path normalization permitted by this spec and (b) this one golden-fixture refresh of the two expected-CSS strings (both amendment 2026-09-21) — nothing else.
* Runtime font lacks Geist → stop, report, don't restyle.
* Any urge to consume the tokens in a component → stop, that's specs 1+4/2/3.
* Anything ambiguous → ask (WEB_APP_WORKFLOW.md §5 step 3).

## 10. Execution report (mandatory, on completion or early stop)

File the report exactly per `_architecture_playground/toms-scripts/EXECUTION_REPORT_REQUIREMENT.md`. Pre-filled for this task — fill values, never invent them:

* Checks rows: Required verification (`npm run verify` tail) | E2E `N/A` (no committed spec — visual-only change; say so, don't hide behind it) | Staging/build (`npm run stage` build + runtime font proof) | Diff check (`git diff --stat` vs §6).
* Runtime Evidence section required (staged server used for the font proof): server URL, PID + stop command, build ID, HTML 200, stylesheet URLs + responses, console/page errors.
* Human Review checkboxes (sitting A pool — pending until a human runs them):
  * [ ] Theme typeface renders in light theme, route `/`.
  * [ ] Theme typeface renders in dark theme, route `/`.
  * [ ] Nothing else visibly changed.
* Status: `AUTOMATED_GREEN_HUMAN_PENDING` while any checkbox is unticked; `BLOCKED` on any failed/not-run required check with Failure Details filled.
