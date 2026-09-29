import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { ALLOWED_HOSTS } from './src/lib/server/config.ts';

export default defineConfig({
	server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { ignored: ['**/data/**'] } },
	preview: { host: '127.0.0.1', port: 5173, strictPort: true },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Kit's own production form-origin check compares against url.origin,
			// which adapter-node builds with protocol https; without this, every
			// form action 403s in `npm run start`. Exactly the loopback origins,
			// derived from ALLOWED_HOSTS (never duplicated); our guard stays stricter.
			csrf: { trustedOrigins: ALLOWED_HOSTS.map((h) => `http://${h}`) },
			adapter: adapter()
		})
	]
});
