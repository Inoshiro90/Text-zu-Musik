// @ts-check
/**
 * Synthetische Klangprofile für die Browser-Vorschau (Web Audio, keine Samples, keine externen Dateien).
 * Jedes Profil beschreibt Oszillatormischung, Hüllkurve (ADSR), Filter und dezente Modulation. Die Klänge sind absichtlich
 * einfach, aber je Instrumentfamilie deutlich unterscheidbar; sie ersetzen keine Sample-Instrumente (siehe docs/audio-lizenzen.md).
 *
 * @typedef {{ type:OscillatorType, ratio?:number, gain:number, detune?:number }} Partial
 * @typedef {{ osc:readonly Partial[], a:number, d:number, s:number, r:number, peak?:number,
 *   filter?:{ type:BiquadFilterType, freq:number, q?:number, sweepTo?:number, sweepTime?:number },
 *   vibrato?:{ rate:number, cents:number, delay:number }, tremolo?:undefined,
 *   noise?:{ gain:number, filter:{ type:BiquadFilterType, freq:number, q?:number }, decay?:number },
 *   pitchDrop?:{ ratio:number, time:number } }} Profile
 * `noise`: deterministisches Rauschen (eigener Filter, optional kurzer Abfall `decay`), mischt sich in die Hüllkurve der Stimme.
 * `pitchDrop`: Die tonalen Anteile starten `ratio`-mal höher und fallen innerhalb `time` s auf die Zielfrequenz (Trommel-Anschlag).
 */

