// @ts-check
/** Spuren-Oberfläche: Karten mit Kurzinfo und Bedienelementen, aufklappbarer Editor, Routing-Übersicht. Keine fachliche Logik. */
import { RULE_TYPES, RULE_GROUPS, describeRule, parseCustomChars, sonorityDefaults } from '../core/tracks.js';
import { isSonorityId } from '../core/sonority-classes.js';
import { PITCH_CLASS_NAMES, noteLabel, noteName, pitchName, getTonalSystem, resolvePitches, hasDescending, hasApplicableRules, isTwelveTone } from '../core/scales.js';
import { resolveSystemPitches } from '../core/tonal/pitch.js';
import { periodOf } from '../core/tonal/schema.js';
import { allTonalSystems } from '../core/tonal/library.js';
import { searchSystems, groupByFamily, availableFilters, materialSiblings, sourcesOf, stepPattern, isSimplified, isMicrotonal, KIND_LABELS, EVIDENCE_LABELS, regionName } from '../core/tonal/catalog.js';
import { CATEGORIES, INSTRUMENTS, primaryCategory, resolveInstrument, searchEntries, instrumentKey } from '../audio/instrument-catalog.js';
import { esc, num, iconSvg, errorInner, noticeHtml } from './dom.js';
import { trackColorClass } from './piano-roll.js';

/** @typedef {{ mute:boolean, solo:boolean, volume:number }} TrackUi */

/** @param {import('../core/tracks.js').TrackMapping} m */
export function describeMapping(m) {
  if (m.mode === 'A') return 'Modus A (0–127)';
  if (m.mode === 'A2') return `Modus A2 ${noteLabel(m.lo)}–${noteLabel(m.hi)}`;
  const sc = getTonalSystem(m.scaleId)?.name ?? m.scaleId;
  const micro = getTonalSystem(m.scaleId) && !isTwelveTone(m.scaleId) ? (m.microtonal === 'nearest' ? 'mikrotonal, gerundet' : 'mikrotonal') : '';
  const opts = [micro, m.direction === 'contour' && hasDescending(m.scaleId) ? 'Auf-/Abstieg' : '', m.rules === 'apply' && hasApplicableRules(m.scaleId) ? 'Tonhierarchie' : ''].filter(Boolean);
  return `${sc} ab ${PITCH_CLASS_NAMES[m.root] ?? '?'}, ${noteLabel(m.lo)}–${noteLabel(m.hi)}${opts.length ? ` · ${opts.join(' · ')}` : ''}`;
}

/** Zusätzliche Sichtbarkeits-Schlüssel im Editor: „dir“ (Tonleiter hat Abstiegsform), „hier“ (hat Tonhierarchie). @param {import('../core/tracks.js').TrackMapping} m */
function mappingShowKeys(m) {
  if (m.mode !== 'B') return [];
  const sys = getTonalSystem(m.scaleId);
  return [hasDescending(m.scaleId) ? 'dir' : '', hasApplicableRules(m.scaleId) ? 'hier' : '', sys && !isTwelveTone(m.scaleId) ? 'micro' : ''].filter(Boolean);
}

/** Kurzinfo einer Spur (für die Karte). @param {import('../core/tracks.js').TrackConfig} t @param {import('../core/pipeline.js').TrackResult|undefined} res @param {number} index */
export function trackInfoHtml(t, res, index) {
  const inst = resolveInstrument(t.instrument);
  const cat = primaryCategory(t.instrument);
  const notes = res ? `${num(res.noteCount)} Note${res.noteCount === 1 ? '' : 'n'} · ${num(res.matchedChars)} Zeichen` : '';
  return `<dl class="track-info"><div><dt>Zeichenregel</dt><dd>${esc(describeRule(t.rule))}</dd></div>` +
    `<div><dt>Instrument</dt><dd>${esc(inst.name)} <span class="muted">(${inst.sound ? `Klangprofil, MIDI-Export: ${esc(inst.gmName)}, GM ${inst.gmNumber}` : `GM ${inst.gmNumber}`}, ${esc(cat.label)})</span></dd></div>` +
    `<div><dt>Tonhöhen</dt><dd>${esc(describeMapping(t.mapping))}</dd></div>` +
    (notes ? `<div><dt>Ergebnis</dt><dd>${notes}${res && res.noteCount === 0 && t.enabled ? ' – <strong>spielt nichts</strong>' : ''}</dd></div>` : '') + '</dl>';
}

/** @param {string} id @param {string} f */
const fid = (id, f) => `te-${id}-${f}`;

/** @param {readonly { value:string|number, label:string }[]} options */
function selectOptions(/** @type {string|number} */ value, options) {
  return options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
}

/**
 * Optionsliste der Instrumentauswahl: General-MIDI-Programme und ergänzende Klangprofile (Wert „12“ bzw. „s:snare“).
 * Das aktuelle Instrument bleibt immer wählbar, auch wenn Kategorie/Suche es ausblenden.
 * @param {string} category @param {string} query @param {{ program:number, sound?:string }} selected
 */
