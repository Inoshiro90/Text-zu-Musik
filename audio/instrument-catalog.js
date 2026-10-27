// @ts-check
/**
 * General-MIDI-Instrumentkatalog (128 Programme) mit Kategorien und Synth-Profil für die Browser-Vorschau.
 * Programmnummern im Code sind 0-basiert (GM 1 = Programm 0); die Anzeige verwendet die 1-basierte GM-Nummer.
 * Ungestimmte Drumkits (Kanal 10) sind bewusst NICHT enthalten, siehe docs/regeln.md §14.
 *
 * @typedef {{ program:number, gmNumber:number, name:string, nameEn:string, categories:readonly string[], profile:string }} Instrument
 */

export const CATEGORIES = Object.freeze([
  { id: 'tasten', label: 'Tasteninstrumente' },
  { id: 'blech', label: 'Blechblasinstrumente' },
  { id: 'holz', label: 'Holzblasinstrumente' },
  { id: 'perkussion', label: 'Perkussion (gestimmt)' },
  { id: 'streich', label: 'Streichinstrumente' },
  { id: 'zupf', label: 'Zupfinstrumente' },
  { id: 'elektronisch', label: 'Elektronisch und Synthesizer' },
  { id: 'bass', label: 'Bassinstrumente' },
  { id: 'orgel', label: 'Orgelinstrumente' },
  { id: 'gesang', label: 'Gesang und vokale Klänge' },
  { id: 'ensemble', label: 'Ensemble- und Flächenklänge' },
  { id: 'welt', label: 'Welt- und Traditionsinstrumente' },
  { id: 'effekte', label: 'Soundeffekte und Klangdesign' },
]);

