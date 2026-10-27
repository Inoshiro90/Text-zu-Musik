// @ts-check
/**
 * Orchestrierung der Oberfläche. Die UI liest nur Ergebnisse aus core/pipeline.js und enthält keine Mapping-/Pausenlogik.
 * Zwei getrennte Zustände:
 *  - Live-Binärvorschau (`state.preview`): immer passend zum aktuellen Textfeld (nur Text- und Byte-Stufe).
 *  - Musikalisches Ergebnis (`state.result`): gehört zum zuletzt umgewandelten Text (`state.convertedText`).
 */
import { runPipeline, runPreview } from '../core/pipeline.js';
import { DEFAULT_CONFIG, LIMITS, validateConfig } from '../core/config.js';
import { countCodePoints } from '../core/text.js';
import { noteLabel } from '../core/scales.js';
import { createPreviewPlayer, DEFAULT_VOLUME } from '../audio/preview.js';
import { arrangementToMidi, midiFilename, MELODIC_CHANNELS, MidiExportError, MIDI_MIME } from '../export/midi.js';
import { buildArrangement, countNotes } from '../core/arrangement.js';
import { createTrack, duplicateTrack, vowelConsonantTemplate, sonorityTemplate, sonorityDefaults } from '../core/tracks.js';
import { downloadBlob } from './download.js';
import { $, esc, num, visibleChar, PAUSE_LABEL, setMessage, setFieldError, noticeHtml, iconSvg } from './dom.js';
import { hydrateIconSlots, setIcon } from './icons.js';
import { initTheme } from './theme.js';
import { instrumentFromKey } from '../audio/instrument-catalog.js';
import { exportAudio, AudioExportError } from '../export/audio.js';
import { initSettings, readSettings, writeSettings, showValidation } from './settings-view.js';
import { renderBinary, renderMapping, renderEvents } from './detail-views.js';
import { renderPianoRoll, rollPageSize } from './piano-roll.js';
import { renderTrackList, renderRoutingSummary, trackErrors, refreshEditorVisibility, instrumentOptionsHtml, trackInfoHtml, cardState, statusText } from './tracks-view.js';
import { applyHighlight, computeLinked, computePreviewLinked, focusFromElement, sameFocus } from './highlighting.js';

const SAMPLE = 'Zwei flinke Boxer jagen die quirlige Eva und ihren Mops durch Sylt.\nFranz jagt im komplett verwahrlosten Taxi quer durch Bayern.\nZwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.\nVogel Quax zwickt Johnys Pferd Bim.\nSylvia wagt quick den Jux bei Pforzheim.\nPolyfon zwitschernd aßen Mäxchens Vögel Rüben, Joghurt und Quark.\n"Fix, Schwyz!" quäkt Jürgen blöd vom Paß.\nVictor jagt zwölf Boxkämpfer quer über den großen Sylter Deich.\nFalsches Üben von Xylophonmusik quält jeden größeren Zwerg.\nHeizölrückstoßabdämpfung.';
/** Ab dieser Länge wird die Live-Vorschau entprellt, damit Tippen flüssig bleibt. */
const PREVIEW_IMMEDIATE_CHARS = 5000;
const PREVIEW_DEBOUNCE_MS = 150;

/** @type {{ convertedText:string|null, result:import('../core/pipeline.js').PipelineResult|null, preview:import('../core/pipeline.js').BytePreview|null,
 *   focus:import('./highlighting.js').Focus|null, focusOrigin:'preview'|'results', rows:{binary:number, mapping:number, events:number}, page:number, stale:string,
 *   playingSeq:number, playMessage:string, tracks:import('../core/tracks.js').TrackConfig[], trackUi:Record<string, import('./tracks-view.js').TrackUi>,
 *   editingId:string|null, trackErrors:Record<string,string>, exporting:boolean }} */
const state = { convertedText: null, result: null, preview: null, focus: null, focusOrigin: 'results', rows: { binary: LIMITS.initialRows, mapping: LIMITS.initialRows, events: LIMITS.initialRows }, page: 0, stale: '', playingSeq: -1, playMessage: '', tracks: [createTrack([])], trackUi: {}, editingId: null, trackErrors: {}, exporting: false };

const input = /** @type {HTMLTextAreaElement} */ ($('text-input'));
const convertBtn = /** @type {HTMLButtonElement} */ ($('btn-convert'));
const playBtn = /** @type {HTMLButtonElement} */ ($('btn-play'));
const stopBtn = /** @type {HTMLButtonElement} */ ($('btn-stop'));
const exportBtn = /** @type {HTMLButtonElement} */ ($('btn-export'));
const volume = /** @type {HTMLInputElement} */ ($('f-volume'));
const results = $('results');
const resultBody = $('result-body');
const previewEl = $('preview');
const nfcBox = /** @type {HTMLInputElement} */ ($('f-nfc'));

const player = createPreviewPlayer({
  createContext: () => {
    const Ctor = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!Ctor) throw new Error('Dieser Browser unterstützt die Web Audio API nicht.');
    return new Ctor();
  },
  volume: DEFAULT_VOLUME,
});

/** Meldung für Screenreader (aria-live). @param {string} msg */
function announce(msg) {
  const el = $('status');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 30);
}

/** @param {string} msg @param {'info'|'warn'|'error'} level */
function setHint(msg, level) {
  setMessage($('input-hint'), level, msg);
}

/** Gesamte Konfiguration: globale Felder aus dem Formular plus die Spuren (Modell der Oberfläche). */
function readConfig() {
  return { ...readSettings(), tracks: state.tracks };
}

/** Das musikalische Ergebnis gehört nicht mehr zum Text im Eingabefeld. */
const isStale = () => state.result !== null && input.value !== state.convertedText;
/** Vorschau und Ergebnis beruhen auf derselben Analysefassung (Indizes sind vergleichbar). */
const isSynced = () => state.result !== null && state.preview?.ok === true && state.convertedText === state.preview.text && state.result.config.normalizeNfc === state.preview.normalizeNfc;
/** @param {string} t */
const excerpt = (t) => { const a = Array.from(t.replace(/\s+/g, ' ').trim()); return a.length > 32 ? `${a.slice(0, 32).join('')}…` : a.join(''); };