export function instrumentOptionsHtml(category, query, selected) {
  const list = searchEntries(category, query);
  const key = instrumentKey(selected);
  const cur = resolveInstrument(selected);
  const withSel = list.some((i) => i.key === key) ? list : [{ key, label: cur.sound ? `${cur.name} (Klangprofil)` : `${cur.gmNumber}. ${cur.name}` }, ...list];
  return withSel.map((i) => `<option value="${esc(i.key)}"${i.key === key ? ' selected' : ''}>${esc(i.label)}</option>`).join('');
}

/* ---------- Tonleiterauswahl (Tonsystem-Bibliothek) ---------- */

/** Filterwerte, die in der Bibliothek vorkommen (berechnet einmal beim Laden). */
const FILTERS = availableFilters();

/** Zuletzt verwendete Tonleitern (höchstens 5; Verwaltung und Speicherung in ui/app.js). @type {string[]} */
let RECENT = [];
export const MAX_RECENT_SCALES = 5;

/** @param {readonly string[]} ids */
export function setRecentScales(ids) {
  RECENT = [...new Set(ids)].filter((id) => getTonalSystem(id)).slice(0, MAX_RECENT_SCALES);
}
export const getRecentScales = () => [...RECENT];

/** Neue Liste mit `id` vorne. @param {readonly string[]} list @param {string} id */
export const pushRecent = (list, id) => [id, ...list.filter((x) => x !== id)].slice(0, MAX_RECENT_SCALES);

/** @typedef {{ region?:string, kind?:string, query?:string }} ScaleFilter */

/** Optionstext mit Kennzeichen als Text (nicht nur Farbe). @param {import('../core/tonal/schema.js').TonalSystem} s */
function scaleOptionLabel(s) {
  const tags = [isSimplified(s) && !/vereinfacht/i.test(s.name) ? 'vereinfacht' : '', isMicrotonal(s) ? 'mikrotonal' : ''].filter(Boolean);
  return tags.length ? `${s.name} · ${tags.join(' · ')}` : s.name;
}

/**
 * Optionsliste der Tonleiterauswahl: Optgroup je Familie, gefiltert nach Region, Typ und Suche.
 * Die aktuelle Tonleiter bleibt immer wählbar, auch wenn die Filter sie ausblenden (eigene Gruppe „Aktuelle Auswahl“).
 * @param {ScaleFilter} filter @param {string} selected
 */
export function scaleOptionsHtml(filter, selected) {
  const hits = searchSystems(filter);
  const opt = (/** @type {import('../core/tonal/schema.js').TonalSystem} */ s) => `<option value="${esc(s.id)}"${s.id === selected ? ' selected' : ''}>${esc(scaleOptionLabel(s))}</option>`;
  const cur = getTonalSystem(selected);
  const head = !hits.some((s) => s.id === selected)
    ? `<optgroup label="Aktuelle Auswahl">${cur ? opt(cur) : `<option value="${esc(selected)}" selected>${esc(selected)} (unbekannt)</option>`}</optgroup>`
    : '';
  const noFilter = (!filter.region || filter.region === 'alle') && (!filter.kind || filter.kind === 'alle') && !(filter.query ?? '').trim();
  const recent = noFilter ? RECENT.map((id) => getTonalSystem(id)).filter((s) => s !== undefined) : [];
  const recentHtml = recent.length
    ? `<optgroup label="Zuletzt verwendet">${recent.map((s) => `<option value="${esc(s.id)}">${esc(scaleOptionLabel(s))}</option>`).join('')}</optgroup>`
    : '';
  return head + recentHtml + groupByFamily(hits).map((g) => `<optgroup label="${esc(g.name)}">${g.systems.map(opt).join('')}</optgroup>`).join('');
}

/** „12 von 33 Tonleitern“ bzw. Hinweis bei keinem Treffer. @param {ScaleFilter} filter */
export function scaleCountText(filter) {
  const n = searchSystems(filter).length;
  const total = allTonalSystems().length;
  if (n === 0) return `Keine Tonleiter gefunden (${total} insgesamt). Filter oder Suche ändern.`;
  return n === total ? `${total} Tonleitern` : `${n} von ${total} Tonleitern`;
}

/** Tonnamen ab Grundton (Tonklassen). @param {readonly number[]} steps @param {number} root */
const pitchClassNames = (steps, root) => steps.map((s) => PITCH_CLASS_NAMES[(root + s) % 12]).join(' ');

/**
 * Inhalt der Info-Box zur gewählten Tonleiter: Tonmaterial ab Grundton, Notenvorschau im Tonumfang, Herkunft, Beleg, Quellen.
 * @param {{ scaleId:string, root:number, lo:number, hi:number }} m
 */
