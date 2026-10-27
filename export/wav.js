// @ts-check
/**
 * WAV-Writer (RIFF/WAVE, unkomprimiertes PCM, 16 Bit, Little-Endian) ohne Abhängigkeit.
 * Reine Funktionen, kein DOM, keine Audio-API – dadurch in Node testbar.
 */

export const WAV_MIME = 'audio/wav';
export const WAV_HEADER_BYTES = 44;
const MAX_DATA_BYTES = 0xffffffff - 36;

/** Größter Betrag aller Samples (0 bei Stille). @param {ArrayLike<number>} samples */
export function peakOf(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  return peak;
}

/** Float (−1…1) → 16-Bit-PCM mit Begrenzung (kein Überlauf); NaN wird zu 0. @param {number} x */
export function floatToPcm16(x) {
  if (!(x === x)) return 0;
  const c = x > 1 ? 1 : x < -1 ? -1 : x;
  return Math.round(c < 0 ? c * 0x8000 : c * 0x7fff);
}

/**
 * Kodiert Kanäle (gleiche Länge, interleaved) als 16-Bit-PCM-WAV.
 * @param {readonly ArrayLike<number>[]} channels @param {number} sampleRate
 * @returns {Uint8Array}
 */
export function encodeWav(channels, sampleRate) {
  if (!Array.isArray(channels) || channels.length < 1 || channels.length > 8) throw new RangeError('WAV: 1 bis 8 Kanäle erforderlich.');
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError(`WAV: ungültige Sample-Rate ${sampleRate}.`);
  const frames = channels[0].length;
  if (channels.some((c) => c.length !== frames)) throw new RangeError('WAV: Alle Kanäle müssen gleich lang sein.');
  const nch = channels.length;
  const dataBytes = frames * nch * 2;
  if (dataBytes > MAX_DATA_BYTES) throw new RangeError('WAV: Datei wäre größer als 4 GiB.');
  const out = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  const v = new DataView(out.buffer);
  const tag = (/** @type {number} */ o, /** @type {string} */ s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  v.setUint32(16, 16, true);          // Größe des fmt-Chunks
  v.setUint16(20, 1, true);           // PCM
  v.setUint16(22, nch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * nch * 2, true); // Bytes pro Sekunde
  v.setUint16(32, nch * 2, true);              // Blockgröße
  v.setUint16(34, 16, true);                   // Bit pro Sample
  tag(36, 'data');
  v.setUint32(40, dataBytes, true);
  let o = WAV_HEADER_BYTES;
  for (let i = 0; i < frames; i++) for (let c = 0; c < nch; c++) { v.setInt16(o, floatToPcm16(channels[c][i]), true); o += 2; }
  return out;
}

/** Liest die Kopfdaten einer von encodeWav erzeugten Datei (für Tests und Plausibilitätsprüfung). @param {Uint8Array} bytes */
export function parseWavHeader(bytes) {
  if (bytes.length < WAV_HEADER_BYTES) throw new RangeError('WAV: Datei zu kurz.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (/** @type {number} */ o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  return {
    riff: tag(0), riffSize: v.getUint32(4, true), wave: tag(8), fmt: tag(12), fmtSize: v.getUint32(16, true), format: v.getUint16(20, true),
    channels: v.getUint16(22, true), sampleRate: v.getUint32(24, true), byteRate: v.getUint32(28, true), blockAlign: v.getUint16(32, true),
    bitsPerSample: v.getUint16(34, true), data: tag(36), dataSize: v.getUint32(40, true),
  };
}