/* ---------- Eingabe ---------- */
function updateInputState() {
  const n = countCodePoints(input.value);
  $('input-count').textContent = `${num(n)} / ${num(LIMITS.maxChars)} Zeichen`;
  const over = n > LIMITS.maxChars;
  convertBtn.disabled = n === 0 || over;
  if (n === 0) setHint('Gib einen Text ein.', 'info');
  else if (over) setHint(`Der Text ist zu lang: Höchstens ${num(LIMITS.maxChars)} Zeichen sind erlaubt, bitte kürze ihn um ${num(n - LIMITS.maxChars)} Zeichen.`, 'error');
  else if (n >= LIMITS.warnChars) setHint(`Langer Text (${num(n)} Zeichen): Die Berechnung kann einen Moment dauern, die Ansichten zeigen zunächst nur die ersten ${num(LIMITS.initialRows)} Einträge.`, 'warn');
  else if (isStale()) setHint('Text geändert – bitte erneut umwandeln. Die Binärvorschau ist aktuell, die Musik gehört noch zum zuletzt umgewandelten Text.', 'info');
  else setHint('Bereit. Klicke auf „Umwandeln“.', 'info');
}

/** @type {ReturnType<typeof setTimeout>|undefined} */
let previewTimer;
/** Eingabefeld hat sich geändert (Tippen, Einfügen, Löschen, Beispieltext). */
function onTextChanged() {
  updateInputState();
  const n = countCodePoints(input.value);
  if (n === 0 || n > LIMITS.maxChars) stopPlayback('Eingabe leer oder zu lang – Wiedergabe beendet.');
  clearTimeout(previewTimer);
  if (input.value.length <= PREVIEW_IMMEDIATE_CHARS) updatePreview();
  else previewTimer = setTimeout(updatePreview, PREVIEW_DEBOUNCE_MS);
  updateSyncUi();
}

/** Live-Binärvorschau neu berechnen (nur Text- und Byte-Stufe) und zeichnen. */
function updatePreview() {
  clearTimeout(previewTimer);
  const prev = state.preview;
  const p = runPreview(input.value, { normalizeNfc: nfcBox.checked }, prev);
  const changed = p !== prev;
  state.preview = p;
  const status = $('preview-status');
  const wrap = $('binary-wrap');
  if (changed) { state.focus = null; state.rows.binary = LIMITS.initialRows; }
  if (input.value === '') {
    setMessage(status, 'info', 'Noch kein Text – hier erscheint der UTF-8-Binärcode, sobald du etwas eingibst.');
    wrap.innerHTML = '';
  } else if (!p.ok || !p.analysis || !p.bytes) {
    setMessage(status, 'error', `Der Text ist zu lang (Limit ${num(LIMITS.maxChars)} Zeichen). Es wird keine Vorschau berechnet – bitte kürzen.`);
    wrap.innerHTML = '';
  } else {
    const a = p.analysis;
    const ch = a.changes;
    const notes = [];
    if (ch.nfc) notes.push('NFC-normalisiert');
    if (ch.lineEndings) notes.push('Zeilenenden vereinheitlicht');
    if (ch.invalidSurrogates) notes.push(`${ch.invalidSurrogates} ungültige(s) Zeichen durch U+FFFD ersetzt`);
    setMessage(status, notes.length ? 'warn' : 'info', `${num(a.chars.length)} Zeichen → ${num(p.bytes.length)} UTF-8-Bytes. ` +
      (notes.length ? `Achtung: Die Vorschau zeigt die Analysefassung (${notes.join(', ')}), nicht exakt deine Roheingabe.` : 'Die Vorschau entspricht exakt deiner Eingabe.'));
    if (changed || !wrap.firstChild) wrap.innerHTML = renderBinary({ analysis: a, bytes: p.bytes }, state.rows.binary);
  }
  reapply();
  updateSyncUi();
}

/* ---------- Umwandeln und Einstellungen ---------- */
function convert() {
  const run = runPipeline(input.value, readConfig(), state.result);
  showValidation(run.errors, run.warnings);
  state.trackErrors = run.errors;
  showTrackErrors();
  if (!run.ok || !run.result) {
    const msg = run.errors.text ?? 'Die Einstellungen sind ungültig. Bitte die markierten Felder korrigieren.';
    setHint(msg, 'error');
    announce(msg);
    return;
  }
  stopPlayback();
  state.playMessage = '';
  state.convertedText = input.value;
  state.result = run.result;
  state.rows.mapping = LIMITS.initialRows;
  state.rows.events = LIMITS.initialRows;
  state.page = 0;
  state.focus = null;
  state.stale = '';
  updatePreview();
  renderAll();
  updateInputState();
  const s = run.result.stats;
  announce(s.notes === 0 && s.rests === 0 ? 'Keine Noten erzeugt.' : `Umwandlung fertig: ${num(s.notes)} Noten und ${num(s.rests)} Pausen.`);
}

function onSettingsChange() {
  updatePreview(); // NFC-Schalter wirkt auf die Vorschau (bei gleichem Text/NFC: gecacht)
  const draft = readConfig();
  if (state.convertedText === null) {
    const v = validateConfig(draft);
    showValidation(v.errors, v.warnings);
    state.trackErrors = v.errors;
    showTrackErrors();
    updateTrackCards();
    return;
  }
  const run = runPipeline(state.convertedText, draft, state.result);
  showValidation(run.errors, run.warnings);
  state.trackErrors = run.errors;
  showTrackErrors();
  if (!run.ok) {
    const first = Object.values(run.errors)[0] ?? 'Ungültige Einstellung.';
    state.stale = `Die Einstellungen sind ungültig (${first}) – angezeigt wird das letzte gültige Ergebnis.`;
    renderNotices();
    announce(state.stale);
    updateTrackCards();
    return;
  }
  state.stale = '';
  if (run.recomputed.length > 0 && run.result) {
    stopPlayback('Einstellungen geändert – Wiedergabe beendet.');
    if (run.recomputed.some((s) => s === 'text' || s === 'tokens' || s === 'timeline')) state.focus = null; // Ereignisnummern können sich verschieben
    state.result = run.result;
    renderAll();
    announce('Ergebnis mit den neuen Einstellungen aktualisiert.');
  } else {
    renderNotices();
  }
  updateTrackCards();
  updateSyncUi();
}

