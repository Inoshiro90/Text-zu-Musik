// @ts-check
/** SVG-Piano-Roll mit einer Spur (Lane) je aktiver Spur auf gemeinsamer Zeitachse. Zeichnet nur eine Seite von Master-Ereignissen. */
import { noteLabel } from '../core/scales.js';
import { getInstrument } from '../audio/instrument-catalog.js';
import { esc, beats, PAUSE_LABEL } from './dom.js';

const PX_PER_TICK = 0.3;
const LEFT = 128;
const TOP = 6;
const BOTTOM = 22;
const LANE_GAP = 8;
const LANE_MAX_H = 112;
const LANE_MIN_H = 36;
/** Spurfarben (ergänzend: jede Spur hat eine beschriftete eigene Zeile und ein Kürzel). */
export const TRACK_COLORS = ['#1d4ed8', '#b45309', '#047857', '#9333ea', '#be123c', '#0e7490', '#4d7c0f', '#a21caf'];
export const TRACK_COLORS_DARK = ['#7fb0ff', '#fbbf24', '#34d399', '#d8b4fe', '#fda4af', '#67e8f9', '#bef264', '#f0abfc'];

/** Auswahlmarke (Raute) als SVG-Pfad um den Mittelpunkt; sichtbar nur bei verknüpften/fokussierten Ereignissen (CSS .roll-mark). */
const diamond = (/** @type {number} */ cx, /** @type {number} */ cy) => `<path class="roll-mark" d="M${cx} ${cy - 5}l5 5-5 5-5-5z"/>`;
/** Pausensymbol (zwei Balken) als SVG-Pfad links neben dem Pausenkürzel. */
const pauseBars = (/** @type {number} */ px, /** @type {number} */ py) => `<path class="roll-rest-icon" d="M${px} ${py}h2.6v8h-2.6zM${px + 4.4} ${py}h2.6v8h-2.6z"/>`;

/** Seitengröße in Master-Ereignissen: bei vielen Spuren kleiner, damit höchstens ~1.500 Notenelemente entstehen. @param {number} laneCount */
export function rollPageSize(laneCount) {
  return Math.max(40, Math.min(250, Math.floor(1500 / Math.max(1, laneCount))));
}

/** @param {number} i */
export const trackColorClass = (i) => `tc${i % TRACK_COLORS.length}`;

/**
 * @param {{ events:readonly import('../core/timeline.js').MasterEvent[], totalTicks:number }} master
 * @param {readonly import('../core/pipeline.js').TrackResult[]} lanes  aktive Spuren
 * @param {number} page nullbasiert
 * @returns {{ html:string, pages:number, page:number, from:number, to:number }}
 */
