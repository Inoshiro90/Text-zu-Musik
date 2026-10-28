// @ts-check
/**
 * Verkettung aller Stufen mit selektiver Neuberechnung ab der ersten geänderten Stufe.
 * Reine Funktion: `prev` wird nie verändert; unveränderte Stufen werden als dieselben (eingefrorenen) Objekte weitergereicht.
 *
 * Gemeinsam für alle Spuren: text → bytes → tokens → timeline (Master-Zeitachse, ohne Tonhöhen).
 * Je Spur: routing (welche Anzeigezeichen sie spielt) und track (Noten mit der Tonhöhe der Spur, Startticks aus der Master-Zeitachse).
 * Referenz (Legacy/Einzelspur): mapping + sequence = Master-Zeitachse mit den Tonhöhen der Referenzspur (erste aktive Spur) für ALLE Noten.
 */
import { analyzeText, countCodePoints } from './text.js';
import { buildByteCells } from './bytes.js';
import { buildTokens } from './tokens.js';
import { createMapping, mappingKey } from './mapping.js';
import { buildMasterEvents, makeSequence, withPitch } from './timeline.js';
import { buildTrackEvents, routeChars, ruleKey, summarizeRouting } from './tracks.js';
import { LIMITS, validateConfig, textKey, structKey, timeKey } from './config.js';

/**
 * @typedef {{
 *   id:string, name:string, enabled:boolean, config:import('./tracks.js').TrackConfig, instrument:{ program:number },
 *   mask:Uint8Array, mapping:ReturnType<typeof createMapping>, events:readonly import('./timeline.js').NoteEvent[],
 *   bySeq:readonly (import('./timeline.js').NoteEvent|undefined)[], noteCount:number, matchedChars:number,
 *   keys:{ rule:string, map:string, meta:string }
 * }} TrackResult
 * @typedef {{
 *   text:string, config:import('./config.js').Config,
 *   analysis:import('./text.js').TextAnalysis, bytes:readonly import('./bytes.js').ByteCell[],
 *   tokens:readonly import('./tokens.js').Token[], mapping:ReturnType<typeof createMapping>,
 *   mapped:readonly (import('./mapping.js').MappedNote|null)[],
 *   timeline:{ events:readonly import('./timeline.js').MasterEvent[], totalTicks:number },
 *   master:{ ppq:480, tempoBpm:number, events:readonly import('./timeline.js').MasterEvent[], totalTicks:number },
 *   sequence:import('./timeline.js').Sequence, tracks:readonly TrackResult[], routing:ReturnType<typeof summarizeRouting>,
 *   links:Links,
 *   stats:{ chars:number, bytes:number, notes:number, rests:number, ignoredBytes:number, structureBytes:number },
 *   keys:{ text:string, nfc:string, struct:string, map:string, time:string }
 * }} PipelineResult
 * @typedef {{ byteToSeq:number[], charToSeqs:number[][] }} Links  -1 = Byte gehört zu keinem Ereignis
 * @typedef {{ ok:boolean, errors:Record<string,string>, warnings:string[], result:PipelineResult|null,
 *   recomputed:string[], validation:import('./config.js').Validation }} PipelineRun
 */

/**
 * @param {readonly import('./text.js').SourceChar[]} chars
 * @param {number} byteCount
 * @param {readonly import('./timeline.js').MasterEvent[]} events
 * @returns {Links}
 */
function buildLinks(chars, byteCount, events) {
  const byteToSeq = new Array(byteCount).fill(-1);
  /** @type {number[][]} */
  const charToSeqs = chars.map(() => []);
  for (const ev of events) {
    if (ev.type === 'note') {
      byteToSeq[ev.source.byteIndex] = ev.seq;
      charToSeqs[ev.source.charIndex].push(ev.seq);
    } else {
      for (const b of ev.source.byteIndexes) byteToSeq[b] = ev.seq;
      for (const c of ev.source.charIndexes) charToSeqs[c].push(ev.seq);
    }
  }
  return { byteToSeq, charToSeqs };
}

/**
 * @param {string} text
 * @param {Partial<import('./config.js').Config>} configInput
 * @param {PipelineResult|null} [prev]
 * @returns {PipelineRun}
 */
