// @ts-check
/** Globale Einstellungen (Dauern, Absatz, NFC, Tempo): füllen, auslesen, Fehler anzeigen. Spur-Einstellungen: ui/tracks-view.js. */
import { DEFAULT_CONFIG, beatsToTicks, ticksToBeats } from '../core/config.js';
import { $, esc, setFieldError, msgInner } from './dom.js';

const FIELDS = ['noteTicks', 'wordPauseTicks', 'sentencePauseTicks', 'paragraphPauseTicks', 'tempoBpm'];
const form = () => /** @type {HTMLFormElement} */ ($('settings'));
/** @param {string} name */
const field = (name) => /** @type {HTMLInputElement} */ (form().elements.namedItem(name));

export function initSettings() {
  writeSettings(DEFAULT_CONFIG);
}

/** @param {import('../core/config.js').Config} c */
export function writeSettings(c) {
  field('noteTicks').value = String(ticksToBeats(c.noteTicks));
  field('wordPauseTicks').value = String(ticksToBeats(c.wordPauseTicks));
  field('sentencePauseTicks').value = String(ticksToBeats(c.sentencePauseTicks));
  field('paragraphPauseTicks').value = String(ticksToBeats(c.paragraphPauseTicks));
  field('paragraphPause').checked = c.paragraphPause;
  field('normalizeNfc').checked = c.normalizeNfc;
  field('tempoBpm').value = String(c.tempoBpm);
}

/** Liest die globalen Felder als (noch nicht validierte) Konfiguration. Leere/ungültige Zahlen werden zu NaN. */
export function readSettings() {
  const n = (/** @type {string} */ name) => (field(name).value.trim() === '' ? NaN : Number(field(name).value));
  return {
    noteTicks: beatsToTicks(n('noteTicks')),
    wordPauseTicks: beatsToTicks(n('wordPauseTicks')),
    sentencePauseTicks: beatsToTicks(n('sentencePauseTicks')),
    paragraphPauseTicks: beatsToTicks(n('paragraphPauseTicks')),
    paragraphPause: field('paragraphPause').checked,
    normalizeNfc: field('normalizeNfc').checked,
    tempoBpm: n('tempoBpm'),
  };
}

/** @param {Record<string,string>} errors @param {string[]} warnings */
export function showValidation(errors, warnings) {
  for (const f of FIELDS) {
    const msg = errors[f] ?? '';
    setFieldError($(`e-${f}`), msg);
    const input = field(f);
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  $('settings-warnings').innerHTML = warnings.map((w) => `<li>${msgInner('warn', esc(w))}</li>`).join('');
}
