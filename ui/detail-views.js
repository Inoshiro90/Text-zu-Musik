// @ts-check
/** Binär-, Zuordnungs- und Ereignisansicht. Liest nur Pipeline-Ergebnisse. */
import { LIMITS } from '../core/config.js';
import { noteLabel } from '../core/scales.js';
import { esc, visibleChar, beats, num, PAUSE_LABEL, ROLE_ICON, ROLE_LABEL, iconSvg, linkMark, playMark } from './dom.js';

const KIND_LABEL = { normal: 'Zeichen', whitespace: 'Leerraum', sentenceEnd: 'Satzende', punctuation: 'Satzzeichen', control: 'Steuerzeichen' };

/** @param {number} shown @param {number} total @param {string} view */
function more(shown, total, view) {
  const info = `<p class="muted small">Angezeigt: ${num(Math.min(shown, total))} von ${num(total)} Einträgen.</p>`;
  return `<div class="more-wrap">${info}${shown >= total ? '' : `<button type="button" class="btn" data-more="${view}">Weitere ${num(LIMITS.initialRows)} laden</button>`}</div>`;
}

/** @param {{ analysis:import('../core/text.js').TextAnalysis, bytes:readonly import('../core/bytes.js').ByteCell[] }} r Pipeline-Ergebnis oder Live-Vorschau @param {number} limit */
export function renderBinary(r, limit) {
  const chars = r.analysis.chars.slice(0, limit);
  const cards = chars.map((c) => {
    const bytes = [];
    for (let p = 0; p < c.byteCount; p++) {
      const b = r.bytes[c.byteStart + p];
      bytes.push(`<span class="byte role-${b.role}" data-byte="${b.byteIndex}" title="${esc(ROLE_LABEL[b.role])}">${ROLE_ICON[b.role]}<code>${b.bits}</code><span class="dec">${b.value}</span><span class="sr-only">${esc(ROLE_LABEL[b.role])}</span>${linkMark()}</span>`);
    }
    const label = `Zeichen ${c.index + 1}: ${visibleChar(c.text)}, ${KIND_LABEL[c.kind]}, ${c.byteCount} Byte${c.byteCount === 1 ? '' : 's'}`;
    return `<li class="char-card kind-${c.kind}" data-char="${c.index}" tabindex="0" role="button" aria-label="${esc(label)}"><span class="glyph-line"><span class="glyph">${esc(visibleChar(c.text))}</span>${linkMark()}</span><span class="ckind">${KIND_LABEL[c.kind]}</span><span class="bytes">${bytes.join('')}</span></li>`;
  }).join('');
  return `<p class="legend-note"><span>${iconSvg('music')} erzeugt später eine Note</span><span>${iconSvg('pause')} gehört zu einer Pause (Leerraum oder Satzzeichen)</span><span>${iconSvg('x')} ignoriert (kein Ereignis)</span></p><ul class="cards" aria-label="Zeichen und Bytes">${cards}</ul>${more(limit, r.analysis.chars.length, 'binary')}`;
}

/** Erste Tabellenzelle: Ereignisnummer plus Marker für „verknüpft“/„spielt gerade“. @param {number} seq */
const firstCell = (seq) => `<span class="cell-first">${linkMark()}${playMark()}${seq + 1}</span>`;

/** @param {import('../core/pipeline.js').PipelineResult} r @param {import('../core/timeline.js').MasterEvent} e */
function sourceText(r, e) {
  if (e.type === 'note') return `„${visibleChar(r.analysis.chars[e.source.charIndex].text)}“ (Byte ${e.source.posInChar + 1} von ${r.analysis.chars[e.source.charIndex].byteCount})`;
  const ids = e.source.charIndexes;
  const shown = ids.slice(0, 6).map((i) => visibleChar(r.analysis.chars[i].text)).join(' ');
  return `„${shown}${ids.length > 6 ? ' …' : ''}“ (${ids.length} Zeichen, ${e.source.byteIndexes.length} Bytes)`;
}

/** Noten der aktiven Spuren zu einem Master-Ereignis. @param {import('../core/pipeline.js').PipelineResult} r @param {number} seq */
function playedBy(r, seq) {
  return r.tracks.flatMap((t, i) => (t.enabled && t.bySeq[seq] ? [{ t, i, e: /** @type {import('../core/timeline.js').NoteEvent} */ (t.bySeq[seq]) }] : []));
}

/** @param {import('../core/pipeline.js').TrackResult} t */
function mappingIntro(t) {
  const m = t.config.mapping;
  const c = t.mapping;
  return m.mode === 'A' ? 'Modus A: <code>m = b mod 128</code> (die Bytes 0 und 128 ergeben dieselbe Tonhöhe).'
    : m.mode === 'A2' ? `Modus A2: <code>n = hi − lo + 1 = ${c.n}</code>, <code>m = lo + (b mod n)</code> mit lo = ${m.lo}, hi = ${m.hi}.`
      : `Modus B: Liste L der Skalentöne von ${noteLabel(m.lo)} bis ${noteLabel(m.hi)} (N = ${c.n}), <code>m(b) = L[b mod N]</code>. L = ${(c.noteList ?? []).map((n) => esc(noteLabel(n))).join(', ')}`;
}