/* [Programm 0–127] → [deutscher Name, englischer GM-Name, Hauptkategorie, Profil, weitere Kategorien] */
/** @type {readonly (readonly [string, string, string, string, string?])[]} */
const TABLE = [
  ['Akustisches Klavier', 'Acoustic Grand Piano', 'tasten', 'piano'], ['Helles Klavier', 'Bright Acoustic Piano', 'tasten', 'piano'], ['E-Flügel', 'Electric Grand Piano', 'tasten', 'epiano'], ['Honky-Tonk-Klavier', 'Honky-tonk Piano', 'tasten', 'piano'],
  ['E-Piano 1', 'Electric Piano 1', 'tasten', 'epiano', 'elektronisch'], ['E-Piano 2', 'Electric Piano 2', 'tasten', 'epiano', 'elektronisch'], ['Cembalo', 'Harpsichord', 'tasten', 'harpsichord'], ['Clavinet', 'Clavinet', 'tasten', 'clav', 'elektronisch'],
  ['Celesta', 'Celesta', 'tasten', 'bell', 'perkussion'], ['Glockenspiel', 'Glockenspiel', 'perkussion', 'bell'], ['Spieluhr', 'Music Box', 'perkussion', 'bell'], ['Vibraphon', 'Vibraphone', 'perkussion', 'mallet'],
  ['Marimba', 'Marimba', 'perkussion', 'marimba'], ['Xylophon', 'Xylophone', 'perkussion', 'mallet'], ['Röhrenglocken', 'Tubular Bells', 'perkussion', 'bell'], ['Hackbrett', 'Dulcimer', 'welt', 'pluck', 'zupf'],
  ['Hammond-Orgel', 'Drawbar Organ', 'orgel', 'organ'], ['Percussion-Orgel', 'Percussive Organ', 'orgel', 'organ'], ['Rock-Orgel', 'Rock Organ', 'orgel', 'organ'], ['Kirchenorgel', 'Church Organ', 'orgel', 'organ'],
  ['Harmonium', 'Reed Organ', 'orgel', 'reed'], ['Akkordeon', 'Accordion', 'welt', 'reed', 'orgel'], ['Mundharmonika', 'Harmonica', 'welt', 'reed'], ['Tango-Akkordeon', 'Tango Accordion', 'welt', 'reed'],
  ['Nylon-Gitarre', 'Acoustic Guitar (nylon)', 'zupf', 'pluck'], ['Stahlsaiten-Gitarre', 'Acoustic Guitar (steel)', 'zupf', 'pluck'], ['Jazz-Gitarre', 'Electric Guitar (jazz)', 'zupf', 'pluck'], ['Cleane E-Gitarre', 'Electric Guitar (clean)', 'zupf', 'pluck'],
  ['Gedämpfte E-Gitarre', 'Electric Guitar (muted)', 'zupf', 'pizz'], ['Overdrive-Gitarre', 'Overdriven Guitar', 'zupf', 'distgtr'], ['Distortion-Gitarre', 'Distortion Guitar', 'zupf', 'distgtr'], ['Gitarren-Obertöne', 'Guitar Harmonics', 'zupf', 'bell'],
  ['Akustikbass', 'Acoustic Bass', 'bass', 'bass'], ['E-Bass gegriffen', 'Electric Bass (finger)', 'bass', 'bass'], ['E-Bass gezupft', 'Electric Bass (pick)', 'bass', 'bass'], ['Fretless-Bass', 'Fretless Bass', 'bass', 'bass'],
  ['Slap-Bass 1', 'Slap Bass 1', 'bass', 'bass'], ['Slap-Bass 2', 'Slap Bass 2', 'bass', 'bass'], ['Synth-Bass 1', 'Synth Bass 1', 'bass', 'synthbass', 'elektronisch'], ['Synth-Bass 2', 'Synth Bass 2', 'bass', 'synthbass', 'elektronisch'],
  ['Violine', 'Violin', 'streich', 'strings'], ['Bratsche', 'Viola', 'streich', 'strings'], ['Cello', 'Cello', 'streich', 'strings'], ['Kontrabass', 'Contrabass', 'streich', 'strings', 'bass'],
  ['Streicher-Tremolo', 'Tremolo Strings', 'streich', 'strings'], ['Pizzicato-Streicher', 'Pizzicato Strings', 'streich', 'pizz'], ['Harfe', 'Orchestral Harp', 'zupf', 'pluck'], ['Pauken', 'Timpani', 'perkussion', 'timpani'],
  ['Streicher-Ensemble 1', 'String Ensemble 1', 'ensemble', 'strings', 'streich'], ['Streicher-Ensemble 2', 'String Ensemble 2', 'ensemble', 'strings', 'streich'], ['Synth-Streicher 1', 'Synth Strings 1', 'ensemble', 'pad', 'elektronisch'], ['Synth-Streicher 2', 'Synth Strings 2', 'ensemble', 'pad', 'elektronisch'],
  ['Chor Aah', 'Choir Aahs', 'gesang', 'choir', 'ensemble'], ['Stimme Ooh', 'Voice Oohs', 'gesang', 'choir'], ['Synth-Stimme', 'Synth Voice', 'gesang', 'choir', 'elektronisch'], ['Orchesterschlag', 'Orchestra Hit', 'ensemble', 'brass'],
  ['Trompete', 'Trumpet', 'blech', 'brass'], ['Posaune', 'Trombone', 'blech', 'brass'], ['Tuba', 'Tuba', 'blech', 'tuba'], ['Gedämpfte Trompete', 'Muted Trumpet', 'blech', 'muted'],
  ['Waldhorn', 'French Horn', 'blech', 'horn'], ['Blechbläser-Satz', 'Brass Section', 'blech', 'brass', 'ensemble'], ['Synth-Blech 1', 'Synth Brass 1', 'blech', 'synthbrass', 'elektronisch'], ['Synth-Blech 2', 'Synth Brass 2', 'blech', 'synthbrass', 'elektronisch'],
  ['Sopransaxophon', 'Soprano Sax', 'holz', 'sax'], ['Altsaxophon', 'Alto Sax', 'holz', 'sax'], ['Tenorsaxophon', 'Tenor Sax', 'holz', 'sax'], ['Baritonsaxophon', 'Baritone Sax', 'holz', 'sax'],
  ['Oboe', 'Oboe', 'holz', 'oboe'], ['Englischhorn', 'English Horn', 'holz', 'oboe'], ['Fagott', 'Bassoon', 'holz', 'bassoon'], ['Klarinette', 'Clarinet', 'holz', 'clarinet'],
  ['Piccolo', 'Piccolo', 'holz', 'flute'], ['Querflöte', 'Flute', 'holz', 'flute'], ['Blockflöte', 'Recorder', 'holz', 'flute'], ['Panflöte', 'Pan Flute', 'holz', 'flute'],
  ['Flaschenblasen', 'Blown Bottle', 'holz', 'flute', 'effekte'], ['Shakuhachi', 'Shakuhachi', 'welt', 'flute', 'holz'], ['Pfeife', 'Whistle', 'holz', 'flute'], ['Okarina', 'Ocarina', 'holz', 'flute', 'welt'],
  ['Lead 1 (Rechteck)', 'Lead 1 (square)', 'elektronisch', 'lead'], ['Lead 2 (Sägezahn)', 'Lead 2 (sawtooth)', 'elektronisch', 'lead'], ['Lead 3 (Kalliope)', 'Lead 3 (calliope)', 'elektronisch', 'lead'], ['Lead 4 (Chiff)', 'Lead 4 (chiff)', 'elektronisch', 'lead'],
  ['Lead 5 (Charang)', 'Lead 5 (charang)', 'elektronisch', 'lead'], ['Lead 6 (Stimme)', 'Lead 6 (voice)', 'elektronisch', 'choir', 'gesang'], ['Lead 7 (Quinten)', 'Lead 7 (fifths)', 'elektronisch', 'lead'], ['Lead 8 (Bass + Lead)', 'Lead 8 (bass + lead)', 'elektronisch', 'lead'],
  ['Pad 1 (New Age)', 'Pad 1 (new age)', 'ensemble', 'pad', 'elektronisch'], ['Pad 2 (warm)', 'Pad 2 (warm)', 'ensemble', 'pad', 'elektronisch'], ['Pad 3 (Polysynth)', 'Pad 3 (polysynth)', 'ensemble', 'pad', 'elektronisch'], ['Pad 4 (Chor)', 'Pad 4 (choir)', 'ensemble', 'choir', 'gesang'],
  ['Pad 5 (gestrichen)', 'Pad 5 (bowed)', 'ensemble', 'pad', 'elektronisch'], ['Pad 6 (metallisch)', 'Pad 6 (metallic)', 'ensemble', 'pad', 'elektronisch'], ['Pad 7 (Halo)', 'Pad 7 (halo)', 'ensemble', 'pad', 'elektronisch'], ['Pad 8 (Sweep)', 'Pad 8 (sweep)', 'ensemble', 'pad', 'elektronisch'],
  ['FX 1 (Regen)', 'FX 1 (rain)', 'effekte', 'fx'], ['FX 2 (Soundtrack)', 'FX 2 (soundtrack)', 'effekte', 'fx'], ['FX 3 (Kristall)', 'FX 3 (crystal)', 'effekte', 'bell'], ['FX 4 (Atmosphäre)', 'FX 4 (atmosphere)', 'effekte', 'fx'],
  ['FX 5 (Helligkeit)', 'FX 5 (brightness)', 'effekte', 'fx'], ['FX 6 (Kobolde)', 'FX 6 (goblins)', 'effekte', 'fx'], ['FX 7 (Echos)', 'FX 7 (echoes)', 'effekte', 'fx'], ['FX 8 (Science-Fiction)', 'FX 8 (sci-fi)', 'effekte', 'fx'],
  ['Sitar', 'Sitar', 'welt', 'sitar', 'zupf'], ['Banjo', 'Banjo', 'zupf', 'pluck', 'welt'], ['Shamisen', 'Shamisen', 'welt', 'pluck', 'zupf'], ['Koto', 'Koto', 'welt', 'pluck', 'zupf'],
  ['Kalimba', 'Kalimba', 'welt', 'mallet', 'perkussion'], ['Dudelsack', 'Bag pipe', 'welt', 'reed'], ['Fiedel', 'Fiddle', 'welt', 'strings', 'streich'], ['Shanai', 'Shanai', 'welt', 'oboe'],
  ['Glöckchen', 'Tinkle Bell', 'perkussion', 'bell'], ['Agogo', 'Agogo', 'perkussion', 'mallet'], ['Steeldrum', 'Steel Drums', 'perkussion', 'mallet'], ['Holzblock', 'Woodblock', 'perkussion', 'woodblock'],
  ['Taiko', 'Taiko Drum', 'perkussion', 'timpani'], ['Melodisches Tom', 'Melodic Tom', 'perkussion', 'tom'], ['Synth-Trommel', 'Synth Drum', 'perkussion', 'timpani', 'elektronisch'], ['Umgekehrtes Becken', 'Reverse Cymbal', 'effekte', 'fx'],
  ['Gitarren-Bundgeräusch', 'Guitar Fret Noise', 'effekte', 'fx'], ['Atemgeräusch', 'Breath Noise', 'effekte', 'fx'], ['Meeresrauschen', 'Seashore', 'effekte', 'fx'], ['Vogelgezwitscher', 'Bird Tweet', 'effekte', 'fx'],
  ['Telefonklingeln', 'Telephone Ring', 'effekte', 'fx'], ['Hubschrauber', 'Helicopter', 'effekte', 'fx'], ['Applaus', 'Applause', 'effekte', 'fx'], ['Gewehrschuss', 'Gunshot', 'effekte', 'fx'],
];