/** @type {Readonly<Record<string, Profile>>} */
export const PROFILES = Object.freeze({
  sine: { osc: [{ type: 'sine', gain: 1 }], a: 0.005, d: 0, s: 1, r: 0.015 },
  piano: { osc: [{ type: 'triangle', gain: 0.75 }, { type: 'sine', ratio: 2, gain: 0.3 }, { type: 'sine', ratio: 3, gain: 0.12 }], a: 0.004, d: 0.7, s: 0.12, r: 0.06, filter: { type: 'lowpass', freq: 4500, q: 0.6 } },
  epiano: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 7, gain: 0.07 }], a: 0.004, d: 0.9, s: 0.25, r: 0.08 },
  harpsichord: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'square', ratio: 2, gain: 0.18 }], a: 0.002, d: 0.3, s: 0.04, r: 0.04, filter: { type: 'lowpass', freq: 3800, q: 1.2 } },
  clav: { osc: [{ type: 'square', gain: 0.5 }, { type: 'sawtooth', ratio: 2, gain: 0.2 }], a: 0.002, d: 0.18, s: 0.05, r: 0.03, filter: { type: 'bandpass', freq: 1800, q: 1.4 } },
  bell: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 2.76, gain: 0.45 }, { type: 'sine', ratio: 5.4, gain: 0.25 }], a: 0.002, d: 1.2, s: 0, r: 0.1 },
  mallet: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 4, gain: 0.3 }], a: 0.002, d: 0.45, s: 0, r: 0.05 },
  marimba: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 3.9, gain: 0.18 }], a: 0.002, d: 0.3, s: 0, r: 0.05, filter: { type: 'lowpass', freq: 2800 } },
  organ: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 2, gain: 0.6 }, { type: 'sine', ratio: 3, gain: 0.35 }, { type: 'sine', ratio: 4, gain: 0.18 }], a: 0.012, d: 0, s: 1, r: 0.03, peak: 0.55 },
  reed: { osc: [{ type: 'square', gain: 0.5 }, { type: 'sawtooth', gain: 0.25, detune: 7 }], a: 0.03, d: 0.05, s: 0.9, r: 0.05, filter: { type: 'lowpass', freq: 2200, q: 1 }, vibrato: { rate: 5, cents: 5, delay: 0.15 } },
  pluck: { osc: [{ type: 'sawtooth', gain: 0.55 }, { type: 'triangle', ratio: 2, gain: 0.2 }], a: 0.002, d: 0.45, s: 0.06, r: 0.05, filter: { type: 'lowpass', freq: 2600, q: 0.8 } },
  pizz: { osc: [{ type: 'triangle', gain: 0.9 }, { type: 'sine', ratio: 2, gain: 0.2 }], a: 0.002, d: 0.14, s: 0, r: 0.03, filter: { type: 'lowpass', freq: 2200 } },
  distgtr: { osc: [{ type: 'sawtooth', gain: 0.55 }, { type: 'square', gain: 0.3, detune: 9 }], a: 0.003, d: 0.2, s: 0.55, r: 0.05, filter: { type: 'lowpass', freq: 3200, q: 2 } },
  bass: { osc: [{ type: 'sawtooth', gain: 0.55 }, { type: 'sine', ratio: 0.5, gain: 0.6 }], a: 0.005, d: 0.2, s: 0.6, r: 0.04, filter: { type: 'lowpass', freq: 900, q: 1 } },
  synthbass: { osc: [{ type: 'square', gain: 0.5 }, { type: 'sawtooth', ratio: 0.5, gain: 0.5 }], a: 0.004, d: 0.15, s: 0.7, r: 0.03, filter: { type: 'lowpass', freq: 700, q: 4, sweepTo: 1800, sweepTime: 0.08 } },
  strings: { osc: [{ type: 'sawtooth', gain: 0.4, detune: -7 }, { type: 'sawtooth', gain: 0.4, detune: 7 }], a: 0.09, d: 0.1, s: 0.85, r: 0.1, filter: { type: 'lowpass', freq: 2800, q: 0.5 }, vibrato: { rate: 5.5, cents: 7, delay: 0.2 } },
  timpani: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 1.5, gain: 0.25 }], a: 0.002, d: 0.55, s: 0, r: 0.06 },
  brass: { osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'square', gain: 0.2, detune: 4 }], a: 0.05, d: 0.1, s: 0.8, r: 0.07, filter: { type: 'lowpass', freq: 700, q: 1.2, sweepTo: 3200, sweepTime: 0.12 } },
  tuba: { osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'sine', ratio: 0.5, gain: 0.4 }], a: 0.06, d: 0.1, s: 0.8, r: 0.08, filter: { type: 'lowpass', freq: 650, q: 1 } },
  muted: { osc: [{ type: 'sawtooth', gain: 0.55 }], a: 0.03, d: 0.1, s: 0.75, r: 0.05, filter: { type: 'bandpass', freq: 1500, q: 2.5 } },
  horn: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'sine', gain: 0.5 }], a: 0.07, d: 0.1, s: 0.8, r: 0.1, filter: { type: 'lowpass', freq: 1300, q: 0.7 } },
  synthbrass: { osc: [{ type: 'sawtooth', gain: 0.5, detune: -9 }, { type: 'sawtooth', gain: 0.5, detune: 9 }], a: 0.04, d: 0.1, s: 0.8, r: 0.06, filter: { type: 'lowpass', freq: 900, q: 2, sweepTo: 3600, sweepTime: 0.1 } },
  sax: { osc: [{ type: 'sawtooth', gain: 0.45 }, { type: 'square', gain: 0.2 }], a: 0.04, d: 0.08, s: 0.85, r: 0.06, filter: { type: 'lowpass', freq: 2000, q: 1.5 }, vibrato: { rate: 5.2, cents: 8, delay: 0.2 } },
  oboe: { osc: [{ type: 'sawtooth', gain: 0.4 }, { type: 'square', ratio: 2, gain: 0.1 }], a: 0.04, d: 0.05, s: 0.9, r: 0.05, filter: { type: 'bandpass', freq: 1700, q: 1.2 }, vibrato: { rate: 5.5, cents: 6, delay: 0.2 } },
  bassoon: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'triangle', gain: 0.3 }], a: 0.05, d: 0.08, s: 0.85, r: 0.06, filter: { type: 'lowpass', freq: 1100, q: 1 } },
  clarinet: { osc: [{ type: 'square', gain: 0.5 }, { type: 'sine', ratio: 3, gain: 0.15 }], a: 0.05, d: 0.06, s: 0.9, r: 0.05, filter: { type: 'lowpass', freq: 1800, q: 0.7 } },
  flute: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 2, gain: 0.12 }], a: 0.06, d: 0.05, s: 0.9, r: 0.06, vibrato: { rate: 5, cents: 9, delay: 0.25 } },
  lead: { osc: [{ type: 'square', gain: 0.45 }, { type: 'sawtooth', gain: 0.35, detune: 6 }], a: 0.01, d: 0.1, s: 0.8, r: 0.04, filter: { type: 'lowpass', freq: 3500, q: 2 } },
  pad: { osc: [{ type: 'sawtooth', gain: 0.3, detune: -12 }, { type: 'sawtooth', gain: 0.3 }, { type: 'sawtooth', gain: 0.3, detune: 12 }], a: 0.35, d: 0.2, s: 0.9, r: 0.3, peak: 0.6, filter: { type: 'lowpass', freq: 1800, q: 0.5 } },
  choir: { osc: [{ type: 'triangle', gain: 0.6 }, { type: 'sine', ratio: 2, gain: 0.25 }], a: 0.15, d: 0.1, s: 0.85, r: 0.15, filter: { type: 'bandpass', freq: 1100, q: 0.9 }, vibrato: { rate: 5, cents: 10, delay: 0.1 } },
  sitar: { osc: [{ type: 'sawtooth', gain: 0.5 }, { type: 'sawtooth', ratio: 1.005, gain: 0.35 }], a: 0.003, d: 0.6, s: 0.1, r: 0.05, filter: { type: 'bandpass', freq: 2200, q: 3 } },
  woodblock: { osc: [{ type: 'sine', gain: 1 }, { type: 'sine', ratio: 2.8, gain: 0.35 }], a: 0.001, d: 0.07, s: 0, r: 0.01, peak: 0.85, noise: { gain: 0.12, filter: { type: 'highpass', freq: 2500 }, decay: 0.01 } },
  tom: { osc: [{ type: 'sine', gain: 1 }, { type: 'triangle', ratio: 0.5, gain: 0.4 }], a: 0.002, d: 0.4, s: 0, r: 0.05, pitchDrop: { ratio: 1.7, time: 0.09 }, noise: { gain: 0.1, filter: { type: 'lowpass', freq: 900 }, decay: 0.03 } },
  snare: { osc: [{ type: 'triangle', gain: 0.6 }], a: 0.001, d: 0.15, s: 0, r: 0.02, pitchDrop: { ratio: 1.4, time: 0.05 }, noise: { gain: 0.9, filter: { type: 'highpass', freq: 1500, q: 0.6 }, decay: 0.13 } },
  'hybrid-perc': { osc: [{ type: 'sine', gain: 1 }, { type: 'sawtooth', gain: 0.22 }], a: 0.001, d: 0.22, s: 0, r: 0.03, pitchDrop: { ratio: 2, time: 0.06 }, noise: { gain: 0.35, filter: { type: 'bandpass', freq: 3000, q: 1 }, decay: 0.05 } },
  hihat: { osc: [{ type: 'square', ratio: 2, gain: 0.1 }, { type: 'square', ratio: 3, gain: 0.1 }, { type: 'square', ratio: 4.16, gain: 0.1 }], a: 0.001, d: 0.07, s: 0, r: 0.012, filter: { type: 'highpass', freq: 6000, q: 0.7 }, noise: { gain: 0.6, filter: { type: 'highpass', freq: 7000 }, decay: 0.06 } },
  noisesaw: { osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'sawtooth', gain: 0.3, detune: 8 }], a: 0.01, d: 0.1, s: 0.75, r: 0.05, filter: { type: 'lowpass', freq: 3200, q: 1.5 }, noise: { gain: 0.25, filter: { type: 'bandpass', freq: 2500, q: 0.8 } } },
  'violin-soft': { osc: [{ type: 'sawtooth', gain: 0.4, detune: -6 }, { type: 'sawtooth', gain: 0.4, detune: 6 }], a: 0.14, d: 0.1, s: 0.85, r: 0.12, filter: { type: 'lowpass', freq: 2600, q: 0.5 }, vibrato: { rate: 5.5, cents: 7, delay: 0.2 } },
  'horn-warm': { osc: [{ type: 'sawtooth', gain: 0.45 }, { type: 'sine', gain: 0.55 }], a: 0.12, d: 0.12, s: 0.8, r: 0.14, filter: { type: 'lowpass', freq: 1000, q: 0.6 } },
  fx: { osc: [{ type: 'sine', gain: 0.6 }, { type: 'sawtooth', ratio: 1.5, gain: 0.2, detune: 15 }], a: 0.2, d: 0.2, s: 0.7, r: 0.2, filter: { type: 'lowpass', freq: 1400, q: 3 }, vibrato: { rate: 7, cents: 25, delay: 0 } },
});

