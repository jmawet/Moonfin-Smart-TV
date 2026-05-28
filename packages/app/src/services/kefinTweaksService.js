const KEFIN_SOURCE = 'kefinTweaks';

const isEnabledFlag = (value, defaultValue = true) => {
	if (value === undefined || value === null) return defaultValue;
	return value !== false;
};

const toNumber = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringArray = (value) => {
	if (!Array.isArray(value)) return null;
	return value
		.map((item) => item == null ? null : String(item))
		.filter(Boolean);
};

const parseMmDd = (value) => {
	if (typeof value !== 'string') return null;
	const parts = value.split('-');
	if (parts.length < 2) return null;
	const month = Number(parts[0]);
	const day = Number(parts[1]);
	if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
	return [month, day];
};

const compareMmDd = (left, right) => {
	if (left[0] !== right[0]) return left[0] - right[0];
	return left[1] - right[1];
};

const isSeasonalActive = (now, startMmDd, endMmDd) => {
	const start = parseMmDd(startMmDd);
	const end = parseMmDd(endMmDd);
	if (!start || !end) return false;
	const today = [now.getMonth() + 1, now.getDate()];
	if (compareMmDd(start, end) <= 0) {
		return compareMmDd(today, start) >= 0 && compareMmDd(today, end) <= 0;
	}
	return compareMmDd(today, start) >= 0 || compareMmDd(today, end) <= 0;
};

const buildSection = (id, displayText, order, spec) => ({
	id: `kefin:${id}`,
	displayText,
	order,
	specJson: JSON.stringify(spec),
	source: KEFIN_SOURCE
});

const buildSections = (config) => {
	const homeScreen = config?.homeScreen || config?.HomeScreen || {};
	const defaultLimit = toNumber(homeScreen.defaultItemLimit ?? homeScreen.DefaultItemLimit, 24);
	const rows = [];

	const recentlyReleased = homeScreen.recentlyReleased || homeScreen.RecentlyReleased;
	if (isEnabledFlag(recentlyReleased?.enabled ?? recentlyReleased?.Enabled)) {
		const movies = recentlyReleased?.movies || recentlyReleased?.Movies;
		if (isEnabledFlag(movies?.enabled ?? movies?.Enabled)) {
			rows.push(buildSection(
				'recentlyReleasedMovies',
				movies?.name || movies?.Name || 'Recently Released Movies',
				toNumber(movies?.order ?? movies?.Order, 21),
				{kind: 'recentlyReleasedMovies', limit: toNumber(movies?.itemLimit ?? movies?.ItemLimit, defaultLimit)}
			));
		}

		const episodes = recentlyReleased?.episodes || recentlyReleased?.Episodes;
		if (isEnabledFlag(episodes?.enabled ?? episodes?.Enabled)) {
			rows.push(buildSection(
				'recentlyReleasedEpisodes',
				episodes?.name || episodes?.Name || 'Recently Released Episodes',
				toNumber(episodes?.order ?? episodes?.Order, 22),
				{kind: 'recentlyReleasedEpisodes', limit: toNumber(episodes?.itemLimit ?? episodes?.ItemLimit, defaultLimit)}
			));
		}
	}

	const watchAgain = homeScreen.watchAgain || homeScreen.WatchAgain;
	if (isEnabledFlag(watchAgain?.enabled ?? watchAgain?.Enabled)) {
		rows.push(buildSection(
			'watchAgain',
			watchAgain?.name || watchAgain?.Name || 'Watch Again',
			toNumber(watchAgain?.order ?? watchAgain?.Order, 50),
			{kind: 'watchAgain', limit: toNumber(watchAgain?.itemLimit ?? watchAgain?.ItemLimit, defaultLimit)}
		));
	}

	const recentlyAdded = homeScreen.recentlyAddedInLibrary || homeScreen.RecentlyAddedInLibrary;
	if (recentlyAdded && typeof recentlyAdded === 'object') {
		const libraryIds = [];
		for (const [libraryId, value] of Object.entries(recentlyAdded)) {
			const enabled = isEnabledFlag(value?.enabled ?? value?.Enabled);
			if (enabled) libraryIds.push(libraryId);
		}
		if (libraryIds.length > 0) {
			rows.push(buildSection(
				'recentlyAddedInLibrary',
				'Recently Added',
				90,
				{kind: 'recentlyAddedInLibrary', libraryIds, limit: defaultLimit}
			));
		}
	}

	const seasonal = homeScreen.seasonal || homeScreen.Seasonal;
	if (seasonal && typeof seasonal === 'object') {
		const now = new Date();
		for (const [key, value] of Object.entries(seasonal)) {
			if (!value || typeof value !== 'object') continue;
			if (!isEnabledFlag(value.enabled ?? value.Enabled)) continue;
			const startDate = value.startDate || value.StartDate;
			const endDate = value.endDate || value.EndDate;
			if (!isSeasonalActive(now, startDate, endDate)) continue;

			rows.push(buildSection(
				`seasonal:${key}`,
				value.name || value.Name || key,
				toNumber(value.order ?? value.Order, 60),
				{
					kind: 'custom',
					type: value.type || value.Type || 'genre',
					source: value.source || value.Source || '',
					sortBy: value.sortOrder || value.SortOrder || 'Random',
					sortOrderDirection: value.sortOrderDirection || value.SortOrderDirection || 'Ascending',
					includeItemTypes: toStringArray(value.includeItemTypes || value.IncludeItemTypes) || ['Movie'],
					limit: toNumber(value.itemLimit ?? value.ItemLimit, defaultLimit)
				}
			));
		}
	}

	const customSections = homeScreen.customSections || homeScreen.CustomSections;
	if (Array.isArray(customSections)) {
		customSections.forEach((entry, index) => {
			if (!entry || typeof entry !== 'object') return;
			if (!isEnabledFlag(entry.enabled ?? entry.Enabled)) return;
			const type = entry.type || entry.Type || 'genre';
			const source = entry.source || entry.Source || '';
			rows.push(buildSection(
				`custom:${entry.id || entry.Id || `${type}:${source}:${index}`}`,
				entry.name || entry.Name || 'Custom',
				toNumber(entry.order ?? entry.Order, 100 + index),
				{
					kind: 'custom',
					type,
					source,
					sortBy: entry.sortOrder || entry.SortOrder || 'Random',
					sortOrderDirection: entry.sortOrderDirection || entry.SortOrderDirection || 'Ascending',
					includeItemTypes: toStringArray(entry.includeItemTypes || entry.IncludeItemTypes) || ['Movie', 'Series'],
					limit: toNumber(entry.limit ?? entry.itemLimit ?? entry.ItemLimit, defaultLimit)
				}
			));
		});
	}

	rows.sort((left, right) => left.order - right.order);
	return rows;
};

