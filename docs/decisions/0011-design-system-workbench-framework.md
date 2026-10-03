# Design system workbench: standalone SvelteKit app, real React components in a preview window

**Status:** accepted · 2026-10-03

The new workbench is built in SvelteKit (predictable, and it moves with the design system into its own
repo later). The real components are React, which Svelte cannot render. We keep one set of components
(the React ones the web app uses) and show them in the workbench through a preview window of the running
web app, with staged edits applied as CSS-variable overrides.

## Considered options

- **Svelte copies of each component in the workbench.** Rejected: the preview would not show what the web
  app really ships, and the two sets would drift.
- **Web Components (one build used by React and Svelte).** Not rejected, not tried: interop with this React
  version is unverified. A time-boxed spike if the web app is ever rewritten in Svelte or a third consumer
  appears.
- **Workbench in Next/React.** Rejected: the owner chose SvelteKit for predictability.

## Consequences

- The preview needs the web app's dev server running; when it is down the workbench says so.
- A new preview route in `app/` renders every Component by Variant and State.
- The workbench is a standalone folder (own `package.json`, imports nothing from Control Center). Control
  Center embeds it by iframe or link. It reads the token and component folders by path, so it can move to a
  separate repo.
- The tested `.mjs` package layer (`resolve`, `token-writes`, `field-descriptors`, `generate-ramp`,
  `build-tokens`) is reused unchanged; a bug found in it is fixed there.
- Trigger to revisit: the web app moves to Svelte, or a third consumer appears. Optional tidy-up meanwhile:
  move each component's Tailwind class strings into one plain CSS file both frameworks can use.
