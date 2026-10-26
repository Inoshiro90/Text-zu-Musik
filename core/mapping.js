// @ts-check
/**
 * Stufe 4a: Byte → MIDI-Ton. Die einzige Stelle mit Mapping-Logik (Modi A, A2, B).
 * @typedef {{ mode:'A'|'A2'|'B', n:number, index:number, text:string }} Explain
 * @typedef {{ midi:number, name:string, explain:Explain }} MappedNote
 */
import { buildNoteList, getScale, noteLabel, noteName } from './scales.js';

/**
 * Erzeugt eine Tabelle für alle 256 Bytewerte. Erwartet eine validierte Konfiguration.
 * @param {import('./config.js').Config} cfg
 * @returns {{ table:readonly MappedNote[], noteList:readonly number[]|null, n:number }}
 */
export function createMapping(cfg) {
  /** @type {(b:number)=>{ midi:number, explain:Explain }} */
  let fn;
  /** @type {number[]|null} */
  let noteList = null;
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
    noteList = buildNoteList(cfg);
    n = noteList.length;
    if (n === 0) throw new Error('Leere Notenliste (Konfiguration nicht validiert).');
    const list = noteList;
    fn = (b) => {
      const i = b % n;
      const m = list[i];
      return { midi: m, explain: { mode: 'B', n, index: i, text: `${b} mod ${n} = ${i} → Liste[${i}] = ${noteLabel(m)}` } };
    };
  }
  const table = [];
  for (let b = 0; b < 256; b++) {
    const r = fn(b);
    table.push(Object.freeze({ midi: r.midi, name: noteName(r.midi), explain: Object.freeze(r.explain) }));
  }
  return { table: Object.freeze(table), noteList: noteList && Object.freeze(noteList), n };
}

/**
 * Tonhöhen-Mapping-Einstellungen (einer Spur bzw. der Legacy-Einzelspur) prüfen. Einzige Validierung dafür.
 * Felder, die im gewählten Modus keine Rolle spielen, werden nicht geprüft.
 * @param {{ mode:string, scaleId:string, root:number, lo:number, hi:number }} m
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
    if (!getScale(m.scaleId)) errors.scaleId = 'Unbekannte Tonleiter.';
    if (!isInt(m.root) || m.root < 0 || m.root > 11) errors.root = 'Grundton: ganze Zahl von 0 (C) bis 11 (H).';
    if (!errors.scaleId && !errors.root && !errors.lo && !errors.hi) {
      noteCount = buildNoteList(m).length;
      if (noteCount === 0) errors.hi = 'Im gewählten Bereich liegt kein Ton der Tonleiter. Bitte den Bereich vergrößern.';
      else if (noteCount === 1) warnings.push('Nur ein Ton verfügbar: Alle Noten klingen gleich. Bitte den Bereich vergrößern.');
      else if (noteCount < 3) warnings.push(`Nur ${noteCount} Töne verfügbar: Die Melodie wird sehr eintönig.`);
    }
  }
  if (m.mode === 'A') warnings.push('Modus A nutzt den ganzen MIDI-Bereich 0–127; viele Töne liegen außerhalb des Klavierumfangs.');
  return { errors, warnings, noteCount };
}

/** Schlüssel für das Caching der Mapping-Tabelle (nur Felder, die im Modus wirken). @param {{ mode:string, scaleId:string, root:number, lo:number, hi:number }} m */
export function mappingKey(m) {
  return m.mode === 'A' ? 'A' : m.mode === 'A2' ? `A2|${m.lo}|${m.hi}` : `B|${m.scaleId}|${m.root}|${m.lo}|${m.hi}`;
}
