// @ts-check
/**
 * Spuren (Tracks): Datenmodell, Zeichenregeln (Routing) und Track-Ereignisse.
 * Alle Spuren teilen Text, Bytes, Tokens und die Master-Zeitachse. Eine Spur wählt nur, WELCHE Zeichen sie hörbar macht
 * und mit WELCHEM Mapping deren Byte-Noten klingen. Nicht gespielte Positionen bleiben still (kein Zusammenrücken).
 *
 * @typedef {{ type:'all'|'vowels'|'consonants'|'digits'|'otherLetters'|'symbols'|'emoji'|'custom', chars:string, caseSensitive:boolean, yIsVowel:boolean }} TrackRule
 * @typedef {{ mode:'A'|'A2'|'B', scaleId:string, root:number, lo:number, hi:number }} TrackMapping
 * @typedef {{ id:string, name:string, enabled:boolean, rule:TrackRule, mapping:TrackMapping, instrument:{ program:number } }} TrackConfig
 */
import { classifyChar, segmentGraphemes } from './text.js';
import { validateMapping } from './mapping.js';

export const MAX_TRACKS = 20;
export const MAX_NAME_LENGTH = 40;
export const MAX_CUSTOM_CHARS = 500;

export const RULE_TYPES = Object.freeze([
  { id: 'all', label: 'Alle notenfähigen Zeichen', help: 'Jedes Zeichen, das eine Note erzeugt (Buchstaben, Ziffern, Symbole, Emoji …). Entspricht der bisherigen Einzelspur.' },
  { id: 'vowels', label: 'Vokale', help: 'A E I O U Ä Ö Ü (auch Kleinbuchstaben, Akzentbuchstaben wie é, å und æ œ ø). Y nur mit der Option unten.' },
  { id: 'consonants', label: 'Konsonanten', help: 'Lateinische Buchstaben, die nicht zur aktiven Vokalmenge gehören (inkl. ß, Y ohne Option).' },
  { id: 'digits', label: 'Ziffern', help: 'Dezimalziffern 0–9 (und andere Unicode-Dezimalziffern).' },
  { id: 'otherLetters', label: 'Weitere Buchstaben', help: 'Buchstaben anderer Schriften (z. B. griechisch, kyrillisch, arabisch, CJK), die nicht lateinisch sind.' },
  { id: 'symbols', label: 'Symbole', help: 'Symbolzeichen wie + = € $ ♪ (ohne Emoji).' },
  { id: 'emoji', label: 'Emoji und Piktogramme', help: 'Emoji und Piktogramme (Unicode „Extended Pictographic“).' },
  { id: 'custom', label: 'Eigene Zeichenmenge', help: 'Zeichen, die du selbst angibst.' },
]);
const RULE_IDS = new Set(RULE_TYPES.map((r) => r.id));

/** @param {string} id */
export const ruleLabel = (id) => RULE_TYPES.find((r) => r.id === id)?.label ?? id;

/* ---------- eigene Zeichenmenge ---------- */

/**
 * Zerlegt die Eingabe in Grapheme (wie die Textanalyse). Leerraum, Komma und Semikolon trennen nur.
 * Satzzeichen und Satzendzeichen sind immer Pausen und können nicht Teil einer Menge sein (werden gemeldet).
 * @param {string} input
 * @param {{ normalizeNfc:boolean, caseSensitive:boolean }} opts
 * @returns {{ chars:string[], ignored:string[], duplicates:number }}
 */
export function parseCustomChars(input, { normalizeNfc, caseSensitive }) {
  const { segments } = segmentGraphemes(String(input ?? ''));
  /** @type {string[]} */ const chars = [];
  /** @type {string[]} */ const ignored = [];
  const seen = new Set();
  let duplicates = 0;
  for (const seg of segments) {
    if (seg === ',' || seg === ';') continue;
    const kind = classifyChar(seg);
    if (kind === 'whitespace' || kind === 'control') continue;
    if (kind === 'sentenceEnd' || kind === 'punctuation') { if (!ignored.includes(seg)) ignored.push(seg); continue; }
    const key = caseKey(seg, normalizeNfc, caseSensitive);
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    chars.push(seg);
  }
  return { chars, ignored, duplicates };
}

/** @param {string} g @param {boolean} nfc @param {boolean} caseSensitive */
function caseKey(g, nfc, caseSensitive) {
  const n = nfc ? g.normalize('NFC') : g;
  return caseSensitive ? n : n.toLowerCase();
}

/* ---------- Regeln ---------- */

