// @ts-check
/**
 * Klangvorschau (Web Audio, synthetische Instrumentprofile, keine Samples). Liest ausschließlich ein Arrangement
 * (aktive Spuren mit absoluten Ticks) oder – abwärtskompatibel – eine einzelne `Sequence` (dann Sinus).
 * Enthält keine Text-, Byte- oder Mapping-Logik. Kein Player mit Transportsteuerung.
 *
 * Tonausgabe wird über `AudioContext.currentTime` vorausgeplant (Lookahead); Timer dienen nur dem
 * Nachplanen und der Statusanzeige. Alle Browser-Schnittstellen sind injizierbar (Tests mit Mocks).
 */

/** @typedef {import('../core/timeline.js').Sequence} Sequence */
/** @typedef {import('../core/arrangement.js').Arrangement} Arrangement */
import { getInstrument } from './instrument-catalog.js';
import { getProfile, PROFILES, scheduleVoice } from './synth.js';
/** @typedef {{ seq:number, midi:number, frequency:number, startSeconds:number, durationSeconds:number, endSeconds:number, velocity?:number, trackIndex?:number }} PlannedNote */

export const SCHEDULE_AHEAD_SECONDS = 0.6;
export const PUMP_INTERVAL_MS = 100;
export const START_DELAY_SECONDS = 0.08;
/** Maximale Pegel-Skalierung des Master-Gains (Lautstärke 1.0 → 0.5), damit nichts übersteuert. */
export const MASTER_PEAK = 0.5;
export const DEFAULT_VOLUME = 0.4;

/** @param {number} midi */
export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Ticks → Sekunden: 1 Beat = ppq Ticks = 60 / tempoBpm Sekunden. @param {number} ticks @param {number} ppq @param {number} tempoBpm */
export function ticksToSeconds(ticks, ppq, tempoBpm) {
  return (ticks / ppq) * (60 / tempoBpm);
}

/** @param {number} seconds @param {number} ppq @param {number} tempoBpm */
export function secondsToTicks(seconds, ppq, tempoBpm) {
  return (seconds * tempoBpm * ppq) / 60;
}

/** @param {Sequence} sequence */
function assertSequence(sequence) {
  if (!sequence || !Array.isArray(sequence.events)) throw new TypeError('Ungültige Sequenz: events fehlt.');
  if (!(Number.isFinite(sequence.ppq) && sequence.ppq > 0)) throw new RangeError('Ungültige Sequenz: ppq muss > 0 sein.');
  if (!(Number.isFinite(sequence.tempoBpm) && sequence.tempoBpm > 0)) throw new RangeError('Ungültige Sequenz: tempoBpm muss > 0 sein.');
}

/**
 * Plant alle Noten (Pausen erzeugen nichts, Dauer-0-Noten werden übersprungen). Zeiten relativ zum Start.
 * @param {Sequence} sequence
 * @returns {PlannedNote[]}
 */
export function planNotes(sequence) {
  assertSequence(sequence);
  const out = [];
  for (const e of sequence.events) {
    if (e.type !== 'note' || !(e.durationTick > 0)) continue;
    const startSeconds = ticksToSeconds(e.startTick, sequence.ppq, sequence.tempoBpm);
    const durationSeconds = ticksToSeconds(e.durationTick, sequence.ppq, sequence.tempoBpm);
    out.push({ seq: e.seq, midi: e.midi, frequency: midiToFrequency(e.midi), startSeconds, durationSeconds, endSeconds: startSeconds + durationSeconds });
  }
  return out;
}

/** Gesamtdauer inklusive abschließender Pausen. @param {Sequence} sequence */
export function totalSeconds(sequence) {
  assertSequence(sequence);
  return ticksToSeconds(sequence.totalTicks, sequence.ppq, sequence.tempoBpm);
}

/**
 * Ereignis zum Zeitpunkt `tick` (Binärsuche; Ereignisse sind lückenlos und sortiert) oder null.
 * @param {Sequence['events']} events @param {number} tick
 */
export function findEventAtTick(events, tick) {
  let lo = 0;
  let hi = events.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const e = events[mid];
    if (tick < e.startTick) hi = mid - 1;
    else if (tick >= e.startTick + e.durationTick) lo = mid + 1;
    else return e;
  }
  return null;
}