export function renderPianoRoll(master, lanes, page) {
  const events = master.events;
  const size = rollPageSize(lanes.length);
  const pages = Math.max(1, Math.ceil(events.length / size));
  page = Math.min(Math.max(0, page), pages - 1);
  const from = page * size;
  const slice = events.slice(from, from + size);
  if (slice.length === 0) return { html: '', pages, page, from: 0, to: 0 };
  const first = from;
  const last = from + slice.length - 1;
  const t0 = slice[0].startTick;
  const t1 = slice[slice.length - 1].startTick + slice[slice.length - 1].durationTick;
  const width = LEFT + Math.max(40, (t1 - t0) * PX_PER_TICK) + 12;
  const x = (/** @type {number} */ t) => LEFT + (t - t0) * PX_PER_TICK;

  // Lane-Geometrie
  const laneInfo = lanes.map((t, idx) => {
    const notes = t.events.filter((e) => e.seq >= first && e.seq <= last);
    const midis = notes.map((e) => e.midi);
    const lo = midis.length ? Math.min(...midis) - 1 : 59;
    const hi = midis.length ? Math.max(...midis) + 1 : 61;
    const rows = hi - lo + 1;
    const rowH = Math.max(3, Math.min(14, LANE_MAX_H / rows));
    const h = Math.max(LANE_MIN_H, rows * rowH);
    return { t, idx, notes, lo, hi, rowH, h };
  });
  let y = TOP;
  for (const l of laneInfo) { /** @type {any} */ (l).y = y; y += l.h + LANE_GAP; }
  const plotBottom = Math.max(y - LANE_GAP, TOP + LANE_MIN_H);
  const height = plotBottom + BOTTOM;

  let g = '';
  // Taktlinien (Beats) und Achsenbeschriftung
  const firstBeat = Math.ceil(t0 / 480);
  for (let b = firstBeat; b * 480 <= t1; b++) {
    const bx = x(b * 480);
    g += `<line class="roll-beat" x1="${bx}" x2="${bx}" y1="${TOP}" y2="${plotBottom}"/>`;
    if ((b - firstBeat) % 2 === 0) g += `<text class="roll-xlabel" x="${bx + 2}" y="${plotBottom + 14}">${b}</text>`;
  }
  // Lanes
  for (const l of laneInfo) {
    const ly = /** @type {any} */ (l).y;
    const cls = trackColorClass(l.idx);
    const inst = getInstrument(l.t.instrument.program);
    g += `<g class="roll-lane ${cls}"><rect class="roll-lane-bg" x="${LEFT}" y="${ly}" width="${width - LEFT}" height="${l.h}"/>`;
    for (let m = l.lo; m <= l.hi; m++) {
      if ([1, 3, 6, 8, 10].includes(m % 12)) g += `<rect class="roll-row black" x="${LEFT}" y="${ly + (l.hi - m) * l.rowH}" width="${width - LEFT}" height="${l.rowH}"/>`;
    }
    g += `<text class="roll-lane-name" x="6" y="${ly + 13}">${esc(`S${l.idx + 1} ${l.t.name}`.slice(0, 18))}</text>`;
    g += `<text class="roll-lane-sub" x="6" y="${ly + 26}">${esc(inst.name.slice(0, 20))}</text>`;
    g += `<text class="roll-lane-sub" x="6" y="${ly + 39}">${l.notes.length ? esc(`${noteLabel(l.lo + 1).split(' ')[0]}–${noteLabel(l.hi - 1).split(' ')[0]}`) : 'still'}</text></g>`;
  }
  // Pausen: ein durchgehendes Band über alle Spuren (eine fokussierbare Stelle je Pause)
  for (const e of slice) {
    if (e.type !== 'rest') continue;
    const label = `Ereignis ${e.seq + 1}: ${PAUSE_LABEL[e.pauseKind]}, Start ${e.startTick} Ticks, Dauer ${e.durationTick} Ticks (${beats(e.durationTick)} Beats), gilt für alle Spuren`;
    const w = Math.max(2, e.durationTick * PX_PER_TICK - 1);
    g += `<g class="roll-ev rest" data-seq="${e.seq}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title>` +
      `<rect x="${x(e.startTick)}" y="${TOP}" width="${w}" height="${plotBottom - TOP}"/>` +
      (w >= 36 ? `${pauseBars(x(e.startTick) + 3, plotBottom - 12)}<text class="roll-rest-label" x="${x(e.startTick) + 14}" y="${plotBottom - 4}">${e.pauseKind === 'word' ? 'W' : e.pauseKind === 'sentence' ? 'S' : 'A'}</text>` : '') +
      `${diamond(x(e.startTick) + 6, TOP + 6)}</g>`;
  }
  // Noten je Lane
  for (const l of laneInfo) {
    const ly = /** @type {any} */ (l).y;
    const cls = trackColorClass(l.idx);
    for (const e of l.notes) {
      const ex = x(e.startTick);
      const w = Math.max(3, e.durationTick * PX_PER_TICK - 1);
      const ny = ly + (l.hi - e.midi) * l.rowH;
      const label = `Spur ${l.idx + 1} ${l.t.name} – Ereignis ${e.seq + 1}: Note ${noteLabel(e.midi)}, Start ${e.startTick} Ticks, Dauer ${e.durationTick} Ticks`;
      g += `<g class="roll-ev note ${cls}" data-seq="${e.seq}" data-track="${esc(l.t.id)}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title>` +
        `<rect x="${ex}" y="${ny + 0.5}" width="${w}" height="${Math.max(2, l.rowH - 1)}" rx="2"/>` +
        (w >= 30 && l.rowH >= 9 ? `<text class="roll-note-label" x="${ex + 3}" y="${ny + l.rowH - 3}">${esc(e.name)}</text>` : '') +
        `${diamond(ex + 5, ny - 1)}</g>`;
    }
  }
  const html = `<div class="roll-scroll" tabindex="-1"><svg class="roll" role="group" aria-label="Piano-Roll mit ${lanes.length} Spur${lanes.length === 1 ? '' : 'en'}, Ereignisse ${from + 1} bis ${from + slice.length}. Dieselben Informationen stehen in der Ereignisliste." width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${g}</svg></div>`;
  return { html, pages, page, from, to: from + slice.length };
}
