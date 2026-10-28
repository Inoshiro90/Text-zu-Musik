// @ts-check
/**
 * Audioexport (WAV, ZIP aus WAV) aus dem vorhandenen Arrangement. Kein DOM.
 *
 * Gerendert wird mit einem OfflineAudioContext und DERSELBEN Synthese wie die Vorschau (audio/synth.js: scheduleVoice,
 * Profile über den Instrumentkatalog). Es gibt keine zweite Text-zu-Noten-Pipeline: Startzeit, Dauer, Tonhöhe und Velocity
 * kommen aus den Arrangement-Noten (Ticks → Sekunden wie in audio/preview.js).
 *
 * Semantik (siehe auch Hinweis in der Oberfläche):
 *  - „Gesamte Musik“: alle aktiven Spuren, mit Stumm/Solo/Pegel der Vorschau (hörbar = exportiert).
 *  - „Alle Spuren“ / „Einzelne Spur“: Stems – unabhängig von Stumm/Solo, mit Pegel 100 %. Alle Dateien besitzen dieselbe
 *    Länge, Sample-Rate (44,1 kHz, mono, 16 Bit) und Zeitachse; spät einsetzende Spuren beginnen mit Stille.
 *  - Spuren ohne Noten ergeben keine Datei. Deaktivierte Spuren sind nicht im Arrangement.
 *  - Aussteuerung: fester Master-Gain wie die Vorschau bei Lautstärke 100 % (MASTER_PEAK), unabhängig vom Lautstärkeregler.
 *    Überschreitet eine Datei danach den Ceiling-Wert, wird sie komplett (nicht dynamisch) abgesenkt – keine Verzerrung.
 */
import { ticksToSeconds, midiToFrequency, MASTER_PEAK } from '../audio/preview.js';
import { resolveInstrument } from '../audio/instrument-catalog.js';
import { getProfile, scheduleVoice } from '../audio/synth.js';
import { encodeWav, peakOf, WAV_MIME } from './wav.js';
import { createZip, ZIP_MIME } from './zip.js';
import { midiFilename } from './midi.js';

/** @typedef {import('../core/arrangement.js').Arrangement} Arrangement */
/** @typedef {{ audible?:boolean, volume?:number }} TrackState */
/** @typedef {'mix'|'zip'|'track'} AudioExportMode */
/** @typedef {(channels:number, length:number, sampleRate:number)=>any} OfflineContextFactory */

export const SAMPLE_RATE = 44100;
export const CHANNELS = 1;
/** Ausklang nach dem Arrangement-Ende (Sekunden); Noten enden zwar exakt, der Puffer verhindert abgeschnittene Randeffekte. */
export const TAIL_SECONDS = 0.25;
export const MAX_SECONDS_PER_FILE = 600;
/** Summe der Dauer aller Dateien eines Exports (begrenzt den Speicherbedarf). */
export const MAX_TOTAL_SECONDS = 1800;
export const MAX_NOTES = 60000;
export const EXPORT_GAIN = MASTER_PEAK;
export const PEAK_CEILING = 0.98;

export class AudioExportError extends Error {
  /** @param {string} message */
  constructor(message) { super(message); this.name = 'AudioExportError'; }
}

/** @type {OfflineContextFactory} */
export const browserOfflineContext = (channels, length, sampleRate) => {
  const Ctor = /** @type {any} */ (globalThis).OfflineAudioContext ?? /** @type {any} */ (globalThis).webkitOfflineAudioContext;
  if (!Ctor) throw new AudioExportError('Dieser Browser unterstützt das Offline-Rendering (OfflineAudioContext) nicht.');
  return new Ctor(channels, length, sampleRate);
};

/** Gemeinsame Dauer aller Dateien in Sekunden (Arrangement-Länge, mindestens bis zum Ende der letzten Note, plus Ausklang). @param {Arrangement} arr */
export function exportDurationSeconds(arr) {
  let endTick = arr.totalTicks;
  for (const t of arr.tracks) for (const n of t.notes) endTick = Math.max(endTick, n.startTick + n.durationTick);
  return ticksToSeconds(endTick, arr.ppq, arr.tempoBpm) + TAIL_SECONDS;
}