/**
 * @typedef {{ createContext:()=>any, timers?:{ setInterval:(fn:()=>void, ms:number)=>any, clearInterval:(id:any)=>void },
 *   scheduleAhead?:number, volume?:number }} PlayerOptions
 * @typedef {{ audible?:boolean, volume?:number }} TrackState
 * @typedef {{ ok:true, notes:number, seconds:number, tracks:number }|{ ok:false, reason:'no-notes'|'no-audible'|'invalid-sequence'|'audio-unavailable'|'superseded', message:string }} StartResult
 * @typedef {{ onProgress?:(p:{ seconds:number, event:import('../core/timeline.js').MasterEvent|import('../core/timeline.js').MusicEvent|null })=>void,
 *   onEnd?:(reason:'finished'|'stopped'|'replaced')=>void, trackStates?:Record<string, TrackState> }} StartOptions
 */

/** Spezifikation vereinheitlichen: Arrangement oder einzelne Sequenz (Sinus). @param {Arrangement|Sequence} spec */
function normalizeSpec(spec) {
  assertSequence(/** @type {Sequence} */ (spec));
  const arr = /** @type {Arrangement} */ (spec);
  if (Array.isArray(arr.tracks)) {
    return { ppq: arr.ppq, tempoBpm: arr.tempoBpm, totalTicks: arr.totalTicks, events: arr.events, tracks: arr.tracks.map((t) => ({ id: t.id, profile: getProfile(getInstrument(t.program).profile), notes: t.notes })) };
  }
  const seq = /** @type {Sequence} */ (spec);
  return { ppq: seq.ppq, tempoBpm: seq.tempoBpm, totalTicks: seq.totalTicks, events: seq.events, tracks: [{ id: 'legacy', profile: PROFILES.sine, notes: seq.events.filter((e) => e.type === 'note') }] };
}

