// @ts-check
/**
 * Datenmodell und Prüfung der Tonsystem-Bibliothek (Bericht Phase 1, Abschnitt 10).
 *
 * Pflichtfelder: id, name, region, tradition, sources, evidence, family, kind, pitch.
 * Optional: aliases, original, parent, sameMaterialAs, rules, notes.
 * Typabhängig: pitch.unit 'semitones' (12-TET, ganze Zahlen 0–11) oder 'cents' (mit optionaler period, Default 1200);
 *   pitch.descending (Abstiegsform, gleiche Einheit); pitch.fallback12 nur bei 'cents'.
 * Belegstatus: 'A' = fachlich gut belegt, 'B' = verbreitet mit Varianten bzw. nur Lexikon-Quellen,
 *   'C' = vereinfachte Referenzfassung (muss in der UI so gekennzeichnet werden).
 *
 * @typedef {'scale'|'mode'|'material'|'classification'|'modal-reference'|'tuning'} TonalKind
 * @typedef {'A'|'B'|'C'} Evidence
 * @typedef {{ unit:'semitones', steps:readonly number[], descending?:readonly number[] }} SemitonePitch
 * @typedef {{ unit:'cents', steps:readonly number[], descending?:readonly number[], period?:number, fallback12?:readonly number[] }} CentPitch
 * @typedef {SemitonePitch|CentPitch} Pitch
 * @typedef {{ center?:number, predominant?:readonly number[], avoid?:readonly number[], cadence?:readonly number[], phrases?:readonly string[] }} ModalRules
 *   Stufenindizes (0 = erste Stufe). In Phase A–C nur Anzeige, ohne Wirkung auf das Mapping.
 * @typedef {{ text:string, lang:string, romanization?:string }} OriginalName
 * @typedef {{
 *   id:string, name:string, aliases?:readonly string[], original?:readonly OriginalName[],
 *   region:readonly string[], tradition:string, sources:readonly string[], evidence:Evidence,
 *   family:string, kind:TonalKind, parent?:string, sameMaterialAs?:string,
 *   pitch:Pitch, rules?:ModalRules, notes?:string
 * }} TonalSystem
 */

export const KINDS = Object.freeze(/** @type {const} */ (['scale', 'mode', 'material', 'classification', 'modal-reference', 'tuning']));
export const EVIDENCE = Object.freeze(/** @type {const} */ (['A', 'B', 'C']));
export const DEFAULT_PERIOD = 1200;
export const PERIOD_RANGE = Object.freeze(/** @type {const} */ ([100, 4800]));
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @param {unknown} v */
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/** Periode eines Tonsystems in Cent. @param {Pitch} p */
export const periodOf = (p) => (p.unit === 'cents' ? (p.period ?? DEFAULT_PERIOD) : DEFAULT_PERIOD);

/** Stufen in Cent relativ zum Grundton. @param {readonly number[]} steps @param {Pitch['unit']} unit */
export const stepsToCents = (steps, unit) => steps.map((s) => (unit === 'semitones' ? s * 100 : s));

/**
 * Prüft eine Stufenliste (aufsteigende oder absteigende Form, jeweils als aufsteigende Menge ab 0 notiert).
 * @param {unknown} steps @param {Pitch['unit']} unit @param {number} period @param {string} label @param {string[]} out
 */
function checkSteps(steps, unit, period, label, out) {
  if (!Array.isArray(steps) || steps.length === 0) { out.push(`${label}: nicht leere Liste erwartet`); return; }
  if (steps[0] !== 0) out.push(`${label}: erste Stufe muss 0 sein`);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (typeof s !== 'number' || !Number.isFinite(s)) { out.push(`${label}[${i}]: keine Zahl`); continue; }
    if (unit === 'semitones' && (!Number.isInteger(s) || s < 0 || s > 11)) out.push(`${label}[${i}]: ganze Zahl 0–11 erwartet (Halbtöne)`);
    if (unit === 'cents' && (s < 0 || s >= period)) out.push(`${label}[${i}]: Cent-Wert muss in [0, ${period}) liegen`);
    if (i > 0 && typeof steps[i - 1] === 'number' && s <= steps[i - 1]) out.push(`${label}: Stufen müssen streng aufsteigend sein (Index ${i})`);
  }
}

/**
 * Prüft einen einzelnen Eintrag (ohne Querverweise). Gibt Problembeschreibungen zurück (leer = gültig).
 * @param {any} e
 * @param {{ isSourceId:(id:string)=>boolean, isRegionId:(id:string)=>boolean }} lookups
 * @returns {string[]}
 */