const EXTRA_VOWELS = new Set(['æ', 'œ', 'ø']);
const BASE_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const LETTER_RE = /^\p{L}\p{M}*$/u;
const LATIN_RE = /^\p{Script=Latin}/u;

/** Buchstaben-Grundzeichen (NFD, ohne diakritische Zeichen), klein; null, wenn das Anzeigezeichen kein Buchstabe ist. @param {string} g */
function letterBase(g) {
  const d = g.normalize('NFD');
  if (!LETTER_RE.test(d)) return null;
  return /** @type {string} */ (Array.from(d)[0]).toLowerCase();
}

/** @param {string} base @param {boolean} y */
const isVowelBase = (base, y) => BASE_VOWELS.has(base) || EXTRA_VOWELS.has(base) || (y && base === 'y');

/**
 * Kompiliert eine Regel zu einem Prädikat über Anzeigezeichen der vorhandenen Textanalyse.
 * Nur Zeichen der Klasse `normal` (notenfähig) können getroffen werden.
 * @param {TrackRule} rule @param {{ normalizeNfc:boolean }} opts
 * @returns {(ch:import('./text.js').SourceChar)=>boolean}
 */
export function compileRule(rule, { normalizeNfc }) {
  const y = rule.yIsVowel === true;
  switch (rule.type) {
    case 'all': return (c) => c.kind === 'normal';
    case 'vowels': return (c) => { if (c.kind !== 'normal') return false; const b = letterBase(c.text); return b !== null && isVowelBase(b, y); };
    case 'consonants': return (c) => { if (c.kind !== 'normal') return false; const b = letterBase(c.text); return b !== null && LATIN_RE.test(b) && !isVowelBase(b, y); };
    case 'otherLetters': return (c) => { if (c.kind !== 'normal') return false; const b = letterBase(c.text); return b !== null && !LATIN_RE.test(b); };
    case 'digits': return (c) => c.kind === 'normal' && /^\p{Nd}$/u.test(c.text);
    case 'symbols': return (c) => c.kind === 'normal' && /^\p{S}+$/u.test(c.text) && !/\p{Extended_Pictographic}/u.test(c.text);
    case 'emoji': return (c) => c.kind === 'normal' && /\p{Extended_Pictographic}/u.test(c.text);
    case 'custom': {
      const cs = rule.caseSensitive === true;
      const set = new Set(parseCustomChars(rule.chars, { normalizeNfc, caseSensitive: cs }).chars.map((g) => caseKey(g, normalizeNfc, cs)));
      return (c) => c.kind === 'normal' && set.has(caseKey(c.text, normalizeNfc, cs));
    }
    default: return () => false;
  }
}

/** Welche Anzeigezeichen trifft die Regel? 1 = ja. Index = SourceChar.index. @param {readonly import('./text.js').SourceChar[]} chars @param {TrackRule} rule @param {{ normalizeNfc:boolean }} opts */
export function routeChars(chars, rule, opts) {
  const test = compileRule(rule, opts);
  const mask = new Uint8Array(chars.length);
  for (let i = 0; i < chars.length; i++) if (test(chars[i])) mask[i] = 1;
  return mask;
}

/** Schlüssel der Routing-Wirkung (nur relevante Regelfelder). @param {TrackRule} r @param {boolean} nfc */
export function ruleKey(r, nfc) {
  const nf = nfc ? 'nfc' : 'raw';
  if (r.type === 'custom') return `custom|${nf}|${r.caseSensitive ? 'cs' : 'ci'}|${r.chars}`;
  if (r.type === 'vowels' || r.type === 'consonants') return `${r.type}|${r.yIsVowel ? 'y' : 'n'}`;
  return r.type;
}

/** Kurzbeschreibung der Regel für Übersichten. @param {TrackRule} r */
export function describeRule(r) {
  if (r.type === 'custom') {
    const { chars } = parseCustomChars(r.chars, { normalizeNfc: true, caseSensitive: r.caseSensitive });
    const shown = chars.slice(0, 12).join(' ');
    return `Eigene Menge: ${shown}${chars.length > 12 ? ` … (${chars.length})` : ''}${r.caseSensitive ? ' (Groß-/Kleinschreibung beachtet)' : ''}`;
  }
  const base = ruleLabel(r.type);
  return (r.type === 'vowels' || r.type === 'consonants') && r.yIsVowel ? `${base} (Y zählt als Vokal)` : base;
}

/* ---------- Modell ---------- */