/* ---------- Rendern ---------- */
function renderNotices() {
  const r = state.result;
  if (!r) return;
  const n = [];
  if (state.stale) n.push(noticeHtml('error', `<strong>Hinweis:</strong> ${esc(state.stale)}`, ' role="alert"'));
  const ch = r.analysis.changes;
  if (ch.nfc) n.push(noticeHtml('info', `<strong>Analysegrundlage ist die NFC-normalisierte Fassung.</strong> Dein Text wurde beim Normalisieren verändert (z. B. „a“ + Umlautpunkt wird zu „ä“). Deine Eingabe bleibt unverändert; Zeichen-, Byte- und Ereignisverweise beziehen sich auf diese Fassung: <code class="inline">${esc(r.analysis.analyzed.slice(0, 200))}${r.analysis.analyzed.length > 200 ? '…' : ''}</code>`));
  if (ch.lineEndings) n.push(noticeHtml('info', 'Zeilenenden wurden zu <code>\\n</code> vereinheitlicht.'));
  if (ch.invalidSurrogates > 0) n.push(noticeHtml('warn', `<strong>Ungültiges Zeichen ersetzt:</strong> ${ch.invalidSurrogates} einzelne ungültige UTF-16-Einheit(en) wurden durch U+FFFD (3 Bytes) ersetzt.`));
  if (!r.analysis.usedSegmenter) n.push(noticeHtml('info', 'Dieser Browser unterstützt <code>Intl.Segmenter</code> nicht: Zeichen werden als Code-Points dargestellt, zusammengesetzte Emojis oder kombinierende Zeichen erscheinen daher als mehrere Zeichen. Bytes und Noten bleiben gleich.'));
  const s = r.stats;
  if (s.notes === 0) {
    const msg = s.rests > 0 ? 'Keine Noten: nur Satzzeichen und Leerraum erkannt, es gibt nur Pausen.'
      : s.bytes === s.structureBytes ? 'Keine Noten: nur Leerzeichen erkannt. Die Bytes stehen weiterhin in der Binärvorschau.' : 'Keine Noten: nur ignorierte Steuerzeichen erkannt.';
    n.push(noticeHtml('warn', `<strong>${msg}</strong>`));
  }
  $('notices').innerHTML = n.join('');
}

/** Alle Ansichten des musikalischen Ergebnisses neu zeichnen. */
function renderAll() {
  const r = state.result;
  if (!r) return;
  resultBody.hidden = false;
  $('empty-state').hidden = true;
  const s = r.stats;
  const active = r.tracks.filter((t) => t.enabled);
  $('summary').textContent = `${num(s.notes)} Noten, ${num(s.rests)} Pausen, ${active.length} aktive Spur${active.length === 1 ? '' : 'en'}, Gesamtlänge ${num(r.master.totalTicks)} Ticks (${(r.master.totalTicks / 480).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Beats), Tempo ${r.master.tempoBpm} BPM.`;
  renderNotices();
  renderRoll();
  $('events-wrap').innerHTML = renderEvents(r, state.rows.events);
  $('mapping-wrap').innerHTML = renderMapping(r, state.rows.mapping);
  updateTrackCards();
  reapply();
  updateSyncUi();
}

function activeLanes() {
  return state.result ? state.result.tracks.filter((t) => t.enabled) : [];
}

function renderRoll() {
  const r = state.result;
  if (!r) return;
  const lanes = activeLanes();
  const roll = renderPianoRoll(r.master, lanes, state.page);
  state.page = roll.page;
  const msg = lanes.length === 0 ? noticeHtml('warn', 'Keine aktive Spur: Es wird keine Piano-Roll gezeichnet.') : '';
  $('roll-wrap').innerHTML = roll.html === '' ? msg : `<h3>Piano-Roll</h3><p class="muted small">Eine Zeile je aktiver Spur auf gemeinsamer Zeitachse (Zahlen = Beats). Noten sind beschriftete Balken, Pausen gestrichelte schraffierte Flächen quer über alle Spuren (Kürzel W/S/A = Wort-/Satz-/Absatzpause). Leere Stellen einer Spur sind Zeichen, die diese Spur nicht spielt.</p>${roll.html}
    <div class="pager"><button type="button" class="btn" data-roll="prev" ${roll.page === 0 ? 'disabled' : ''}>${iconSvg('skip-back')}Vorherige Ereignisse</button> <span>Ereignisse ${num(roll.from + 1)}–${num(roll.to)} von ${num(r.master.events.length)}</span> <button type="button" class="btn" data-roll="next" ${roll.page >= roll.pages - 1 ? 'disabled' : ''}>Nächste Ereignisse${iconSvg('skip-forward')}</button></div>`;
}

/** Status „aktuell/veraltet“, Export- und Wiedergabe-Beschriftung. */
function updateSyncUi() {
  const sync = $('sync-status');
  const r = state.result;
  const stale = isStale();
  results.classList.toggle('stale', stale);
  if (r) {
    if (stale) {
      setMessage(sync, 'stale', `Text geändert – bitte erneut umwandeln. Die Binärvorschau ist aktuell; Ereignisse, Piano-Roll, Wiedergabe und Export gehören noch zum zuletzt umgewandelten Text „${excerpt(state.convertedText ?? '')}“.`, 'Veraltet:');
    } else {
      setMessage(sync, 'ok', 'Das musikalische Ergebnis gehört zum aktuellen Text.');
    }
  }
  const arr = r ? buildArrangement(r) : null;
  const notes = arr ? countNotes(arr) : 0;
  const nActive = arr ? arr.tracks.length : 0;
  const tooMany = nActive > MELODIC_CHANNELS.length;
  const canExport = r !== null && notes > 0 && !stale && !tooMany;
  exportBtn.disabled = !canExport;
  $('export-hint').textContent = !r ? '' : nActive === 0 ? 'MIDI-Export nicht möglich: Es gibt keine aktive Spur.'
    : tooMany ? `MIDI-Export nicht möglich: ${nActive} aktive Spuren, aber nur ${MELODIC_CHANNELS.length} Melodiekanäle (Kanal 10 ist für Schlagzeug reserviert). Bitte Spuren deaktivieren.`
      : notes === 0 ? 'MIDI-Export nicht möglich: Die aktiven Spuren spielen keine Noten (Pausen allein ergeben keine Töne).'
        : stale ? 'MIDI-Export gesperrt, bis der geänderte Text erneut umgewandelt wurde.' : `Exportiert alle ${nActive} aktiven Spuren mit Instrument, Tempo und Pausen (als Stille) als mehrspurige Standard-MIDI-Datei. Stumm/Solo wirken nur auf die Vorschau.`;
  playBtn.disabled = r === null;
  if (!player.isPlaying()) {
    $('play-status').textContent = !r ? '' : state.playMessage !== '' ? state.playMessage : nActive === 0 ? 'Keine aktive Spur zum Abspielen.' : notes === 0 ? 'Keine Töne zum Abspielen: Die aktiven Spuren spielen keine Noten, Pausen allein erzeugen keinen Klang.'
      : stale ? 'Die Vorschau würde den zuletzt umgewandelten Text abspielen, nicht den geänderten.' : 'Klangvorschau mit einfachen synthetischen Instrumentklängen (keine Samples), alle aktiven Spuren gleichzeitig. Pausen bleiben still.';
  }
  $('routing-summary').innerHTML = r ? (stale ? '<p class="muted small">Zuordnung für den zuletzt umgewandelten Text:</p>' : '') + renderRoutingSummary(r) : '';
  updateAudioExportUi();
}