/** @param {string} id */
export const getProfile = (id) => PROFILES[id] ?? PROFILES.sine;

/** Alle Profil-IDs, die der Katalog verwendet, müssen existieren (Test). */
export const PROFILE_IDS = Object.freeze(Object.keys(PROFILES));

/** @type {WeakMap<object, any>} */
const NOISE_BUFFERS = new WeakMap();

/** Eine Sekunde weißes Rauschen, deterministisch (feste Startzahl) → reproduzierbarer Export. @param {any} ctx */
function noiseBuffer(ctx) {
  let b = NOISE_BUFFERS.get(ctx);
  if (!b) {
    const rate = ctx.sampleRate || 44100;
    b = ctx.createBuffer(1, rate, rate);
    const d = b.getChannelData(0);
    let x = 123456789;
    for (let i = 0; i < d.length; i++) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; d[i] = (x / 2147483648) - 1; }
    NOISE_BUFFERS.set(ctx, b);
  }
  return b;
}

/**
 * Plant EINE Note mit dem Profil auf dem AudioContext. Die Note ist spätestens bei `end` still (Hüllkurve endet bei 0,
 * Oszillatoren stoppen bei `end`), klingt also nie über die Grenze zum nächsten Ereignis hinaus.
 * @param {any} ctx @param {any} destination
 * @param {Profile} profile
 * @param {{ frequency:number, start:number, end:number, velocity:number }} note
 * @returns {{ osc:any, gain:any }[]} Knoten für sofortiges Stoppen
 */