export const DEFAULT_RULE = Object.freeze({ type: /** @type {const} */ ('all'), chars: '', caseSensitive: false, yIsVowel: false });
export const DEFAULT_TRACK_MAPPING = Object.freeze({ mode: /** @type {const} */ ('B'), scaleId: 'dur', root: 0, lo: 60, hi: 84 });

/** Ergänzt fehlende Felder mit Standardwerten (prüft nichts). @param {Partial<TrackConfig>&Record<string,any>} t @param {number} index */
export function normalizeTrack(t, index = 0) {
  const r = /** @type {Partial<TrackRule>} */ (t.rule ?? {});
  const m = /** @type {Partial<TrackMapping>} */ (t.mapping ?? {});
  return /** @type {TrackConfig} */ ({
    id: typeof t.id === 'string' ? t.id : '',
    name: typeof t.name === 'string' ? t.name : `Spur ${index + 1}`,
    enabled: t.enabled !== false,
    rule: { type: r.type ?? 'all', chars: typeof r.chars === 'string' ? r.chars : '', caseSensitive: r.caseSensitive === true, yIsVowel: r.yIsVowel === true },
    mapping: { mode: m.mode ?? DEFAULT_TRACK_MAPPING.mode, scaleId: m.scaleId ?? DEFAULT_TRACK_MAPPING.scaleId, root: m.root ?? DEFAULT_TRACK_MAPPING.root, lo: m.lo ?? DEFAULT_TRACK_MAPPING.lo, hi: m.hi ?? DEFAULT_TRACK_MAPPING.hi },
    instrument: { program: t.instrument?.program ?? 0 },
  });
}

/**
 * Prüft eine (normalisierte) Spur. Fehlerschlüssel: name, ruleType, ruleChars, mode, scaleId, root, lo, hi, program.
 * @param {TrackConfig} t @param {{ normalizeNfc?:boolean }} [opts]
 * @returns {{ errors:Record<string,string>, warnings:string[], noteCount:number|null }}
 */
export function validateTrack(t, { normalizeNfc = true } = {}) {
  /** @type {Record<string,string>} */ const errors = {};
  /** @type {string[]} */ const warnings = [];
  if (typeof t.name !== 'string' || t.name.trim() === '') errors.name = 'Bitte einen Namen eingeben.';
  else if (t.name.length > MAX_NAME_LENGTH) errors.name = `Der Name darf höchstens ${MAX_NAME_LENGTH} Zeichen lang sein.`;
  if (!RULE_IDS.has(t.rule.type)) errors.ruleType = 'Unbekannte Zeichenregel.';
  if (t.rule.type === 'custom') {
    const { chars, ignored, duplicates } = parseCustomChars(t.rule.chars, { normalizeNfc, caseSensitive: t.rule.caseSensitive });
    if (chars.length === 0) errors.ruleChars = ignored.length > 0
      ? `Die Menge enthält nur Satzzeichen (${ignored.join(' ')}). Satzzeichen und Leerraum sind immer Pausen und können nicht Teil einer Zeichenmenge sein.`
      : 'Die Zeichenmenge ist leer. Gib mindestens ein Zeichen ein, z. B. „A, B, C, X“ oder „ABCX“.';
    else if (chars.length > MAX_CUSTOM_CHARS) errors.ruleChars = `Höchstens ${MAX_CUSTOM_CHARS} verschiedene Zeichen.`;
    else {
      if (ignored.length > 0) warnings.push(`Ignoriert (Satzzeichen sind immer Pausen): ${ignored.join(' ')}`);
      if (duplicates > 0) warnings.push(`${duplicates} doppelte Angabe(n) zusammengefasst.`);
    }
  }
  const mv = validateMapping(t.mapping);
  for (const [k, v] of Object.entries(mv.errors)) errors[k] = v;
  warnings.push(...mv.warnings);
  if (!Number.isInteger(t.instrument.program) || t.instrument.program < 0 || t.instrument.program > 127) errors.program = 'Instrument: General-MIDI-Programm 0–127 erwartet.';
  return { errors, warnings, noteCount: mv.noteCount };
}

/** Nächste freie, stabile Spur-ID („track-N“). @param {readonly {id:string}[]} tracks */
export function nextTrackId(tracks) {
  const used = new Set(tracks.map((t) => t.id));
  let n = tracks.length + 1;
  while (used.has(`track-${n}`)) n++;
  return `track-${n}`;
}

