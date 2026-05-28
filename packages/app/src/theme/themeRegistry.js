import {parseThemeSpec} from './themeSpec';

const moonfinTheme = parseThemeSpec({
	schemaVersion: 1,
	id: 'moonfin',
	displayName: 'Moonfin',
	brightness: 'dark',
	colors: {
		background: '#FF101010',
		onBackground: '#FFFFFFFF',
		surface: '#FF252525',
		onSurface: '#FFFFFFFF',
		surfaceVariant: '#FF252525',
		scrim: '#CC000000',
		accent: '#FF00A4DC',
		onAccent: '#FFFFFFFF',
		buttonNormal: '#FF2A2A2A',
		buttonFocused: '#FF00A4DC',
		buttonDisabled: '#FF1E1E1E',
		buttonActive: '#FF3A3A3A',
		onButtonNormal: '#FFFFFFFF',
		onButtonFocused: '#FFFFFFFF',
		onButtonDisabled: '#FF666666',
		inputBackground: '#FF2A2A2A',
		inputFocused: '#FF3A3A3A',
		inputBorder: '#FF404040',
		inputBorderFocused: '#FF00A4DC',
		rangeTrack: '#FF404040',
		rangeProgress: '#FF00A4DC',
		rangeThumb: '#FF00A4DC',
		seekbarBuffered: '#80FFFFFF',
		badgeBackground: '#FF00A4DC',
		onBadge: '#FFFFFFFF',
		badgeUnplayed: '#FF00A4DC',
		badgeWatched: '#FF22C55E',
		recordingActive: '#FFEF4444',
		recordingScheduled: '#FFF59E0B'
	},
	borders: {
		cardBorder: {color: '#00000000', width: 1},
		chipBorder: {color: '#558EC8F0', width: 1},
		focusBorder: {color: '#FF00A4DC', width: 2},
		cardRadius: 8,
		chipRadius: 999,
		chipBackground: '#1F8EC8F0',
		focusGlow: []
	}
});

const neonPulseTheme = parseThemeSpec({
	schemaVersion: 1,
	id: 'neon_pulse',
	displayName: 'Neon Pulse',
	brightness: 'dark',
	fontFamily: 'NeonPulseDisplay',
	textGlow: [{color: '#6600E5FF', blurRadius: 8, spreadRadius: 0, offsetX: 0, offsetY: 0}],
	navColorCycle: ['#FFFF2E92', '#FF00E5FF'],
	transparentNavbarSurface: true,
	colors: {
		background: '#FF0B0420',
		onBackground: '#FF00E5FF',
		surface: '#CC1E0A3F',
		onSurface: '#FF00E5FF',
		surfaceVariant: '#CC1E0A3F',
		scrim: '#CC0B0420',
		accent: '#FFFF2E92',
		onAccent: '#FFFFFFFF',
		buttonNormal: '#00000000',
		buttonFocused: '#33FF2E92',
		buttonDisabled: '#22FFFFFF',
		buttonActive: '#33FF2E92',
		onButtonNormal: '#FFFF2E92',
		onButtonFocused: '#FFFFFFFF',
		onButtonDisabled: '#AAFFFFFF',
		inputBackground: '#331E0A3F',
		inputFocused: '#441E0A3F',
		inputBorder: '#66FF2E92',
		inputBorderFocused: '#FFFF2E92',
		rangeTrack: '#66201840',
		rangeProgress: '#FFFF2E92',
		rangeThumb: '#FFFF2E92',
		seekbarBuffered: '#66FFFFFF',
		badgeBackground: '#FFFF2E92',
		onBadge: '#FFFFFFFF',
		badgeUnplayed: '#FFFF2E92',
		badgeWatched: '#FF00E5FF',
		recordingActive: '#FFFF2E92',
		recordingScheduled: '#FF00E5FF'
	},
	borders: {
		cardBorder: {color: '#66FF2E92', width: 1},
		chipBorder: {color: '#CCFF2E92', width: 1.2},
		focusBorder: {color: '#FFFF2E92', width: 1.4},
		cardRadius: 10,
		chipRadius: 8,
		chipBackground: '#00000000',
		focusGlow: [
			{color: '#99FF2E92', blurRadius: 8, spreadRadius: 0.5, offsetX: 0, offsetY: 0},
			{color: '#6600E5FF', blurRadius: 5, spreadRadius: 0, offsetX: 0, offsetY: 0}
		],
		navBorder: {color: '#CCFF2E92', width: 1}
	}
});

const builtInThemes = Object.freeze({
	moonfin: moonfinTheme,
	neon_pulse: neonPulseTheme
});

const builtInThemeIds = new Set(Object.keys(builtInThemes));
let customThemes = {};

export const builtInThemeIdsList = Object.freeze(Array.from(builtInThemeIds));
export const isBuiltInThemeId = (id) => builtInThemeIds.has(id);

export const getAvailableThemes = () => ({
	...builtInThemes,
	...customThemes
});

export const getAvailableThemeList = () => {
	const builtIns = Object.values(builtInThemes);
	const customs = Object.values(customThemes).sort((left, right) => left.displayName.localeCompare(right.displayName));
	return [...builtIns, ...customs];
};

export const resolveThemeById = (id) => getAvailableThemes()[id] || builtInThemes.moonfin;

export const replaceCustomThemes = (specs) => {
	const next = {};
	for (const spec of specs) {
		if (!spec || !spec.id || isBuiltInThemeId(spec.id)) continue;
		next[spec.id] = spec;
	}
	customThemes = next;
	return getAvailableThemes();
};

export const registerCustomTheme = (spec) => {
	if (!spec || !spec.id || isBuiltInThemeId(spec.id)) {
		throw new Error(`Cannot register theme with reserved id "${spec?.id || ''}".`);
	}
	customThemes = {...customThemes, [spec.id]: spec};
	return customThemes[spec.id];
};