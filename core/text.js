// @ts-check
/**
 * Stufe 1: Text → Anzeigezeichen (Graphem-Einheiten).
 *
 * Indexbedeutung (wichtig, nicht verwechseln):
 *  - SourceChar.index        → Index des Anzeigezeichens (Graphem bzw. Code-Point im Fallback)
 *  - utf16Start / utf16End   → UTF-16-Offsets in `analysis.analyzed` (NICHT im Originaltext)
 *  - byteStart / byteCount   → Bytepositionen im UTF-8 der analysierten Fassung
 *
 * Analysegrundlage: Alle Indizes beziehen sich auf die *analysierte Fassung*
 * (Zeilenenden vereinheitlicht, ungültige Surrogate ersetzt, optional NFC).
 * Das Original bleibt unverändert; Abweichungen werden in `analysis.changes` gemeldet.
 */

/**
 * @typedef {{ index:number, text:string, utf16Start:number, utf16End:number,
 *   kind:'normal'|'whitespace'|'sentenceEnd'|'punctuation'|'control', byteStart:number, byteCount:number }} SourceChar
 * @typedef {{ original:string, analyzed:string, chars:readonly SourceChar[], usedSegmenter:boolean,
 *   changes:{ lineEndings:boolean, invalidSurrogates:number, nfc:boolean }, totalBytes:number }} TextAnalysis
 */

export const SENTENCE_END_CHARS = new Set(['.', '!', '?', '…']);
const WHITESPACE_RE = /^\p{White_Space}+$/u;
const CONTROL_RE = /^[\p{Cc}\p{Cf}]+$/u;
/** Unicode-Satzzeichen (Kategorien P*): , ; : – ( ) „ “ " ' usw. */
const PUNCTUATION_RE = /^\p{P}+$/u;

/** @param {string} s */
export function normalizeLineEndings(s) {
  return s.replace(/\r\n?/g, '\n');
}

/**
 * Ersetzt einzelne (ungültige) UTF-16-Surrogate durch U+FFFD – so wie es
 * TextEncoder ohnehin täte, aber sichtbar und zählbar.
 * @param {string} s
 * @returns {{ text:string, count:number }}
 */
export function replaceLoneSurrogates(s) {
  let out = '';
  let count = 0;
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = s.charCodeAt(i + 1);
      if (n >= 0xdc00 && n <= 0xdfff) { i++; continue; }
    } else if (!(c >= 0xdc00 && c <= 0xdfff)) {
      continue;
    }
    out += s.slice(last, i) + '\uFFFD';
    last = i + 1;
    count++;
  }
  return count === 0 ? { text: s, count: 0 } : { text: out + s.slice(last), count };
}

/** Anzahl UTF-8-Bytes eines Code-Points. @param {number} cp */
export function utf8Length(cp) {
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

/** Anzahl UTF-8-Bytes eines (wohlgeformten) Strings. @param {string} s */
export function utf8ByteLength(s) {
  let n = 0;
  for (const ch of s) n += utf8Length(/** @type {number} */ (ch.codePointAt(0)));
  return n;
}

/** Zeichenklasse eines Anzeigezeichens. @param {string} g @returns {SourceChar['kind']} */
export function classifyChar(g) {
  if (WHITESPACE_RE.test(g)) return 'whitespace';
  if (SENTENCE_END_CHARS.has(g)) return 'sentenceEnd';
  if (PUNCTUATION_RE.test(g)) return 'punctuation';
  if (CONTROL_RE.test(g)) return 'control';
  return 'normal';
}

/**
 * Zerlegt in Graphem-Einheiten; ohne Intl.Segmenter Fallback auf Code-Points
 * (Einschränkung: Emoji-Sequenzen, Flaggen und kombinierende Zeichen zerfallen dann
 * in mehrere Anzeigezeichen; die Bytes und Noten bleiben identisch).
 * @param {string} text
 * @param {boolean} [useSegmenter]
 * @returns {{ segments:string[], usedSegmenter:boolean }}
 */
export function segmentGraphemes(text, useSegmenter = true) {
  if (useSegmenter && typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = [];
    for (const s of seg.segment(text)) segments.push(s.segment);
    return { segments, usedSegmenter: true };
  }
  return { segments: Array.from(text), usedSegmenter: false };
}

/**
 * @param {string} original
 * @param {{ normalizeNfc?:boolean, useSegmenter?:boolean }} [options]
 * @returns {TextAnalysis}
 */
export function analyzeText(original, options = {}) {
  const { normalizeNfc = true, useSegmenter = true } = options;
  const le = normalizeLineEndings(original);
  const { text: wellFormed, count } = replaceLoneSurrogates(le);
  const analyzed = normalizeNfc ? wellFormed.normalize('NFC') : wellFormed;
  const { segments, usedSegmenter } = segmentGraphemes(analyzed, useSegmenter);

  /** @type {SourceChar[]} */
  const chars = [];
  let u16 = 0;
  let bytePos = 0;
  for (let i = 0; i < segments.length; i++) {
    const text = segments[i];
    const byteCount = utf8ByteLength(text);
    chars.push(Object.freeze({
      index: i, text, utf16Start: u16, utf16End: u16 + text.length,
      kind: classifyChar(text), byteStart: bytePos, byteCount,
    }));
    u16 += text.length;
    bytePos += byteCount;
  }
  return Object.freeze({
    original, analyzed, chars: Object.freeze(chars), usedSegmenter,
    changes: Object.freeze({
      lineEndings: le !== original,
      invalidSurrogates: count,
      nfc: normalizeNfc && analyzed !== wellFormed,
    }),
    totalBytes: bytePos,
  });
}

/** Zählt Code-Points (für das Eingabelimit). @param {string} s */
export function countCodePoints(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) i++;
    n++;
  }
  return n;
}
