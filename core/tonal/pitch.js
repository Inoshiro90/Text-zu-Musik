// @ts-check
/**
 * Tonhöhen eines Tonsystems im MIDI-Bereich (Bericht Phase 1, Abschnitt 10 „MIDI-Übersetzung“). Reine Funktion.
 *
 * Absolute Tonhöhe in Cent über MIDI 0 = (60 + root)·100 + k·Periode + Stufe (k ganzzahlig).
 * Referenz ist der Grundton in der Oktave von C4 (MIDI 60). Bei Oktav-Perioden ist das gleichwertig zu jedem anderen
 * Bezug; bei Perioden ≠ 1200 Cent (z. B. Bohlen-Pierce) legt es fest, dass der Grundton auf C4…H4 exakt getroffen wird.
 * midi = nächstgelegene MIDI-Note, cents = Abweichung davon (−50 … +50; genau 50 Cent fallen auf die höhere Note, cents = −50).
 * Bereich: Es zählen Tonhöhen von genau lo bis genau hi (in Cent: lo·100 … hi·100), nicht ±50 Cent darüber hinaus.
 * Für 12-TET-Systeme (unit 'semitones') ist cents immer 0 und das Ergebnis entspricht exakt dem früheren Mengenfilter
 * „(m − root) mod 12 ∈ intervals“ über alle m in [lo, hi].
 */
import { periodOf, stepsToCents } from './schema.js';

/** @typedef {{ midi:number, cents:number }} ResolvedPitch */

/** Referenz-Oktave: Der Grundton liegt (bei jeder Periode) exakt auf MIDI 60 + root. */
export const REFERENCE_MIDI = 60;

/**
 * @param {import('./schema.js').TonalSystem} system
 * @param {{ root:number, lo:number, hi:number, direction?:'up'|'down' }} p  root: Tonklasse 0–11; lo/hi: MIDI-Grenzen inklusive
 * @returns {ResolvedPitch[]} aufsteigend nach absoluter Tonhöhe
 */
export function resolveSystemPitches(system, p) {
  return resolveSystemPitchesWithSteps(system, p).map(({ midi, cents }) => ({ midi, cents }));
}

/**
 * Wie resolveSystemPitches, zusätzlich mit dem Stufenwert (`step`, in der Einheit der Daten), aus dem der Ton stammt.
 * Wird für die Tonhierarchie gebraucht (Regeln gelten nach Stufenwert).
 * @param {import('./schema.js').TonalSystem} system
 * @param {{ root:number, lo:number, hi:number, direction?:'up'|'down' }} p
 * @returns {(ResolvedPitch & { step:number })[]}
 */
export function resolveSystemPitchesWithSteps(system, { root, lo, hi, direction = 'up' }) {
  const pitch = system.pitch;
  const raw = direction === 'down' && pitch.descending ? pitch.descending : pitch.steps;
  const steps = stepsToCents(raw, pitch.unit);
  const period = periodOf(pitch);
  const base = (REFERENCE_MIDI + root) * 100;
  const minC = lo * 100 - 50;
  const maxC = hi * 100 + 50;
  const kFrom = Math.floor((minC - base) / period) - 1;
  const kTo = Math.ceil((maxC - base) / period) + 1;
  /** @type {{ c:number, midi:number, cents:number, step:number }[]} */
  const out = [];
  for (let k = kFrom; k <= kTo; k++) {
    steps.forEach((s, j) => {
      const c = base + k * period + s;
      const midi = Math.round(c / 100);
      if (c < lo * 100 - EPS || c > hi * 100 + EPS) return;
      out.push({ c, midi, cents: roundCents(c - midi * 100), step: raw[j] });
    });
  }
  out.sort((a, b) => a.c - b.c);
  return out.map(({ midi, cents, step }) => ({ midi, cents, step }));
}

const EPS = 1e-6;

/** Rundet auf 1/1000 Cent (vermeidet Gleitkomma-Reste wie 1e-13). @param {number} v */
const roundCents = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return r === 0 ? 0 : r; // −0 vermeiden
};