function reapply() {
  const empty = { chars: new Set(), bytes: new Set(), seqs: new Set() };
  const f = state.focus;
  const resLinked = state.result && f ? computeLinked(state.result, f) : empty;
  if (!state.result || (!isSynced() && state.focusOrigin === 'preview')) {
    applyHighlight(results, empty);
    applyHighlight(previewEl, state.preview?.ok && state.preview.analysis && state.preview.bytes ? computePreviewLinked({ analysis: state.preview.analysis, bytes: state.preview.bytes }, f) : empty);
  } else if (isSynced()) {
    applyHighlight(results, resLinked);
    applyHighlight(previewEl, resLinked);
  } else {
    applyHighlight(results, resLinked);
    applyHighlight(previewEl, empty);
  }
  $('btn-clear-focus').hidden = !f;
  $('focus-info').firstElementChild?.replaceWith(Object.assign(document.createElement('span'), { className: f ? '' : 'muted', textContent: describeFocus() }));
}

/** Beschreibung eines Ereignisses: Pause oder die Töne der aktiven Spuren. @param {import('../core/pipeline.js').PipelineResult} r @param {number} seq */
function eventLabel(r, seq) {
  const e = r.master.events[seq];
  if (e.type === 'rest') return PAUSE_LABEL[e.pauseKind];
  const by = r.tracks.flatMap((t, i) => (t.enabled && t.bySeq[seq] ? [`S${i + 1} ${noteLabel(/** @type {any} */ (t.bySeq[seq]).midi)}`] : []));
  return by.length ? `Note ${by.join(', ')}` : 'Note ohne Spur (still)';
}

function describeFocus() {
  const r = state.result;
  const f = state.focus;
  if (!f) return 'Klicke oder fokussiere ein Zeichen, ein Byte oder ein Ereignis, um die Verbindungen in allen Ansichten zu sehen.';
  if (!r || (!isSynced() && state.focusOrigin === 'preview')) {
    const p = state.preview;
    if (!p?.analysis || !p.bytes) return '';
    if ('charIndex' in f) { const c = p.analysis.chars[f.charIndex]; return c ? `Zeichen ${c.index + 1} „${visibleChar(c.text)}“: ${c.byteCount} Byte${c.byteCount === 1 ? '' : 's'} (Vorschau; das Ergebnis gehört noch zum alten Text).` : ''; }
    if ('byteIndex' in f) { const b = p.bytes[f.byteIndex]; return b ? `Byte ${b.value} (${b.bits}) von Zeichen ${b.charIndex + 1} (Vorschau).` : ''; }
    return '';
  }
  const lk = computeLinked(r, f);
  const ev = (/** @type {number} */ i) => eventLabel(r, i);
  const seqs = [...lk.seqs].sort((a, b) => a - b);
  const evText = seqs.length === 0 ? 'kein Ereignis (ignoriert bzw. Rand-Leerraum)' : seqs.length <= 4 ? seqs.map((i) => `Ereignis ${i + 1} (${ev(i)})`).join(', ') : `${seqs.length} Ereignisse`;
  if ('charIndex' in f) { const c = r.analysis.chars[f.charIndex]; return `Zeichen ${c.index + 1} „${visibleChar(c.text)}“: ${c.byteCount} Byte${c.byteCount === 1 ? '' : 's'} → ${evText}.`; }
  if ('byteIndex' in f) { const b = r.bytes[f.byteIndex]; return `Byte ${b.value} (${b.bits}) von Zeichen ${b.charIndex + 1} „${visibleChar(r.analysis.chars[b.charIndex].text)}“ → ${evText}.`; }
  const e = r.master.events[f.seq];
  const chs = [...lk.chars].slice(0, 6).map((i) => `„${visibleChar(r.analysis.chars[i].text)}“`).join(' ');
  return `Ereignis ${e.seq + 1} (${ev(e.seq)}) stammt von Zeichen ${chs}.`;
}

/** @param {import('./highlighting.js').Focus|null} f @param {boolean} fromRoll @param {'preview'|'results'} origin */
function setFocus(f, fromRoll, origin) {
  if (sameFocus(f, state.focus) && origin === state.focusOrigin) return;
  state.focus = f;
  state.focusOrigin = origin;
  if (state.result && !fromRoll && f && (isSynced() || origin === 'results')) {
    const seqs = [...computeLinked(state.result, f).seqs];
    const size = rollPageSize(activeLanes().length);
    const first = state.page * size;
    if (seqs.length > 0 && !seqs.some((s) => s >= first && s < first + size)) {
      state.page = Math.floor(Math.min(...seqs) / size);
      renderRoll();
    }
  }
  reapply();
}

/* ---------- Klangvorschau ---------- */
/** @param {string} [message] */
function stopPlayback(message) {
  const was = player.isPlaying();
  player.stop('stopped');
  if (was && message) { state.playMessage = message; $('play-status').textContent = message; announce(message); }
}

function markPlaying(/** @type {number} */ seq) {
  if (seq === state.playingSeq) return;
  results.querySelectorAll('.playing').forEach((el) => el.classList.remove('playing'));
  state.playingSeq = seq;
  if (seq >= 0) results.querySelectorAll(`[data-seq="${seq}"]`).forEach((el) => el.classList.add('playing'));
}

/** Hörbarkeit je aktiver Spur (Stumm/Solo/Pegel; wirkt nur auf die Vorschau). */
function trackStates() {
  const anySolo = state.tracks.some((t) => t.enabled && state.trackUi[t.id]?.solo);
  /** @type {Record<string, { audible:boolean, volume:number }>} */
  const out = {};
  for (const t of state.tracks) {
    const ui = state.trackUi[t.id] ?? { mute: false, solo: false, volume: 100 };
    out[t.id] = { audible: t.enabled && (anySolo ? ui.solo : !ui.mute), volume: ui.volume / 100 };
  }
  return out;
}

