import { error } from "@sveltejs/kit";
import { findComponent } from "$lib/registry.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
	const entry = findComponent(params.slug);
	if (!entry) {
		throw error(404, "Unknown component");
	}
	return entry;
};
