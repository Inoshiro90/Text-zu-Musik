// @ts-check
/**
 * Standard-MIDI-File-Export (Format 0, eine Spur) aus einer `Sequence`.
 * Eigener, kleiner Writer ohne Abhängigkeit: Das Projekt hat keinen Build-Schritt, ein npm-Paket
 * wie midi-writer-js müsste gebündelt oder per CDN geladen werden – für Header, VLQ, Tempo, Note-On/Off
 * und End-of-Track lohnt das nicht. Zeitpunkte kommen ausschließlich aus startTick/durationTick.
 *
 * MIDI kennt keine Pausen: Stille entsteht durch den Abstand zwischen Note-Off und dem nächsten Note-On;
 * der Track endet bei `sequence.totalTicks`, damit abschließende Pausen erhalten bleiben.
 */

/** @typedef {import('../core/timeline.js').Sequence} Sequence */

export const MIDI_MIME = 'audio/midi';
export const DEFAULT_VELOCITY = 80;
const CHANNEL = 0;

/** Variable-length quantity (7 Bit pro Byte, höchstes Bit = „weitere Bytes“). @param {number} value @returns {number[]} */
export function encodeVlq(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x0fffffff) throw new RangeError(`VLQ außerhalb 0…0x0FFFFFFF: ${value}`);
  const bytes = [value & 0x7f];
  let v = value >>> 7;
  while (v > 0) { bytes.unshift((v & 0x7f) | 0x80); v >>>= 7; }
  return bytes;
}

/** @param {number} n @returns {number[]} */
const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
/** @param {number} n @returns {number[]} */
const u32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
/** @param {string} s */
const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0));

/**
 * @param {Sequence} sequence
 * @param {{ defaultVelocity?:number }} [options]
 * @returns {Uint8Array}
 */