/** @type {readonly Instrument[]} */
export const INSTRUMENTS = Object.freeze(TABLE.map(([name, nameEn, cat, profile, extra], program) => Object.freeze({
  program, gmNumber: program + 1, name, nameEn, categories: Object.freeze(extra ? [cat, extra] : [cat]), profile,
})));

export const DEFAULT_PROGRAM = 0;

/**
 * Ergänzende Klangprofile („Sonderklänge“): Synth-Definitionen für die Browser-Vorschau, die es in General MIDI nicht gibt.
 * Jedes Profil hat einen GM-Ersatz (`program`) für den MIDI-Export; Rauschanteile, Tonhöhenabfall und Hüllkurven der Vorschau
 * sind in einer Standard-MIDI-Datei NICHT enthalten (dort klingt das GM-Programm des Wiedergabegeräts).
 * @typedef {{ id:string, name:string, program:number, profile:string, categories:readonly string[], description:string }} Sound
 */
/** @type {readonly Sound[]} */
export const SOUNDS = Object.freeze([
  { id: 'snare', name: 'Snare-artiger Anschlag', program: 118, profile: 'snare', categories: ['perkussion', 'elektronisch'], description: 'Tonaler Körper mit kurzem Rauschanteil; folgt der Tonhöhe der Spur (kein GM-Schlagzeug).' },
  { id: 'hybrid-perc', name: 'Hybrid-Percussion-Synth', program: 118, profile: 'hybrid-perc', categories: ['elektronisch', 'perkussion'], description: 'Anschlag mit Tonhöhenabfall, kurzem Rauschanteil und tonalem Körper.' },
  { id: 'hihat-noise', name: 'Hi-Hat-Rauschen', program: 119, profile: 'hihat', categories: ['perkussion', 'effekte', 'elektronisch'], description: 'Heller, luftiger Rausch- und Metallklang, sehr kurz; Tonhöhe nur schwach hörbar.' },
  { id: 'noise-saw', name: 'Rausch-Sägezahn-Synth', program: 81, profile: 'noisesaw', categories: ['elektronisch'], description: 'Sägezahn-Grundton mit Rauschanteil; harmonisch und leicht geräuschhaft.' },
  { id: 'violin-soft', name: 'Violine, weicher Anschlag', program: 40, profile: 'violin-soft', categories: ['streich'], description: 'Violine mit langsamerem Einschwingen.' },
  { id: 'horn-warm', name: 'Warmes Horn', program: 60, profile: 'horn-warm', categories: ['blech'], description: 'Waldhorn mit weicher Artikulation und dunklerem Klang.' },
].map((x) => Object.freeze({ ...x, categories: Object.freeze(x.categories) })));