/** @param {PlayerOptions} options */
export function createPreviewPlayer(options) {
  const timers = options.timers ?? { setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: (id) => clearInterval(id) };
  const ahead = options.scheduleAhead ?? SCHEDULE_AHEAD_SECONDS;
  let volume = clamp01(options.volume ?? DEFAULT_VOLUME);
  /** @type {any} */ let ctx = null;
  /** @type {any} */ let master = null;
  /** @type {any} */ let timerId = null;
  let runId = 0;
  /** @type {null|{ spec:ReturnType<typeof normalizeSpec>, notes:PlannedNote[], next:number, t0:number, total:number, onProgress?:Function, onEnd?:Function,
   *   active:Set<{ osc:any, gain:any }[]>, trackGains:Map<string, any>, profiles:any[] }} */
  let run = null;

  /** @param {number} v */
  function clamp01(v) { return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0; }

  function ensureContext() {
    if (!ctx || ctx.state === 'closed') {
      ctx = options.createContext();
      master = ctx.createGain();
      master.gain.value = volume * MASTER_PEAK;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  /** @param {PlannedNote} n */
  function scheduleNote(n) {
    if (!run) return;
    const ti = n.trackIndex ?? 0;
    const track = run.spec.tracks[ti];
    const dest = run.trackGains.get(track.id);
    const nodes = scheduleVoice(ctx, dest, track.profile, { frequency: n.frequency, start: run.t0 + n.startSeconds, end: run.t0 + n.endSeconds, velocity: n.velocity ?? 80 });
    const active = run.active;
    active.add(nodes);
    const oscs = nodes.filter((x) => x.osc);
    let left = oscs.length;
    for (const x of oscs) {
      x.osc.onended = () => {
        try { x.osc.disconnect(); } catch { /* bereits getrennt */ }
        if (--left <= 0) {
          for (const y of nodes) { try { y.gain?.disconnect(); } catch { /* bereits getrennt */ } }
          active.delete(nodes);
        }
      };
    }
  }

  function pump() {
    if (!run) return;
    const now = ctx.currentTime;
    while (run.next < run.notes.length && run.t0 + run.notes[run.next].startSeconds < now + ahead) scheduleNote(run.notes[run.next++]);
    const seconds = Math.max(0, now - run.t0);
    const tick = secondsToTicks(seconds, run.spec.ppq, run.spec.tempoBpm);
    run.onProgress?.({ seconds, event: findEventAtTick(/** @type {any} */ (run.spec.events), tick) });
    if (run.next >= run.notes.length && seconds >= run.total) stop('finished');
  }

  /**
   * Beendet die Wiedergabe sofort (idempotent): Timer löschen, geplante und klingende Oszillatoren ausblenden und stoppen.
   * @param {'finished'|'stopped'|'replaced'} [reason]
   */
  function stop(reason = 'stopped') {
    if (timerId !== null) { timers.clearInterval(timerId); timerId = null; }
    const r = run;
    run = null;
    runId++;
    if (!r) return;
    const now = ctx ? ctx.currentTime : 0;
    for (const nodes of r.active) {
      for (const { osc, gain } of nodes) {
        try {
          if (gain?.gain) { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, 0.01); }
          if (osc) osc.stop(now + 0.05);
        } catch { /* Oszillator war schon beendet */ }
      }
    }
    r.active.clear();
    for (const g of r.trackGains.values()) { try { g.disconnect(); } catch { /* ok */ } }
    r.onEnd?.(reason);
  }

  /**
   * Startet die Vorschau aller Spuren auf einer gemeinsamen Zeitachse. Muss aus einem Klick aufgerufen werden
   * (AudioContext-Freischaltung). Eine laufende Wiedergabe wird vorher zuverlässig beendet.
   * @param {Arrangement|Sequence} specIn @param {StartOptions} [opts]
   * @returns {Promise<StartResult>}
   */
  async function start(specIn, opts = {}) {
    stop('replaced');
    const myRun = runId;
    /** @type {ReturnType<typeof normalizeSpec>} */
    let spec;
    /** @type {PlannedNote[]} */
    const notes = [];
    let total;
    try {
      spec = normalizeSpec(specIn);
      total = ticksToSeconds(spec.totalTicks, spec.ppq, spec.tempoBpm);
      spec.tracks.forEach((t, trackIndex) => {
        for (const e of t.notes) {
          if (!(e.durationTick > 0)) continue;
          const startSeconds = ticksToSeconds(e.startTick, spec.ppq, spec.tempoBpm);
          const durationSeconds = ticksToSeconds(e.durationTick, spec.ppq, spec.tempoBpm);
          notes.push({ seq: e.seq, midi: e.midi, frequency: midiToFrequency(e.midi), startSeconds, durationSeconds, endSeconds: startSeconds + durationSeconds, velocity: e.velocity, trackIndex });
        }
      });
      notes.sort((a, b) => a.startSeconds - b.startSeconds || /** @type {number} */ (a.trackIndex) - /** @type {number} */ (b.trackIndex) || a.seq - b.seq);
    } catch (err) {
      return { ok: false, reason: 'invalid-sequence', message: err instanceof Error ? err.message : String(err) };
    }
    if (notes.length === 0) return { ok: false, reason: 'no-notes', message: 'Die Sequenz enthält keine Noten – Pausen allein erzeugen keinen Klang.' };
    const states = opts.trackStates ?? {};
    const audible = (/** @type {string} */ id) => states[id]?.audible !== false;
    if (!spec.tracks.some((t) => audible(t.id) && t.notes.length > 0)) return { ok: false, reason: 'no-audible', message: 'Keine hörbare Spur mit Noten: Alle Spuren mit Noten sind stummgeschaltet oder durch Solo ausgeblendet.' };
    try {
      const c = ensureContext();
      if (c.state === 'suspended' && typeof c.resume === 'function') await c.resume();
    } catch (err) {
      return { ok: false, reason: 'audio-unavailable', message: `Audio konnte nicht gestartet werden: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (myRun !== runId) return { ok: false, reason: 'superseded', message: 'Die Wiedergabe wurde durch eine neuere Aktion ersetzt.' };
    /** @type {Map<string, any>} */
    const trackGains = new Map();
    for (const t of spec.tracks) {
      const g = ctx.createGain();
      g.gain.value = audible(t.id) ? clamp01(states[t.id]?.volume ?? 1) : 0;
      g.connect(master);
      trackGains.set(t.id, g);
    }
    run = { spec, notes, next: 0, t0: ctx.currentTime + START_DELAY_SECONDS, total, onProgress: opts.onProgress, onEnd: opts.onEnd, active: new Set(), trackGains, profiles: [] };
    timerId = timers.setInterval(pump, PUMP_INTERVAL_MS);
    pump();
    return { ok: true, notes: notes.length, seconds: total, tracks: spec.tracks.length };
  }

  return {
    start,
    stop,
    /** @param {number} v Lautstärke 0…1 */
    setVolume(v) {
      volume = clamp01(v);
      if (master) master.gain.value = volume * MASTER_PEAK;
    },
    /** Stumm/Solo/Lautstärke einer Spur während der Wiedergabe ändern (nur Hörkontrolle, ändert nichts an Noten oder Export). @param {string} id @param {TrackState} state */
    setTrackState(id, state) {
      const g = run?.trackGains.get(id);
      if (g) g.gain.value = state.audible === false ? 0 : clamp01(state.volume ?? 1);
    },
    isPlaying: () => run !== null,
    /** Beendet alles und gibt den AudioContext frei (z. B. beim Verlassen der Seite). */
    dispose() {
      stop('stopped');
      const c = ctx;
      ctx = null;
      master = null;
      if (c && c.state !== 'closed' && typeof c.close === 'function') Promise.resolve(c.close()).catch(() => {});
    },
  };
}