async function startPlayback() {
  const r = state.result;
  if (!r) return;
  state.playMessage = '';
  const label = excerpt(state.convertedText ?? '');
  const total = r.master.events.length;
  const arr = buildArrangement(r);
  if (arr.tracks.length === 0) { state.playMessage = 'Keine aktive Spur zum Abspielen.'; $('play-status').textContent = state.playMessage; announce(state.playMessage); return; }
  const res = await player.start(arr, {
    trackStates: trackStates(),
    onProgress: ({ event }) => {
      markPlaying(event ? event.seq : -1);
      if (event) {
        $('play-status').textContent = `Spielt das Ergebnis von „${label}“ (${arr.tracks.length} Spur${arr.tracks.length === 1 ? '' : 'en'})${isStale() ? ' (Text wurde seitdem geändert)' : ''} – Ereignis ${event.seq + 1} von ${num(total)}: ${eventLabel(r, event.seq)}.`;
      }
    },
    onEnd: (reason) => {
      markPlaying(-1);
      stopBtn.disabled = true;
      if (reason === 'finished') { state.playMessage = `Wiedergabe beendet (Ergebnis von „${label}“).`; announce('Wiedergabe beendet.'); }
      else if (reason === 'stopped') { state.playMessage = state.playMessage || 'Wiedergabe gestoppt.'; }
      if (reason !== 'replaced') $('play-status').textContent = state.playMessage;
    },
  });
  if (res.ok) {
    stopBtn.disabled = false;
    announce(`Wiedergabe gestartet: ${res.tracks} Spur${res.tracks === 1 ? '' : 'en'}, ${num(res.notes)} Noten, ${res.seconds.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Sekunden.`);
  } else if (res.reason !== 'superseded') {
    state.playMessage = res.message;
    $('play-status').textContent = res.message;
    announce(res.message);
  }
}

/* ---------- MIDI-Export ---------- */
function exportMidi() {
  const r = state.result;
  if (!r || isStale()) { updateSyncUi(); return; }
  try {
    const bytes = arrangementToMidi(buildArrangement(r));
    downloadBlob(new Blob([/** @type {BlobPart} */ (bytes)], { type: MIDI_MIME }), midiFilename(new Date(), state.convertedText ?? ''));
    announce('MIDI-Datei wird heruntergeladen.');
  } catch (err) {
    const msg = err instanceof MidiExportError ? err.message : `MIDI-Export fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`;
    $('export-hint').textContent = msg;
    announce(msg);
  }
}

/* ---------- Audioexport (WAV/ZIP) ---------- */
const audioModeInputs = /** @type {NodeListOf<HTMLInputElement>} */ (document.querySelectorAll('input[name="audio-mode"]'));
const audioTrackSelect = /** @type {HTMLSelectElement} */ ($('audio-track'));
const audioExportBtn = /** @type {HTMLButtonElement} */ ($('btn-audio-export'));
const audioMode = () => /** @type {import('../export/audio.js').AudioExportMode} */ (Array.from(audioModeInputs).find((i) => i.checked)?.value ?? 'mix');

/** OfflineAudioContext des Browsers (über window, wie die Vorschau). */
const createOfflineContext = (/** @type {number} */ channels, /** @type {number} */ length, /** @type {number} */ sampleRate) => {
  const Ctor = window.OfflineAudioContext ?? /** @type {any} */ (window).webkitOfflineAudioContext;
  if (!Ctor) throw new AudioExportError('Dieser Browser unterstützt das Offline-Rendering (OfflineAudioContext) nicht.');
  return new Ctor(channels, length, sampleRate);
};

/** Spuren, die im Export vorkommen können: aktiv und mit mindestens einer Note. */
function exportableTracks() {
  const r = state.result;
  if (!r) return [];
  return buildArrangement(r).tracks.filter((t) => t.notes.some((n) => n.durationTick > 0));
}

/** Grund, warum gerade nicht exportiert werden kann (leer = möglich). Nutzt dieselben Zustände wie der MIDI-Export. */
function audioExportBlocker() {
  const r = state.result;
  const mode = audioMode();
  if (!r) return 'Noch kein Ergebnis: Klicke zuerst auf „Umwandeln“.';
  if (isStale()) return 'Audioexport gesperrt, bis der geänderte Text erneut umgewandelt wurde.';
  if (state.stale) return 'Audioexport gesperrt: Die Einstellungen sind ungültig. Bitte die markierten Felder korrigieren.';
  const arr = buildArrangement(r);
  if (arr.tracks.length === 0) return 'Audioexport nicht möglich: Es gibt keine aktive Spur.';
  const tracks = exportableTracks();
  if (tracks.length === 0) return 'Audioexport nicht möglich: Die aktiven Spuren spielen keine Noten.';
  if (mode === 'mix') {
    const st = trackStates();
    if (!tracks.some((t) => st[t.id]?.audible !== false)) return 'Audioexport nicht möglich: Alle Spuren mit Noten sind stummgeschaltet oder durch Solo ausgeblendet.';
  }
  if (mode === 'track' && !tracks.some((t) => t.id === audioTrackSelect.value)) return 'Bitte eine Spur auswählen.';
  return '';
}

