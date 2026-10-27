// @ts-check
/**
 * Theme-Umschalter (hell/dunkel). Die CSS-Tokens (styles/tokens.css) reagieren auf `html[data-theme]` und – ohne dieses
 * Attribut – auf prefers-color-scheme. Der Umschalter setzt nur das Attribut und merkt sich die Wahl (localStorage, optional).
 * Ohne gespeicherte Wahl gilt die Systempräferenz. Speicherfehler (blockiert, privater Modus) verhindern das Umschalten nicht.
 */

import { setIcon } from './icons.js';

export const THEME_KEY = 'ttm-theme';

/** @param {Storage|null|undefined} storage */
function safeGet(storage, key) { try { return storage ? storage.getItem(key) : null; } catch { return null; } }
/** @param {Storage|null|undefined} storage */
function safeSet(storage, key, value) { try { storage?.setItem(key, value); } catch { /* nicht speicherbar: Wahl gilt nur für diese Sitzung */ } }

/** @returns {Storage|null} */
function defaultStorage() { try { return window.localStorage; } catch { return null; } }

/** Gespeichertes Theme oder null. @param {Storage|null} [storage] */
export function storedTheme(storage = defaultStorage()) {
  const v = safeGet(storage, THEME_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

/** Wirksames Theme: explizites Attribut, sonst Systempräferenz. @param {Document} [doc] */
export function effectiveTheme(doc = document) {
  const a = doc.documentElement.getAttribute('data-theme');
  if (a === 'light' || a === 'dark') return a;
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  return mq && mq.matches ? 'dark' : 'light';
}

/**
 * Bindet den Umschalter. @param {HTMLButtonElement} button @param {{ doc?:Document, storage?:Storage|null, onChange?:(theme:'light'|'dark')=>void }} [opts]
 */
export function initTheme(button, { doc = document, storage = defaultStorage(), onChange } = {}) {
  const saved = storedTheme(storage);
  if (saved) doc.documentElement.setAttribute('data-theme', saved);
  /** Zustand für assistive Technologien: aria-pressed = „Dunkles Design ist aktiv“. */
  const sync = () => {
    const dark = effectiveTheme(doc) === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    // Wie im Soundboard: Dunkel aktiv → Sonne (Klick wechselt zu Hell), Hell aktiv → Mond.
    setIcon(button.querySelector('svg'), dark ? 'sun' : 'moon');
  };
  sync();
  button.addEventListener('click', () => {
    const next = effectiveTheme(doc) === 'dark' ? 'light' : 'dark';
    doc.documentElement.setAttribute('data-theme', next);
    safeSet(storage, THEME_KEY, next);
    sync();
    onChange?.(next);
  });
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', sync); // ohne explizite Wahl folgt der Zustand der Systempräferenz
  }
}
