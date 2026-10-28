// Golden-Master: hält das Tonhöhen- und Exportverhalten fest. Aufruf: node scripts/golden.mjs [--write]
// Ohne --write wird der aktuelle Stand berechnet und mit test/fixtures/golden.json verglichen (Exit-Code 1 bei Abweichung).
// Die Fixture wurde einmalig aus dem unveränderten Ausgangsstand erzeugt (vor Phase A); sie darf nur bewusst neu geschrieben werden.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SCALES, buildNoteList } from '../core/scales.js';
import { createMapping, validateMapping, mappingKey } from '../core/mapping.js';
import { runPipeline } from '../core/pipeline.js';
import { buildArrangement } from '../core/arrangement.js';
import { arrangementToMidi, sequenceToMidi } from '../export/midi.js';
import { createTrack, vowelConsonantTemplate, sonorityTemplate } from '../core/tracks.js';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'golden.json');

export const SCALE_IDS = ['dur', 'moll', 'dur-pentatonik', 'moll-pentatonik', 'chromatisch'];
export const RANGES = [[60, 84], [36, 60], [0, 127], [48, 72], [21, 108], [59, 61], [127, 127]];

export const TEXTS = [
  'Zwei flinke Boxer jagen die quirlige Eva und ihren Mops durch Sylt.\nFranz jagt im komplett verwahrlosten Taxi quer durch Bayern.',
  'Heizölrückstoßabdämpfung! Ça va? Ελληνικά, 日本語, emoji 🎵👍🏽 und Ziffern 0123456789.',
  'Tschüss, Dschungel. Rhythmus: ck tch qu ph th sch.\n\nNeuer Absatz … Ende.',
];

/** @param {Uint8Array|string} b */
const sha = (b) => createHash('sha256').update(b).digest('hex');

function configs() {
  const base = createTrack([]);
  const vc = vowelConsonantTemplate([]);
  const son = sonorityTemplate([]).created;
  /** @type {Record<string, any>} */
  const out = {
    default: {},
    modeA: { mode: 'A' },
    modeA2: { mode: 'A2', lo: 40, hi: 90 },
    vowelConsonant: { tracks: vc },
    sonority: { tracks: son.slice(0, 13) },
  };
  for (const id of SCALE_IDS) for (const root of [0, 3, 7, 11]) {
    out[`B-${id}-${root}`] = { tracks: [{ ...base, mapping: { mode: 'B', scaleId: id, root, lo: 48, hi: 79 } }] };
  }
  return out;
}

export function compute() {
  /** @type {Record<string, number[]>} */
  const noteLists = {};
  for (const scaleId of SCALE_IDS) for (let root = 0; root < 12; root++) for (const [lo, hi] of RANGES) {
    noteLists[`${scaleId}|${root}|${lo}|${hi}`] = buildNoteList({ scaleId, root, lo, hi });
  }
  /** @type {Record<string, string>} */
  const tables = {};
  /** @type {Record<string, unknown>} */
  const validation = {};
  /** @type {Record<string, string>} */
  const keys = {};
  const mappings = [
    { mode: 'A', scaleId: 'dur', root: 0, lo: 60, hi: 84 },
    { mode: 'A2', scaleId: 'dur', root: 0, lo: 40, hi: 90 },
    ...SCALE_IDS.flatMap((scaleId) => [0, 5, 11].flatMap((root) => [[60, 84], [36, 60], [59, 61]].map(([lo, hi]) => ({ mode: 'B', scaleId, root, lo, hi })))),
  ];
  for (const m of mappings) {
    const k = mappingKey(m);
    keys[JSON.stringify(m)] = k;
    tables[k] = sha(JSON.stringify(createMapping(/** @type {any} */ ({ ...m })).table));
  }
  const badMappings = [
    { mode: 'B', scaleId: 'gibt-es-nicht', root: 0, lo: 60, hi: 84 },
    { mode: 'B', scaleId: 'dur', root: 12, lo: 60, hi: 84 },
    { mode: 'B', scaleId: 'dur', root: 0, lo: 61, hi: 61 },
    { mode: 'B', scaleId: 'dur-pentatonik', root: 0, lo: 61, hi: 63 },
    { mode: 'B', scaleId: 'dur', root: 0, lo: 60, hi: 61 },
    { mode: 'B', scaleId: 'dur', root: 0, lo: 64, hi: 66 },
    { mode: 'X', scaleId: 'dur', root: 0, lo: 60, hi: 84 },
    { mode: 'A', scaleId: 'xyz', root: 99, lo: 60, hi: 84 },
    { mode: 'A2', scaleId: 'xyz', root: 0, lo: 80, hi: 20 },
  ];
  for (const m of [...mappings, ...badMappings]) validation[JSON.stringify(m)] = validateMapping(m);

  /** @type {Record<string, { arrangement:string, sequence:string, recomputed?:string }>} */
  const midi = {};
  for (const [name, cfg] of Object.entries(configs())) {
    TEXTS.forEach((text, ti) => {
      const run = runPipeline(text, cfg);
      if (!run.ok || !run.result) { midi[`${name}|${ti}`] = { arrangement: `FEHLER ${JSON.stringify(run.errors)}`, sequence: '' }; return; }
      const arr = buildArrangement(run.result);
      let a;
      try { a = sha(arrangementToMidi(arr)); } catch (e) { a = `FEHLER ${/** @type {Error} */ (e).message}`; }
      midi[`${name}|${ti}`] = { arrangement: a, sequence: sha(sequenceToMidi(run.result.sequence)) };
    });
  }
  return { noteLists, tables, keys, validation, midi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = compute();
  if (process.argv.includes('--write')) {
    await mkdir(dirname(FIXTURE), { recursive: true });
    await writeFile(FIXTURE, `${JSON.stringify(data)}\n`);
    console.log(`Geschrieben: ${FIXTURE}`);
  } else {
    const expected = JSON.parse(await readFile(FIXTURE, 'utf8'));
    const same = JSON.stringify(expected) === JSON.stringify(data);
    console.log(same ? 'Golden-Master: identisch.' : 'Golden-Master: ABWEICHUNG.');
    process.exitCode = same ? 0 : 1;
  }
}