/** Spurauswahl, Sichtbarkeit, Button- und Hinweiszustand aktualisieren (Auswahl und Fokus bleiben erhalten). */
function updateAudioExportUi() {
  const mode = audioMode();
  $('audio-track-field').hidden = mode !== 'track';
  const tracks = exportableTracks();
  const opts = tracks.map((t) => ({ id: t.id, label: `S${state.tracks.findIndex((x) => x.id === t.id) + 1} ${t.name}` }));
  const sig = JSON.stringify(opts);
  if (audioTrackSelect.dataset.sig !== sig) {
    const keep = audioTrackSelect.value;
    audioTrackSelect.innerHTML = opts.map((o) => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('');
    audioTrackSelect.dataset.sig = sig;
    if (opts.some((o) => o.id === keep)) audioTrackSelect.value = keep;
  }
  const blocker = audioExportBlocker();
  audioExportBtn.disabled = state.exporting || blocker !== '';
  $('audio-export-hint').textContent = blocker;
  $('audio-export').setAttribute('aria-busy', String(state.exporting));
  $('audio-export-label').textContent = state.exporting ? 'Wird erstellt …' : mode === 'zip' ? 'ZIP mit WAV-Dateien erstellen' : 'WAV-Datei erstellen';
  setIcon(audioExportBtn.querySelector('svg'), state.exporting ? 'loader-circle' : 'download', state.exporting ? 'ui-icon--spin' : '');
  audioModeInputs.forEach((i) => { i.disabled = state.exporting; });
  audioTrackSelect.disabled = state.exporting;
}

async function runAudioExport() {
  if (state.exporting) return;
  const r = state.result;
  if (!r || audioExportBlocker() !== '') { updateAudioExportUi(); return; }
  const status = $('audio-export-status');
  const mode = audioMode();
  const arr = buildArrangement(r); // Momentaufnahme: der Export gehört zum zuletzt umgewandelten Text
  const text = state.convertedText ?? '';
  state.exporting = true;
  updateAudioExportUi();
  setMessage(status, 'info', 'Audio wird erzeugt …');
  announce('Audioexport gestartet.');
  try {
    const res = await exportAudio(arr, {
      mode, trackId: audioTrackSelect.value, trackStates: trackStates(), text, createOfflineContext,
      onProgress: (done, total) => { if (mode === 'zip' && done < total) setMessage(status, 'info', `Audio wird erzeugt … Spur ${done + 1} von ${total}`); },
    });
    downloadBlob(new Blob([/** @type {BlobPart} */ (res.data)], { type: res.mime }), res.filename);
    const i = res.info;
    const msg = `Audio exportiert: ${res.filename} (${i.files} WAV-Datei${i.files === 1 ? '' : 'en'}, je ${i.seconds.toLocaleString('de-DE', { maximumFractionDigits: 1 })} s)` +
      `${i.skipped ? `; ${i.skipped} Spur${i.skipped === 1 ? '' : 'en'} ohne Noten übersprungen` : ''}${i.attenuated ? '; wegen Übersteuerung leiser ausgesteuert' : ''}.`;
    setMessage(status, 'ok', msg);
    announce(msg);
  } catch (err) {
    console.error(err);
    const msg = err instanceof AudioExportError ? err.message : 'Der Audioexport ist fehlgeschlagen. Bitte erneut versuchen oder weniger Spuren bzw. einen kürzeren Text exportieren.';
    setMessage(status, 'error', msg);
    announce(msg);
  } finally {
    state.exporting = false;
    updateAudioExportUi();
  }
}

audioModeInputs.forEach((i) => i.addEventListener('change', () => { setMessage($('audio-export-status'), 'info', ''); updateAudioExportUi(); }));
audioTrackSelect.addEventListener('change', updateAudioExportUi);
audioExportBtn.addEventListener('click', () => { void runAudioExport(); });

/* ---------- Spuren ---------- */
const tracksList = $('tracks-list');
/** Wert für Attributselektoren absichern (IDs sind „track-N“, trotzdem robust). @param {string} v */
const q = (v) => String(v).replace(/["\\]/g, '\\$&');
const anySolo = () => state.tracks.some((t) => t.enabled && state.trackUi[t.id]?.solo);
/** @param {string} id */
const ui = (id) => (state.trackUi[id] ??= { mute: false, solo: false, volume: 100 });

/** Komplette Spurenliste neu zeichnen (nur bei Strukturänderungen: hinzufügen, löschen, Editor öffnen/schließen, verschieben). */
function renderTracks() {
  state.tracks.forEach((t) => ui(t.id));
  tracksList.innerHTML = renderTrackList({ tracks: state.tracks, results: state.result?.tracks ?? null, ui: state.trackUi, editingId: state.editingId, errors: state.trackErrors, anySolo: anySolo() });
}

/** Karteninhalte aktualisieren, ohne Eingabefelder neu aufzubauen (Fokus bleibt erhalten). */
function updateTrackCards() {
  const solo = anySolo();
  for (const card of Array.from(tracksList.querySelectorAll('li.track-card'))) {
    const id = /** @type {string} */ (card.getAttribute('data-track'));
    const t = state.tracks.find((x) => x.id === id);
    if (!t) continue;
    const i = state.tracks.indexOf(t);
    const u = ui(id);
    card.setAttribute('data-state', cardState(t, u, solo));
    const nm = card.querySelector('.track-name'); if (nm) nm.textContent = t.name;
    const st = card.querySelector('[data-role=status]'); if (st) st.textContent = statusText(t, u, solo);
    const info = card.querySelector('[data-role=info]'); if (info) info.innerHTML = trackInfoHtml(t, state.result?.tracks.find((x) => x.id === id), i);
    const en = /** @type {HTMLInputElement|null} */ (card.querySelector('[data-tact=enabled]')); if (en) en.checked = t.enabled;
    card.querySelector('[data-tact=mute]')?.setAttribute('aria-pressed', String(u.mute));
    card.querySelector('[data-tact=solo]')?.setAttribute('aria-pressed', String(u.solo));
  }
  $('routing-summary').innerHTML = state.result ? (isStale() ? '<p class="muted small">Zuordnung für den zuletzt umgewandelten Text:</p>' : '') + renderRoutingSummary(state.result) : '';
  updateAudioExportUi();
}

/** Fehler an den Feldern des geöffneten Editors anzeigen. */
function showTrackErrors() {
  const id = state.editingId;
  if (!id) return;
  const errs = trackErrors(state.trackErrors, id);
  const editor = tracksList.querySelector(`[data-editor="${q(id)}"]`);
  if (!editor) return;
  for (const f of ['name', 'ruleType', 'ruleChars', 'mode', 'scaleId', 'root', 'lo', 'hi', 'program']) {
    const p = editor.querySelector(`[id="e-${q(id)}-${f}"]`);
    if (p) setFieldError(p, errs[f] ?? '');
    const inputEl = editor.querySelector(`[data-tfield="${f}"]`);
    if (inputEl) { if (errs[f]) inputEl.setAttribute('aria-invalid', 'true'); else inputEl.removeAttribute('aria-invalid'); }
  }
}

/** @param {string} id @param {(t:import('../core/tracks.js').TrackConfig)=>import('../core/tracks.js').TrackConfig} fn */
function updateTrack(id, fn) {
  state.tracks = state.tracks.map((t) => (t.id === id ? fn(t) : t));
}

/** Feldänderung im Editor. @param {HTMLElement} el */
function onTrackField(el) {
  const editor = el.closest('[data-editor]');
  const field = el.getAttribute('data-tfield');
  if (!editor || !field) return;
  const id = /** @type {string} */ (editor.getAttribute('data-editor'));
  const v = /** @type {HTMLInputElement} */ (el).value;
  const num_ = v.trim() === '' ? NaN : Number(v);
  if (field === 'category' || field === 'search') {
    const cat = /** @type {HTMLSelectElement} */ (editor.querySelector('[data-tfield=category]')).value;
    const q = /** @type {HTMLInputElement} */ (editor.querySelector('[data-tfield=search]')).value;
    const cur = state.tracks.find((t) => t.id === id)?.instrument ?? { program: 0 };
    /** @type {HTMLSelectElement} */ (editor.querySelector('[data-tfield=program]')).innerHTML = instrumentOptionsHtml(cat, q, cur);
    return;
  }
  updateTrack(id, (t) => {
    switch (field) {
      case 'name': return { ...t, name: v };
      case 'ruleType': return { ...t, rule: { ...t.rule, type: /** @type {any} */ (v) } };
      case 'ruleChars': return { ...t, rule: { ...t.rule, chars: v } };
      case 'caseSensitive': return { ...t, rule: { ...t.rule, caseSensitive: /** @type {HTMLInputElement} */ (el).checked } };
      case 'yIsVowel': return { ...t, rule: { ...t.rule, yIsVowel: /** @type {HTMLInputElement} */ (el).checked } };
      case 'mode': return { ...t, mapping: { ...t.mapping, mode: /** @type {any} */ (v) } };
      case 'scaleId': return { ...t, mapping: { ...t.mapping, scaleId: v } };
      case 'root': return { ...t, mapping: { ...t.mapping, root: Number(v) } };
      case 'lo': return { ...t, mapping: { ...t.mapping, lo: num_ } };
      case 'hi': return { ...t, mapping: { ...t.mapping, hi: num_ } };
      case 'germanExt': { const { germanExt: _g, ...rest } = t.rule; return { ...t, rule: /** @type {HTMLInputElement} */ (el).checked ? { ...rest, germanExt: true } : rest }; }
      case 'program': return { ...t, instrument: instrumentFromKey(v) };
      default: return t;
    }
  });
  const t = state.tracks.find((x) => x.id === id);
  if (t) refreshEditorVisibility(/** @type {HTMLElement} */ (editor), t);
  onSettingsChange();
}

/** @param {string} id */
function pushPlayerState(id) {
  const st = trackStates();
  for (const t of state.tracks) player.setTrackState(t.id, st[t.id]);
  void id;
}

/** Aktion auf einer Spurkarte. @param {HTMLElement} btn */
function onTrackAction(btn) {
  const act = btn.getAttribute('data-tact');
  const card = btn.closest('li.track-card');
  const id = card?.getAttribute('data-track') ?? '';
  const idx = state.tracks.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const t = state.tracks[idx];
  switch (act) {
    case 'enabled': updateTrack(id, (x) => ({ ...x, enabled: /** @type {HTMLInputElement} */ (btn).checked })); onSettingsChange(); announce(`Spur ${t.name} ${/** @type {HTMLInputElement} */ (btn).checked ? 'aktiviert' : 'deaktiviert'}.`); break;
    case 'mute': ui(id).mute = !ui(id).mute; updateTrackCards(); pushPlayerState(id); announce(`Spur ${t.name} ${ui(id).mute ? 'stumm' : 'wieder hörbar'} (nur Vorschau).`); break;
    case 'solo': ui(id).solo = !ui(id).solo; updateTrackCards(); pushPlayerState(id); announce(`Solo für ${t.name} ${ui(id).solo ? 'an' : 'aus'} (nur Vorschau).`); break;
    case 'volume': ui(id).volume = Number(/** @type {HTMLInputElement} */ (btn).value); pushPlayerState(id); break;
    case 'edit': case 'close':
      state.editingId = state.editingId === id && act === 'edit' || act === 'close' ? null : id;
      renderTracks(); showTrackErrors();
      const target = /** @type {HTMLElement|null} */ (tracksList.querySelector(state.editingId ? `[data-editor="${q(id)}"] [data-tfield=name]` : `[data-track="${q(id)}"] [data-tact=edit]`));
      (target ?? $('btn-add-track')).focus();
      break;
    case 'apply-default': {
      const d = sonorityDefaults(t.rule.type);
      if (!d) break;
      updateTrack(id, (x) => ({ ...x, instrument: { ...d.instrument }, mapping: { ...x.mapping, ...d.mapping } }));
      renderTracks(); onSettingsChange(); showTrackErrors();
      /** @type {HTMLElement|null} */ (tracksList.querySelector(`[data-editor="${q(id)}"] [data-tact=apply-default]`))?.focus();
      announce(`Standardinstrument ${d.label} und Tonumfang für ${t.name} übernommen.`);
      break;
    }
    case 'duplicate': {
      const copy = duplicateTrack(state.tracks, id);
      if (!copy) break;
      state.tracks = [...state.tracks.slice(0, idx + 1), copy, ...state.tracks.slice(idx + 1)];
      state.trackUi[copy.id] = { ...ui(id), solo: false };
      state.editingId = copy.id;
      renderTracks(); onSettingsChange(); showTrackErrors();
      /** @type {HTMLElement|null} */ (tracksList.querySelector(`[data-editor="${q(copy.id)}"] [data-tfield=name]`))?.focus();
      announce(`Spur ${t.name} dupliziert als ${copy.name}.`);
      break;
    }
    case 'up': case 'down': {
      const j = act === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= state.tracks.length) break;
      const arr = [...state.tracks]; [arr[idx], arr[j]] = [arr[j], arr[idx]];
      state.tracks = arr;
      renderTracks(); onSettingsChange();
      /** @type {HTMLElement|null} */ (tracksList.querySelector(`[data-track="${q(id)}"] [data-tact=${act}]`))?.focus();
      announce(`Spur ${t.name} steht jetzt an Position ${j + 1}.`);
      break;
    }
    case 'delete': {
      state.tracks = state.tracks.filter((x) => x.id !== id);
      delete state.trackUi[id];
      if (state.editingId === id) state.editingId = null;
      stopPlayback('Spur gelöscht – Wiedergabe beendet.');
      renderTracks(); onSettingsChange();
      const next = state.tracks[Math.min(idx, state.tracks.length - 1)];
      const focusTarget = /** @type {HTMLElement|null} */ (next ? tracksList.querySelector(`[data-track="${q(next.id)}"] [data-tact=edit]`) : null) ?? $('btn-add-track');
      focusTarget.focus();
      announce(`Spur ${t.name} gelöscht.`);
      break;
    }
    default: break;
  }
}

tracksList.addEventListener('input', (e) => {
  const el = /** @type {HTMLElement} */ (e.target);
  if (el.hasAttribute('data-tfield') && el.tagName !== 'SELECT' && /** @type {HTMLInputElement} */ (el).type !== 'checkbox') onTrackField(el);
  else if (el.getAttribute('data-tact') === 'volume') onTrackAction(el);
});
tracksList.addEventListener('change', (e) => {
  const el = /** @type {HTMLElement} */ (e.target);
  if (el.hasAttribute('data-tfield') && (el.tagName === 'SELECT' || /** @type {HTMLInputElement} */ (el).type === 'checkbox')) onTrackField(el);
  else if (el.getAttribute('data-tact') === 'enabled') onTrackAction(el);
});
tracksList.addEventListener('click', (e) => {
  const btn = /** @type {Element} */ (e.target).closest('button[data-tact]');
  if (btn) onTrackAction(/** @type {HTMLElement} */ (btn));
});
tracksList.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.editingId) { const id = state.editingId; state.editingId = null; renderTracks(); /** @type {HTMLElement|null} */ (tracksList.querySelector(`[data-track="${q(id)}"] [data-tact=edit]`))?.focus(); }
});
$('btn-add-track').addEventListener('click', () => {
  if (state.tracks.length >= 20) { announce('Höchstens 20 Spuren.'); return; }
  const t = createTrack(state.tracks);
  state.tracks = [...state.tracks, t];
  state.editingId = t.id;
  renderTracks(); onSettingsChange(); showTrackErrors();
  /** @type {HTMLElement|null} */ (tracksList.querySelector(`[data-editor="${q(t.id)}"] [data-tfield=name]`))?.focus();
  announce(`Spur ${t.name} hinzugefügt.`);
});
$('btn-add-sonority').addEventListener('click', () => {
  const r = sonorityTemplate(state.tracks);
  const status = $('tracks-status');
  const have = r.existing.length > 0 ? ` Schon vorhanden (nicht erneut angelegt): ${r.existing.join(', ')}.` : '';
  if (!r.fits) {
    const msg = `Es fehlen ${r.missing} Sonoritätsklassen-Spuren, aber nur ${r.free} Plätze sind frei (Höchstens 20 Spuren). Es wurde nichts angelegt – lösche oder deaktiviere vorher andere Spuren.${have}`;
    setMessage(status, 'warn', msg); announce(msg); return;
  }
  if (r.created.length === 0) { const msg = 'Alle 13 Sonoritätsklassen sind bereits als Spuren vorhanden. Es wurde nichts angelegt.'; setMessage(status, 'info', msg); announce(msg); return; }
  state.tracks = [...state.tracks, ...r.created];
  state.editingId = null;
  renderTracks(); onSettingsChange();
  const msg = `${r.created.length} Sonoritätsklassen-Spuren angelegt.${have} Instrument, Tonleiter, Grundton und Tonumfang kannst du je Spur ändern.`;
  setMessage(status, 'ok', msg); announce(msg);
});
$('btn-add-vc').addEventListener('click', () => {
  if (state.tracks.length + 2 > 20) { announce('Höchstens 20 Spuren.'); return; }
  const [c, v] = vowelConsonantTemplate(state.tracks);
  state.tracks = [...state.tracks, c, v];
  state.editingId = null;
  renderTracks(); onSettingsChange();
  announce('Spuren „Konsonanten“ und „Vokale“ hinzugefügt.');
});

