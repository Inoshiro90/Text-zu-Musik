// @ts-check
/** Kleine DOM-/Format-Helfer ohne fachliche Logik. */
import { ticksToBeats } from '../core/config.js';
import { iconSvg } from './icons.js';

/** @param {unknown} s */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Sichtbare Darstellung für Leer-/Steuerzeichen. @param {string} t */
export function visibleChar(t) {
  if (t === ' ') return '␣';
  if (t === '\t') return '⇥';
  if (t === '\n') return '⏎';
  const out = Array.from(t).map((ch) => {
    const cp = /** @type {number} */ (ch.codePointAt(0));
    return /[\p{Cc}\p{Cf}\p{Zs}]/u.test(ch) ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : ch;
  });
  return out.join('');
}

/** @param {string} id */
export const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/** Beats in deutscher Schreibweise. @param {number} ticks */
export const beats = (ticks) => ticksToBeats(ticks).toLocaleString('de-DE', { maximumFractionDigits: 4 });

/** @param {number} n */
export const num = (n) => n.toLocaleString('de-DE');

export const PAUSE_LABEL = { word: 'Wortpause', sentence: 'Satzpause', paragraph: 'Absatzpause', clause: 'Teilsatzpause' };
export const ROLE_LABEL = { note: 'Note', structure: 'Pause/Struktur', ignored: 'ignoriert' };
/** Rollen-Symbole der Byte-Blöcke (SVG aus der zentralen Icon-Registry; Text steht zusätzlich in ROLE_LABEL). */
export const ROLE_ICON = { note: iconSvg('music'), structure: iconSvg('pause'), ignored: iconSvg('x') };

/* ---------- Meldungen und Marker (Icons nur aus ui/icons.js) ---------- */
export { iconSvg };

/** Icon je Meldungsstufe. */
const LEVEL_ICON = { info: 'info', ok: 'check', warn: 'triangle-alert', stale: 'refresh-cw', error: 'x' };

/** Inhalt einer Meldung: Icon + Text. @param {keyof typeof LEVEL_ICON} level @param {string} html bereits maskiertes HTML */
export const msgInner = (level, html) => `<span class="msg__icon">${iconSvg(LEVEL_ICON[level])}</span><span class="msg__text">${html}</span>`;

/** Hinweisabsatz für dynamische Bereiche. @param {'info'|'warn'|'error'} level @param {string} html bereits maskiertes HTML @param {string} [attrs] */
export const noticeHtml = (level, html, attrs = '') => `<p class="${level === 'info' ? 'notice' : `notice ${level}`}"${attrs}>${msgInner(level, html)}</p>`;

/** Statuszeile mit data-level setzen (Icon + Text; leerer Text leert das Element). @param {HTMLElement} el @param {keyof typeof LEVEL_ICON} level @param {string} text @param {string} [label] fetter Präfix, z. B. „Veraltet:“ */
export function setMessage(el, level, text, label = '') {
  el.setAttribute('data-level', level);
  el.innerHTML = text === '' ? '' : msgInner(level, `${label ? `<strong class="msg__label">${esc(label)}</strong> ` : ''}${esc(text)}`);
}

/** Inhalt eines Feldfehlers (leer = kein Fehler). @param {string} msg */
export const errorInner = (msg) => (msg ? `${iconSvg('x')}<span>${esc(msg)}</span>` : '');

/** @param {Element} el @param {string} msg */
export function setFieldError(el, msg) { el.innerHTML = errorInner(msg); }

/** Marker „verknüpft“ bzw. „spielt gerade“ (nur sichtbar bei .linked/.playing, siehe styles/components/data.css). */
export const linkMark = () => `<span class="link-mark" aria-hidden="true">${iconSvg('arrow-right-left')}</span>`;
export const playMark = () => `<span class="play-mark" aria-hidden="true">${iconSvg('play')}</span>`;
