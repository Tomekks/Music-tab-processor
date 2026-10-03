# Control Centre rules (SvelteKit)

- Build slowly and explain each SvelteKit architecture choice as you make it.
- Svelte trims whitespace at the start of an `{#if}` block, which glues words together. Build the text
  once in the script and render that string.
- On a `<select>`, set `value={...}` on the `<select>`, not `selected` on each `<option>`: after the user
  changes it, the DOM selection is "dirty" and later data changes won't update it.
