// @ts-check
/** Konfigurationsobjekt, Defaults, Validierung und Schlüssel für die selektive Neuberechnung. */
import { mappingKey, validateMapping } from './mapping.js';
import { MAX_TRACKS, normalizeTrack, validateTrack } from './tracks.js';

export const PPQ = 480;
export const LIMITS = Object.freeze({ maxChars: 50000, warnChars: 10000, initialRows: 2000 });
/** Schrittweite der Dauer-Eingaben: 0,125 Beat = 60 Ticks. */
export const TICK_STEP = PPQ / 8;
export const RANGES = Object.freeze({
  noteTicks: [60, 960], // 0,125–2 Beats
  pauseTicks: [0, 3840], // 0–8 Beats
  tempoBpm: [20, 300],
});

/**
 * @typedef {{ mode:'A'|'A2'|'B', scaleId:string, root:number, lo:number, hi:number,
 *   noteTicks:number, wordPauseTicks:number, sentencePauseTicks:number, paragraphPauseTicks:number,
 *   paragraphPause:boolean, normalizeNfc:boolean, tempoBpm:number, tracks?:readonly import('./tracks.js').TrackConfig[] }} Config
 */

/** @type {Readonly<Config>} */
export const DEFAULT_CONFIG = Object.freeze({
  mode: 'B', scaleId: 'dur', root: 0, lo: 60, hi: 84,
  noteTicks: 240, wordPauseTicks: 120, sentencePauseTicks: 720, paragraphPauseTicks: 1440,
  paragraphPause: true, normalizeNfc: true, tempoBpm: 120,
});

/** Beats → Ticks; NaN, wenn der Wert keine ganze Tickzahl ergibt (kein stilles Runden). @param {number} beats */
export function beatsToTicks(beats) {
  const t = beats * PPQ;
  return Number.isFinite(t) && Math.abs(t - Math.round(t)) < 1e-9 ? Math.round(t) : NaN;
}

/** Ticks → Beats (nur Anzeige). @param {number} ticks */
export function ticksToBeats(ticks) {
  return ticks / PPQ;
}

/**
 * @typedef {{ ok:boolean, errors:Record<string,string>, warnings:string[], config:Readonly<Config>|null,
 *   noteCount:number|null, trackWarnings:Record<string,string[]> }} Validation
 */

/** Implizite Standardspur aus den (Legacy-)Mapping-Feldern der Konfiguration. @param {Config} c */
function implicitTrack(c) {
  return normalizeTrack({ id: 'track-1', name: 'Spur 1', mapping: { mode: c.mode, scaleId: c.scaleId, root: c.root, lo: c.lo, hi: c.hi } }, 0);
}

/**
 * Prüft die Konfiguration. Ohne `tracks` gilt das Einzelspur-Verhalten: die Mapping-Felder der Konfiguration beschreiben
 * eine implizite Spur „track-1“. Mit `tracks` besitzt jede Spur ihr eigenes Mapping; Fehlerschlüssel `tracks.<id>.<feld>`.
 * @param {Partial<Config>} input
 * @returns {Validation}
 */
export function validateConfig(input) {
  const c = /** @type {Config} */ ({ ...DEFAULT_CONFIG, ...input });
  /** @type {Record<string,string>} */
  const errors = {};
  /** @type {string[]} */
  const warnings = [];
  /** @type {Record<string,string[]>} */
  const trackWarnings = {};
  let noteCount = null;

  if (typeof c.normalizeNfc !== 'boolean') errors.normalizeNfc = 'Ja/Nein erwartet.';
  /** @type {import('./tracks.js').TrackConfig[]} */
  let tracks;
  if (Array.isArray(input.tracks)) {
    tracks = input.tracks.map((t, i) => normalizeTrack(/** @type {any} */ (t), i));
    if (tracks.length > MAX_TRACKS) errors.tracks = `Höchstens ${MAX_TRACKS} Spuren.`;
    const seen = new Set();
    tracks.forEach((t, i) => {
      const key = (/** @type {string} */ f) => `tracks.${t.id}.${f}`;
      if (typeof t.id !== 'string' || t.id === '') { errors[`tracks.#${i}.id`] = 'Jede Spur braucht eine ID.'; return; }
      if (seen.has(t.id)) { errors[key('id')] = `Doppelte Spur-ID „${t.id}“.`; return; }
      seen.add(t.id);
      const v = validateTrack(t, { normalizeNfc: c.normalizeNfc !== false });
      for (const [f, msg] of Object.entries(v.errors)) errors[key(f)] = msg;
      trackWarnings[t.id] = v.warnings;
      for (const w of v.warnings) warnings.push(`${t.name}: ${w}`);
      if (i === 0) noteCount = v.noteCount;
    });
  } else {
    const v = validateMapping(c);
    Object.assign(errors, v.errors);
    warnings.push(...v.warnings);
    noteCount = v.noteCount;
    tracks = [implicitTrack(c)];
  }

  /** @param {keyof Config} key @param {number} lo @param {number} hi @param {string} label */
  const checkTicks = (key, lo, hi, label) => {
    const v = c[key];
    if (typeof v !== 'number' || !Number.isInteger(v)) errors[key] = `${label}: kein ganzzahliger Tickwert (480 Ticks = 1 Beat, Schrittweite 0,125 Beat).`;
    else if (v < lo || v > hi) errors[key] = `${label}: erlaubt sind ${lo / PPQ} bis ${hi / PPQ} Beats.`;
  };
  checkTicks('noteTicks', RANGES.noteTicks[0], RANGES.noteTicks[1], 'Notendauer');
  checkTicks('wordPauseTicks', RANGES.pauseTicks[0], RANGES.pauseTicks[1], 'Wortpause');
  checkTicks('sentencePauseTicks', RANGES.pauseTicks[0], RANGES.pauseTicks[1], 'Satzpause');
  checkTicks('paragraphPauseTicks', RANGES.pauseTicks[0], RANGES.pauseTicks[1], 'Absatzpause');

  if (typeof c.tempoBpm !== 'number' || !Number.isFinite(c.tempoBpm) || c.tempoBpm < RANGES.tempoBpm[0] || c.tempoBpm > RANGES.tempoBpm[1]) {
    errors.tempoBpm = `Tempo: ${RANGES.tempoBpm[0]} bis ${RANGES.tempoBpm[1]} BPM.`;
  }
  if (typeof c.paragraphPause !== 'boolean') errors.paragraphPause = 'Ja/Nein erwartet.';

  const ok = Object.keys(errors).length === 0;
  const config = ok ? Object.freeze({ ...c, tracks: Object.freeze(tracks.map((t) => Object.freeze({ ...t, rule: Object.freeze(t.rule), mapping: Object.freeze(t.mapping), instrument: Object.freeze(t.instrument) }))) }) : null;
  return { ok, errors, warnings, config, noteCount, trackWarnings };
}

/* Schlüssel je Stufe: gleiche Schlüssel → Stufe kann wiederverwendet werden. */
/** @param {Config} c */
export const textKey = (c) => (c.normalizeNfc ? 'nfc' : 'raw');
/** @param {Config} c */
export const structKey = (c) => (c.paragraphPause ? 'para' : 'nopara');
/** @param {Config} c */
export const mapKey = (c) => mappingKey(c);
/** @param {Config} c */
export const timeKey = (c) => [c.noteTicks, c.wordPauseTicks, c.sentencePauseTicks, c.paragraphPauseTicks].join('|');
