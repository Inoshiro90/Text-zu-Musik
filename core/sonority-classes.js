// @ts-check
/**
 * Sonoritätsklassen: 13 vom Nutzer definierte Zeichen-/Zeichenfolgen-Klassen als auswählbare Spurregeln.
 *
 * Wichtig: Das ist eine REGELBASIERTE Zuordnung nach Schreibweise (Graphemen), keine phonetische Analyse. Die Listen sind
 * die verbindlichen Startwerte der Aufgabenstellung und werden nicht phonetisch „korrigiert“.
 *
 * Segmentierung: Longest Match First über die Anzeigezeichen (`SourceChar`) der vorhandenen Textanalyse. Die Segmentierung ist
 * global (hängt nur vom Text ab, nie davon, welche Spuren aktiv sind). Die 13 Klassen sind untereinander exklusiv: Ein
 * erkannter Mehrbuchstabentreffer gehört nur der Klasse, die die ganze Folge enthält; seine Bestandteile erscheinen nicht
 * zusätzlich in anderen Klassen. Leerraum, Satzzeichen, Satzendzeichen, Steuerzeichen, Ziffern, Symbole, Emoji und nicht
 * aufgeführte Buchstaben (z. B. Umlaute) sind nie Teil einer Sequenz und unterbrechen sie.
 *
 * Das Modul kennt weder UI noch Audio. Die Standardinstrumente sind GM-Programmnummern (0-basiert) plus optional die ID eines
 * ergänzenden Klangprofils aus audio/instrument-catalog.js (Konsistenz per Test geprüft).
 *
 * @typedef {{ id:string, name:string, chars:readonly string[], instrumentGroup:string, help:string,
 *   instrument:{ program:number, sound?:string, label:string },
 *   mapping:{ mode:'B', scaleId:string, root:number, lo:number, hi:number } }} SonorityClass
 * @typedef {{ classId:string, start:number, end:number, text:string, utf16Start:number, utf16End:number, byteStart:number, byteCount:number }} SonoritySegment
 */

const B = (/** @type {number} */ lo, /** @type {number} */ hi) => ({ mode: /** @type {const} */ ('B'), scaleId: 'dur', root: 0, lo, hi });

