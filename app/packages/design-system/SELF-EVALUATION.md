# Design system self-evaluation

A lightweight health check for this specific system — single-maintainer, ~40 leaf tokens, 4
components, one consumer app. Enterprise design-system maturity models (NN/g's 6-dimension
framework, Atomize's 6-axis scorecard) assume multiple consuming teams and executive sponsorship
that don't apply here; this is a trimmed adaptation, keeping only the axes that mean something at
this scale. Re-score whenever a task from `docs/plans/2026-09-20-design-system-iteration-2/2026-09-20-design-system-iteration-2.md`
lands, or at any natural pause point — not on a fixed schedule.

## Scorecard (0/1/2 per axis)

| Axis | Score | Why |
|---|---|---|
| **Tokens** — raw values (0) → primitives without semantics (1) → full semantic+component layering (2) | **2** | `tokens.json` already has all three layers (`primitive`/`semantic`/`component`), with `{path}` references resolved by `resolve.mjs`. |
| **Code sync** — design-only (0) → exported but unused (1) → production consumes it directly (2) | **2** | The whole app runs on `build-tokens.mjs`'s generated CSS since Task 3's cutover — not a parallel design artifact nobody reads. |
| **Governance** — no rules (0) → informal (1) → a published contribution/override/reset process (2) | **1**, moving to 2 once Task 5 lands | Single-brand reset-to-default already exists (`applyReset`/`applyResetAll`). Multi-brand override/reset (Task 5) is the real governance mechanism — and it's landing *before* more components or brands pile up, which external research flags as the right sequencing (adding components before governance exists is a named common mistake). |
| **Documentation** — none (0) → partial (1) → guidelines + status + changelog maintained (2) | **1** | `DESIGN.md` (principles) and `README.md` (package structure) are both real and current. No changelog/versioning — correctly skipped for now (single internal consumer, git history is an adequate changelog until that changes). |
| **Test coverage** — this project's own axis, not in either external model | **2** | 45 passing tests including `contrast.test.mjs`'s automated WCAG AA check on every semantic color pair, both themes — a real, already-invested-in strength worth tracking explicitly since it doesn't show up in generic maturity models. |

**Not scored:** *Ownership* (trivially "dedicated" for a solo project — not a meaningful axis
here) and *Organizational alignment / Adoption* (both external models' dimensions assume other
teams exist; this project has one consumer app, so they're dropped entirely rather than scored
low).

## Staleness check (part of every re-score, not a one-time write)

Design-system documentation drifts from actual token values the same way status docs drift from
code (confirmed twice this session, unrelated to the design system: `app/status/song-views.md`
and `docs/WEB_APP_WORKFLOW.md` both went stale). Every re-score should also ask: **does
`DESIGN.md`'s prose still match `tokens.json`'s actual current values?** — spot-check a few
described colors/behaviors against the live file, don't assume the doc is still accurate.

## Anti-patterns to watch for (design-system-specific, not the generic process-bloat lessons
already captured in `docs/WEB_APP_WORKFLOW.md`)

- **Token sprawl via careless multi-brand overrides.** Task 5's whole design exists to prevent
  this — a child brand's `tokens.json` must only ever contain the leaves it actually overrides,
  never a full duplicate copy. If a future child brand's file starts looking like a full copy of
  `default`'s, that's the anti-pattern showing up, not a feature.
- **Orphaned tokens.** A leaf nothing references anymore adds noise and tempts the next person to
  reach for the wrong (unused) token. Task 6 (`token-usage.test.mjs`) makes this a checked
  invariant instead of something that has to be remembered.
- **Contrast coverage silently going stale.** `contrast.test.mjs`'s `PAIRS` array is hand-
  enumerated — it only protects pairs someone remembered to add. Every task that introduces a new
  color-pair relationship (Task 1's generator, Task 5's overrides) should extend that array as
  part of its own acceptance criteria, not as an afterthought.
- **Theming complexity exceeding real need.** This project has one real consumer surface today,
  maybe one or two backlogged ones — build-time, config-driven brand overrides (Task 5's actual
  design) are the right amount of machinery. A live, runtime multi-tenant theming engine would be
  solving a problem this project doesn't have.

## Explicitly deferred (researched, assessed, not worth doing yet — recorded so it isn't
re-researched from scratch later)

| Idea | Why deferred |
|---|---|
| Storybook or equivalent living-docs tooling | Standard once a system passes ~15-20 components; this one has 4. The `/design-system` editor already doubles as live docs-with-editing at this scale. |
| Visual regression testing (Chromatic or BackstopJS) | Worth it once manual eyeballing starts missing real regressions. BackstopJS is the better fit *when* the time comes — it needs no Storybook/RTL harness, matching this project's existing "manual browser check" pattern. Not yet. |
| Token versioning/changelog as a formal practice | Standard for systems with external consumers. Nothing outside this repo consumes `@guitar-tabs/design-system` yet; git history is adequate. Revisit if Task 5 turns this into a package multiple real surfaces depend on. |
| DTCG spec / Style Dictionary adoption | `tokens.json` is already DTCG-shaped (`$value`/`$type`) by convention, just not tool-verified against the real spec. Worth validating once the token set stabilizes further; the hand-rolled resolver already works and is tested, so this isn't urgent. |
| `prefers-reduced-motion` tokens | `DESIGN.md` already states "no decorative motion" as a principle — there's very little motion to reduce in the first place. Solves a problem this project doesn't have. |

## Sources

NN/g, ["Design System Maturity"](https://www.nngroup.com/articles/design-system-maturity/) ·
Atomize, ["Design System Maturity: 5 Levels + Scorecard"](https://atomize.tools/blog/design-system-maturity/) ·
[Design Tokens Format Module (DTCG)](https://www.designtokens.org/tr/third-editors-draft/format/) ·
[Style Dictionary DTCG support](https://styledictionary.com/info/dtcg/) ·
["Design tokens & theming, scalable UI 2025"](https://materialui.co/blog/design-tokens-and-theming-scalable-ui-2025) ·
[Design Token Kit (orphan-token detection)](https://medium.com/@bychinskidm/how-we-made-design-token-kit-an-npm-tool-for-design-tokens-fccf36bd2c65) ·
[Shopify Polaris multi-theme PR](https://github.com/Shopify/polaris/pull/10423) ·
["Storybook visual testing without Chromatic"](https://dev.to/delta-qa/storybook-visual-testing-without-chromatic-alternatives-for-testing-your-components-visually-3pg5)
