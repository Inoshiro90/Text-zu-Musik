// @ts-check
/** Weltregionen für Filter und Metadaten der Tonsystem-Bibliothek. Reihenfolge = Anzeige. IDs sind stabil. */

/** @typedef {{ id:string, name:string }} Region */

/** @type {readonly Region[]} */
export const REGIONS = Object.freeze(
	[
		{id: 'global', name: 'Global'},
		{id: 'europe', name: 'Europa'},
		{id: 'mena', name: 'Westasien und Nordafrika'},
		{id: 'caucasus-central-asia', name: 'Kaukasus und Zentralasien'},
		{id: 'south-asia', name: 'Südasien'},
		{id: 'east-asia', name: 'Ostasien'},
		{id: 'southeast-asia', name: 'Südostasien'},
		{id: 'sub-saharan-africa', name: 'Subsahara-Afrika'},
		{id: 'north-america', name: 'Nordamerika'},
		{id: 'central-america-caribbean', name: 'Mittelamerika und Karibik'},
		{id: 'south-america', name: 'Südamerika'},
		{id: 'oceania', name: 'Ozeanien'},
		{id: 'historical-experimental', name: 'Historisch und experimentell'},
	].map((r) => Object.freeze(r)),
);

const IDS = new Set(REGIONS.map((r) => r.id));

/** @param {string} id */
export const isRegionId = (id) => IDS.has(id);
