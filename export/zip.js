// @ts-check
/**
 * Minimaler ZIP-Writer (Methode „stored“, ohne Kompression, ohne ZIP64) ohne Abhängigkeit.
 * WAV-Daten sind kaum komprimierbar, deshalb genügt Speichern ohne Kompression. Dateinamen werden als UTF-8 abgelegt
 * (General-Purpose-Flag, Bit 11), Umlaute bleiben erhalten. Reine Funktionen, kein DOM.
 */

export const ZIP_MIME = 'application/zip';
const MAX = 0xffffffff;

/** @type {Uint32Array|null} */
let table = null;
function crcTable() {
  if (table) return table;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
}

/** CRC-32 (IEEE). @param {Uint8Array} data */
export function crc32(data) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {Date} d */
function dosDateTime(d) {
  const y = Math.min(2107, Math.max(1980, d.getFullYear()));
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

/**
 * @param {readonly { name:string, data:Uint8Array }[]} files Namen ohne Pfad-Trenner, eindeutig
 * @param {{ date?:Date }} [options] Zeitstempel der Einträge (Standard: jetzt)
 * @returns {Uint8Array}
 */
export function createZip(files, { date = new Date() } = {}) {
  if (files.length > 0xffff) throw new RangeError('ZIP: höchstens 65.535 Dateien.');
  const enc = new TextEncoder();
  const seen = new Set();
  const { time, date: day } = dosDateTime(date);
  const entries = files.map((f) => {
    if (typeof f.name !== 'string' || f.name === '' || /[\\/\0]/.test(f.name)) throw new RangeError(`ZIP: ungültiger Dateiname „${f.name}“.`);
    if (seen.has(f.name)) throw new RangeError(`ZIP: doppelter Dateiname „${f.name}“.`);
    seen.add(f.name);
    return { name: enc.encode(f.name), data: f.data, crc: crc32(f.data) };
  });
  let size = 22;
  for (const e of entries) size += 30 + e.name.length + e.data.length + 46 + e.name.length;
  if (size > MAX) throw new RangeError('ZIP: Archiv wäre größer als 4 GiB.');
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  let o = 0;
  /** @type {number[]} */
  const offsets = [];
  for (const e of entries) {
    offsets.push(o);
    v.setUint32(o, 0x04034b50, true); v.setUint16(o + 4, 20, true); v.setUint16(o + 6, 0x0800, true); v.setUint16(o + 8, 0, true);
    v.setUint16(o + 10, time, true); v.setUint16(o + 12, day, true); v.setUint32(o + 14, e.crc, true);
    v.setUint32(o + 18, e.data.length, true); v.setUint32(o + 22, e.data.length, true); v.setUint16(o + 26, e.name.length, true); v.setUint16(o + 28, 0, true);
    out.set(e.name, o + 30); out.set(e.data, o + 30 + e.name.length);
    o += 30 + e.name.length + e.data.length;
  }
  const cdStart = o;
  entries.forEach((e, i) => {
    v.setUint32(o, 0x02014b50, true); v.setUint16(o + 4, 20, true); v.setUint16(o + 6, 20, true); v.setUint16(o + 8, 0x0800, true); v.setUint16(o + 10, 0, true);
    v.setUint16(o + 12, time, true); v.setUint16(o + 14, day, true); v.setUint32(o + 16, e.crc, true);
    v.setUint32(o + 20, e.data.length, true); v.setUint32(o + 24, e.data.length, true); v.setUint16(o + 28, e.name.length, true);
    v.setUint16(o + 30, 0, true); v.setUint16(o + 32, 0, true); v.setUint16(o + 34, 0, true); v.setUint16(o + 36, 0, true); v.setUint32(o + 38, 0, true); v.setUint32(o + 42, offsets[i], true);
    out.set(e.name, o + 46);
    o += 46 + e.name.length;
  });
  v.setUint32(o, 0x06054b50, true); v.setUint16(o + 4, 0, true); v.setUint16(o + 6, 0, true);
  v.setUint16(o + 8, entries.length, true); v.setUint16(o + 10, entries.length, true);
  v.setUint32(o + 12, o - cdStart, true); v.setUint32(o + 16, cdStart, true); v.setUint16(o + 20, 0, true);
  return out;
}

/** Liest Einträge eines mit createZip erzeugten Archivs (Namen, Daten, CRC-Prüfung) – für Tests. @param {Uint8Array} zip */
export function readZip(zip) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let e = zip.length - 22;
  if (e < 0 || v.getUint32(e, true) !== 0x06054b50) throw new RangeError('ZIP: Ende des Verzeichnisses nicht gefunden.');
  const count = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const dec = new TextDecoder();
  /** @type {{ name:string, data:Uint8Array }[]} */
  const out = [];
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new RangeError('ZIP: Verzeichniseintrag defekt.');
    const crc = v.getUint32(p + 16, true); const size = v.getUint32(p + 24, true); const nl = v.getUint16(p + 28, true);
    const lho = v.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nl));
    const start = lho + 30 + v.getUint16(lho + 26, true) + v.getUint16(lho + 28, true);
    const data = zip.subarray(start, start + size);
    if (crc32(data) !== crc) throw new RangeError(`ZIP: CRC-Fehler in „${name}“.`);
    out.push({ name, data });
    p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return out;
}
