import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { ALLOWED_HOSTS } from './src/lib/server/config.ts';

export default defineConfig({
	server: { host: '127.0.0.1', port: 5174, strictPort: true },
	preview: { host: '127.0.0.1', port: 5174, strictPort: true },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Same reasoning as Control Center: adapter-node's production form-origin check builds
			// the origin with https, so trust exactly the loopback origins derived from ALLOWED_HOSTS.
			csrf: { trustedOrigins: ALLOWED_HOSTS.map((h) => `http://${h}`) },
			adapter: adapter()
		})
	]
});