export function scaleInfoHtml(m) {
  const s = getTonalSystem(m.scaleId);
  if (!s) return '<p class="muted small">Unbekannte Tonleiter.</p>';
  const rootOk = Number.isInteger(m.root) && m.root >= 0 && m.root <= 11;
  const root = rootOk ? m.root : 0;
  /** @type {string[]} */ const rows = [];
  const dd = (/** @type {string} */ k, /** @type {string} */ v) => rows.push(`<div><dt>${k}</dt><dd>${v}</dd></div>`);
  if (s.pitch.unit === 'semitones') {
    dd(`Tonmaterial ab ${esc(PITCH_CLASS_NAMES[root])}`, esc(pitchClassNames(s.pitch.steps, root)));
    dd('Stufen', `${s.pitch.steps.length} · Abstände in Halbtönen ${esc(stepPattern(s))}`);
    if (s.pitch.descending) dd('Abstiegsform', `${esc(pitchClassNames(s.pitch.descending, root))} <span class="muted">(wirkt mit „Auf- und Abstieg beachten“)</span>`);
  } else {
    // Mikrotonal: eine Periode ab dem Grundton in der Referenz-Oktave, als nächste Taste mit Abweichung
    const period = periodOf(s.pitch);
    const one = resolveSystemPitches(s, { root, lo: 0, hi: 127 }).filter((p) => {
      const c = p.midi * 100 + p.cents - (60 + root) * 100;
      return c >= -0.001 && c < period - 0.001;
    });
    dd(`Tonmaterial ab ${esc(PITCH_CLASS_NAMES[root])}`, esc(one.map((p) => pitchName(p.midi, p.cents).replace(/-?\d+(?= |$)/, '')).join(' · ')));
    const fmt = (/** @type {number} */ v) => (+v.toFixed(1)).toLocaleString('de-DE', { useGrouping: false });
    dd('Stufen (Cent)', `${s.pitch.steps.length} · ${esc(s.pitch.steps.map(fmt).join('; '))}${period !== 1200 ? ` <span class="muted">(Periode ${fmt(period)} Cent statt Oktave)</span>` : ''}`);
    dd('Abstände (Cent)', esc(stepPattern(s).split('-').map((v) => fmt(Number(v))).join(' · ')));
    if (s.pitch.descending) dd('Abstiegsform (Cent)', `${esc(s.pitch.descending.map(fmt).join('; '))} <span class="muted">(wirkt mit „Auf- und Abstieg beachten“)</span>`);
  }
  const rangeOk = [m.lo, m.hi].every((v) => Number.isInteger(v) && v >= 0 && v <= 127) && m.lo < m.hi;
  if (rangeOk && rootOk) {
    const notes = resolvePitches({ scaleId: s.id, root, lo: m.lo, hi: m.hi });
    const max = 24;
    const shown = notes.slice(0, max).map((p) => pitchName(p.midi, p.cents)).join(isTwelveTone(s.id) ? ' ' : ' · ');
    dd('Im Tonumfang', notes.length === 0 ? 'keine Töne' : `${notes.length} Töne: ${esc(shown)}${notes.length > max ? ' …' : ''}`);
  }
  dd('Typ', esc(KIND_LABELS[s.kind]));
  dd('Herkunft', `${esc(s.tradition)} <span class="muted">(${esc(s.region.map(regionName).join(', '))})</span>`);
  if (s.original?.length) dd('Originalname', esc(s.original.map((o) => (o.romanization ? `${o.text} (${o.romanization})` : o.text)).join(', ')));
  if (s.rules && s.pitch.unit === 'semitones') {
    const st = s.pitch.steps;
    const names = (/** @type {readonly number[]} */ idx) => idx.map((k) => PITCH_CLASS_NAMES[(root + st[k]) % 12]).join(', ');
    const parts = [];
    if (s.rules.center !== undefined) parts.push(`Zentrum ${names([s.rules.center])}`);
    if (s.rules.predominant?.length) parts.push(`Haupttöne ${names(s.rules.predominant)}`);
    if (s.rules.avoid?.length) parts.push(`gemieden ${names(s.rules.avoid)}`);
    if (parts.length) dd('Tonhierarchie', `${esc(parts.join(' · '))} <span class="muted">(wirkt mit „Tonhierarchie anwenden“)</span>`);
  }
  const sib = materialSiblings(s.id);
  const SIB_MAX = 8;
  if (sib.length) dd('Gleiches Tonmaterial wie', `${esc(sib.slice(0, SIB_MAX).map((x) => x.name).join(', '))}${sib.length > SIB_MAX ? ` <span class="muted">und ${sib.length - SIB_MAX} weitere</span>` : ''}`);
  if (s.aliases?.length) dd('Auch bekannt als', esc(s.aliases.join(', ')));
  dd('Belegstatus', esc(EVIDENCE_LABELS[s.evidence]));
  const src = sourcesOf(s).map((q) => {
    const label = `${q.title} – ${q.author}${q.year && q.year !== '–' ? `, ${q.year}` : ''}`;
    return `<li>${q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label)}</li>`;
  }).join('');
  const notes = s.notes ? `<p class="small">${isSimplified(s) ? '<strong>Vereinfachte Fassung.</strong> ' : ''}${esc(s.notes)}</p>` : '';
  return `<dl class="track-info scale-info__list">${rows.join('')}</dl>${notes}<p class="small"><strong>Quellen</strong></p><ul class="small scale-info__sources">${src}</ul>`;
}

