// @ts-check
/**
 * Stufe 3: Zeichen/Bytes → Token (einzelnes Notenbyte oder Pausenlauf), Regeln aus docs/regeln.md §3.
 * @typedef {{ id:number, kind:'noteByte'|'pauseRun', byteIndexes:readonly number[], charIndexes:readonly number[],
 *   pauseKind?:'word'|'sentence'|'paragraph'|'clause' }} Token
 */

/** @param {readonly import('./text.js').SourceChar[]} chars */
const countNewlines = (chars) => chars.reduce((n, c) => n + (c.text.split('\n').length - 1), 0);

/**
 * Bestimmt die Pausenart eines Strukturlaufs oder null (kein Ereignis).
 * Ein Strukturlauf ist eine maximale Folge aus Whitespace, Satzendzeichen und sonstigen Satzzeichen.
 * @param {readonly import('./text.js').SourceChar[]} run
 * @param {boolean} atStart  vor dem Lauf stand kein normales Zeichen
 * @param {boolean} atEnd    nach dem Lauf folgt kein normales Zeichen
 * @param {boolean} paragraphPause
 * @returns {'word'|'sentence'|'paragraph'|null}
 */
export function classifyRun(run, atStart, atEnd, paragraphPause) {
  // Nur Rand-WHITESPACE wird abgeschnitten (Textanfang bzw. Textende). Satzzeichen behalten ihre Bedeutung.
  let from = 0;
  let to = run.length - 1;
  if (atStart) while (from <= to && run[from].kind === 'whitespace') from++;
  if (atEnd) while (to >= from && run[to].kind === 'whitespace') to--;
  if (from > to) return null;
  const eff = run.slice(from, to + 1);
  if (paragraphPause && countNewlines(eff) >= 2) return 'paragraph';
  return eff.some((c) => c.kind === 'sentenceEnd') ? 'sentence' : 'word';
}

/**
 * @param {readonly import('./text.js').SourceChar[]} chars
 * @param {{ paragraphPause:boolean }} opts
 * @returns {Token[]}
 */
export function buildTokens(chars, { paragraphPause }) {
  /** @type {Token[]} */
  const tokens = [];
  /** @type {import('./text.js').SourceChar[]} */
  let run = [];
  let seenNormal = false;

  /** @param {boolean} atEnd */
  const flush = (atEnd) => {
    if (run.length === 0) return;
    const pauseKind = classifyRun(run, !seenNormal, atEnd, paragraphPause);
    if (pauseKind) {
      const byteIndexes = [];
      for (const c of run) for (let p = 0; p < c.byteCount; p++) byteIndexes.push(c.byteStart + p);
      tokens.push({ id: tokens.length, kind: 'pauseRun', byteIndexes, charIndexes: run.map((c) => c.index), pauseKind });
    }
    run = [];
  };

  for (const ch of chars) {
    if (ch.kind === 'control') continue; // ignoriert, unterbricht keinen Lauf
    if (ch.kind === 'normal') {
      flush(false);
      for (let p = 0; p < ch.byteCount; p++) {
        tokens.push({ id: tokens.length, kind: 'noteByte', byteIndexes: [ch.byteStart + p], charIndexes: [ch.index] });
      }
      seenNormal = true;
    } else {
      run.push(ch);
    }
  }
  flush(true);
  return tokens;
}