export function sequenceToMidi(sequence, { defaultVelocity = DEFAULT_VELOCITY } = {}) {
  if (!sequence || !Array.isArray(sequence.events)) throw new TypeError('Ungültige Sequenz: events fehlt.');
  const { ppq, tempoBpm, totalTicks } = sequence;
  if (!Number.isInteger(ppq) || ppq < 1 || ppq > 0x7fff) throw new RangeError(`Ungültiges ppq: ${ppq}`);
  if (!Number.isFinite(tempoBpm) || tempoBpm <= 0) throw new RangeError(`Ungültiges Tempo: ${tempoBpm}`);
  const microsPerQuarter = Math.round(60_000_000 / tempoBpm);
  if (microsPerQuarter < 1 || microsPerQuarter > 0xffffff) throw new RangeError(`Tempo ${tempoBpm} BPM ist in MIDI nicht darstellbar.`);
  if (!Number.isInteger(totalTicks) || totalTicks < 0) throw new RangeError(`Ungültige Gesamtlänge: ${totalTicks}`);
  if (!Number.isInteger(defaultVelocity) || defaultVelocity < 1 || defaultVelocity > 127) throw new RangeError('Ungültige Standard-Velocity.');

  /** @type {{ tick:number, order:number, seq:number, data:number[] }[]} */
  const items = [];
  for (const e of sequence.events) {
    if (!Number.isInteger(e.startTick) || e.startTick < 0 || !Number.isInteger(e.durationTick) || e.durationTick < 0) {
      throw new RangeError(`Ereignis ${e.seq}: Start/Dauer müssen ganze, nicht negative Ticks sein.`);
    }
    if (e.type !== 'note') continue; // Pausen: keine MIDI-Events, nur Lücke
    if (!Number.isInteger(e.midi) || e.midi < 0 || e.midi > 127) throw new RangeError(`Ereignis ${e.seq}: MIDI-Tonhöhe ${e.midi} außerhalb 0–127.`);
    const velocity = e.velocity === undefined ? defaultVelocity : e.velocity;
    if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) throw new RangeError(`Ereignis ${e.seq}: Velocity ${velocity} außerhalb 1–127.`);
    if (e.durationTick === 0) continue; // Note ohne Länge: nicht exportierbar
    items.push({ tick: e.startTick, order: 1, seq: e.seq, data: [0x90 | CHANNEL, e.midi, velocity] });
    items.push({ tick: e.startTick + e.durationTick, order: 0, seq: e.seq, data: [0x80 | CHANNEL, e.midi, 0] });
  }
  // gleicher Tick: Note-Off (0) vor Note-On (1), danach nach Ereignisnummer
  items.sort((a, b) => a.tick - b.tick || a.order - b.order || a.seq - b.seq);

  /** @type {number[]} */
  const track = [0x00, 0xff, 0x51, 0x03, (microsPerQuarter >> 16) & 0xff, (microsPerQuarter >> 8) & 0xff, microsPerQuarter & 0xff];
  let last = 0;
  for (const it of items) {
    track.push(...encodeVlq(it.tick - last), ...it.data);
    last = it.tick;
  }
  const end = Math.max(last, totalTicks);
  track.push(...encodeVlq(end - last), 0xff, 0x2f, 0x00);

  return Uint8Array.from([...ascii('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(ppq), ...ascii('MTrk'), ...u32(track.length), ...track]);
}

/* ===================== Mehrspur-Export (Format 1) ===================== */

/** Melodiekanäle (0-basiert). Kanal 10 (Index 9) bleibt dem Schlagzeug vorbehalten und wird nie belegt. */
export const MELODIC_CHANNELS = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);

export class MidiExportError extends Error {
  /** @param {'too-many-tracks'|'no-notes'|'invalid'} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'MidiExportError';
    this.code = code;
  }
}

/** Kanal je Spur (eindeutig, ohne Kanal 10). @param {number} count @returns {number[]} */
export function allocateChannels(count) {
  if (count > MELODIC_CHANNELS.length) {
    throw new MidiExportError('too-many-tracks', `Zu viele aktive Spuren für MIDI: ${count} Spuren, aber nur ${MELODIC_CHANNELS.length} Melodiekanäle (Kanal 10 ist für Schlagzeug reserviert). Bitte Spuren deaktivieren oder löschen – es wurde keine Datei erzeugt.`);
  }
  return MELODIC_CHANNELS.slice(0, count);
}

/** Track-Name als ASCII (Umlaute transliteriert), damit jeder Sequenzer ihn korrekt anzeigt. @param {string} name @param {number} [max] */
export function sanitizeTrackName(name, max = 60) {
  const t = String(name ?? '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{M}+/gu, '').replace(/[^\x20-\x7e]/g, '_').replace(/\s+/g, ' ').trim().slice(0, max);
  return t === '' ? 'Spur' : t;
}

/** Meta-Textereignis (Delta 0). @param {number} type @param {string} text */
const metaText = (type, text) => { const b = ascii(text); return [0x00, 0xff, type, ...encodeVlq(b.length), ...b]; };

/** @param {number[]} track @returns {number[]} */
const chunk = (track) => [...ascii('MTrk'), ...u32(track.length), ...track];

/**
 * Mehrspurige Standard-MIDI-Datei (Format 1): eine Conductor-Spur (Name, Tempo) plus eine Spur je aktiver Nutzer-Spur
 * mit Name, Program Change, Note-On/Off. Alle Spuren verwenden dieselben absoluten Ticks und enden bei `totalTicks`.
 * Jede Spur trägt ihre eigenen Tonhöhen (aus dem Arrangement); es gibt keine globale Tonhöhenkopie.
 * @param {import('../core/arrangement.js').Arrangement} arr
 * @param {{ defaultVelocity?:number }} [options]
 * @returns {Uint8Array}
 */
export function arrangementToMidi(arr, { defaultVelocity = DEFAULT_VELOCITY } = {}) {
  if (!arr || !Array.isArray(arr.tracks)) throw new TypeError('Ungültiges Arrangement: tracks fehlt.');
  const { ppq, tempoBpm, totalTicks } = arr;
  if (!Number.isInteger(ppq) || ppq < 1 || ppq > 0x7fff) throw new RangeError(`Ungültiges ppq: ${ppq}`);
  if (!Number.isFinite(tempoBpm) || tempoBpm <= 0) throw new RangeError(`Ungültiges Tempo: ${tempoBpm}`);
  const micros = Math.round(60_000_000 / tempoBpm);
  if (micros < 1 || micros > 0xffffff) throw new RangeError(`Tempo ${tempoBpm} BPM ist in MIDI nicht darstellbar.`);
  if (!Number.isInteger(totalTicks) || totalTicks < 0) throw new RangeError(`Ungültige Gesamtlänge: ${totalTicks}`);
  if (!Number.isInteger(defaultVelocity) || defaultVelocity < 1 || defaultVelocity > 127) throw new RangeError('Ungültige Standard-Velocity.');
  if (arr.tracks.length === 0) throw new MidiExportError('no-notes', 'Keine aktive Spur: Es gibt nichts zu exportieren.');
  if (arr.tracks.reduce((n, t) => n + t.notes.length, 0) === 0) throw new MidiExportError('no-notes', 'Keine Noten in den aktiven Spuren: Es gibt nichts zu exportieren.');
  const channels = allocateChannels(arr.tracks.length);

  // eindeutige, lesbare Tracknamen
  /** @type {Map<string, number>} */ const used = new Map();
  const names = arr.tracks.map((t) => {
    const base = sanitizeTrackName(t.name);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });

  const conductor = [...metaText(0x03, 'Text zu Musik'), 0x00, 0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff, ...encodeVlq(totalTicks), 0xff, 0x2f, 0x00];
  /** @type {number[][]} */
  const chunks = [chunk(conductor)];
  arr.tracks.forEach((t, i) => {
    const ch = channels[i];
    if (!Number.isInteger(t.program) || t.program < 0 || t.program > 127) throw new RangeError(`Spur „${t.name}“: Instrument ${t.program} außerhalb 0–127.`);
    /** @type {{ tick:number, order:number, seq:number, data:number[] }[]} */
    const items = [];
    for (const e of t.notes) {
      if (!Number.isInteger(e.startTick) || e.startTick < 0 || !Number.isInteger(e.durationTick) || e.durationTick < 0) throw new RangeError(`Spur „${t.name}“, Ereignis ${e.seq}: Start/Dauer müssen ganze, nicht negative Ticks sein.`);
      if (!Number.isInteger(e.midi) || e.midi < 0 || e.midi > 127) throw new RangeError(`Spur „${t.name}“, Ereignis ${e.seq}: MIDI-Tonhöhe ${e.midi} außerhalb 0–127.`);
      const velocity = e.velocity === undefined ? defaultVelocity : e.velocity;
      if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) throw new RangeError(`Spur „${t.name}“, Ereignis ${e.seq}: Velocity ${velocity} außerhalb 1–127.`);
      if (e.durationTick === 0) continue;
      if (e.startTick + e.durationTick > totalTicks) throw new RangeError(`Spur „${t.name}“, Ereignis ${e.seq}: Note endet nach der gemeinsamen Gesamtlänge.`);
      items.push({ tick: e.startTick, order: 1, seq: e.seq, data: [0x90 | ch, e.midi, velocity] });
      items.push({ tick: e.startTick + e.durationTick, order: 0, seq: e.seq, data: [0x80 | ch, e.midi, 0] });
    }
    items.sort((a, b) => a.tick - b.tick || a.order - b.order || a.seq - b.seq);
    /** @type {number[]} */
    const body = [...metaText(0x03, names[i]), 0x00, 0xc0 | ch, t.program];
    let last = 0;
    for (const it of items) { body.push(...encodeVlq(it.tick - last), ...it.data); last = it.tick; }
    body.push(...encodeVlq(Math.max(last, totalTicks) - last), 0xff, 0x2f, 0x00);
    chunks.push(chunk(body));
  });
  return Uint8Array.from([...ascii('MThd'), ...u32(6), ...u16(1), ...u16(chunks.length), ...u16(ppq), ...chunks.flat()]);
}

/** @param {import('../core/arrangement.js').Arrangement} arr @param {{ defaultVelocity?:number }} [options] */
export function createArrangementBlob(arr, options) {
  return new Blob([/** @type {BlobPart} */ (arrangementToMidi(arr, options))], { type: MIDI_MIME });
}

/** @param {Sequence} sequence @param {{ defaultVelocity?:number }} [options] */
export function createMidiBlob(sequence, options) {
  return new Blob([/** @type {BlobPart} */ (sequenceToMidi(sequence, options))], { type: MIDI_MIME });
}

/**
 * Sicherer Dateiname. Mit Text: Kurzform des Textes (ASCII, höchstens 32 Zeichen) + Datum/Zeit; sonst „text-zu-musik“.
 * Entfernt Pfad- und Sonderzeichen, fängt leere Namen ab. @param {Date} [date] @param {string} [text]
 */
export function midiFilename(date = new Date(), text = '') {
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const slug = String(text ?? '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'ae').replace(/Ö/g, 'oe').replace(/Ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/g, '');
  return `${slug === '' ? 'text-zu-musik' : slug}-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}-${p(date.getMinutes())}.mid`;
}