/** Gruppierte Regelauswahl (optgroup je Gruppe). @param {string} selected */
export function ruleOptionsHtml(selected) {
  return RULE_GROUPS.map((g) => `<optgroup label="${esc(g.label)}">${RULE_TYPES.filter((r) => r.group === g.id).map((r) => `<option value="${esc(r.id)}"${r.id === selected ? ' selected' : ''}>${esc(r.label)}</option>`).join('')}</optgroup>`).join('');
}

/** Hinweis zum empfohlenen Standardinstrument einer Sonoritätsklasse. @param {import('../core/tracks.js').TrackConfig} t */
export function sonorityHint(t) {
  const d = sonorityDefaults(t.rule.type);
  if (!d) return '';
  const same = instrumentKey(t.instrument) === instrumentKey(d.instrument);
  return `Empfohlenes Standardinstrument: ${d.label}. ${same ? 'Dieses Instrument ist bereits eingestellt.' : 'Dein gewähltes Instrument bleibt unverändert, bis du es übernimmst.'}`;
}

/** Editor einer Spur. @param {import('../core/tracks.js').TrackConfig} t @param {Record<string,string>} errors Fehler ohne Präfix */
export function editorHtml(t, errors) {
  const i = t.id;
  const cat = primaryCategory(t.instrument).id;
  const err = (/** @type {string} */ f) => `<p class="field-error" id="e-${i}-${f}">${errorInner(errors[f] ?? '')}</p>`;
  const inv = (/** @type {string} */ f) => (errors[f] ? ' aria-invalid="true"' : '');
  const mode = t.mapping.mode;
  const rt = t.rule.type;
  return `<div class="track-editor" data-editor="${esc(i)}" role="group" aria-label="Spur bearbeiten: ${esc(t.name)}">
  <div class="field"><label for="${fid(i, 'name')}">Name</label><input id="${fid(i, 'name')}" data-tfield="name" type="text" maxlength="40" value="${esc(t.name)}" aria-describedby="e-${i}-name"${inv('name')}>${err('name')}</div>
  <fieldset><legend>Zeichenregel: Welche Zeichen spielt diese Spur?</legend>
    <div class="field"><label for="${fid(i, 'ruleType')}">Regel</label><select id="${fid(i, 'ruleType')}" data-tfield="ruleType" aria-describedby="e-${i}-ruleType rule-help-${i}">${ruleOptionsHtml(rt)}</select>${err('ruleType')}
      <p class="muted small" id="rule-help-${i}">${esc(RULE_TYPES.find((r) => r.id === rt)?.help ?? '')} Satzzeichen und Leerraum sind immer Pausen und nie Teil einer Spur.</p></div>
    <div class="field" data-show="custom"${rt === 'custom' ? '' : ' hidden'}><label for="${fid(i, 'ruleChars')}">Zeichen (z. B. „A, B, C, X“ oder „ABCX“)</label><input id="${fid(i, 'ruleChars')}" data-tfield="ruleChars" type="text" value="${esc(t.rule.chars)}" aria-describedby="e-${i}-ruleChars chars-info-${i}"${inv('ruleChars')}>${err('ruleChars')}
      <p class="muted small" id="chars-info-${i}" aria-live="polite">${esc(customInfo(t))}</p></div>
    <div class="field check" data-show="custom"${rt === 'custom' ? '' : ' hidden'}><input id="${fid(i, 'caseSensitive')}" data-tfield="caseSensitive" type="checkbox"${t.rule.caseSensitive ? ' checked' : ''}><label for="${fid(i, 'caseSensitive')}">Groß-/Kleinschreibung beachten</label></div>
    <div class="field" data-show="sonority"${isSonorityId(rt) ? '' : ' hidden'}><p class="muted small" id="sonority-hint-${i}" aria-live="polite">${esc(sonorityHint(t))}</p>
      <button type="button" class="btn btn--wrap" data-tact="apply-default" id="apply-default-${i}">${iconSvg('check')}<span class="btn__label">Standardinstrument und Tonumfang übernehmen</span></button></div>
    <div class="field check" data-show="sonority"${isSonorityId(rt) ? '' : ' hidden'}><input id="${fid(i, 'germanExt')}" data-tfield="germanExt" type="checkbox"${t.rule.germanExt ? ' checked' : ''}><label for="${fid(i, 'germanExt')}">Deutsche Erweiterung: ä ö → mittlere Vokale, ü → geschlossene Vokale (nicht Teil der Standardliste)</label></div>
    <div class="field check" data-show="vowels consonants"${rt === 'vowels' || rt === 'consonants' ? '' : ' hidden'}><input id="${fid(i, 'yIsVowel')}" data-tfield="yIsVowel" type="checkbox"${t.rule.yIsVowel ? ' checked' : ''}><label for="${fid(i, 'yIsVowel')}">Y zählt als Vokal</label></div>
  </fieldset>
  <fieldset><legend>Tonhöhen dieser Spur</legend>
    <div class="field"><label for="${fid(i, 'mode')}">Mapping-Modus</label><select id="${fid(i, 'mode')}" data-tfield="mode" aria-describedby="e-${i}-mode">${selectOptions(mode, [{ value: 'B', label: 'B: Tonleiter' }, { value: 'A2', label: 'A2: begrenzter chromatischer Bereich' }, { value: 'A', label: 'A: gesamter MIDI-Bereich (0–127)' }])}</select>${err('mode')}</div>
    <div class="field-row scale-filters" data-show="B"${mode === 'B' ? '' : ' hidden'} role="group" aria-label="Tonleiter finden">
      <div class="field"><label for="${fid(i, 'scaleRegion')}">Region</label><select id="${fid(i, 'scaleRegion')}" data-tfield="scaleRegion">${selectOptions('alle', [{ value: 'alle', label: 'Alle Regionen' }, ...FILTERS.regions.map((r) => ({ value: r.id, label: r.name }))])}</select></div>
      <div class="field"><label for="${fid(i, 'scaleKind')}">Typ</label><select id="${fid(i, 'scaleKind')}" data-tfield="scaleKind">${selectOptions('alle', [{ value: 'alle', label: 'Alle Typen' }, ...FILTERS.kinds.map((k) => ({ value: k.id, label: k.name }))])}</select></div>
      <div class="field"><label for="${fid(i, 'scaleSearch')}">Tonleiter suchen</label><input id="${fid(i, 'scaleSearch')}" data-tfield="scaleSearch" type="search" placeholder="z. B. Dorisch, Blues, Freygish" autocomplete="off" aria-describedby="scale-count-${i}"></div>
    </div>
    <div class="field" data-show="B"${mode === 'B' ? '' : ' hidden'}><label for="${fid(i, 'scaleId')}">Tonleiter</label><select id="${fid(i, 'scaleId')}" data-tfield="scaleId" aria-describedby="e-${i}-scaleId scale-count-${i}">${scaleOptionsHtml({}, t.mapping.scaleId)}</select>${err('scaleId')}
      <p class="muted small" id="scale-count-${i}" aria-live="polite">${esc(scaleCountText({}))}</p></div>
    <div class="scale-tools" data-show="B"${mode === 'B' ? '' : ' hidden'} role="group" aria-label="Tonleiter anhören, exportieren, importieren">
      <button type="button" class="btn btn--wrap" data-tact="audition-scale">${iconSvg('play')}<span class="btn__label">Tonleiter anhören</span></button>
      <button type="button" class="btn btn--wrap" data-tact="scala-export">${iconSvg('download')}<span class="btn__label">Als Scala-Datei (.scl)</span></button>
      <label class="btn btn--wrap" for="${fid(i, 'scalaImport')}">${iconSvg('upload')}<span class="btn__label">Scala-Datei importieren</span></label><input id="${fid(i, 'scalaImport')}" class="sr-only" type="file" accept=".scl,text/plain" data-tact="scala-import" aria-describedby="scala-msg-${i}">
      <p class="muted small scale-tools__msg" id="scala-msg-${i}" aria-live="polite">Importierte Tonleitern gelten nur bis zum Neuladen der Seite.</p>
    </div>
    <div class="field" data-show="B"${mode === 'B' ? '' : ' hidden'}><label for="${fid(i, 'root')}">Grundton</label><select id="${fid(i, 'root')}" data-tfield="root" aria-describedby="e-${i}-root">${selectOptions(t.mapping.root, PITCH_CLASS_NAMES.map((n, k) => ({ value: k, label: n })))}</select>${err('root')}</div>
    <div class="field" data-show="dir"${mappingShowKeys(t.mapping).includes('dir') ? '' : ' hidden'}><label for="${fid(i, 'direction')}">Richtung</label><select id="${fid(i, 'direction')}" data-tfield="direction" aria-describedby="e-${i}-direction dir-help-${i}">${selectOptions(t.mapping.direction ?? 'set', [{ value: 'set', label: 'Nur Tonvorrat (Standard)' }, { value: 'contour', label: 'Auf- und Abstieg beachten' }])}</select>${err('direction')}
      <p class="muted small" id="dir-help-${i}">Diese Tonleiter hat eine eigene Abstiegsform. Mit „Auf- und Abstieg beachten“ gilt sie, sobald der nächste Ton der Aufstiegsform tiefer läge als der vorherige Ton dieser Spur.</p></div>
    <div class="field check" data-show="hier"${mappingShowKeys(t.mapping).includes('hier') ? '' : ' hidden'}><input id="${fid(i, 'rulesApply')}" data-tfield="rulesApply" type="checkbox"${t.mapping.rules === 'apply' ? ' checked' : ''} aria-describedby="e-${i}-rules"><label for="${fid(i, 'rulesApply')}">Tonhierarchie anwenden: Haupttöne doppelt so oft treffen, gemiedene Töne weglassen</label>${err('rules')}</div>
    <div class="field" data-show="micro"${mappingShowKeys(t.mapping).includes('micro') ? '' : ' hidden'}><label for="${fid(i, 'microtonal')}">Mikrotöne</label><select id="${fid(i, 'microtonal')}" data-tfield="microtonal" aria-describedby="e-${i}-microtonal micro-help-${i}">${selectOptions(t.mapping.microtonal ?? 'bend', [{ value: 'bend', label: 'Genau (Pitch-Bend)' }, { value: 'nearest', label: 'Auf nächste Taste runden' }])}</select>${err('microtonal')}
      <p class="muted small" id="micro-help-${i}">Diese Tonleiter hat Töne zwischen den Klaviertasten. Vorschau und WAV-Export spielen sie genau. Im MIDI-Export entstehen Pitch-Bend-Befehle (Bereich ±2 Halbtöne); manche MIDI-Geräte ignorieren sie. „Runden“ verwendet stattdessen die nächste Taste.</p></div>
    <div class="field-row" data-show="A2 B"${mode === 'B' || mode === 'A2' ? '' : ' hidden'}>
      <div class="field"><label for="${fid(i, 'lo')}">Tonumfang von (MIDI)</label><input id="${fid(i, 'lo')}" data-tfield="lo" type="number" min="0" max="127" step="1" inputmode="numeric" value="${Number.isFinite(t.mapping.lo) ? t.mapping.lo : ''}" aria-describedby="e-${i}-lo n-${i}-lo"${inv('lo')}><p class="muted small" id="n-${i}-lo">${noteHint(t.mapping.lo)}</p>${err('lo')}</div>
      <div class="field"><label for="${fid(i, 'hi')}">bis (MIDI)</label><input id="${fid(i, 'hi')}" data-tfield="hi" type="number" min="0" max="127" step="1" inputmode="numeric" value="${Number.isFinite(t.mapping.hi) ? t.mapping.hi : ''}" aria-describedby="e-${i}-hi n-${i}-hi"${inv('hi')}><p class="muted small" id="n-${i}-hi">${noteHint(t.mapping.hi)}</p>${err('hi')}</div>
    </div>
    <details class="help scale-info-box" data-show="B"${mode === 'B' ? '' : ' hidden'}><summary>Über diese Tonleiter${iconSvg('chevron-down', 'disclosure-chevron')}</summary>
      <div class="scale-info" id="scale-info-${i}">${scaleInfoHtml(t.mapping)}</div></details>
  </fieldset>
  <fieldset><legend>Instrument</legend>
    <div class="field-row">
      <div class="field"><label for="${fid(i, 'category')}">Kategorie</label><select id="${fid(i, 'category')}" data-tfield="category">${selectOptions(cat, [{ value: 'alle', label: 'Alle Kategorien' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))])}</select></div>
      <div class="field"><label for="${fid(i, 'search')}">Suchen</label><input id="${fid(i, 'search')}" data-tfield="search" type="search" placeholder="z. B. Cello, Flute, 41" autocomplete="off"></div>
    </div>
    <div class="field"><label for="${fid(i, 'program')}">Instrument (General MIDI und Klangprofile)</label><select id="${fid(i, 'program')}" data-tfield="program" aria-describedby="e-${i}-program instrument-note-${i}">${instrumentOptionsHtml(cat, '', t.instrument)}</select>${err('program')}
      <p class="muted small" id="instrument-note-${i}">${esc(instrumentNote(t))}</p></div>
  </fieldset>
  <button type="button" class="btn btn--accent" data-tact="close">${iconSvg('check')}<span class="btn__label">Fertig</span></button>
</div>`;
}