export function scheduleVoice(ctx, destination, profile, note) {
  const dur = note.end - note.start;
  const s = note.start;
  const e = note.end;
  const peak = (profile.peak ?? 0.8) * Math.min(1, Math.max(0.05, note.velocity / 127 / 0.63));
  const a = Math.min(profile.a, dur * 0.4);
  const r = Math.min(profile.r, dur * 0.4);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, s);
  env.gain.linearRampToValueAtTime(peak, s + a);
  const sustainLevel = peak * profile.s;
  const dEnd = Math.min(e - r, s + a + Math.max(0.001, profile.d));
  if (dEnd > s + a) env.gain.linearRampToValueAtTime(Math.max(sustainLevel, 0.0001), dEnd);
  if (e - r > dEnd) env.gain.setValueAtTime(Math.max(sustainLevel, 0.0001), e - r);
  env.gain.linearRampToValueAtTime(0, e);

  /** @type {any} */
  let sink = env;
  if (profile.filter) {
    const f = ctx.createBiquadFilter();
    f.type = profile.filter.type;
    f.Q.value = profile.filter.q ?? 0.7;
    if (profile.filter.sweepTo) {
      f.frequency.setValueAtTime(profile.filter.freq, s);
      f.frequency.linearRampToValueAtTime(profile.filter.sweepTo, s + Math.min(profile.filter.sweepTime ?? 0.1, dur));
    } else f.frequency.setValueAtTime(profile.filter.freq, s);
    f.connect(env);
    sink = f;
  }
  env.connect(destination);

  /** @type {{ osc:any, gain:any }[]} */
  const nodes = [{ osc: null, gain: env }];
  const partials = profile.osc;
  const single = partials.length === 1 && !partials[0].detune && (partials[0].ratio ?? 1) === 1 && partials[0].gain === 1 && !profile.filter && !profile.vibrato;
  let lfo = null;
  if (profile.vibrato) {
    lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = profile.vibrato.rate;
  }
  const lfoGain = lfo ? ctx.createGain() : null;
  if (lfo && lfoGain && profile.vibrato) {
    lfoGain.gain.setValueAtTime(0, s);
    lfoGain.gain.linearRampToValueAtTime(profile.vibrato.cents, s + Math.min(dur, profile.vibrato.delay + 0.1));
    lfo.connect(lfoGain);
    lfo.start(s);
    lfo.stop(e);
    nodes.push({ osc: lfo, gain: lfoGain });
  }
  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = p.type;
    const target = note.frequency * (p.ratio ?? 1);
    osc.frequency.value = target;
    if (profile.pitchDrop && osc.frequency.setValueAtTime && osc.frequency.exponentialRampToValueAtTime) {
      osc.frequency.setValueAtTime(target * profile.pitchDrop.ratio, s);
      osc.frequency.exponentialRampToValueAtTime(target, s + Math.min(profile.pitchDrop.time, dur));
    }
    if (p.detune && osc.detune) osc.detune.value = p.detune;
    if (lfoGain && osc.detune) lfoGain.connect(osc.detune);
    if (single) { osc.connect(sink); nodes.push({ osc, gain: null }); } else {
      const g = ctx.createGain();
      g.gain.value = p.gain;
      osc.connect(g);
      g.connect(sink);
      nodes.push({ osc, gain: g });
    }
    osc.start(s);
    osc.stop(e);
  }
  if (profile.noise && typeof ctx.createBuffer === 'function' && typeof ctx.createBufferSource === 'function') {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = profile.noise.filter.type;
    nf.frequency.value = profile.noise.filter.freq;
    nf.Q.value = profile.noise.filter.q ?? 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(profile.noise.gain, s);
    if (profile.noise.decay) ng.gain.linearRampToValueAtTime(0.0001, Math.min(e, s + profile.noise.decay));
    src.connect(nf);
    nf.connect(ng);
    ng.connect(env);
    src.start(s, (note.frequency % 0.9));
    src.stop(e);
    nodes.push({ osc: src, gain: ng });
  }
  return nodes;
}