/* ---------- Ereignisse ---------- */
input.addEventListener('input', onTextChanged);
input.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !convertBtn.disabled) { e.preventDefault(); convert(); } });
convertBtn.addEventListener('click', convert);
$('btn-sample').addEventListener('click', () => { input.value = SAMPLE; onTextChanged(); input.focus(); announce('Beispieltext geladen. Die Binärvorschau ist aktuell; klicke auf „Umwandeln“ für die Musik.'); });
$('btn-reset').addEventListener('click', () => { writeSettings(DEFAULT_CONFIG); state.tracks = [createTrack([])]; state.trackUi = {}; state.editingId = null; stopPlayback('Einstellungen zurückgesetzt – Wiedergabe beendet.'); renderTracks(); onSettingsChange(); announce('Einstellungen und Spuren auf Standardwerte gesetzt.'); });
$('settings').addEventListener('input', onSettingsChange);
$('settings').addEventListener('change', onSettingsChange);
$('settings').addEventListener('submit', (e) => e.preventDefault());
$('btn-clear-focus').addEventListener('click', () => setFocus(null, true, state.focusOrigin));
playBtn.addEventListener('click', () => { void startPlayback(); });
stopBtn.addEventListener('click', () => stopPlayback());
exportBtn.addEventListener('click', exportMidi);
volume.addEventListener('input', () => player.setVolume(Number(volume.value) / 100));
window.addEventListener('pagehide', () => player.dispose());