/** Neue Standardspur (Regel „alle“, Dur 60–84, Klavier). @param {readonly TrackConfig[]} tracks @param {Partial<TrackConfig>} [over] */
export function createTrack(tracks, over = {}) {
  const id = nextTrackId(tracks);
  const n = tracks.length + 1;
  const base = normalizeTrack({ name: `Spur ${n}`, ...over, id }, n - 1);
  return /** @type {TrackConfig} */ ({ ...base, id });
}

/** Kopie mit neuer ID und Namen „… (Kopie)“. @param {readonly TrackConfig[]} tracks @param {string} id */
export function duplicateTrack(tracks, id) {
  const src = tracks.find((t) => t.id === id);
  if (!src) return null;
  const nid = nextTrackId(tracks);
  const name = `${src.name} (Kopie)`.slice(0, MAX_NAME_LENGTH);
  return /** @type {TrackConfig} */ ({ ...structuredClone(src), id: nid, name });
}

/** Vorlage „Vokale + Konsonanten“: zwei Spuren (Konsonanten Klavier, Vokale Cello-ähnlich höher). @param {readonly TrackConfig[]} tracks */
export function vowelConsonantTemplate(tracks) {
  const c = createTrack(tracks, { name: 'Konsonanten', rule: { type: 'consonants', chars: '', caseSensitive: false, yIsVowel: false }, mapping: { mode: 'B', scaleId: 'dur', root: 0, lo: 48, hi: 72 }, instrument: { program: 0 } });
  const v = createTrack([...tracks, c], { name: 'Vokale', rule: { type: 'vowels', chars: '', caseSensitive: false, yIsVowel: false }, mapping: { mode: 'B', scaleId: 'dur', root: 0, lo: 60, hi: 84 }, instrument: { program: 73 } });
  return [c, v];
}

/* ---------- Track-Ereignisse und Routing-Übersicht ---------- */

/**
 * Notenereignisse einer Spur: alle Master-Noten, deren Quellzeichen getroffen wird, mit der Tonhöhe dieser Spur.
 * Startticks/Dauern kommen unverändert aus der Master-Zeitachse (Stille bleibt Stille).
 * @param {readonly import('./timeline.js').MasterEvent[]} masterEvents
 * @param {Uint8Array} mask  Treffer je Anzeigezeichen
 * @param {readonly import('./mapping.js').MappedNote[]} table  Mapping-Tabelle der Spur (256 Einträge)
 * @param {string} trackId
 */
export function buildTrackEvents(masterEvents, mask, table, trackId) {
  /** @type {import('./timeline.js').NoteEvent[]} */
  const out = [];
  for (const e of masterEvents) {
    if (e.type !== 'note' || mask[e.source.charIndex] !== 1) continue;
    const m = table[e.source.byteValue];
    out.push(Object.freeze({ ...e, midi: m.midi, name: m.name, explain: m.explain, trackId }));
  }
  return Object.freeze(out);
}

/**
 * Wie verteilen sich die notenfähigen Zeichen auf die aktiven Spuren?
 * @param {readonly import('./text.js').SourceChar[]} chars
 * @param {readonly { id:string, name:string, mask:Uint8Array }[]} active  aktive Spuren
 */
export function summarizeRouting(chars, active) {
  let noteChars = 0;
  let unassigned = 0;
  let overlapChars = 0;
  /** @type {Map<string, number>} */ const pairs = new Map();
  /** @type {Record<string, number>} */ const perTrack = {};
  for (const t of active) perTrack[t.id] = 0;
  /** @type {number[]} */ const unassignedSample = [];
  const n = active.length;
  /** @type {number[]} */ const hit = new Array(n);
  for (const ch of chars) {
    if (ch.kind !== 'normal') continue;
    noteChars++;
    let h = 0;
    for (let k = 0; k < n; k++) if (active[k].mask[ch.index] === 1) { hit[h++] = k; perTrack[active[k].id]++; }
    if (h === 0) { unassigned++; if (unassignedSample.length < 12) unassignedSample.push(ch.index); }
    if (h > 1) {
      overlapChars++;
      for (let i = 0; i < h; i++) for (let j = i + 1; j < h; j++) { const k = `${active[hit[i]].id}|${active[hit[j]].id}`; pairs.set(k, (pairs.get(k) ?? 0) + 1); }
    }
  }
  const overlaps = [...pairs].map(([k, count]) => { const [a, b] = k.split('|'); return { a, b, chars: count }; });
  return Object.freeze({ noteChars, unassigned, unassignedSample: Object.freeze(unassignedSample), overlapChars, overlaps: Object.freeze(overlaps), perTrack: Object.freeze(perTrack) });
}
