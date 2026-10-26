// @ts-check
/**
 * Stufe 4b: Token + Mapping → Ereignisse mit ganzzahligen Ticks (sequenziell, ohne Lücken/Überlappung).
 * @typedef {{ type:'note', seq:number, startTick:number, durationTick:number, midi:number, name:string, velocity:number,
 *   source:{ charIndex:number, byteIndex:number, posInChar:number, byteValue:number, bits:string },
 *   explain:import('./mapping.js').Explain, trackId?:string }} NoteEvent
 * @typedef {{ type:'rest', seq:number, startTick:number, durationTick:number, pauseKind:'word'|'sentence'|'paragraph'|'clause',
 *   source:{ charIndexes:readonly number[], byteIndexes:readonly number[] } }} PauseEvent
 * @typedef {Omit<NoteEvent,'midi'|'name'|'explain'|'trackId'>} MasterNote
 * @typedef {MasterNote|PauseEvent} MasterEvent
 * @typedef {NoteEvent|PauseEvent} MusicEvent
 * @typedef {{ ppq:480, tempoBpm:number, events:readonly MusicEvent[], totalTicks:number }} Sequence
 */
import { PPQ } from './config.js';

export const DEFAULT_VELOCITY = 80;

/**
 * Master-Zeitachse: ALLE Notenbytes und Pausen mit absoluten Ticks, ohne Tonhöhe (die gehört der Spur).
 * @param {readonly import('./tokens.js').Token[]} tokens
 * @param {readonly import('./bytes.js').ByteCell[]} cells
 * @param {import('./config.js').Config} cfg
 * @returns {{ events:readonly MasterEvent[], totalTicks:number }}
 */
export function buildMasterEvents(tokens, cells, cfg) {
  const pauseTicks = { word: cfg.wordPauseTicks, sentence: cfg.sentencePauseTicks, paragraph: cfg.paragraphPauseTicks, clause: cfg.wordPauseTicks };
  /** @type {MasterEvent[]} */
  const events = [];
  let t = 0;
  for (const tok of tokens) {
    if (tok.kind === 'noteByte') {
      const cell = cells[tok.byteIndexes[0]];
      events.push(Object.freeze({
        type: /** @type {const} */ ('note'), seq: events.length, startTick: t, durationTick: cfg.noteTicks, velocity: DEFAULT_VELOCITY,
        source: Object.freeze({ charIndex: cell.charIndex, byteIndex: cell.byteIndex, posInChar: cell.posInChar, byteValue: cell.value, bits: cell.bits }),
      }));
      t += cfg.noteTicks;
    } else {
      const kind = /** @type {NonNullable<typeof tok.pauseKind>} */ (tok.pauseKind);
      const d = pauseTicks[kind];
      events.push(Object.freeze({
        type: /** @type {const} */ ('rest'), seq: events.length, startTick: t, durationTick: d, pauseKind: kind,
        source: Object.freeze({ charIndexes: Object.freeze(tok.charIndexes), byteIndexes: Object.freeze(tok.byteIndexes) }),
      }));
      t += d;
    }
  }
  return { events: Object.freeze(events), totalTicks: t };
}

/**
 * Referenz-Sequenz (Legacy/Einzelspur): Master-Zeitachse mit den Tonhöhen EINES Mappings für alle Noten.
 * @param {readonly MasterEvent[]} events @param {readonly import('./mapping.js').MappedNote[]} table
 * @returns {readonly MusicEvent[]}
 */
export function withPitch(events, table) {
  return Object.freeze(events.map((e) => {
    if (e.type !== 'note') return e;
    const m = table[e.source.byteValue];
    return Object.freeze({ ...e, midi: m.midi, name: m.name, explain: m.explain });
  }));
}

/** @param {readonly MusicEvent[]} events @param {number} totalTicks @param {number} tempoBpm @returns {Sequence} */
export function makeSequence(events, totalTicks, tempoBpm) {
  return Object.freeze({ ppq: PPQ, tempoBpm, events, totalTicks });
}
