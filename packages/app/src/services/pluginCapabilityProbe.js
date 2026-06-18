import * as multiServerManager from './multiServerManager';
import {formatErrorMessage, requestJson} from './pluginHttp';

const HOME_SCREEN_SECTIONS_PLUGIN_GUID = 'b8298e01-2697-407a-b44d-aa8dc795e850';
const DEFAULT_TIMEOUT_MS = 12000;

const readPluginIdentifier = (plugin) => {
	if (!plugin || typeof plugin !== 'object') return '';
	const id = plugin.id || plugin.Id || plugin.guid || plugin.Guid || plugin.assemblyGuid || plugin.AssemblyGuid || '';
	return String(id).toLowerCase();
};

const readPluginVersion = (plugin) => {
	if (!plugin || typeof plugin !== 'object') return null;
	const version = plugin.version || plugin.Version || null;
	return version ? String(version) : null;
};

const normalizeSectionInfo = (item) => {
	if (!item || typeof item !== 'object') return null;
	const section = String(item.Section || item.section || '');
	const displayText = String(item.DisplayText || item.displayText || item.Name || item.name || section);
	const additionalData = item.AdditionalData || item.additionalData || null;
	if (!section && !displayText) return null;
	return {
		section,
		displayText,
		additionalData: additionalData == null ? null : String(additionalData)
	};
};

const parseSectionList = (payload) => {
	const raw = Array.isArray(payload)
		? payload
		: Array.isArray(payload?.Items)
			? payload.Items
			: [];
	return raw
		.map(normalizeSectionInfo)
		.filter((entry) => !!entry);
};

const resolveServerLabel = (server) => {
	const serverName = server.name || server.serverId || 'Server';
	if (!server.username) return serverName;
	return `${serverName} (${server.username})`;
};

const probeHomeScreenSectionsServer = async (server) => {
	const base = {
		serverId: server.serverId,
		serverName: server.name,
		serverLabel: resolveServerLabel(server),
		serverUrl: server.url,
		userId: server.userId,
		username: server.username || null,
		installed: false,
		enabled: false,
		pluginVersion: null,
		sections: [],
		sectionCount: 0,
		available: false,
		lastError: null
	};

	let pluginVersion = null;
	let installedByPluginList = false;

	const plugins = await requestJson({
		serverUrl: server.url,
		endpoint: '/Plugins',
		token: server.accessToken,
		timeoutMs: DEFAULT_TIMEOUT_MS
	}).catch(() => null);
	if (Array.isArray(plugins)) {
		const found = plugins.find((plugin) => readPluginIdentifier(plugin) === HOME_SCREEN_SECTIONS_PLUGIN_GUID);
		if (found) {
			installedByPluginList = true;
			pluginVersion = readPluginVersion(found);
		}
	}

	let meta = null;
	let metaError = null;
	try {
		meta = await requestJson({
			serverUrl: server.url,
			endpoint: '/HomeScreen/Meta',
			token: server.accessToken,
			timeoutMs: DEFAULT_TIMEOUT_MS
		});
	} catch (error) {
		metaError = error;
	}

	if (!installedByPluginList && metaError?.status === 404) {
		return base;
	}

	const installed = installedByPluginList || !!meta;
	const enabled = !!(meta && (meta.Enabled ?? meta.enabled));
	let sections = [];
	let sectionsError = null;

	if (installed && enabled) {
		const query = server.userId ? `?userId=${encodeURIComponent(server.userId)}` : '';
		try {
			const payload = await requestJson({
				serverUrl: server.url,
				endpoint: `/HomeScreen/Sections${query}`,
				token: server.accessToken,
				timeoutMs: DEFAULT_TIMEOUT_MS
			});
			sections = parseSectionList(payload);
		} catch (error) {
			sectionsError = error;
		}
	}

	return {
		...base,
		installed,
		enabled,
		pluginVersion,
		sections,
		sectionCount: sections.length,
		available: installed && enabled,
		lastError: formatErrorMessage(sectionsError || (metaError?.status === 404 ? null : metaError))
	};
};

const compareByServer = (a, b) => {
	const serverNameA = (a.serverName || '').toLowerCase();
	const serverNameB = (b.serverName || '').toLowerCase();
	if (serverNameA !== serverNameB) return serverNameA.localeCompare(serverNameB);
	const userA = (a.username || '').toLowerCase();
	const userB = (b.username || '').toLowerCase();
	return userA.localeCompare(userB);
};

const getServerSessions = async () => {
	const servers = await multiServerManager.getAllServersArray();
	if (!Array.isArray(servers)) return [];
	return servers.filter((server) => !!(server?.url && server?.accessToken));
};

export const probeHomeScreenSectionsCapabilities = async () => {
	const sessions = await getServerSessions();
	if (sessions.length === 0) return [];
	const capabilities = await Promise.all(sessions.map((server) => probeHomeScreenSectionsServer(server)));
	return capabilities.sort(compareByServer);
};
