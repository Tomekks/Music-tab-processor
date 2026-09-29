import type { LayoutServerLoad } from './$types';
import { DESIGN_SYSTEM_URL } from '$lib/server/config';

export const load: LayoutServerLoad = async () => {
	return {
		nav: [
			{ label: 'Audio processing', href: '/audio' },
			{ label: 'Design System', href: DESIGN_SYSTEM_URL, external: true }
		]
	};
};