/** Noten einer Spur in Sekunden auf der gemeinsamen Zeitachse (Dauer-0 wird übersprungen). @param {Arrangement} arr @param {import('../core/arrangement.js').ArrTrack} track */
export function planTrackNotes(arr, track) {
  const out = [];
  for (const n of track.notes) {
    if (!(n.durationTick > 0)) continue;
    const start = ticksToSeconds(n.startTick, arr.ppq, arr.tempoBpm);
    out.push({ frequency: midiToFrequency(n.midi + (n.cents ?? 0) / 100), start, end: start + ticksToSeconds(n.durationTick, arr.ppq, arr.tempoBpm), velocity: n.velocity });
  }
  return out;
}

/** @param {import('../core/arrangement.js').ArrTrack} t */
const hasNotes = (t) => t.notes.some((n) => n.durationTick > 0);

/**
 * Rendert die gegebenen Spuren zu EINEM Mono-Puffer (Summe, Pegel je Spur) und senkt ihn bei Bedarf unter das Ceiling ab.
 * @param {Arrangement} arr @param {readonly { track:import('../core/arrangement.js').ArrTrack, volume:number }[]} entries
 * @param {{ createOfflineContext?:OfflineContextFactory, sampleRate?:number }} [deps]
 * @returns {Promise<{ samples:Float32Array, peak:number, attenuated:boolean }>}
 */
export async function renderEntries(arr, entries, { createOfflineContext = browserOfflineContext, sampleRate = SAMPLE_RATE } = {}) {
  const length = Math.ceil(exportDurationSeconds(arr) * sampleRate);
  const ctx = createOfflineContext(CHANNELS, length, sampleRate);
  const master = ctx.createGain();
  master.gain.value = EXPORT_GAIN;
  master.connect(ctx.destination);
  for (const { track, volume } of entries) {
    const g = ctx.createGain();
    g.gain.value = volume;
    g.connect(master);
    const profile = getProfile(resolveInstrument(track).profile);
    for (const n of planTrackNotes(arr, track)) scheduleVoice(ctx, g, profile, n);
  }
  const buffer = await ctx.startRendering();
  const samples = new Float32Array(buffer.getChannelData(0));
  const peak = peakOf(samples);
  let attenuated = false;
  if (peak > PEAK_CEILING) {
    const k = PEAK_CEILING / peak;
    for (let i = 0; i < samples.length; i++) samples[i] *= k;
    attenuated = true;
  }
  return { samples, peak, attenuated };
}

