// @ts-check
/**
 * Katalogfunktionen für die Tonleiterauswahl: Familien, Bezeichnungen, Suche und Filter, Materialgleichheit.
 * Reine Funktionen ohne DOM (die Oberfläche liegt in ui/tracks-view.js).
 */
import { allTonalSystems, getTonalSystem } from './library.js';
import { REGIONS } from './regions.js';
import { getSource } from './sources.js';
import { sameMaterial } from './schema.js';
import { MELAKARTA_FAMILIES } from './melakarta.js';

/** @typedef {import('./schema.js').TonalSystem} TonalSystem */

/** Familien in Anzeigereihenfolge (Optgroups). Unbekannte Familien erscheinen am Ende unter ihrer ID. */
export const FAMILIES = Object.freeze([
  { id: 'diatonic', name: 'Dur, Moll und diatonische Modi' },
  { id: 'minor-variants', name: 'Moll-Varianten' },
  { id: 'pentatonic-anhemitonic', name: 'Pentatonik' },
  { id: 'european-lexicon', name: 'Europäische Lexikon-Skalen' },
  { id: 'jewish-modes', name: 'Jüdische Gebetsmodi (vereinfacht)' },
  { id: 'blues', name: 'Blues' },
  { id: 'melodic-minor-modes', name: 'Modi von melodisch Moll (Jazz)' },
  { id: 'symmetric', name: 'Symmetrische Skalen' },
  { id: 'cn-pentatonic', name: 'Chinesische Modi (diao)' },
  { id: 'jp-scales', name: 'Japanische Skalen' },
  { id: 'thaat', name: 'Hindustani-Thaats' },
  { id: 'raga', name: 'Ragas (Tonvorrat, vereinfacht)' },
  { id: 'korean', name: 'Koreanische Modi (vereinfacht)' },
  { id: 'maqam-arab', name: 'Arabische Maqamat (mikrotonal)' },
  { id: 'makam-turkish', name: 'Türkische Makamlar (53-Komma, mikrotonal)' },
  { id: 'gamelan', name: 'Gamelan: Stimmungen und Pathet (mikrotonal)' },
  { id: 'southeast-asia-tunings', name: 'Südostasiatische Tonsysteme (mikrotonal)' },
  { id: 'africa-tunings', name: 'Afrikanische Tonsysteme (mikrotonal)' },
  { id: 'oceania-tunings', name: 'Ozeanische Tonsysteme (mikrotonal)' },
  { id: 'instrument-tunings', name: 'Instrumentenstimmungen (mikrotonal)' },
  { id: 'historical-tunings', name: 'Antike und historische Stimmungen' },
  { id: 'equal-divisions', name: 'Gleichstufige Teilungen und Bohlen-Pierce' },
  ...MELAKARTA_FAMILIES,
  { id: 'chromatic', name: 'Chromatisch' },
  { id: 'user', name: 'Eigene Tonleitern (Scala-Import, nur diese Sitzung)' },
].map((f) => Object.freeze({ ...f })));

/** @type {Readonly<Record<import('./schema.js').TonalKind, string>>} */
export const KIND_LABELS = Object.freeze({
  scale: 'Skala', mode: 'Modus', material: 'Tonmaterial', classification: 'Klassifikation',
  'modal-reference': 'Modale Referenzfassung', tuning: 'Stimmung',
});

/** @type {Readonly<Record<import('./schema.js').Evidence, string>>} */
export const EVIDENCE_LABELS = Object.freeze({
  A: 'A – fachlich gut belegt',
  B: 'B – verbreitet, mit Varianten oder nur aus Nachschlagewerken',
  C: 'C – vereinfachte Referenzfassung',
});

const FAMILY_ORDER = new Map(FAMILIES.map((f, i) => [f.id, i]));
const REGION_NAME = new Map(REGIONS.map((r) => [r.id, r.name]));

/** @param {string} id */
export const familyName = (id) => FAMILIES.find((f) => f.id === id)?.name ?? id;
/** @param {string} id */
export const regionName = (id) => REGION_NAME.get(id) ?? id;

/** Ist der Eintrag eine vereinfachte Fassung (Kennzeichnung in der Oberfläche)? @param {TonalSystem} s */
export const isSimplified = (s) => s.kind === 'modal-reference' || s.evidence === 'C';
/** @param {TonalSystem} s */
export const isMicrotonal = (s) => s.pitch.unit === 'cents';

