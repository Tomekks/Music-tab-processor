export function bodyColumns(navOpen: boolean, inspectorOpen: boolean): string {
	if (navOpen && inspectorOpen) return "200px 1fr 320px";
	if (!navOpen && inspectorOpen) return "1fr 320px";
	if (navOpen && !inspectorOpen) return "200px 1fr";
	return "1fr";
}