/** Dateinamenteil aus einem Spurnamen: Umlaute bleiben, problematische Zeichen werden zu „-“. @param {string} name */
export function safeNamePart(name) {
  const s = String(name ?? '').normalize('NFC').replace(/[\\/:*?"<>|\p{Cc}]+/gu, '-').replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '').toLowerCase();
  return Array.from(s).slice(0, 40).join('').replace(/[-.]+$/g, '') || 'spur';
}

/** @param {number} i nullbasiert @param {string} name */
export const trackFileName = (i, name) => `spur-${String(i + 1).padStart(2, '0')}-${safeNamePart(name)}.wav`;

/**
 * Erzeugt die Exportdatei.
 * @param {Arrangement} arr
 * @param {{ mode:AudioExportMode, trackId?:string, trackStates?:Record<string, TrackState>, text?:string, date?:Date,
 *   createOfflineContext?:OfflineContextFactory, sampleRate?:number, onProgress?:(done:number, total:number)=>void }} opts
 * @returns {Promise<{ data:Uint8Array, mime:string, filename:string, info:{ mode:AudioExportMode, files:number, seconds:number, skipped:number, attenuated:boolean } }>}
 */
export async function exportAudio(arr, opts) {
  const { mode, trackStates = {}, text = '', date = new Date(), sampleRate = SAMPLE_RATE } = opts;
  const deps = { createOfflineContext: opts.createOfflineContext, sampleRate };
  if (!arr || !Array.isArray(arr.tracks)) throw new AudioExportError('Kein Arrangement zum Exportieren vorhanden.');
  const indexed = arr.tracks.map((track, i) => ({ track, i }));
  const withNotes = indexed.filter((x) => hasNotes(x.track));
  if (arr.tracks.length === 0) throw new AudioExportError('Keine aktive Spur: Es gibt nichts zu exportieren.');
  if (withNotes.length === 0) throw new AudioExportError('Die aktiven Spuren spielen keine Noten – Pausen allein ergeben keinen Klang.');

  /** @type {{ track:import('../core/arrangement.js').ArrTrack, i:number, volume:number }[]} */
  let jobs;
  if (mode === 'mix') {
    const audible = withNotes.filter((x) => trackStates[x.track.id]?.audible !== false);
    if (audible.length === 0) throw new AudioExportError('Keine hörbare Spur mit Noten: Alle Spuren sind stummgeschaltet oder durch Solo ausgeblendet.');
    jobs = audible.map((x) => ({ ...x, volume: clamp01(trackStates[x.track.id]?.volume ?? 1) }));
  } else if (mode === 'track') {
    const x = indexed.find((y) => y.track.id === opts.trackId);
    if (!x) throw new AudioExportError('Die gewählte Spur ist nicht (mehr) aktiv.');
    if (!hasNotes(x.track)) throw new AudioExportError('Die gewählte Spur spielt in diesem Text keine Noten.');
    jobs = [{ ...x, volume: 1 }];
  } else if (mode === 'zip') {
    jobs = withNotes.map((x) => ({ ...x, volume: 1 }));
  } else throw new AudioExportError(`Unbekannter Exportmodus „${mode}“.`);

  const seconds = exportDurationSeconds(arr);
  const files = mode === 'zip' ? jobs.length : 1;
  if (seconds > MAX_SECONDS_PER_FILE) throw new AudioExportError(`Das Arrangement ist zu lang für den Audioexport (${Math.round(seconds)} s, höchstens ${MAX_SECONDS_PER_FILE} s). Kürze den Text oder erhöhe das Tempo.`);
  if (seconds * files > MAX_TOTAL_SECONDS) throw new AudioExportError(`Der Export wäre zu groß (${files} Dateien à ${Math.round(seconds)} s). Exportiere weniger Spuren oder einen kürzeren Text.`);
  const noteCount = jobs.reduce((n, j) => n + j.track.notes.length, 0);
  if (noteCount > MAX_NOTES) throw new AudioExportError(`Zu viele Noten für den Audioexport (${noteCount}, höchstens ${MAX_NOTES}).`);

  const stem = midiFilename(date, text).slice(0, -4);
  const units = mode === 'mix' ? [jobs] : jobs.map((j) => [j]);
  /** @type {{ name:string, data:Uint8Array }[]} */
  const wavs = [];
  let attenuated = false;
  for (let u = 0; u < units.length; u++) {
    opts.onProgress?.(u, units.length);
    await new Promise((r) => setTimeout(r, 0)); // UI atmen lassen
    const r = await renderEntries(arr, units[u], deps);
    attenuated ||= r.attenuated;
    wavs.push({ name: mode === 'mix' ? 'mix.wav' : trackFileName(units[u][0].i, units[u][0].track.name), data: encodeWav([r.samples], sampleRate) });
  }
  opts.onProgress?.(units.length, units.length);
  const info = { mode, files: wavs.length, seconds, skipped: mode === 'zip' ? arr.tracks.length - withNotes.length : 0, attenuated };
  if (mode === 'mix') return { data: wavs[0].data, mime: WAV_MIME, filename: `${stem}-gesamt.wav`, info };
  if (mode === 'track') return { data: wavs[0].data, mime: WAV_MIME, filename: `${stem}-${wavs[0].name}`, info };
  return { data: createZip(wavs, { date }), mime: ZIP_MIME, filename: `${stem}-spuren.zip`, info };
}

/** @param {number} v */
function clamp01(v) { return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0; }
