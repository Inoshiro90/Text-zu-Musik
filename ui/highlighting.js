// @ts-check
/** Zeichen ↔ Byte ↔ Ereignis: Verknüpfung ausschließlich über Indizes aus der Pipeline (result.links). */

/** @typedef {{ charIndex:number }|{ byteIndex:number }|{ seq:number }} Focus */

/**
 * @param {import('../core/pipeline.js').PipelineResult} result
 * @param {Focus|null} focus
 */
export function computeLinked(result, focus) {
  const linked = { chars: new Set(), bytes: new Set(), seqs: new Set() };
  if (!focus) return linked;
  const { analysis, bytes, links, sequence } = result;
  if ('charIndex' in focus) {
    const c = analysis.chars[focus.charIndex];
    if (!c) return linked;
    linked.chars.add(c.index);
    for (let p = 0; p < c.byteCount; p++) linked.bytes.add(c.byteStart + p);
    for (const s of links.charToSeqs[c.index]) linked.seqs.add(s);
  } else if ('byteIndex' in focus) {
    const b = bytes[focus.byteIndex];
    if (!b) return linked;
    linked.bytes.add(b.byteIndex);
    linked.chars.add(b.charIndex);
    if (links.byteToSeq[b.byteIndex] >= 0) linked.seqs.add(links.byteToSeq[b.byteIndex]);
  } else {
    const ev = sequence.events[focus.seq];
    if (!ev) return linked;
    linked.seqs.add(ev.seq);
    if (ev.type === 'note') {
      linked.bytes.add(ev.source.byteIndex);
      linked.chars.add(ev.source.charIndex);
    } else {
      ev.source.byteIndexes.forEach((b) => linked.bytes.add(b));
      ev.source.charIndexes.forEach((c) => linked.chars.add(c));
    }
  }
  return linked;
}

/**
 * Nur Zeichen ↔ Byte (Live-Vorschau ohne zugehöriges musikalisches Ergebnis).
 * @param {{ analysis:import('../core/text.js').TextAnalysis, bytes:readonly import('../core/bytes.js').ByteCell[] }} preview
 * @param {Focus|null} focus
 */
export function computePreviewLinked(preview, focus) {
  const linked = { chars: new Set(), bytes: new Set(), seqs: new Set() };
  if (!focus) return linked;
  if ('charIndex' in focus) {
    const c = preview.analysis.chars[focus.charIndex];
    if (!c) return linked;
    linked.chars.add(c.index);
    for (let p = 0; p < c.byteCount; p++) linked.bytes.add(c.byteStart + p);
  } else if ('byteIndex' in focus) {
    const b = preview.bytes[focus.byteIndex];
    if (!b) return linked;
    linked.bytes.add(b.byteIndex);
    linked.chars.add(b.charIndex);
  }
  return linked;
}

/**
 * Setzt die Klasse „linked“ auf alle passenden Elemente (Markierung zusätzlich nicht-farbig per CSS).
 * @param {ParentNode} root
 * @param {ReturnType<typeof computeLinked>} linked
 */
export function applyHighlight(root, linked) {
  root.querySelectorAll('.linked').forEach((el) => el.classList.remove('linked'));
  const mark = (/** @type {string} */ attr, /** @type {Set<number>} */ set) => {
    if (set.size > 400) { // sehr große Läufe: einmal durchlaufen statt n Selektoren
      root.querySelectorAll(`[${attr}]`).forEach((el) => { if (set.has(Number(el.getAttribute(attr)))) el.classList.add('linked'); });
    } else {
      set.forEach((i) => root.querySelectorAll(`[${attr}="${i}"]`).forEach((el) => el.classList.add('linked')));
    }
  };
  mark('data-char', linked.chars);
  mark('data-byte', linked.bytes);
  mark('data-seq', linked.seqs);
}

/** Liest den Fokus aus einem Element (nächster Vorfahre mit data-byte/-seq/-char). @param {EventTarget|null} target @returns {Focus|null} */
export function focusFromElement(target) {
  const el = target instanceof Element ? target.closest('[data-byte],[data-seq],[data-char]') : null;
  if (!el) return null;
  if (el.hasAttribute('data-byte')) return { byteIndex: Number(el.getAttribute('data-byte')) };
  if (el.hasAttribute('data-seq')) return { seq: Number(el.getAttribute('data-seq')) };
  return { charIndex: Number(el.getAttribute('data-char')) };
}

/** @param {Focus|null} a @param {Focus|null} b */
export function sameFocus(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
