// @ts-check
/** Skalen als reine Daten + Notenliste + deutsche Notennamen. */

/** @typedef {{ id:string, name:string, intervals:readonly number[] }} Scale */

/** @type {readonly Scale[]} */
export const SCALES = Object.freeze([
  { id: 'dur', name: 'Dur', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'moll', name: 'Natürliches Moll', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dur-pentatonik', name: 'Dur-Pentatonik', intervals: [0, 2, 4, 7, 9] },
  { id: 'moll-pentatonik', name: 'Moll-Pentatonik', intervals: [0, 3, 5, 7, 10] },
  { id: 'chromatisch', name: 'Chromatisch', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
].map((s) => Object.freeze(s)));

/** Deutsche Tonklassen-Namen (B = B♭, H = B♮). */
export const PITCH_CLASS_NAMES = Object.freeze(['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H']);

/** @param {string} id */
export function getScale(id) {
  return SCALES.find((s) => s.id === id);
}

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
 * L = aufsteigende Liste aller MIDI-Töne in [lo, hi], deren Tonstufe zur Skala gehört.
 * @param {{ scaleId:string, root:number, lo:number, hi:number }} p
 * @returns {number[]}
 */
export function buildNoteList({ scaleId, root, lo, hi }) {
  const scale = getScale(scaleId);
  if (!scale) return [];
  const set = new Set(scale.intervals);
  const list = [];
  for (let m = lo; m <= hi; m++) {
    if (set.has(positiveModulo(m - root, 12))) list.push(m);
  }
  return list;
}