/** @type {readonly SonorityClass[]} */
export const SONORITY_CLASSES = Object.freeze([
  { id: 'sonority-voiceless-plosive', name: 'Stimmlose Plosive', chars: ['ck', 'tch', 'qu', 'p', 't', 'k', 'c', 'q'], instrumentGroup: 'Perkussion (gestimmt) / Mallet-Percussion',
    help: 'Kurzer, trockener Anschlag.', instrument: { program: 115, label: 'Holzblock (Woodblock)' }, mapping: B(60, 84) },
  { id: 'sonority-voiced-plosive', name: 'Stimmhafte Plosive', chars: ['b', 'd', 'g'], instrumentGroup: 'Perkussion (gestimmt) / elektronische Perkussion',
    help: 'Tiefes, körperreiches Tom.', instrument: { program: 117, label: 'Tiefes Tom-Tom (Melodisches Tom)' }, mapping: B(36, 60) },
  { id: 'sonority-voiceless-affricate', name: 'Stimmlose Affrikaten', chars: ['tsch', 'ts', 'tz', 'tsh'], instrumentGroup: 'Perkussion / elektronische Perkussion',
    help: 'Snare-artiger Anschlag mit kurzem Rauschanteil.', instrument: { program: 118, sound: 'snare', label: 'Snare-artiger Anschlag (Klangprofil)' }, mapping: B(48, 72) },
  { id: 'sonority-voiced-affricate', name: 'Stimmhafte Affrikaten', chars: ['dsch', 'dz', 'dj'], instrumentGroup: 'Elektronisch und Synthesizer / Perkussion',
    help: 'Hybrid-Percussion: Anschlag, kurzer Rauschanteil, tonaler Körper.', instrument: { program: 118, sound: 'hybrid-perc', label: 'Hybrid-Percussion-Synth (Klangprofil)' }, mapping: B(48, 72) },
  { id: 'sonority-voiceless-fricative', name: 'Stimmlose Frikative', chars: ['sch', 'sh', 'ph', 'th', 'ch', 'ß', 'f', 'h', 's', 'x'], instrumentGroup: 'Perkussion / Sounddesign und Synthesizer',
    help: 'Heller, luftiger Hi-Hat-/Rauschklang.', instrument: { program: 119, sound: 'hihat-noise', label: 'Hi-Hat-Rauschen (Klangprofil)' }, mapping: B(72, 96) },
  { id: 'sonority-voiced-fricative', name: 'Stimmhafte Frikative', chars: ['zh', 'v', 'w', 'z'], instrumentGroup: 'Elektronisch und Synthesizer',
    help: 'Synthesizer mit Rausch- und Sägezahnanteil.', instrument: { program: 81, sound: 'noise-saw', label: 'Rausch-Sägezahn-Synth (Klangprofil)' }, mapping: B(48, 72) },
  { id: 'sonority-nasal', name: 'Nasale', chars: ['m', 'n'], instrumentGroup: 'Holzblasinstrumente',
    help: 'Klarinette in tiefem Register, weich und resonant.', instrument: { program: 71, label: 'Klarinette (tiefes Register)' }, mapping: B(48, 67) },
  { id: 'sonority-lateral', name: 'Laterale', chars: ['l'], instrumentGroup: 'Holzblasinstrumente',
    help: 'Flöte, klar, fließend, weich.', instrument: { program: 73, label: 'Querflöte' }, mapping: B(72, 96) },
  { id: 'sonority-rhotic', name: 'Rhotische', chars: ['r', 'rh'], instrumentGroup: 'Streichinstrumente',
    help: 'Cello, rund und resonant.', instrument: { program: 42, label: 'Cello' }, mapping: B(36, 60) },
  { id: 'sonority-approximant', name: 'Approximanten', chars: ['j'], instrumentGroup: 'Streichinstrumente',
    help: 'Violine mit weichem Anschlag.', instrument: { program: 40, sound: 'violin-soft', label: 'Violine, weicher Anschlag (Klangprofil)' }, mapping: B(67, 91) },
  { id: 'sonority-close-vowel', name: 'Geschlossene Vokale', chars: ['i', 'u', 'y', 'ü'], instrumentGroup: 'Tasteninstrumente / Glockenklänge',
    help: 'Celesta, klar, fokussiert, leicht kristallin.', instrument: { program: 8, label: 'Celesta' }, mapping: B(72, 96) },
  { id: 'sonority-mid-vowel', name: 'Mittlere Vokale', chars: ['e', 'o', 'ö'], instrumentGroup: 'Perkussion (gestimmt) / Mallet-Percussion',
    help: 'Marimba, rund und warm.', instrument: { program: 12, label: 'Marimba' }, mapping: B(55, 79) },
  { id: 'sonority-open-vowel', name: 'Offene Vokale', chars: ['a', 'ä'], instrumentGroup: 'Blechblasinstrumente',
    help: 'Warmes, weich artikuliertes Horn.', instrument: { program: 60, sound: 'horn-warm', label: 'Warmes Horn (Klangprofil)' }, mapping: B(48, 72) },
].map((c) => Object.freeze({ ...c, chars: Object.freeze(c.chars), instrument: Object.freeze(c.instrument), mapping: Object.freeze(c.mapping) })));

/**
 * Optionale deutsche Erweiterung (nicht Teil der Nutzerliste, standardmäßig AUS, pro Spur per Option `germanExt`):
 * ä, ö → mittlere Vokale, ü → geschlossene Vokale. Gilt nur für diese Einzelzeichen; keine Mehrbuchstabenfolgen.
 * @type {Readonly<Record<string,string>>}
 */
export const GERMAN_EXTENSION = Object.freeze({ 'ä': 'sonority-mid-vowel', 'ö': 'sonority-mid-vowel', 'ü': 'sonority-close-vowel' });

export const SONORITY_IDS = Object.freeze(SONORITY_CLASSES.map((c) => c.id));
const BY_ID = new Map(SONORITY_CLASSES.map((c) => [c.id, c]));

/** @param {string} id */
export const isSonorityId = (id) => BY_ID.has(id);
/** @param {string} id @returns {SonorityClass|undefined} */
export const getSonorityClass = (id) => BY_ID.get(id);

/**
 * Prüft das Inventar: Einträge klein geschrieben, nicht leer, keine Folge in zwei Klassen.
 * @param {readonly SonorityClass[]} [classes]
 * @returns {string[]} Fehlermeldungen (leer = gültig)
 */
export function validateInventory(classes = SONORITY_CLASSES) {
  /** @type {string[]} */ const problems = [];
  /** @type {Map<string,string>} */ const seen = new Map();
  for (const c of classes) {
    if (c.chars.length === 0) problems.push(`${c.id}: keine Zeichen`);
    for (const s of c.chars) {
      if (s === '' || s !== s.toLowerCase()) problems.push(`${c.id}: Eintrag „${s}“ ist leer oder nicht klein geschrieben`);
      const other = seen.get(s);
      if (other !== undefined) problems.push(`Konflikt: „${s}“ steht in ${other} und ${c.id}`);
      else seen.set(s, c.id);
    }
  }
  return problems;
}