/** Erklärung zu Vorschau und Export des gewählten Instruments. @param {import('../core/tracks.js').TrackConfig} t */
export function instrumentNote(t) {
  const r = resolveInstrument(t.instrument);
  const base = 'Die Vorschau klingt synthetisch (keine Samples).';
  if (r.soundMissing) return `${base} Das Klangprofil „${t.instrument.sound}“ ist unbekannt; es klingt das General-MIDI-Programm ${r.gmNumber} (${r.gmName}).`;
  if (r.sound) return `${base} ${r.exportNote} Rauschanteile und Hüllkurven der Vorschau sind in der MIDI-Datei nicht enthalten. ${r.sound.description}`;
  return `${base} Die exportierte MIDI-Datei verwendet dasselbe General-MIDI-Programm auf deinem Wiedergabegerät.`;
}

/** @param {number} v */
function noteHint(v) { return Number.isInteger(v) && v >= 0 && v <= 127 ? `= ${noteLabel(v)}` : ''; }

/** @param {import('../core/tracks.js').TrackConfig} t */
export function customInfo(t) {
  if (t.rule.type !== 'custom') return '';
  const p = parseCustomChars(t.rule.chars, { normalizeNfc: true, caseSensitive: t.rule.caseSensitive });
  const parts = [`${p.chars.length} Zeichen erkannt`];
  if (p.duplicates) parts.push(`${p.duplicates} doppelt`);
  if (p.ignored.length) parts.push(`ignoriert (Satzzeichen sind Pausen): ${p.ignored.join(' ')}`);
  return parts.join(' · ');
}

