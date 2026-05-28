const HSS_SOURCE = 'hss';

const findHssPlugin = (plugins) => {
	if (!Array.isArray(plugins)) return null;
	return plugins.find((plugin) => {
		const text = `${plugin?.Name || ''} ${plugin?.name || ''} ${plugin?.Id || ''} ${plugin?.id || ''}`.toLowerCase();
		return text.includes('home screen sections') || text.includes('homescreensections');
	}) || null;
};

const extractSections = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (payload && Array.isArray(payload.Items)) return payload.Items;
	if (payload && Array.isArray(payload.items)) return payload.items;
	return [];
};

const normalizeIdPart = (value, fallback = 'section') => {
	if (value === undefined || value === null) return fallback;
	const normalized = String(value)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized || fallback;
};

const normalizeSection = (section, index) => {
	const sectionType = section?.Section || section?.section || section?.Id || section?.id || section?.SectionId || section?.sectionId || `Section${index + 1}`;
	const additionalData = section?.AdditionalData || section?.additionalData || '';
	const id = `hss:${normalizeIdPart(sectionType, `section-${index + 1}`)}:${normalizeIdPart(additionalData, 'default')}`;
	const displayText = section?.DisplayText || section?.displayText || section?.Name || section?.name || `Section ${index + 1}`;
	const order = Number(section?.OrderIndex ?? section?.orderIndex ?? section?.Order ?? section?.order);
	const limit = Number(section?.Limit ?? section?.limit);
	const viewMode = section?.ViewMode || section?.viewMode || 'Landscape';

	return {
		id,
		displayText,
		order: Number.isFinite(order) ? order : index,
		specJson: JSON.stringify({
			kind: 'hssSection',
			sectionType: String(sectionType),
			additionalData: additionalData ? String(additionalData) : '',
			viewMode: String(viewMode),
			limit: Number.isFinite(limit) ? limit : undefined,
			section
		}),
		source: HSS_SOURCE
	};
};

const getPluginVersion = (plugin) => plugin?.Version || plugin?.version || null;

const isNotInstalledError = (error) => {
	return Boolean(error && (error.status === 404 || error.message === 'API Error: 404'));
};

export const probeHomeScreenSections = async (api) => {
	let plugins = [];
	let plugin = null;
	try {
		plugins = await api.getInstalledPlugins();
		plugin = findHssPlugin(plugins);
	} catch (_error) {
		plugin = null;
	}

	let meta = null;
	let metaError = null;
	try {
		meta = await api.getHomeScreenMeta();
	} catch (error) {
		metaError = error;
	}

	let sections = [];
	let sectionsError = null;
	let sectionsPayload = null;
	const enabledFromMeta = meta?.enabled ?? meta?.Enabled;
	const shouldFetchSections = enabledFromMeta !== false;
	if (shouldFetchSections) {
		try {
			sectionsPayload = await api.getHomeScreenSections();
			sections = extractSections(sectionsPayload)
				.map((section, index) => normalizeSection(section, index))
				.sort((left, right) => left.order - right.order);
		} catch (error) {
			sectionsError = error;
		}
	}

	const metaNotInstalled = isNotInstalledError(metaError);
	const sectionsNotInstalled = isNotInstalledError(sectionsError);
	const installed = Boolean(plugin || meta || sectionsPayload) && !(metaNotInstalled && sectionsNotInstalled);
	if (!installed) {
		return {
			installed: false,
			enabled: false,
			version: null,
			sections: [],
			error: null
		};
	}

	const enabled = enabledFromMeta === undefined || enabledFromMeta === null
		? Boolean(sectionsPayload)
		: Boolean(enabledFromMeta);

	const effectiveError = sectionsError && !sectionsNotInstalled
		? sectionsError
		: (metaError && !metaNotInstalled ? metaError : null);

	return {
		installed: true,
		enabled,
		version: getPluginVersion(plugin) || meta?.version || meta?.Version || null,
		sections,
		error: effectiveError
	};
};

export const hssSectionToPluginSection = (section, existingSection = null, fallbackOrder = 0) => ({
	id: section.id,
	name: section.displayText,
	enabled: existingSection?.enabled ?? false,
	order: existingSection?.order ?? fallbackOrder,
	source: HSS_SOURCE,
	specJson: section.specJson
});

export const HOME_SCREEN_SECTIONS_SOURCE = HSS_SOURCE;
