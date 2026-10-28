// @ts-check
/**
 * Hörprobe einer Tonleiter (Phase F): eine Periode aufwärts ab dem Grundton in der Referenz-Oktave (C4…H4) und – falls das
 * Tonsystem eine Abstiegsform hat – dieselbe Periode abwärts in der Abstiegsform. Ergebnis ist ein Arrangement im Format
 * von core/arrangement.js, das der Vorschau-Player direkt abspielt. Reine Funktion.
 */
import { buildPitchList, getTonalSystem } from '../scales.js';
import { periodOf } from './schema.js';
import { REFERENCE_MIDI } from './pitch.js';

export const AUDITION_PPQ = 480;
export const AUDITION_TEMPO = 120;
export const AUDITION_NOTE_TICKS = 240;

/**
 * @param {{ scaleId:string, root:number, microtonal?:'bend'|'nearest' }} m
 * @param {{ program:number, sound?:string }} instrument
 * @returns {import('../arrangement.js').Arrangement|null}  null bei unbekannter Tonleiter oder ungültigem Grundton
 */
export function buildScaleAudition(m, instrument) {
  const system = getTonalSystem(m.scaleId);
  if (!system || !Number.isInteger(m.root) || m.root < 0 || m.root > 11) return null;
  const period = periodOf(system.pitch);
  const lo = REFERENCE_MIDI + m.root;
  const hi = Math.min(127, lo + Math.ceil(period / 100));
  const inPeriod = (/** @type {{ midi:number, cents:number }} */ p) => p.midi * 100 + p.cents <= lo * 100 + period + 1e-6;
  const microtonal = m.microtonal === 'nearest' ? 'nearest' : 'bend';
  const up = buildPitchList({ scaleId: m.scaleId, root: m.root, lo, hi, microtonal }).filter(inPeriod);
  const down = system.pitch.descending
    ? buildPitchList({ scaleId: m.scaleId, root: m.root, lo, hi, direction: 'down', microtonal }).filter(inPeriod).reverse().slice(1)
    : [];
  const seqPitches = [...up, ...down];
  /** @type {import('../arrangement.js').ArrNote[]} */
  const notes = seqPitches.map((p, i) => ({
    seq: i, startTick: i * AUDITION_NOTE_TICKS, durationTick: i === seqPitches.length - 1 ? AUDITION_NOTE_TICKS * 3 : AUDITION_NOTE_TICKS,
    midi: p.midi, velocity: 80, ...(p.cents ? { cents: p.cents } : {}),
  }));
  const totalTicks = notes.length ? notes[notes.length - 1].startTick + notes[notes.length - 1].durationTick : 0;
  const events = notes.map((n) => /** @type {any} */ ({ type: 'note', seq: n.seq, startTick: n.startTick, durationTick: n.durationTick, velocity: n.velocity, source: { charIndex: -1, byteIndex: -1, posInChar: 0, byteValue: 0, bits: '' } }));
  return Object.freeze({
    ppq: AUDITION_PPQ, tempoBpm: AUDITION_TEMPO, totalTicks, events,
    tracks: [{ id: 'audition', name: `Hörprobe ${system.name}`, program: instrument.program, ...(instrument.sound ? { sound: instrument.sound } : {}), notes }],
  });
}