/** Suchnormalisierung: klein, ohne diakritische Zeichen, Sonderzeichen ♭/♯ lesbar. @param {string} v */
export function normalizeSearch(v) {
  return String(v ?? '')
    .replace(/♭/g, 'b').replace(/♯/g, '#').replace(/♮/g, '')
    .normalize('NFKD').replace(/\p{M}+/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase().trim();
}

/** Alle durchsuchbaren Texte eines Eintrags. @param {TonalSystem} s */
function haystack(s) {
  return [s.id, s.name, s.tradition, ...(s.aliases ?? []), ...(s.original ?? []).flatMap((o) => [o.text, o.romanization ?? ''])]
    .map(normalizeSearch);
}

/**
 * Filtert die Bibliothek. Alle Wörter der Suche müssen vorkommen (in irgendeinem Feld). Reihenfolge: Familie, dann Bibliothek.
 * @param {{ region?:string, kind?:string, query?:string }} f  region/kind: '' oder 'alle' = kein Filter
 * @param {readonly TonalSystem[]} [systems]
 * @returns {TonalSystem[]}
 */
export function searchSystems({ region = '', kind = '', query = '' } = {}, systems = allTonalSystems()) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const anyRegion = region === '' || region === 'alle';
  const anyKind = kind === '' || kind === 'alle';
  const hits = systems.filter((s) => {
    if (!anyRegion && !s.region.includes(region)) return false;
    if (!anyKind && s.kind !== kind) return false;
    if (words.length === 0) return true;
    const hay = haystack(s);
    return words.every((w) => hay.some((h) => h.includes(w)));
  });
  const idx = new Map(systems.map((s, i) => [s.id, i]));
  return hits.sort((a, b) => (FAMILY_ORDER.get(a.family) ?? 99) - (FAMILY_ORDER.get(b.family) ?? 99) || (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));
}

/**
 * Gruppiert (bereits sortierte) Einträge nach Familie.
 * @param {readonly TonalSystem[]} list
 * @returns {{ family:string, name:string, systems:TonalSystem[] }[]}
 */
export function groupByFamily(list) {
  /** @type {Map<string, TonalSystem[]>} */ const m = new Map();
  for (const s of list) { const g = m.get(s.family); if (g) g.push(s); else m.set(s.family, [s]); }
  return [...m].map(([family, systems]) => ({ family, name: familyName(family), systems }));
}

/** Regionen und Typen, die in der Bibliothek tatsächlich vorkommen (für die Filter). @param {readonly TonalSystem[]} [systems] */
export function availableFilters(systems = allTonalSystems()) {
  const regions = REGIONS.filter((r) => systems.some((s) => s.region.includes(r.id)));
  const kinds = /** @type {(keyof typeof KIND_LABELS)[]} */ (Object.keys(KIND_LABELS)).filter((k) => systems.some((s) => s.kind === k));
  return { regions, kinds: kinds.map((k) => ({ id: k, name: KIND_LABELS[k] })) };
}

/** Alle anderen Einträge mit gleichem Tonmaterial (Rotation), unabhängig von expliziten Verweisen. @param {string} id */
export function materialSiblings(id, systems = allTonalSystems()) {
  const s = getTonalSystem(id) ?? systems.find((x) => x.id === id);
  if (!s) return [];
  return systems.filter((o) => o.id !== s.id && sameMaterial(o.pitch, s.pitch));
}

/** Quellen eines Eintrags (aufgelöst; unbekannte IDs fallen weg). @param {TonalSystem} s */
export const sourcesOf = (s) => s.sources.map(getSource).filter((x) => x !== undefined);

/** Intervallfolge zwischen benachbarten Stufen inkl. Rückkehr zur Periode, z. B. „2-2-1-2-2-2-1“. @param {TonalSystem} s */
export function stepPattern(s) {
  const p = s.pitch;
  const period = p.unit === 'semitones' ? 12 : (p.period ?? 1200);
  const st = p.steps;
  return st.map((v, i) => +(((i + 1 < st.length ? st[i + 1] : period) - v)).toFixed(3)).join('-');
}