const getPluginVersion = (plugin) => plugin?.Version || plugin?.version || null;

const findKefinPlugin = (plugins) => {
	if (!Array.isArray(plugins)) return null;
	return plugins.find((plugin) => {
		const text = `${plugin?.Name || ''} ${plugin?.name || ''} ${plugin?.Id || ''} ${plugin?.id || ''}`.toLowerCase();
		return text.includes('kefin');
	}) || null;
};

export const probeKefinTweaks = async (api) => {
	let plugins = [];
	let plugin = null;

	try {
		plugins = await api.getInstalledPlugins();
		plugin = findKefinPlugin(plugins);
	} catch (_error) {
		plugin = null;
	}

	let config = null;
	let configError = null;
	try {
		config = await api.getKefinTweaksConfig();
	} catch (error) {
		configError = error;
	}

	const installed = Boolean(plugin || config);
	if (!installed) {
		return {
			installed: false,
			enabled: false,
			version: null,
			sections: [],
			error: null
		};
	}

	if (!config) {
		return {
			installed: true,
			enabled: false,
			version: getPluginVersion(plugin),
			sections: [],
			error: configError
		};
	}

	const homeScreen = config.homeScreen || config.HomeScreen || {};
	const enabled = Boolean(homeScreen.enabled ?? homeScreen.Enabled);
	const sections = enabled ? buildSections(config) : [];

	return {
		installed: true,
		enabled,
		version: getPluginVersion(plugin) || config.version || config.Version || null,
		sections,
		error: null
	};
};

export const kefinSectionToPluginSection = (section, existingSection = null, fallbackOrder = 0) => ({
	id: section.id,
	name: section.displayText,
	enabled: existingSection?.enabled ?? false,
	order: existingSection?.order ?? fallbackOrder,
	source: KEFIN_SOURCE,
	specJson: section.specJson
});

export const KEFIN_TWEAKS_SOURCE = KEFIN_SOURCE;