export function runPipeline(text, configInput, prev = null) {
  const validation = validateConfig(configInput);
  const fail = (/** @type {Record<string,string>} */ errors) => ({ ok: false, errors, warnings: validation.warnings, result: prev, recomputed: [], validation });
  if (!validation.ok || !validation.config) return fail(validation.errors);
  if (countCodePoints(text) > LIMITS.maxChars) {
    return fail({ text: `Der Text ist zu lang (Limit: ${LIMITS.maxChars.toLocaleString('de-DE')} Zeichen).` });
  }
  const cfg = validation.config;
  const cfgTracks = cfg.tracks ?? [];
  const keys = { text, nfc: textKey(cfg), struct: structKey(cfg), map: '', time: timeKey(cfg) };
  const same = prev && prev.keys.text === keys.text && prev.keys.nfc === keys.nfc;
  /** @type {string[]} */
  const recomputed = [];

  const analysis = same ? prev.analysis : (recomputed.push('text'), analyzeText(text, { normalizeNfc: cfg.normalizeNfc }));
  const bytes = same ? prev.bytes : (recomputed.push('bytes'), buildByteCells(analysis));
  const tokensSame = same && prev.keys.struct === keys.struct;
  const tokens = tokensSame ? prev.tokens : (recomputed.push('tokens'), Object.freeze(buildTokens(analysis.chars, { paragraphPause: cfg.paragraphPause })));
  const timeSame = tokensSame && prev.keys.time === keys.time;
  const timeline = timeSame ? prev.timeline : (recomputed.push('timeline'), buildMasterEvents(tokens, bytes, cfg));

  /* ----- Spuren: Routing und Ereignisse ----- */
  const prevTracks = new Map((prev?.tracks ?? []).map((t) => [t.id, t]));
  /** @type {Map<string, ReturnType<typeof createMapping>>} */
  const mappingCache = new Map((prev?.tracks ?? []).map((t) => [t.keys.map, t.mapping]));
  const analysisSame = same === true;
  /** @type {TrackResult[]} */
  const tracks = [];
  let metaChanged = prev === null || (prev?.tracks.length ?? 0) !== cfgTracks.length;
  cfgTracks.forEach((tc, i) => {
    const p = prevTracks.get(tc.id);
    const rKey = ruleKey(tc.rule, cfg.normalizeNfc);
    const mKey = mappingKey(tc.mapping);
    const routeSame = !!p && analysisSame && p.keys.rule === rKey;
    const mask = routeSame && p ? p.mask : (recomputed.push(`routing:${tc.id}`), routeChars(analysis.chars, tc.rule, { normalizeNfc: cfg.normalizeNfc }));
    let mapping = mappingCache.get(mKey);
    if (!mapping) { mapping = createMapping(/** @type {any} */ ({ ...cfg, ...tc.mapping })); mappingCache.set(mKey, mapping); }
    const eventsSame = routeSame && !!p && p.keys.map === mKey && timeSame;
    /** @type {readonly import('./timeline.js').NoteEvent[]} */
    let events;
    /** @type {readonly (import('./timeline.js').NoteEvent|undefined)[]} */
    let bySeq;
    if (eventsSame && p) { events = p.events; bySeq = p.bySeq; } else {
      recomputed.push(`track:${tc.id}`);
      events = buildTrackEvents(timeline.events, mask, mapping.table, tc.id, mapping.tableDown);
      const arr = new Array(timeline.events.length);
      for (const e of events) arr[e.seq] = e;
      bySeq = Object.freeze(arr);
    }
    const meta = JSON.stringify(tc);
    if (!p || p.keys.meta !== meta || prev?.tracks[i]?.id !== tc.id) metaChanged = true;
    let matched = 0;
    for (const ch of analysis.chars) if (mask[ch.index] === 1) matched++;
    tracks.push(Object.freeze({ id: tc.id, name: tc.name, enabled: tc.enabled, config: tc, instrument: tc.instrument, mask, mapping, events, bySeq, noteCount: events.length, matchedChars: matched, keys: { rule: rKey, map: mKey, meta } }));
  });
  if (metaChanged && prev) recomputed.push('trackmeta');

  /* ----- Referenz (Legacy/Einzelspur) ----- */
  const ref = tracks.find((t) => t.enabled) ?? tracks[0];
  const refMapping = ref ? ref.mapping : createMapping(/** @type {any} */ ({ ...cfg }));
  const refKey = ref ? ref.keys.map : mappingKey(cfg);
  keys.map = refKey;
  const mapSame = tokensSame && prev.keys.map === refKey;
  const mapping = mapSame ? prev.mapping : (recomputed.push('mapping'), refMapping);
  const mapped = mapSame ? prev.mapped : Object.freeze(tokens.map((t) => (t.kind === 'noteByte' ? mapping.table[bytes[t.byteIndexes[0]].value] : null)));
  const refSame = mapSame && timeSame;
  const refEvents = refSame ? prev.sequence.events : (recomputed.push('sequence'), withPitch(timeline.events, mapping.table));
  const tempoSame = refSame && prev.config.tempoBpm === cfg.tempoBpm;
  const sequence = tempoSame ? prev.sequence : makeSequence(refEvents, timeline.totalTicks, cfg.tempoBpm);
  if (refSame && !tempoSame) recomputed.push('tempo');
  const master = tempoSame ? prev.master : makeSequenceMaster(timeline, cfg.tempoBpm);
  const links = timeSame ? prev.links : buildLinks(analysis.chars, bytes.length, timeline.events);

  const active = tracks.filter((t) => t.enabled);
  const sig = (/** @type {readonly TrackResult[]} */ a) => a.map((t) => t.id).join('|');
  const routing = prev && analysisSame && sig(active) === sig(prev.tracks.filter((t) => t.enabled)) && active.every((t, i) => t.mask === prev.tracks.filter((x) => x.enabled)[i].mask)
    ? prev.routing : summarizeRouting(analysis.chars, active);

  const notes = timeline.events.reduce((n, e) => n + (e.type === 'note' ? 1 : 0), 0);
  const stats = timeSame ? prev.stats : {
    chars: analysis.chars.length, bytes: bytes.length, notes, rests: timeline.events.length - notes,
    ignoredBytes: bytes.filter((b) => b.role === 'ignored').length, structureBytes: bytes.filter((b) => b.role === 'structure').length,
  };

  /** @type {PipelineResult} */
  const result = Object.freeze({ text, config: cfg, analysis, bytes, tokens, mapping, mapped, timeline, master, sequence, tracks: Object.freeze(tracks), routing, links, stats, keys });
  return { ok: true, errors: {}, warnings: validation.warnings, result, recomputed, validation };
}

