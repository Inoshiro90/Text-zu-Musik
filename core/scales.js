// @ts-check
/**
 * Skalen-Schnittstelle der Anwendung + deutsche Notennamen.
 * Seit Phase A kommen die Daten aus der Tonsystem-Bibliothek (core/tonal/library.js). `SCALES`, `getScale` und
 * `buildNoteList` bleiben als dünne, rückwärtskompatible Adapter erhalten; neue Logik nutzt `resolvePitches`.
 */
import { TONAL_SYSTEMS, getTonalSystem } from './tonal/library.js';
import { resolveSystemPitches, resolveSystemPitchesWithSteps } from './tonal/pitch.js';

/** @typedef {{ id:string, name:string, intervals:readonly number[] }} Scale  Legacy-Form: nur 12-TET-Einträge */
/** @typedef {import('./tonal/pitch.js').ResolvedPitch} ResolvedPitch */

/** 12-TET-Einträge der Bibliothek in der bisherigen Form (Reihenfolge = Bibliothek). @type {readonly Scale[]} */
export const SCALES = Object.freeze(TONAL_SYSTEMS
  .filter((s) => s.pitch.unit === 'semitones')
  .map((s) => Object.freeze({ id: s.id, name: s.name, intervals: s.pitch.steps })));

const SCALE_BY_ID = new Map(SCALES.map((s) => [s.id, s]));

/** Deutsche Tonklassen-Namen (B = B♭, H = B♮). */
export const PITCH_CLASS_NAMES = Object.freeze(['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H']);

/** Legacy-Nachschlagen (nur 12-TET-Einträge). @param {string} id @returns {Scale|undefined} */
export function getScale(id) {
  return SCALE_BY_ID.get(id);
}

export { getTonalSystem };

/** Mathematisches Modulo (immer ≥ 0, im Gegensatz zu JS-`%`). @param {number} a @param {number} n */
export function positiveModulo(a, n) {
  return ((a % n) + n) % n;
}

/** Name mit Oktave, MIDI 60 = C4, MIDI 0 = C-1. @param {number} midi */
export function noteName(midi) {
  return `${PITCH_CLASS_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Anzeigeform „A4 (69)“. @param {number} midi */
export function noteLabel(midi) {
  return `${noteName(midi)} (${midi})`;
}

/**
 * Tonhöhen eines Tonsystems im Bereich [lo, hi], aufsteigend, mit Cent-Abweichung (bei 12-TET immer 0).
 * Unbekannte ID → leere Liste.
 * @param {{ scaleId:string, root:number, lo:number, hi:number, direction?:'up'|'down' }} p
 * @returns {ResolvedPitch[]}
 */
export function resolvePitches({ scaleId, root, lo, hi, direction = 'up' }) {
  const system = getTonalSystem(scaleId);
  if (!system) return [];
  return resolveSystemPitches(system, { root, lo, hi, direction });
}

/** Ist das Tonsystem ohne Mikrotöne darstellbar (alle Stufen auf ganzen Halbtönen)? @param {string} scaleId */
export function isTwelveTone(scaleId) {
  const s = getTonalSystem(scaleId);
  return !!s && s.pitch.unit === 'semitones';
}

/** Hat das Tonsystem eine eigene Abstiegsform? @param {string} scaleId */
export function hasDescending(scaleId) {
  return !!getTonalSystem(scaleId)?.pitch.descending;
}

/** Hat das Tonsystem anwendbare Tonhierarchie-Regeln (Haupttöne oder gemiedene Töne)? @param {string} scaleId */
export function hasApplicableRules(scaleId) {
  const r = getTonalSystem(scaleId)?.rules;
  return !!r && ((r.predominant?.length ?? 0) > 0 || (r.avoid?.length ?? 0) > 0);
}

/** Gewicht der Haupttöne in der Notenliste (Anzahl der Einträge je Haupttonhöhe). */
export const PREDOMINANT_WEIGHT = 2;

/**
 * Notenliste mit Cent-Abweichung für Modus B (alle Tonsysteme, auch mikrotonale).
 * - direction 'down': Abstiegsform (falls vorhanden, sonst identisch mit 'up').
 * - applyRules: gemiedene Töne (rules.avoid) entfallen; Haupttöne (rules.predominant) stehen PREDOMINANT_WEIGHT-mal
 *   hintereinander in der Liste und werden dadurch häufiger getroffen. Regeln gelten nach Stufenwert, also für Auf- und
 *   Abstiegsform gleichermaßen.
 * - microtonal 'nearest': Cent-Abweichungen werden verworfen (nächstgelegene MIDI-Taste).
 * @param {{ scaleId:string, root:number, lo:number, hi:number, direction?:'up'|'down', applyRules?:boolean, microtonal?:'bend'|'nearest' }} p
 * @returns {ResolvedPitch[]}
 */
export function buildPitchList({ scaleId, root, lo, hi, direction = 'up', applyRules = false, microtonal = 'bend' }) {
  const system = getTonalSystem(scaleId);
  if (!system) return [];
  const resolved = resolveSystemPitchesWithSteps(system, { root, lo, hi, direction });
  const rules = system.rules;
  /** @type {ResolvedPitch[]} */ const out = [];
  const steps = system.pitch.steps;
  const toVals = (/** @type {readonly number[]|undefined} */ idx) => new Set((idx ?? []).map((i) => steps[i]));
  const avoid = applyRules && rules ? toVals(rules.avoid) : new Set();
  const pred = applyRules && rules ? toVals(rules.predominant) : new Set();
  for (const p of resolved) {
    if (avoid.has(p.step)) continue;
    const item = { midi: p.midi, cents: microtonal === 'nearest' ? 0 : p.cents };
    const times = pred.has(p.step) ? PREDOMINANT_WEIGHT : 1;
    for (let k = 0; k < times; k++) out.push(item);
  }
  return out;
}

/**
 * L = aufsteigende Liste aller MIDI-Töne in [lo, hi], deren Tonstufe zur Skala gehört (nur MIDI-Nummern).
 * Ohne Zusatzoptionen exakt das bisherige Verhalten (Legacy). Für Nicht-12-TET-Systeme leer: Wer Mikrotöne braucht,
 * nutzt buildPitchList.
 * @param {{ scaleId:string, root:number, lo:number, hi:number, direction?:'up'|'down', applyRules?:boolean }} p
 * @returns {number[]}
 */
export function buildNoteList({ scaleId, root, lo, hi, direction = 'up', applyRules = false }) {
  if (!isTwelveTone(scaleId)) return [];
  return buildPitchList({ scaleId, root, lo, hi, direction, applyRules }).map((p) => p.midi);
}

/** Cent-Angabe für Anzeigen: „+42 ct“, „−50 ct“; leer bei 0. @param {number|undefined} cents */
export function centsText(cents) {
  if (!cents) return '';
  const r = Math.round(cents);
  if (r === 0) return '';
  return `${r > 0 ? '+' : '−'}${Math.abs(r)} ct`;
}

/** Anzeigeform „E4 (64) −50 ct“ bzw. wie noteLabel ohne Abweichung. @param {number} midi @param {number} [cents] */
export function pitchLabel(midi, cents = 0) {
  const c = centsText(cents);
  return c ? `${noteLabel(midi)} ${c}` : noteLabel(midi);
}

/** Kurzform „E4 −50 ct“. @param {number} midi @param {number} [cents] */
export function pitchName(midi, cents = 0) {
  const c = centsText(cents);
  return c ? `${noteName(midi)} ${c}` : noteName(midi);
}
