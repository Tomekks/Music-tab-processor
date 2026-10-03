# Workbench slice 1 spike (2026-10-03) - throwaway

Question: can a preview window show the REAL React components with staged token edits, including forced Hover/Pressed states?
`spike-page.tsx.txt` is the throwaway Next page used (deleted from `app/` after the test). Not for promotion; rewrite properly.

## Prior art
- storybook-addon-pseudo-states (README read raw; now merged into the Storybook monorepo). Technique, no Storybook needed:
  copy every `:hover`/`:active` rule with a class selector and toggle the class on a wrapper. Documented limitation: browser
  default styles are not forced (fine here, components set their own).
- Framer property controls: see the plan (control spec per token).
- Nothing found for "edit design tokens from a separate app and preview real React components"; Storybook is the closest,
  but it is a different tool (no token writes). Owner chose the standalone workbench anyway.

## Results (measured in the browser pane against the running dev server)
1. CSS-variable overrides change the real Button: PASS. Setting `--component-button-primary-background` on `<html>` turned
   the primary Button red. Inside an iframe via `postMessage`: PASS (only the iframe's Button changed, the parent kept its colour).
2. Forced hover/pressed: PASS after two fixes. (a) Tailwind v4 emits `.hover\:[...]:hover` plus an `@supports color-mix`
   override; the forced copy must use the descendant form (`.force-hover .cls`) and be inserted right after the original rule,
   not at the end, or the plain fallback wins. (b) Reading colours in a background tab lags because of `transition-colors`;
   disable transitions in the preview when measuring. Secondary Button has no pressed style in the component, so its Pressed cell equals Default (correct, not a bug).
3. Generated CSS reaches the page without a manual refresh: PASS. Editing `app/app/design-tokens.generated.css` changed the page's
   `--color-accent` within about 100 ms of the file write (I could not tell HMR from a reload; either way no manual refresh).
   The file was restored with `npm run tokens:build` and diffed identical to a backup.

## Findings that change the plan
- **Primary Button hover/pressed are mixed from `--color-accent`, not from the Button's own token.** With `--color-accent` changed,
  the default stayed purple and hover went blue. So editing `component.button.primary.background` leaves hover/pressed unchanged
  and they disagree. Needs a decision (component bug, or base the overlay on the component token) before slice 1's Hover cells mean anything.
- **`buildActiveBrand()` regenerates only the active brand** (the `active-brand.json` pointer, written to the app's generated CSS).
  A workbench editing another brand must either switch the pointer or call `generateCSS` with that brand's directory. Check `generateCSS`'s signature in the slice 1 spec.