/** @param {string|undefined} id */
export const getSound = (id) => SOUNDS.find((x) => x.id === id);

/**
 * Löst eine Spur-Instrumentangabe auf: Anzeigename, Synth-Profil der Vorschau und das GM-Programm des Exports.
 * Eine unbekannte Klangprofil-ID fällt auf das GM-Programm zurück (`soundMissing`), nie auf ein anderes Instrument.
 * @param {{ program:number, sound?:string }} inst
 */
export function resolveInstrument(inst) {
  const gm = getInstrument(inst.program);
  const sound = getSound(inst.sound);
  return {
    name: sound ? sound.name : gm.name,
    profile: sound ? sound.profile : gm.profile,
    program: gm.program, gmNumber: gm.gmNumber, gmName: gm.name,
    categories: sound ? sound.categories : gm.categories,
    sound: sound ?? null,
    soundMissing: inst.sound !== undefined && !sound,
    /** Hinweis, wenn Vorschau und MIDI-Export unterschiedlich klingen. */
    exportNote: sound ? `Vorschau: ${sound.name}; MIDI-Export: ${gm.name} (GM ${gm.gmNumber}).` : '',
  };
}

/** Eindeutiger Auswahlwert einer Instrumentangabe: „12“ (GM) oder „s:snare“ (Klangprofil). @param {{ program:number, sound?:string }} inst */
export const instrumentKey = (inst) => (getSound(inst.sound) ? `s:${inst.sound}` : String(inst.program));

