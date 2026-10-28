// @ts-check
/**
 * Stufe 4a: Byte → MIDI-Ton. Die einzige Stelle mit Mapping-Logik (Modi A, A2, B).
 * @typedef {{ mode:'A'|'A2'|'B', n:number, index:number, text:string }} Explain
 * @typedef {{ midi:number, name:string, explain:Explain, cents?:number }} MappedNote
 *   cents: Abweichung von der MIDI-Taste (nur vorhanden, wenn ≠ 0; Phase E).
 */
import { buildPitchList, getTonalSystem, isTwelveTone, hasDescending, hasApplicableRules, pitchLabel, noteName } from './scales.js';

/** Optionen der Tonleiter-Zuordnung (Modus B). Fehlende Felder = Standard = bisheriges Verhalten. */
export const DIRECTIONS = Object.freeze(/** @type {const} */ (['set', 'contour']));
export const RULE_MODES = Object.freeze(/** @type {const} */ (['off', 'apply']));
export const MICROTONAL_MODES = Object.freeze(/** @type {const} */ (['bend', 'nearest']));

/** @param {{ microtonal?:string }} m @returns {'bend'|'nearest'} */
const microMode = (m) => (m.microtonal === 'nearest' ? 'nearest' : 'bend');

/** @param {{ direction?:string }} m */
const wantsContour = (m) => m.direction === 'contour';
/** @param {{ rules?:string }} m */
const wantsRules = (m) => m.rules === 'apply';

/**
 * Erzeugt eine Tabelle für alle 256 Bytewerte. Erwartet eine validierte Konfiguration.
 * @param {import('./config.js').Config} cfg
 * Modus B mit direction 'contour' und vorhandener Abstiegsform liefert zusätzlich `tableDown` (Abstiegsliste); welche der
 * beiden Tabellen eine Note nutzt, entscheidet buildTrackEvents anhand der vorherigen Note derselben Spur.
 * noteList/noteListDown: MIDI-Nummern; pitchList/pitchListDown: dieselben Töne mit Cent-Abweichung (Modus B).
 * @returns {{ table:readonly MappedNote[], noteList:readonly number[]|null, n:number,
 *   tableDown:readonly MappedNote[]|null, noteListDown:readonly number[]|null, nDown:number,
 *   pitchList:readonly import('./scales.js').ResolvedPitch[]|null, pitchListDown:readonly import('./scales.js').ResolvedPitch[]|null }}
 */
export function createMapping(cfg) {
  /** @type {(b:number)=>{ midi:number, cents?:number, explain:Explain }} */
  let fn;
  /** @type {number[]|null} */
  let noteList = null;
  /** @type {import('./scales.js').ResolvedPitch[]|null} */
  let pitchList = null;
  /** @type {number} */
  let n = 0;
  if (cfg.mode === 'A') {
    n = 128;
    fn = (b) => {
      const m = b % 128;
      return { midi: m, explain: { mode: 'A', n, index: m, text: `${b} mod 128 = ${m} → MIDI ${m}` } };
    };
  } else if (cfg.mode === 'A2') {
    n = cfg.hi - cfg.lo + 1;
    fn = (b) => {
      const i = b % n;
      const m = cfg.lo + i;
      return { midi: m, explain: { mode: 'A2', n, index: i, text: `n = ${cfg.hi} − ${cfg.lo} + 1 = ${n}; ${b} mod ${n} = ${i} → ${cfg.lo} + ${i} = ${m}` } };
    };
  } else {
    const applyRules = wantsRules(cfg) && hasApplicableRules(cfg.scaleId);
    const base = { scaleId: cfg.scaleId, root: cfg.root, lo: cfg.lo, hi: cfg.hi, applyRules, microtonal: microMode(cfg) };
    pitchList = buildPitchList({ ...base, direction: 'up' });
    noteList = pitchList.map((p) => p.midi);
    n = pitchList.length;
    if (n === 0) throw new Error('Leere Notenliste (Konfiguration nicht validiert).');
    fn = listFn(pitchList, 'Liste');
    if (wantsContour(cfg) && hasDescending(cfg.scaleId)) {
      const down = buildPitchList({ ...base, direction: 'down' });
      if (down.length === 0) throw new Error('Leere Abstiegsliste (Konfiguration nicht validiert).');
      const tableDown = buildTable(listFn(down, 'Abstiegsliste'));
      return { table: buildTable(fn), noteList: Object.freeze(noteList), n, tableDown, noteListDown: Object.freeze(down.map((p) => p.midi)), nDown: down.length, pitchList: Object.freeze(pitchList), pitchListDown: Object.freeze(down) };
    }
  }
  return { table: buildTable(fn), noteList: noteList && Object.freeze(noteList), n, tableDown: null, noteListDown: null, nDown: 0, pitchList: pitchList && Object.freeze(pitchList), pitchListDown: null };
}

/**
 * Byte → Index in einer Notenliste (Modus B).
 * @param {readonly import('./scales.js').ResolvedPitch[]} list @param {string} label
 * @returns {(b:number)=>{ midi:number, cents?:number, explain:Explain }}
 */
function listFn(list, label) {
  const n = list.length;
  return (b) => {
    const i = b % n;
    const { midi, cents } = list[i];
    return { midi, ...(cents ? { cents } : {}), explain: { mode: 'B', n, index: i, text: `${b} mod ${n} = ${i} → ${label}[${i}] = ${pitchLabel(midi, cents)}` } };
  };
}