/**
 * Gesamte Spurenliste (ohne Editor-Zustand der Eingabefelder → nur bei Struktur-Änderungen neu zeichnen).
 * @param {{ tracks:readonly import('../core/tracks.js').TrackConfig[], results:readonly import('../core/pipeline.js').TrackResult[]|null,
 *   ui:Record<string,TrackUi>, editingId:string|null, errors:Record<string,string>, anySolo:boolean }} m
 */
export function renderTrackList(m) {
  if (m.tracks.length === 0) return '<li class="track-empty">Keine Spuren vorhanden. Füge eine Spur hinzu, damit Musik entsteht (Text, Bytes und Pausen sind trotzdem berechnet).</li>';
  return m.tracks.map((t, i) => {
    const ui = m.ui[t.id] ?? { mute: false, solo: false, volume: 100 };
    const res = m.results?.find((r) => r.id === t.id);
    const errs = trackErrors(m.errors, t.id);
    const editing = m.editingId === t.id;
    return `<li class="track-card ${trackColorClass(i)}" data-track="${esc(t.id)}" data-state="${cardState(t, ui, m.anySolo)}">
  <div class="track-summary">
    <div class="track-title"><span class="track-badge" aria-hidden="true">S${i + 1}</span> <strong class="track-name">${esc(t.name)}</strong> <span class="track-status" data-role="status">${statusText(t, ui, m.anySolo)}</span></div>
    <div data-role="info">${trackInfoHtml(t, res, i)}</div>
    <div class="track-actions" role="group" aria-label="Spur ${i + 1} ${esc(t.name)}">
      <div class="track-actions__mix">
        <span class="check inline"><input type="checkbox" id="act-${esc(t.id)}" data-tact="enabled"${t.enabled ? ' checked' : ''}><label for="act-${esc(t.id)}">aktiv</label></span>
        <button type="button" class="btn" data-tact="mute" aria-pressed="${ui.mute}" title="Stumm: Spur ist in der Vorschau nicht hörbar, der Export bleibt unverändert">${iconSvg('volume-x')}<span class="btn__label">Stumm</span></button>
        <button type="button" class="btn" data-tact="solo" aria-pressed="${ui.solo}" title="Solo: nur Solo-Spuren sind in der Vorschau hörbar, der Export bleibt unverändert">${iconSvg('headphones')}<span class="btn__label">Solo</span></button>
        <div class="track-volume"><label class="inline-label" for="vol-${esc(t.id)}">${iconSvg('volume-1')} Pegel</label><input type="range" id="vol-${esc(t.id)}" data-tact="volume" min="0" max="100" value="${ui.volume}" aria-label="Lautstärke der Spur ${esc(t.name)}"></div>
      </div>
      <div class="track-actions__tools">
        <button type="button" class="btn btn--edit" data-tact="edit" aria-expanded="${editing}">${iconSvg(editing ? 'x' : 'pencil')}<span class="btn__label">${editing ? 'Editor schließen' : 'Bearbeiten'}</span></button>
        <button type="button" class="btn btn--collapse" data-tact="duplicate" title="Spur duplizieren">${iconSvg('copy')}<span class="btn__label">Duplizieren</span></button>
        <button type="button" class="btn btn--icon" data-tact="up"${i === 0 ? ' disabled' : ''} aria-label="Spur ${i + 1} nach oben" title="Nach oben">${iconSvg('chevron-up')}</button>
        <button type="button" class="btn btn--icon" data-tact="down"${i === m.tracks.length - 1 ? ' disabled' : ''} aria-label="Spur ${i + 1} nach unten" title="Nach unten">${iconSvg('chevron-down')}</button>
        <button type="button" class="btn btn--danger btn--collapse" data-tact="delete" title="Spur löschen">${iconSvg('trash')}<span class="btn__label">Löschen</span></button>
      </div>
    </div>
    ${Object.keys(errs).length && !editing ? `<p class="field-error">${errorInner(`${Object.values(errs)[0]} (Editor öffnen)`)}</p>` : ''}
  </div>
  ${editing ? editorHtml(t, errs) : ''}
</li>`;
  }).join('');
}