/** Instrumentangabe aus einem Auswahlwert (Gegenstück zu instrumentKey). @param {string} key @returns {{ program:number, sound?:string }} */
export function instrumentFromKey(key) {
  if (key.startsWith('s:')) { const sd = getSound(key.slice(2)); if (sd) return { program: sd.program, sound: sd.id }; }
  const n = Number(key);
  return { program: Number.isInteger(n) ? n : DEFAULT_PROGRAM };
}

/**
 * Auswahlliste (GM-Programme und Klangprofile) einer Kategorie, gefiltert nach Suchtext.
 * @param {string} [categoryId] @param {string} [query]
 * @returns {{ key:string, label:string, kind:'gm'|'sound', program:number }[]}
 */
export function searchEntries(categoryId = 'alle', query = '') {
  const q = query.trim().toLowerCase();
  const all = categoryId === 'alle' || categoryId === '';
  const gm = searchInstruments(categoryId, query).map((i) => ({ key: String(i.program), label: `${i.gmNumber}. ${i.name}`, kind: /** @type {const} */ ('gm'), program: i.program }));
  const snd = SOUNDS.filter((x) => (all || x.categories.includes(categoryId)) && (q === '' || x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)))
    .map((x) => ({ key: `s:${x.id}`, label: `${x.name} (Klangprofil)`, kind: /** @type {const} */ ('sound'), program: x.program }));
  return [...snd, ...gm];
}

/** @param {number} program */
export function getInstrument(program) {
  return INSTRUMENTS[program] ?? INSTRUMENTS[DEFAULT_PROGRAM];
}

/** Hauptkategorie (für die Übersicht). @param {number|{ program:number, sound?:string }} program */
export function primaryCategory(program) {
  const id = (typeof program === 'number' ? getInstrument(program) : resolveInstrument(program)).categories[0];
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

/** @param {string} id */
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

/** Instrumente einer Kategorie (leer/„alle“ = alle), gefiltert nach Suchtext (deutscher oder englischer Name, GM-Nummer). @param {string} [categoryId] @param {string} [query] */
export function searchInstruments(categoryId = 'alle', query = '') {
  const q = query.trim().toLowerCase();
  return INSTRUMENTS.filter((i) => (categoryId === 'alle' || categoryId === '' || i.categories.includes(categoryId))
    && (q === '' || i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q) || String(i.gmNumber) === q));
}