/** Tabelle für alle 256 Bytewerte. @param {(b:number)=>{ midi:number, cents?:number, explain:Explain }} fn @returns {readonly MappedNote[]} */
function buildTable(fn) {
  const table = [];
  for (let b = 0; b < 256; b++) {
    const r = fn(b);
    table.push(Object.freeze({ midi: r.midi, name: noteName(r.midi), explain: Object.freeze(r.explain), ...(r.cents ? { cents: r.cents } : {}) }));
  }
  return Object.freeze(table);
}

/**
 * Tonhöhen-Mapping-Einstellungen (einer Spur bzw. der Legacy-Einzelspur) prüfen. Einzige Validierung dafür.
 * Felder, die im gewählten Modus keine Rolle spielen, werden nicht geprüft.
 * @param {{ mode:string, scaleId:string, root:number, lo:number, hi:number, direction?:string, rules?:string, microtonal?:string }} m
 * @returns {{ errors:Record<string,string>, warnings:string[], noteCount:number|null }}
 */
export function validateMapping(m) {
  /** @type {Record<string,string>} */
  const errors = {};
  /** @type {string[]} */
  const warnings = [];
  let noteCount = null;
  const isInt = (/** @type {unknown} */ v) => typeof v === 'number' && Number.isInteger(v);
  if (!['A', 'A2', 'B'].includes(m.mode)) errors.mode = 'Unbekannter Mapping-Modus.';
  if (m.mode === 'A2' || m.mode === 'B') {
    if (!isInt(m.lo) || m.lo < 0 || m.lo > 127) errors.lo = 'Untergrenze: ganze Zahl von 0 bis 127.';
    if (!isInt(m.hi) || m.hi < 0 || m.hi > 127) errors.hi = 'Obergrenze: ganze Zahl von 0 bis 127.';
    if (!errors.lo && !errors.hi && m.lo >= m.hi) errors.hi = 'Die Obergrenze muss größer als die Untergrenze sein.';
  }
  if (m.mode === 'B') {
    if (!getTonalSystem(m.scaleId)) errors.scaleId = 'Unbekannte Tonleiter.';
    if (!isInt(m.root) || m.root < 0 || m.root > 11) errors.root = 'Grundton: ganze Zahl von 0 (C) bis 11 (H).';
    if (!errors.scaleId && !errors.root && !errors.lo && !errors.hi) {
      noteCount = buildPitchList({ scaleId: m.scaleId, root: m.root, lo: m.lo, hi: m.hi }).length;
      if (noteCount === 0) errors.hi = 'Im gewählten Bereich liegt kein Ton der Tonleiter. Bitte den Bereich vergrößern.';
      else if (noteCount === 1) warnings.push('Nur ein Ton verfügbar: Alle Noten klingen gleich. Bitte den Bereich vergrößern.');
      else if (noteCount < 3) warnings.push(`Nur ${noteCount} Töne verfügbar: Die Melodie wird sehr eintönig.`);
    }
    if (m.direction !== undefined && !DIRECTIONS.includes(/** @type {any} */ (m.direction))) errors.direction = 'Unbekannte Richtungs-Option.';
    if (m.rules !== undefined && !RULE_MODES.includes(/** @type {any} */ (m.rules))) errors.rules = 'Unbekannte Option für die Tonhierarchie.';
    if (m.microtonal !== undefined && !MICROTONAL_MODES.includes(/** @type {any} */ (m.microtonal))) errors.microtonal = 'Unbekannte Option für Mikrotöne.';
    if (!errors.scaleId && getTonalSystem(m.scaleId) && !isTwelveTone(m.scaleId) && !errors.microtonal) {
      warnings.push(microMode(m) === 'nearest'
        ? 'Mikrotonale Tonleiter: Die Töne werden auf die nächste Taste gerundet (Abweichungen bis 50 Cent gehen verloren).'
        : 'Mikrotonale Tonleiter: Im MIDI-Export entstehen Pitch-Bend-Befehle (Bereich ±2 Halbtöne). Das Wiedergabegerät muss Pitch-Bend unterstützen.');
    }
    // Optionen ohne Wirkung (Tonleiter ohne Abstiegsform bzw. ohne Tonhierarchie) werden still ignoriert; der Editor blendet sie dann aus.
    if (noteCount !== null && noteCount > 0 && !errors.direction && wantsContour(m) && hasDescending(m.scaleId)) {
      const down = buildPitchList({ scaleId: m.scaleId, root: m.root, lo: m.lo, hi: m.hi, direction: 'down' }).length;
      if (down === 0) errors.hi = 'Im gewählten Bereich liegt kein Ton der Abstiegsform. Bitte den Bereich vergrößern.';
    }
  }
  if (m.mode === 'A') warnings.push('Modus A nutzt den ganzen MIDI-Bereich 0–127; viele Töne liegen außerhalb des Klavierumfangs.');
  return { errors, warnings, noteCount };
}

/**
 * Schlüssel für das Caching der Mapping-Tabelle (nur Felder, die im Modus wirken). Optionen erscheinen nur, wenn sie
 * gesetzt sind und bei dieser Tonleiter wirken; der Schlüssel des Standardfalls ist unverändert.
 * @param {{ mode:string, scaleId:string, root:number, lo:number, hi:number, direction?:string, rules?:string, microtonal?:string }} m
 */
export function mappingKey(m) {
  if (m.mode === 'A') return 'A';
  if (m.mode === 'A2') return `A2|${m.lo}|${m.hi}`;
  const contour = wantsContour(m) && hasDescending(m.scaleId) ? '|contour' : '';
  const rules = wantsRules(m) && hasApplicableRules(m.scaleId) ? '|rules' : '';
  const micro = microMode(m) === 'nearest' && getTonalSystem(m.scaleId) && !isTwelveTone(m.scaleId) ? '|nearest' : '';
  return `B|${m.scaleId}|${m.root}|${m.lo}|${m.hi}${contour}${rules}${micro}`;
}