/** @param {import('../core/tracks.js').TrackConfig} t @param {TrackUi} ui @param {boolean} anySolo */
export function cardState(t, ui, anySolo) {
  if (!t.enabled) return 'inactive';
  if (anySolo && !ui.solo) return 'silenced';
  if (ui.mute && !ui.solo) return 'muted';
  return ui.solo ? 'solo' : 'active';
}

/** @param {import('../core/tracks.js').TrackConfig} t @param {TrackUi} ui @param {boolean} anySolo */
export function statusText(t, ui, anySolo) {
  return { inactive: 'deaktiviert', silenced: 'nicht hörbar (Solo einer anderen Spur)', muted: 'stumm', solo: 'Solo', active: 'aktiv' }[cardState(t, ui, anySolo)];
}

/** Fehler einer Spur ohne Präfix. @param {Record<string,string>} errors @param {string} id */
export function trackErrors(errors, id) {
  /** @type {Record<string,string>} */
  const out = {};
  const p = `tracks.${id}.`;
  for (const [k, v] of Object.entries(errors)) if (k.startsWith(p)) out[k.slice(p.length)] = v;
  return out;
}

/** Routing-Übersicht (nicht zugeordnete und überlappende Zeichen). @param {import('../core/pipeline.js').PipelineResult|null} r */
export function renderRoutingSummary(r) {
  if (!r) return '';
  const rt = r.routing;
  const name = (/** @type {string} */ id) => r.tracks.find((t) => t.id === id)?.name ?? id;
  const parts = [];
  const active = r.tracks.filter((t) => t.enabled);
  if (active.length === 0) parts.push(noticeHtml('warn', 'Keine aktive Spur: Es erklingt nichts. Die Zeitachse (Pausen) bleibt erhalten.'));
  else if (rt.noteChars > 0) {
    parts.push(`<p class="muted small">${num(rt.noteChars)} notenfähige Zeichen: ${num(rt.noteChars - rt.unassigned)} zugeordnet, <strong>${num(rt.unassigned)} ohne Spur</strong> (bleiben still, die Zeit bleibt erhalten), <strong>${num(rt.overlapChars)} auf mehreren Spuren</strong> (erklingen mehrfach).</p>`);
    if (rt.unassigned > 0) {
      const sample = rt.unassignedSample.map((i) => `„${esc(r.analysis.chars[i].text)}“`).join(' ');
      parts.push(noticeHtml('info', `Nicht zugeordnet${rt.unassigned > rt.unassignedSample.length ? ' (Auswahl)' : ''}: ${sample}`));
    }
    if (rt.overlaps.length > 0) {
      const isSon = (/** @type {string} */ id) => isSonorityId(r.tracks.find((t) => t.id === id)?.config.rule.type ?? '');
      const layering = rt.overlaps.some((o) => isSon(o.a) !== isSon(o.b)) ? ' Sonoritätsklassen-Spuren sind untereinander exklusiv; Überlagerung mit allgemeinen Regeln (z. B. „Vokale“) ist beabsichtigtes Layering.' : '';
      parts.push(noticeHtml('info', `Überlappung: ${rt.overlaps.map((o) => `${esc(name(o.a))} + ${esc(name(o.b))} (${num(o.chars)} Zeichen)`).join('; ')} – dieselben Zeichen klingen auf beiden Spuren.${layering}`));
    }
  }
  for (const t of active) if (t.noteCount === 0 && rt.noteChars > 0) parts.push(noticeHtml('warn', `Spur „${esc(t.name)}“ spielt in diesem Text nichts (keine passenden Zeichen).`));
  return parts.join('');
}