/** @param {import('../core/pipeline.js').PipelineResult} r @param {number} limit */
export function renderMapping(r, limit) {
  const intro = r.tracks.length === 0 ? '<p>Keine Spur vorhanden: Es gibt keine Zuordnung von Bytes zu Tönen.</p>'
    : r.tracks.map((t, i) => `<p><strong>Spur ${i + 1} „${esc(t.name)}“${t.enabled ? '' : ' (deaktiviert)'}:</strong> ${mappingIntro(t)}</p>`).join('');
  const rows = r.master.events.slice(0, limit).map((e) => {
    if (e.type === 'note') {
      const by = playedBy(r, e.seq);
      const rule = by.length === 0 ? '<em>Keine aktive Spur spielt dieses Zeichen (still).</em>' : by.map(({ t, i, e: n }) => `<div><span class="trk-tag">S${i + 1}</span> ${esc(t.name)}: ${esc(n.explain.text)}</div>`).join('');
      const out = by.length === 0 ? '<span class="muted">—</span>' : by.map(({ i, e: n }) => `<div><strong>${iconSvg('music')} S${i + 1}: ${esc(noteLabel(n.midi))}</strong></div>`).join('');
      return `<tr data-seq="${e.seq}" tabindex="0" class="row-note"><td>${firstCell(e.seq)}</td><td>${esc(sourceText(r, e))}</td><td><code>${e.source.bits}</code></td><td>${e.source.byteValue}</td><td>${rule}</td><td>${out}</td></tr>`;
    }
    return `<tr data-seq="${e.seq}" tabindex="0" class="row-rest"><td>${firstCell(e.seq)}</td><td>${esc(sourceText(r, e))}</td><td colspan="2">${e.source.byteIndexes.map((b) => r.bytes[b].value).join(' ')}</td><td>Strukturlauf ergibt eine ${PAUSE_LABEL[e.pauseKind]} (keine Note, auf allen Spuren still)</td><td><strong>${iconSvg('pause')} ${PAUSE_LABEL[e.pauseKind]}, ${e.durationTick} Ticks</strong></td></tr>`;
  }).join('');
  return `${intro}<p class="muted small">Kollisionen sind gewollt: Verschiedene Bytes können denselben Ton ergeben, deshalb lässt sich der Text aus der Musik nicht zurückgewinnen.</p>
  <div class="table-wrap"><table><caption class="sr-only">Zuordnung von Bytes zu Tönen je Spur</caption><thead><tr><th scope="col">Nr.</th><th scope="col">Quelle</th><th scope="col">Bits</th><th scope="col">Dezimal</th><th scope="col">Regel je Spur</th><th scope="col">Ergebnis</th></tr></thead><tbody>${rows}</tbody></table></div>${more(limit, r.master.events.length, 'mapping')}`;
}

/** @param {import('../core/pipeline.js').PipelineResult} r @param {number} limit */
export function renderEvents(r, limit) {
  const rows = r.master.events.slice(0, limit).map((e) => {
    let what;
    if (e.type === 'note') {
      const by = playedBy(r, e.seq);
      what = by.length === 0 ? `${iconSvg('music')} Note ohne Spur (still)` : `${iconSvg('music')} ${by.slice(0, 4).map(({ i, t, e: n }) => `S${i + 1} ${esc(t.name)}: Note ${esc(noteLabel(n.midi))}`).join('; ')}${by.length > 4 ? ` … (+${by.length - 4})` : ''}`;
    } else what = `${iconSvg('pause')} ${PAUSE_LABEL[e.pauseKind]} (alle Spuren still)`;
    return `<tr data-seq="${e.seq}" tabindex="0" class="row-${e.type}"><td>${firstCell(e.seq)}</td><td>${e.type === 'note' ? 'Note' : 'Pause'}</td><td>${esc(sourceText(r, e))}</td><td>${e.startTick} <span class="muted">(${beats(e.startTick)} B)</span></td><td>${e.durationTick} <span class="muted">(${beats(e.durationTick)} B)</span></td><td>${what}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><caption class="sr-only">Ereignisse mit Startzeit und Dauer in Ticks und Beats</caption><thead><tr><th scope="col">Nr.</th><th scope="col">Typ</th><th scope="col">Quelle</th><th scope="col">Start (Ticks)</th><th scope="col">Dauer (Ticks)</th><th scope="col">Inhalt (Spur: Ton)</th></tr></thead><tbody>${rows}</tbody></table></div>${more(limit, r.master.events.length, 'events')}`;
}
