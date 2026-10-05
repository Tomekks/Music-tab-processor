# Design System workbench rules (SvelteKit)

- Internal desktop tool for one user (min width about 1024). Local only: port 5174, `127.0.0.1`.
- The tool's own panels (top bar, sidebars, inspector) keep one fixed neutral look, hard-coded in this
  folder. Only the canvas will show the active brand later. Do not import the web app's brand CSS here.
- The shell fills the window and the page never scrolls as a whole. Each column scrolls inside itself.
- Svelte trims whitespace at the start of an `{#if}` block, which glues words together. Build the text
  once in the script and render that string.
- On a `<select>`, set `value={...}` on the `<select>`, not `selected` on each `<option>`.
- Imports nothing from `tools/Control_Centre/`; copy a file if you need it.
- Tests: `node --test` on `src/**/*.test.ts` (see `package.json`).
- Browser specs: `app/e2e/workbench/` (see `docs/rules/e2e.md`). Keep accessible labels and roles stable; renaming one means updating the specs.