/** Sichtbarkeit abhängiger Felder im geöffneten Editor aktualisieren. @param {HTMLElement} editor @param {import('../core/tracks.js').TrackConfig} t */
export function refreshEditorVisibility(editor, t) {
  const keys = new Set([t.rule.type, t.mapping.mode, ...(isSonorityId(t.rule.type) ? ['sonority'] : []), ...mappingShowKeys(t.mapping)]);
  editor.querySelectorAll('[data-show]').forEach((el) => {
    /** @type {HTMLElement} */ (el).hidden = !(el.getAttribute('data-show') ?? '').split(' ').some((k) => keys.has(/** @type {any} */ (k)));
  });
  const help = editor.querySelector(`#rule-help-${t.id}`);
  if (help) help.textContent = `${RULE_TYPES.find((r) => r.id === t.rule.type)?.help ?? ''} Satzzeichen und Leerraum sind immer Pausen und nie Teil einer Spur.`;
  const sh = editor.querySelector(`#sonority-hint-${t.id}`);
  if (sh) sh.textContent = sonorityHint(t);
  const inote = editor.querySelector(`#instrument-note-${t.id}`);
  if (inote) inote.textContent = instrumentNote(t);
  const info = editor.querySelector(`#chars-info-${t.id}`);
  if (info) info.textContent = customInfo(t);
  for (const k of ['lo', 'hi']) { const n = editor.querySelector(`#n-${t.id}-${k}`); if (n) n.textContent = noteHint(/** @type {any} */ (t.mapping)[k]); }
  const si = editor.querySelector(`#scale-info-${t.id}`);
  if (si) si.innerHTML = scaleInfoHtml(t.mapping);
}

export { INSTRUMENTS };
