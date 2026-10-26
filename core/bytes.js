// @ts-check
/**
 * Stufe 2: Anzeigezeichen → UTF-8-Bytes als 8-Bit-Blöcke.
 * @typedef {{ byteIndex:number, charIndex:number, posInChar:number, value:number, bits:string,
 *   role:'note'|'structure'|'ignored' }} ByteCell
 */

/** @param {import('./text.js').SourceChar['kind']} kind @returns {ByteCell['role']} */
export function roleForKind(kind) {
  return kind === 'normal' ? 'note' : kind === 'control' ? 'ignored' : 'structure'; // whitespace, sentenceEnd, punctuation → structure
}

/** @param {number} v */
export function toBits(v) {
  return v.toString(2).padStart(8, '0');
}

/**
 * @param {import('./text.js').TextAnalysis} analysis
 * @returns {readonly ByteCell[]}
 */
export function buildByteCells(analysis) {
  const encoded = new TextEncoder().encode(analysis.analyzed);
  if (encoded.length !== analysis.totalBytes) {
    throw new Error(`Interner Fehler: UTF-8-Länge ${encoded.length} ≠ erwartet ${analysis.totalBytes}`);
  }
  /** @type {ByteCell[]} */
  const cells = new Array(encoded.length);
  for (const ch of analysis.chars) {
    const role = roleForKind(ch.kind);
    for (let p = 0; p < ch.byteCount; p++) {
      const byteIndex = ch.byteStart + p;
      const value = encoded[byteIndex];
      cells[byteIndex] = Object.freeze({
        byteIndex, charIndex: ch.index, posInChar: p, value, bits: toBits(value), role,
      });
    }
  }
  return Object.freeze(cells);
}