/** Klick/Fokus/Tastatur für einen Bereich (Vorschau oder Ergebnis). @param {HTMLElement} root @param {'preview'|'results'} origin */
function bindInteractions(root, origin) {
  root.addEventListener('click', (e) => {
    const t = /** @type {Element} */ (e.target);
    const more = t.closest('[data-more]');
    if (more) {
      const view = /** @type {'binary'|'mapping'|'events'} */ (more.getAttribute('data-more'));
      state.rows[view] += LIMITS.initialRows;
      const r = state.result;
      if (view === 'binary' && state.preview?.ok && state.preview.analysis && state.preview.bytes) $('binary-wrap').innerHTML = renderBinary({ analysis: state.preview.analysis, bytes: state.preview.bytes }, state.rows.binary);
      if (r && view === 'mapping') $('mapping-wrap').innerHTML = renderMapping(r, state.rows.mapping);
      if (r && view === 'events') $('events-wrap').innerHTML = renderEvents(r, state.rows.events);
      reapply();
      announce('Weitere Einträge geladen.');
      return;
    }
    const pager = t.closest('[data-roll]');
    if (pager) {
      state.page += pager.getAttribute('data-roll') === 'next' ? 1 : -1;
      renderRoll();
      reapply();
      return;
    }
    const f = focusFromElement(t);
    if (f) setFocus(f, !!t.closest('.roll'), origin);
  });
  root.addEventListener('focusin', (e) => {
    const f = focusFromElement(e.target);
    if (f) setFocus(f, !!(/** @type {Element} */ (e.target)).closest('.roll'), origin);
  });
  root.addEventListener('keydown', (e) => {
    const t = /** @type {Element} */ (e.target);
    if (e.key === 'Escape' && state.focus) { setFocus(null, true, origin); return; }
    if ((e.key === 'Enter' || e.key === ' ') && t.matches('[data-char],[data-seq]')) {
      e.preventDefault();
      const f = focusFromElement(t);
      if (f) setFocus(f, !!t.closest('.roll'), origin);
    }
  });
}
bindInteractions(results, 'results');
bindInteractions(previewEl, 'preview');

hydrateIconSlots(document);
initTheme(/** @type {HTMLButtonElement} */ ($('btn-theme')), { onChange: (t) => announce(t === 'dark' ? 'Dunkles Design aktiv.' : 'Helles Design aktiv.') });
initSettings();
renderTracks();
updateInputState();
updatePreview();
updateSyncUi();
