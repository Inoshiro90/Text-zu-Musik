// @ts-check
/**
 * Scala-Dateiformat (.scl) lesen und schreiben (Phase F). Format nach Manuel Op de Coul (Huygens-Fokker):
 *   Zeilen mit „!“ am Anfang sind Kommentare. Erste Nicht-Kommentarzeile: Beschreibung (darf leer sein). Zweite: Anzahl der
 *   Töne. Danach je Zeile ein Ton: mit Punkt = Cent („701.955“), sonst Verhältnis („3/2“) oder ganze Zahl („2“ = 2/1).
 *   Der Grundton 1/1 steht nicht in der Datei; der letzte Ton ist die Periode (meist 2/1 = 1200 Cent).
 */

/** @typedef {{ description:string, pitches:number[], warnings:string[] }} ScalaScale  pitches in Cent, Periode = letzter Wert */

const CENTS_RE = /^-?\d*\.\d*$|^-?\d+\.$/;
const RATIO_RE = /^(\d+)\s*\/\s*(\d+)$/;
const INT_RE = /^\d+$/;

/** Ton einer Scala-Zeile in Cent; null bei ungültiger Angabe. @param {string} token */
export function parsePitch(token) {
  const t = token.trim();
  if (CENTS_RE.test(t)) { const v = Number(t); return Number.isFinite(v) ? v : null; }
  const r = RATIO_RE.exec(t);
  if (r) { const a = Number(r[1]); const b = Number(r[2]); return a > 0 && b > 0 ? 1200 * Math.log2(a / b) : null; }
  if (INT_RE.test(t)) { const a = Number(t); return a > 0 ? 1200 * Math.log2(a) : null; }
  return null;
}

/**
 * Liest eine .scl-Datei. Wirft Error mit deutscher Meldung bei unbrauchbarem Inhalt.
 * @param {string} text
 * @returns {ScalaScale}
 */
export function parseScala(text) {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => !l.startsWith('!'));
  if (lines.length < 2) throw new Error('Keine gültige Scala-Datei: Beschreibung und Anzahl der Töne fehlen.');
  const description = lines[0].trim();
  const count = Number(lines[1].trim().split(/\s+/)[0]);
  if (!Number.isInteger(count) || count < 1 || count > 1200) throw new Error('Keine gültige Scala-Datei: Die Anzahl der Töne fehlt oder ist unplausibel.');
  const body = lines.slice(2).map((l) => l.trim()).filter((l) => l !== '');
  if (body.length < count) throw new Error(`Die Datei kündigt ${count} Töne an, enthält aber nur ${body.length}.`);
  /** @type {number[]} */ const pitches = [];
  for (let i = 0; i < count; i++) {
    const token = body[i].split(/\s+/)[0];
    const c = parsePitch(token);
    if (c === null) throw new Error(`Ton ${i + 1} („${token}“) ist weder Cent-Wert noch Verhältnis.`);
    pitches.push(c);
  }
  /** @type {string[]} */ const warnings = [];
  if (body.length > count) warnings.push(`${body.length - count} zusätzliche Zeile(n) nach dem letzten Ton ignoriert.`);
  return { description, pitches, warnings };
}

/**
 * Wandelt eine gelesene Scala-Datei in einen Bibliothekseintrag (kind 'tuning', Belegstatus C, Quelle USER-SCALA).
 * Töne werden sortiert; Töne ≤ 0 oder ≥ Periode und Doppelte entfallen (mit Hinweis).
 * @param {ScalaScale} scl @param {string} fileName
 * @returns {{ entry:import('./schema.js').TonalSystem, warnings:string[] }}
 */
export function scalaToSystem(scl, fileName) {
  const warnings = [...scl.warnings];
  const period = scl.pitches[scl.pitches.length - 1];
  if (!(period >= 100 && period <= 4800)) throw new Error(`Die Periode (letzter Ton, ${period.toFixed(1)} Cent) liegt außerhalb von 100–4800 Cent.`);
  const round = (/** @type {number} */ v) => Math.round(v * 1000) / 1000;
  const inner = scl.pitches.slice(0, -1).map(round);
  const kept = [...new Set(inner.filter((c) => c > 0 && c < round(period)))].sort((a, b) => a - b);
  if (kept.length !== inner.length) warnings.push(`${inner.length - kept.length} Ton/Töne außerhalb der Periode oder doppelt – ignoriert.`);
  const base = String(fileName ?? '').replace(/\.scl$/i, '');
  const slug = base.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'scala';
  const name = (scl.description || base || 'Eigene Tonleiter').slice(0, 80);
  return {
    entry: {
      id: `user-${slug}`, name, aliases: base && base !== name ? [base] : [],
      region: ['global'], tradition: 'Eigene Scala-Datei', family: 'user', kind: 'tuning',
      evidence: 'C', sources: ['USER-SCALA'],
      pitch: { unit: 'cents', steps: [0, ...kept], ...(round(period) !== 1200 ? { period: round(period) } : {}) },
      notes: `Importiert aus „${base || 'Scala-Datei'}.scl“. Inhalt nicht geprüft; gilt nur bis zum Neuladen der Seite.`,
    },
    warnings,
  };
}

/** Zahl für Scala: Cent immer mit Punkt. @param {number} c */
const centsToken = (c) => {
  const s = (Math.round(c * 1000) / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0');
  return s;
};

/**
 * Schreibt ein Tonsystem als .scl-Text (alle Töne in Cent; Periode als letzter Ton).
 * @param {import('./schema.js').TonalSystem} system
 * @returns {string}
 */
export function toScala(system) {
  const p = system.pitch;
  const cents = p.steps.map((s) => (p.unit === 'semitones' ? s * 100 : s));
  const period = p.unit === 'cents' ? (p.period ?? 1200) : 1200;
  const tones = [...cents.slice(1), period];
  const desc = `${system.name} – ${system.tradition}`.replace(/[\r\n]+/g, ' ');
  return [
    `! ${system.id}.scl`,
    '!',
    `! Exportiert aus Text-zu-Musik (Tonsystem-Bibliothek). Belegstatus ${system.evidence}; Quellen: ${system.sources.join(', ')}.`,
    ...(p.descending ? ['! Hinweis: Die Abstiegsform ist im Scala-Format nicht darstellbar und fehlt.'] : []),
    desc,
    ` ${tones.length}`,
    '!',
    ...tones.map((c) => ` ${centsToken(c)}`),
    '',
  ].join('\n');
}

/** Sicherer Dateiname für den Export. @param {import('./schema.js').TonalSystem} system */
export const scalaFilename = (system) => `${system.id}.scl`;