export function validateSystem(e, { isSourceId, isRegionId }) {
  /** @type {string[]} */ const p = [];
  const id = typeof e?.id === 'string' ? e.id : '?';
  const add = (/** @type {string} */ m) => p.push(`${id}: ${m}`);
  if (!e || typeof e !== 'object') return ['Eintrag ist kein Objekt'];
  if (!isNonEmptyString(e.id) || !ID_RE.test(e.id)) add('id fehlt oder ist nicht kebab-case (a–z, 0–9, Bindestrich)');
  if (!isNonEmptyString(e.name)) add('name fehlt');
  if (!isNonEmptyString(e.tradition)) add('tradition fehlt');
  if (!isNonEmptyString(e.family)) add('family fehlt');
  if (!KINDS.includes(e.kind)) add(`kind ungültig (${KINDS.join(', ')})`);
  if (!EVIDENCE.includes(e.evidence)) add('evidence muss A, B oder C sein');
  if (!Array.isArray(e.region) || e.region.length === 0) add('region: mindestens eine Region');
  else for (const r of e.region) if (!isRegionId(r)) add(`unbekannte Region „${r}“`);
  if (!Array.isArray(e.sources) || e.sources.length === 0) add('sources: mindestens eine Quelle');
  else for (const s of e.sources) if (!isSourceId(s)) add(`unbekannte Quelle „${s}“`);
  if (e.aliases !== undefined && (!Array.isArray(e.aliases) || !e.aliases.every(isNonEmptyString))) add('aliases: Liste nicht leerer Texte erwartet');
  if (e.original !== undefined && (!Array.isArray(e.original) || !e.original.every((/** @type {any} */ o) => isNonEmptyString(o?.text) && isNonEmptyString(o?.lang)))) add('original: Einträge brauchen text und lang');
  if (e.kind === 'modal-reference' && e.evidence !== 'C' && !isNonEmptyString(e.notes)) add('modal-reference braucht notes (was die Vereinfachung weglässt)');

  const pitch = e.pitch;
  if (!pitch || (pitch.unit !== 'semitones' && pitch.unit !== 'cents')) { add("pitch.unit muss 'semitones' oder 'cents' sein"); return p; }
  let period = DEFAULT_PERIOD;
  if (pitch.unit === 'cents') {
    if (pitch.period !== undefined) {
      if (typeof pitch.period !== 'number' || !Number.isFinite(pitch.period) || pitch.period < PERIOD_RANGE[0] || pitch.period > PERIOD_RANGE[1]) add(`pitch.period muss zwischen ${PERIOD_RANGE[0]} und ${PERIOD_RANGE[1]} Cent liegen`);
      else period = pitch.period;
    }
    if (pitch.fallback12 !== undefined) {
      checkSteps(pitch.fallback12, 'semitones', DEFAULT_PERIOD, `${id}: pitch.fallback12`, p);
      if (!isNonEmptyString(e.notes)) add('fallback12 muss in notes begründet werden');
    }
  } else {
    if (pitch.period !== undefined) add("pitch.period nur bei unit 'cents'");
    if (pitch.fallback12 !== undefined) add("pitch.fallback12 nur bei unit 'cents'");
  }
  checkSteps(pitch.steps, pitch.unit, period, `${id}: pitch.steps`, p);
  if (pitch.descending !== undefined) checkSteps(pitch.descending, pitch.unit, period, `${id}: pitch.descending`, p);

  if (e.rules !== undefined) {
    const n = Array.isArray(pitch.steps) ? pitch.steps.length : 0;
    const idx = (/** @type {unknown} */ v) => Number.isInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) < n;
    const r = e.rules;
    if (r.center !== undefined && !idx(r.center)) add('rules.center: gültiger Stufenindex erwartet');
    for (const k of ['predominant', 'avoid', 'cadence']) {
      if (r[k] !== undefined && (!Array.isArray(r[k]) || !r[k].every(idx))) add(`rules.${k}: Liste gültiger Stufenindizes erwartet`);
    }
  }
  return p;
}

/**
 * Rotationsinvariante Materialgleichheit: Zwei Systeme haben dasselbe Tonmaterial, wenn eine Rotation (Modus) des einen
 * die Stufenmenge des anderen ergibt. Nur für gleiche Einheit und Periode definiert.
 * @param {Pitch} a @param {Pitch} b
 */
export function sameMaterial(a, b) {
  if (a.unit !== b.unit || periodOf(a) !== periodOf(b) || a.steps.length !== b.steps.length) return false;
  const P = a.unit === 'semitones' ? 12 : periodOf(a);
  const target = b.steps.join(',');
  for (const r of a.steps) {
    const rot = a.steps.map((s) => (((s - r) % P) + P) % P).sort((x, y) => x - y);
    if (rot.join(',') === target) return true;
  }
  return false;
}

/**
 * Prüft die ganze Bibliothek: Einzelprüfung, eindeutige IDs, eindeutige Aliase/Namen gegenüber IDs, Querverweise.
 * @param {readonly any[]} systems
 * @param {{ isSourceId:(id:string)=>boolean, isRegionId:(id:string)=>boolean }} lookups
 * @returns {string[]}
 */
export function validateLibrary(systems, lookups) {
  /** @type {string[]} */ const p = [];
  /** @type {Map<string, any>} */ const byId = new Map();
  for (const e of systems) {
    p.push(...validateSystem(e, lookups));
    if (typeof e?.id === 'string') {
      if (byId.has(e.id)) p.push(`Doppelte ID „${e.id}“`);
      else byId.set(e.id, e);
    }
  }
  for (const e of systems) {
    if (!e || typeof e !== 'object') continue;
    for (const a of e.aliases ?? []) if (byId.has(a) && a !== e.id) p.push(`${e.id}: Alias „${a}“ kollidiert mit einer ID`);
    for (const k of ['parent', 'sameMaterialAs']) {
      const ref = e[k];
      if (ref === undefined) continue;
      if (ref === e.id) p.push(`${e.id}: ${k} verweist auf sich selbst`);
      else if (!byId.has(ref)) p.push(`${e.id}: ${k} verweist auf unbekannte ID „${ref}“`);
      else if (e.pitch && byId.get(ref).pitch && !sameMaterial(e.pitch, byId.get(ref).pitch)) p.push(`${e.id}: ${k} „${ref}“ hat kein gleiches Tonmaterial`);
    }
  }
  return p;
}