/** @param {{ events:readonly import('./timeline.js').MasterEvent[], totalTicks:number }} timeline @param {number} tempoBpm */
function makeSequenceMaster(timeline, tempoBpm) {
  return Object.freeze({ ppq: /** @type {480} */ (480), tempoBpm, events: timeline.events, totalTicks: timeline.totalTicks });
}

/**
 * Leichtgewichtige Live-Vorschau: nur Text- und Byte-Stufe (dieselben Funktionen wie die Pipeline),
 * keine Tokens, kein Mapping, keine Timeline. Liefert `prev` zurück, wenn Text und NFC-Einstellung gleich sind.
 * @param {string} text
 * @param {{ normalizeNfc?:boolean }} [options]
 * @param {BytePreview|null} [prev]
 * @returns {BytePreview}
 * @typedef {{ ok:boolean, tooLong:boolean, text:string, normalizeNfc:boolean,
 *   analysis:import('./text.js').TextAnalysis|null, bytes:readonly import('./bytes.js').ByteCell[]|null }} BytePreview
 */
export function runPreview(text, { normalizeNfc = true } = {}, prev = null) {
  if (prev && prev.text === text && prev.normalizeNfc === normalizeNfc) return prev;
  if (countCodePoints(text) > LIMITS.maxChars) return { ok: false, tooLong: true, text, normalizeNfc, analysis: null, bytes: null };
  const analysis = analyzeText(text, { normalizeNfc });
  return { ok: true, tooLong: false, text, normalizeNfc, analysis, bytes: buildByteCells(analysis) };
}
