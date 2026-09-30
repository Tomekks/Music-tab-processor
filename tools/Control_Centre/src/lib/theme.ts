export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'guitar-tabs-theme';

export function resolveTheme(stored: string | null, systemDark: boolean): ThemeMode {
	if (stored === 'light' || stored === 'dark') return stored;
	return systemDark ? 'dark' : 'light';
}

export function nextTheme(mode: ThemeMode): ThemeMode {
	return mode === 'dark' ? 'light' : 'dark';
}