/**
 * Baut den Suchindex: Folge → Klasse, und die längste Folgenlänge. Die Prüfreihenfolge (lang vor kurz) ergibt sich allein
 * aus der Länge; gleich lange Folgen sind verschieden und daher nie mehrdeutig (Konflikte meldet validateInventory).
 * @param {readonly SonorityClass[]} classes
 */
function buildIndex(classes) {
  /** @type {Map<string,string>} */ const map = new Map();
  let maxLen = 1;
  for (const c of classes) for (const s of c.chars) { if (!map.has(s)) map.set(s, c.id); maxLen = Math.max(maxLen, Array.from(s).length); }
  return { map, maxLen };
}
const problems = validateInventory();
if (problems.length > 0) throw new Error(`Ungültiges Sonoritäts-Inventar: ${problems.join('; ')}`);
const INDEX = buildIndex(SONORITY_CLASSES);

/** Kleingeschriebener Einzelbuchstabe eines Anzeigezeichens oder null (kein notenfähiges Einzelzeichen). @param {import('./text.js').SourceChar} ch */
function key1(ch) {
  if (ch.kind !== 'normal') return null;
  const t = ch.text.toLowerCase();
  return t.length === 1 ? t : null;
}

/**
 * Longest Match First über die Anzeigezeichen.
 * @param {readonly import('./text.js').SourceChar[]} chars
 * @param {{ germanExt?:boolean, index?:{ map:Map<string,string>, maxLen:number } }} [opts]
 * @returns {{ segments:readonly SonoritySegment[], classOf:readonly (string|null)[] }}
 */
export function segmentSonority(chars, { germanExt = false, index = INDEX } = {}) {
  const n = chars.length;
  /** @type {(string|null)[]} */ const classOf = new Array(n).fill(null);
  /** @type {SonoritySegment[]} */ const segments = [];
  let i = 0;
  while (i < n) {
    const k = key1(chars[i]);
    if (k === null) { i++; continue; }
    let hitLen = 0;
    let classId = '';
    for (let len = Math.min(index.maxLen, n - i); len >= 1; len--) {
      let seq = k;
      let ok = true;
      for (let j = 1; j < len; j++) { const kj = key1(chars[i + j]); if (kj === null) { ok = false; break; } seq += kj; }
      if (!ok) continue;
      const hit = index.map.get(seq);
      if (hit !== undefined) { hitLen = len; classId = hit; break; }
    }
    if (hitLen === 0 && germanExt && GERMAN_EXTENSION[k] !== undefined) { hitLen = 1; classId = GERMAN_EXTENSION[k]; }
    if (hitLen === 0) { i++; continue; }
    const first = chars[i];
    const last = chars[i + hitLen - 1];
    let text = '';
    for (let j = 0; j < hitLen; j++) { classOf[i + j] = classId; text += chars[i + j].text; }
    segments.push(Object.freeze({
      classId, start: i, end: i + hitLen, text,
      utf16Start: first.utf16Start, utf16End: last.utf16End, byteStart: first.byteStart, byteCount: last.byteStart + last.byteCount - first.byteStart,
    }));
    i += hitLen;
  }
  return { segments: Object.freeze(segments), classOf: Object.freeze(classOf) };
}

/** @type {WeakMap<readonly import('./text.js').SourceChar[], { base?:ReturnType<typeof segmentSonority>, ext?:ReturnType<typeof segmentSonority> }>} */
const CACHE = new WeakMap();

/** Wie segmentSonority, aber je Zeichenliste zwischengespeichert (alle Spuren teilen dieselbe Segmentierung). @param {readonly import('./text.js').SourceChar[]} chars @param {boolean} [germanExt] */
export function classifyChars(chars, germanExt = false) {
  let e = CACHE.get(chars);
  if (!e) { e = {}; CACHE.set(chars, e); }
  const slot = germanExt ? 'ext' : 'base';
  return (e[slot] ??= segmentSonority(chars, { germanExt }));
}

/**
 * Maske (1 = Anzeigezeichen gehört zur Klasse) für eine Spurregel.
 * @param {readonly import('./text.js').SourceChar[]} chars @param {string} classId @param {boolean} [germanExt]
 */
export function sonorityMask(chars, classId, germanExt = false) {
  const { classOf } = classifyChars(chars, germanExt);
  const mask = new Uint8Array(chars.length);
  for (let i = 0; i < chars.length; i++) if (classOf[i] === classId) mask[i] = 1;
  return mask;
}

/** Kurzliste der Zeichen für die Anzeige, z. B. „ck, tch, qu, p, t, k, c, q“. @param {string} id */
export function describeSonorityChars(id) {
  return (BY_ID.get(id)?.chars ?? []).join(', ');
}
