// @ts-check
/**
 * Tonsystem-Bibliothek: alle auswählbaren Tonsysteme als reine, eingefrorene Daten.
 * Phase A enthält genau die fünf bisherigen Skalen; ihre IDs, Namen und Reihenfolge sind unverändert (Rückwärtskompatibilität).
 * Neue Einträge: siehe Bericht Phase 1, Abschnitt 7 – jeder Eintrag braucht Quelle und Belegstatus. Die Bibliothek wird beim
 * Import geprüft; ein ungültiger Eintrag bricht das Laden ab (wie das Sonoritäts-Inventar).
 */
import { validateLibrary } from './schema.js';
import { getSource } from './sources.js';
import { isRegionId } from './regions.js';
import { melakartaEntries } from './melakarta.js';

/** @typedef {import('./schema.js').TonalSystem} TonalSystem */

/** @type {TonalSystem[]} */
const ENTRIES = [
  {
    id: 'dur', name: 'Dur', aliases: ['Ionisch', 'Durtonleiter', 'Major'],
    region: ['europe'], tradition: 'Europäische Kunst- und Volksmusik', family: 'diatonic', kind: 'scale',
    evidence: 'A', sources: ['THAAT'], pitch: { unit: 'semitones', steps: [0, 2, 4, 5, 7, 9, 11] },
  },
  {
    id: 'moll', name: 'Natürliches Moll', aliases: ['Äolisch', 'Moll', 'Natural minor', 'Aeolian'],
    region: ['europe'], tradition: 'Europäische Kunst- und Volksmusik', family: 'diatonic', kind: 'scale', sameMaterialAs: 'dur',
    evidence: 'A', sources: ['THAAT'], pitch: { unit: 'semitones', steps: [0, 2, 3, 5, 7, 8, 10] },
  },
  {
    id: 'dur-pentatonik', name: 'Dur-Pentatonik', aliases: ['Major pentatonic', 'Anhemitonische Pentatonik'],
    region: ['global'], tradition: 'Traditionsübergreifende Lexikon-Skala', family: 'pentatonic-anhemitonic', kind: 'scale',
    evidence: 'A', sources: ['LAM'], pitch: { unit: 'semitones', steps: [0, 2, 4, 7, 9] },
    notes: 'Tonmaterial der chinesischen Gong-Position; Intervallfolge aus Lam (2024) abgeleitet.',
  },
  {
    id: 'moll-pentatonik', name: 'Moll-Pentatonik', aliases: ['Minor pentatonic'],
    region: ['global'], tradition: 'Traditionsübergreifende Lexikon-Skala', family: 'pentatonic-anhemitonic', kind: 'scale', sameMaterialAs: 'dur-pentatonik',
    evidence: 'A', sources: ['LAM'], pitch: { unit: 'semitones', steps: [0, 3, 5, 7, 10] },
    notes: 'Rotation der Dur-Pentatonik ab der fünften Stufe (Yu-Position); aus Lam (2024) abgeleitet.',
  },
  {
    id: 'chromatisch', name: 'Chromatisch', aliases: ['Chromatic', 'Zwölftonleiter'],
    region: ['global'], tradition: 'Gleichstufige Zwölfteilung', family: 'chromatic', kind: 'material',
    evidence: 'A', sources: ['DEF-12TET'], pitch: { unit: 'semitones', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  },

  /* ───────── Phase B: diatonische Modi (Rotationen von Dur) ───────── */
  ...modes('dur', 'europe', 'Europäische Kunstmusik (moderne Modi nach den Kirchentonarten)', ['MODES'], [
    ['dorisch', 'Dorisch', ['Dorian'], [0, 2, 3, 5, 7, 9, 10]],
    ['phrygisch', 'Phrygisch', ['Phrygian'], [0, 1, 3, 5, 7, 8, 10]],
    ['lydisch', 'Lydisch', ['Lydian'], [0, 2, 4, 6, 7, 9, 11]],
    ['mixolydisch', 'Mixolydisch', ['Mixolydian'], [0, 2, 4, 5, 7, 9, 10]],
    ['lokrisch', 'Lokrisch', ['Locrian'], [0, 1, 3, 5, 6, 8, 10]],
  ]),

  /* ───────── Moll-Varianten ───────── */
  {
    id: 'harmonisch-moll', name: 'Harmonisch Moll', aliases: ['Harmonic minor'],
    region: ['europe'], tradition: 'Europäische Kunstmusik', family: 'minor-variants', kind: 'scale',
    evidence: 'A', sources: ['MINOR'], pitch: { unit: 'semitones', steps: [0, 2, 3, 5, 7, 8, 11] },
  },
  {
    id: 'melodisch-moll', name: 'Melodisch Moll', aliases: ['Melodic minor', 'Jazz-Moll', 'Jazz minor'],
    region: ['europe'], tradition: 'Europäische Kunstmusik', family: 'minor-variants', kind: 'scale',
    evidence: 'A', sources: ['MINOR'],
    pitch: { unit: 'semitones', steps: [0, 2, 3, 5, 7, 9, 11], descending: [0, 2, 3, 5, 7, 8, 10] },
    notes: 'Abwärts wie natürliches Moll. Die Abstiegsform wirkt, wenn im Spur-Editor „Auf- und Abstieg beachten“ gewählt ist.',
  },

  /* ───────── Modi von melodisch Moll (Jazztheorie) ───────── */
  ...modes('melodisch-moll', 'north-america', 'Jazztheorie (Akkord-Skalen)', ['MMMODES', 'MINOR'], [
    ['dorisch-b2', 'Dorisch ♭2', ['Dorian b2', 'Phrygisch ♮6', 'Phrygian natural 6'], [0, 1, 3, 5, 7, 9, 10]],
    ['lydisch-uebermaessig', 'Lydisch übermäßig', ['Lydian augmented', 'Lydisch ♯5'], [0, 2, 4, 6, 8, 9, 11]],
    ['lydisch-dominant', 'Lydisch-Dominant', ['Lydian dominant', 'Mixolydisch ♯4', 'Akustische Skala', 'Acoustic scale'], [0, 2, 4, 6, 7, 9, 10]],
    ['mixolydisch-b6', 'Mixolydisch ♭6', ['Mixolydian b13', 'Mixolydian b6', 'Äolisch dominant'], [0, 2, 4, 5, 7, 8, 10]],
    ['lokrisch-2', 'Lokrisch ♮2', ['Locrian #2', 'Locrian natural 2', 'Halbvermindert'], [0, 2, 3, 5, 6, 8, 10]],
    ['alteriert', 'Alteriert', ['Altered scale', 'Superlokrisch', 'Super Locrian'], [0, 1, 3, 4, 6, 8, 10]],
  ], 'B', 'Name aus der Jazzpraxis; Intervallfolge als Rotation von melodisch Moll (Aufstiegsform) abgeleitet.'),

  /* ───────── Symmetrische Skalen ───────── */
  {
    id: 'ganzton', name: 'Ganztonleiter', aliases: ['Whole-tone scale', 'Messiaen-Modus 1'],
    region: ['europe'], tradition: 'Europäische Kunstmusik des 19. und 20. Jahrhunderts', family: 'symmetric', kind: 'scale',
    evidence: 'A', sources: ['WHOLETONE', 'MLT'], pitch: { unit: 'semitones', steps: [0, 2, 4, 6, 8, 10] },
  },
  {
    id: 'oktatonik-hg', name: 'Oktatonik (Halbton–Ganzton)', aliases: ['Octatonic', 'Diminished scale', 'Vermindert', 'Messiaen-Modus 2'],
    region: ['europe'], tradition: 'Europäische Kunstmusik des 20. Jahrhunderts, Jazz', family: 'symmetric', kind: 'scale',
    evidence: 'A', sources: ['MLT'], pitch: { unit: 'semitones', steps: [0, 1, 3, 4, 6, 7, 9, 10] },
  },
  {
    id: 'oktatonik-gh', name: 'Oktatonik (Ganzton–Halbton)', aliases: ['Octatonic whole-half', 'Diminished whole-half'],
    region: ['europe'], tradition: 'Europäische Kunstmusik des 20. Jahrhunderts, Jazz', family: 'symmetric', kind: 'mode', parent: 'oktatonik-hg',
    evidence: 'A', sources: ['MLT'], pitch: { unit: 'semitones', steps: [0, 2, 3, 5, 6, 8, 9, 11] },
    notes: 'Rotation der Halbton–Ganzton-Oktatonik; aus der Quelle abgeleitet.',
  },
  ...messiaen([
    [3, [0, 2, 3, 4, 6, 7, 8, 10, 11]],
    [4, [0, 1, 2, 5, 6, 7, 8, 11]],
    [5, [0, 1, 5, 6, 7, 11]],
    [6, [0, 2, 4, 5, 6, 8, 10, 11]],
    [7, [0, 1, 2, 3, 5, 6, 7, 8, 9, 11]],
  ]),

  /* ───────── Mittel- und südosteuropäische sowie jüdische Lexikon-Skalen (12-TET) ───────── */
  {
    id: 'doppelt-harmonisch-dur', name: 'Doppelt harmonisch Dur', aliases: ['Double harmonic major', 'Byzantinisch', 'Byzantine scale', 'Hijaz Kar (12-TET)', 'Gypsy major'],
    region: ['europe', 'mena'], tradition: 'Europäische Lexikon-Skala', family: 'european-lexicon', kind: 'scale',
    evidence: 'B', sources: ['DHS'], pitch: { unit: 'semitones', steps: [0, 1, 4, 5, 7, 8, 11] },
    notes: 'Westlicher Lexikon-Name. „Arabisch“/„Hijaz Kar“ bezeichnet hier nur die 12-TET-Näherung, nicht den Maqam mit seiner Intonation.',
  },
  {
    id: 'ungarisch-moll', name: 'Ungarisch Moll', aliases: ['Hungarian minor', 'Double harmonic minor', 'Doppelt harmonisch Moll', 'Harmonisch Moll ♯4', 'Gypsy minor', 'Zigeunermoll (historisch)'],
    region: ['europe'], tradition: 'Mitteleuropäische Lexikon-Skala (style hongrois)', family: 'european-lexicon', kind: 'scale', sameMaterialAs: 'doppelt-harmonisch-dur',
    evidence: 'B', sources: ['HUNG', 'DHS'], pitch: { unit: 'semitones', steps: [0, 2, 3, 6, 7, 8, 11] },
    notes: '4. Modus von Doppelt harmonisch Dur. Die Bezeichnung „Zigeunermoll“ ist historisch und abwertend; sie steht nur als Suchbegriff zur Verfügung.',
  },
  {
    id: 'ukrainisch-dorisch', name: 'Ukrainisch Dorisch', aliases: ['Ukrainian Dorian', 'Rumänisch Moll', 'Romanian minor', 'Dorisch ♯4', 'Altered Dorian', 'Nikriz (12-TET)', 'Hutsul-Modus'],
    region: ['europe'], tradition: 'Ukraine (Duma, Huzulen), Rumänien und Moldau (Doina), Klezmer', family: 'european-lexicon', kind: 'scale', sameMaterialAs: 'harmonisch-moll',
    evidence: 'B', sources: ['UKRD'], pitch: { unit: 'semitones', steps: [0, 2, 3, 6, 7, 9, 10] },
    notes: 'In der Praxis wird die erhöhte 4. Stufe oft auch tief gespielt (über C: F statt Fis). „Nikriz“ meint hier nur die 12-TET-Näherung.',
  },
  {
    id: 'phrygisch-dominant', name: 'Phrygisch-Dominant', aliases: ['Phrygian dominant', 'Freygish', 'Fraigish', 'Spanisch-Phrygisch', 'Hijaz (12-TET)', 'Harmonisch Moll, 5. Modus'],
    region: ['europe', 'mena'], tradition: 'Klezmer, Synagogalmusik, Flamenco; 12-TET-Näherung von Hijaz', family: 'european-lexicon', kind: 'scale', sameMaterialAs: 'harmonisch-moll',
    evidence: 'B', sources: ['PHRYGDOM', 'NUSACH'], pitch: { unit: 'semitones', steps: [0, 1, 4, 5, 7, 8, 10] },
    notes: '5. Modus von harmonisch Moll. Ahava Rabbah und Hijaz sind modale Systeme mit Motiven und eigener Intonation; dieser Eintrag gibt nur das 12-TET-Tonmaterial wieder.',
  },
  {
    id: 'neapolitanisch-dur', name: 'Neapolitanisch Dur', aliases: ['Neapolitan major'],
    region: ['europe'], tradition: 'Europäische Lexikon-Skala', family: 'european-lexicon', kind: 'scale',
    evidence: 'B', sources: ['NEAP'], pitch: { unit: 'semitones', steps: [0, 1, 3, 5, 7, 9, 11] },
  },
  {
    id: 'neapolitanisch-moll', name: 'Neapolitanisch Moll', aliases: ['Neapolitan minor'],
    region: ['europe'], tradition: 'Europäische Lexikon-Skala', family: 'european-lexicon', kind: 'scale',
    evidence: 'B', sources: ['NEAP'], pitch: { unit: 'semitones', steps: [0, 1, 3, 5, 7, 8, 11] },
  },

  /* ───────── Blues ───────── */
  {
    id: 'blues-moll', name: 'Blues-Skala (Moll)', aliases: ['Blues-Moll', 'Blues Minor', 'Minor blues scale', 'Hexatonische Blues-Skala'],
    region: ['north-america'], tradition: 'Afroamerikanischer Blues (Lehrbuch-Vereinfachung)', family: 'blues', kind: 'scale',
    evidence: 'C', sources: ['BLUESSCALE', 'BLUES'], pitch: { unit: 'semitones', steps: [0, 3, 5, 6, 7, 10] },
    notes: 'Blue Notes sind in der Praxis Tonbereiche (Messwerte um 319, 583 und 1038 Cent über dem Grundton, Cutting 2018), keine festen Halbtöne.',
  },

  /* ───────── Phase C: chinesische Modi (diao) – Rotationen eines pentatonischen Materials ───────── */
  {
    id: 'cn-gong', name: 'Gong-Modus', aliases: ['Gong Diao', 'Gong-Diao'], original: [{ text: '宫调', lang: 'zh', romanization: 'gōng diào' }],
    region: ['east-asia'], tradition: 'Han-chinesische Musik', family: 'cn-pentatonic', kind: 'mode', sameMaterialAs: 'dur-pentatonik',
    evidence: 'A', sources: ['LAM'], pitch: { unit: 'semitones', steps: [0, 2, 4, 7, 9] },
    notes: 'Finalis auf der Position gong (do). Intervallfolge aus Lam (2024) abgeleitet; gleiches Tonmaterial wie die Dur-Pentatonik.',
  },
  ...cnModes([
    ['cn-shang', 'Shang-Modus', 'Shang Diao', '商调', 'shāng diào', 're', [0, 2, 5, 7, 10]],
    ['cn-jue', 'Jue-Modus', 'Jue Diao', '角调', 'jué diào', 'mi', [0, 3, 5, 8, 10]],
    ['cn-zhi', 'Zhi-Modus', 'Zhi Diao', '徵调', 'zhǐ diào', 'sol', [0, 2, 5, 7, 9]],
    ['cn-yu', 'Yu-Modus', 'Yu Diao', '羽调', 'yǔ diào', 'la', [0, 3, 5, 7, 10]],
  ]),

  /* ───────── Japanische Skalen ───────── */
  {
    id: 'jp-yo', name: 'Yo-Skala', aliases: ['Yo scale', 'Yo-Tonleiter'], original: [{ text: '陽旋法', lang: 'ja', romanization: 'yōsenpō' }],
    region: ['east-asia'], tradition: 'Japanische Volksmusik, Gagaku und Shōmyō', family: 'jp-scales', kind: 'scale',
    evidence: 'B', sources: ['YO'], pitch: { unit: 'semitones', steps: [0, 2, 5, 7, 9] },
    notes: 'Neuere Theorie (Koizumi) beschreibt japanische Skalen über Kerntöne im Quartabstand; diese Skalenform ist eine Vereinfachung.',
  },
  {
    id: 'jp-insen', name: 'Insen-Skala', aliases: ['Insen scale', 'Insen'], original: [{ text: '陰旋法', lang: 'ja', romanization: 'insenpō' }],
    region: ['east-asia'], tradition: 'Japanische Koto- und Shamisen-Musik', family: 'jp-scales', kind: 'scale',
    evidence: 'B', sources: ['INSEN'], pitch: { unit: 'semitones', steps: [0, 1, 5, 7, 10] },
  },
  {
    id: 'jp-hirajoshi-burrows', name: 'Hirajōshi (nach Burrows)', aliases: ['Hirajoshi', 'Hira-chōshi'], original: [{ text: '平調子', lang: 'ja', romanization: 'hirajōshi' }],
    region: ['east-asia'], tradition: 'Westliche Ableitung aus der Koto-Stimmung hirajōshi', family: 'jp-scales', kind: 'scale',
    evidence: 'B', sources: ['HIRA'], pitch: { unit: 'semitones', steps: [0, 4, 6, 7, 11] },
    notes: 'Für „Hirajōshi“ gibt es drei verschiedene Tonfolgen in westlichen Lehrbüchern (Burrows; Sachs/Slonimsky; Speed, Kostka/Payne). Alle drei sind Modi desselben Intervallmusters.',
  },
  {
    id: 'jp-hirajoshi-sachs', name: 'Hirajōshi (nach Sachs/Slonimsky)', aliases: ['Hirajoshi', 'Iwato (gleiche Intervalle)'],
    region: ['east-asia'], tradition: 'Westliche Ableitung aus der Koto-Stimmung hirajōshi', family: 'jp-scales', kind: 'scale', sameMaterialAs: 'jp-hirajoshi-burrows',
    evidence: 'B', sources: ['HIRA'], pitch: { unit: 'semitones', steps: [0, 1, 5, 6, 10] },
    notes: 'Eine von drei Lehrbuch-Fassungen; gleiches Intervallmuster wie die Iwato-Skala.',
  },
  {
    id: 'jp-hirajoshi-speed', name: 'Hirajōshi (nach Speed, Kostka/Payne)', aliases: ['Hirajoshi'],
    region: ['east-asia'], tradition: 'Westliche Ableitung aus der Koto-Stimmung hirajōshi', family: 'jp-scales', kind: 'scale', sameMaterialAs: 'jp-hirajoshi-burrows',
    evidence: 'B', sources: ['HIRA'], pitch: { unit: 'semitones', steps: [0, 2, 3, 7, 8] },
    notes: 'Eine von drei Lehrbuch-Fassungen.',
  },
  {
    id: 'jp-ritsu', name: 'Ritsu (pentatonischer Kern)', aliases: ['Ritsu scale', 'Ritsusen'], original: [{ text: '律', lang: 'ja', romanization: 'ritsu' }],
    region: ['east-asia'], tradition: 'Japanischer buddhistischer Gesang (Shōmyō)', family: 'jp-scales', kind: 'scale',
    evidence: 'B', sources: ['RITSU'], pitch: { unit: 'semitones', steps: [0, 2, 5, 7, 9] },
    notes: 'Nur der pentatonische Kern; die zwei Nebentöne der heptatonischen Form sind nicht enthalten.',
  },
  {
    id: 'jp-ryo', name: 'Ryo (pentatonischer Kern)', aliases: ['Ryo scale', 'Ryosen'], original: [{ text: '呂', lang: 'ja', romanization: 'ryo' }],
    region: ['east-asia'], tradition: 'Japanischer buddhistischer Gesang (Shōmyō)', family: 'jp-scales', kind: 'scale', sameMaterialAs: 'dur-pentatonik',
    evidence: 'B', sources: ['RITSU'], pitch: { unit: 'semitones', steps: [0, 2, 4, 7, 9] },
    notes: 'Nur der pentatonische Kern; die Nebentöne der heptatonischen Form (mit Varianten) sind nicht enthalten.',
  },

  /* ───────── Hindustani-Thaats (Bhatkhande) ───────── */
  ...thaats([
    ['bilawal', 'Bilawal', ['Bilaval'], [0, 2, 4, 5, 7, 9, 11]],
    ['kalyan', 'Kalyan', ['Kalyan (Yaman)'], [0, 2, 4, 6, 7, 9, 11]],
    ['khamaj', 'Khamaj', [], [0, 2, 4, 5, 7, 9, 10]],
    ['bhairav', 'Bhairav', [], [0, 1, 4, 5, 7, 8, 11]],
    ['kafi', 'Kafi', ['Kaafi'], [0, 2, 3, 5, 7, 9, 10]],
    ['asavari', 'Asavari', ['Asaveri'], [0, 2, 3, 5, 7, 8, 10]],
    ['bhairavi', 'Bhairavi', [], [0, 1, 3, 5, 7, 8, 10]],
    ['poorvi', 'Poorvi', ['Purvi'], [0, 1, 4, 6, 7, 8, 11]],
    ['marwa', 'Marwa', ['Marva'], [0, 1, 4, 6, 7, 9, 11]],
    ['todi', 'Todi', ['Tori'], [0, 1, 3, 6, 7, 8, 11]],
  ]),
  {
    id: 'raga-bhairav', name: 'Raag Bhairav (Tonvorrat)', aliases: ['Raga Bhairav', 'Bhairav'],
    region: ['south-asia'], tradition: 'Hindustani-Musik (Nordindien), Morgenraga', family: 'raga', kind: 'modal-reference', sameMaterialAs: 'thaat-bhairav',
    evidence: 'C', sources: ['BHAIRAV', 'NIOS-HM', 'THAAT'], pitch: { unit: 'semitones', steps: [0, 1, 4, 5, 7, 8, 11] },
    rules: { center: 0, predominant: [5, 1] },
    notes: 'Nur der Tonvorrat S r G M P d N (auf- und abwärts gleich) mit Vadi (komal Dha) und Samvadi (komal Re) als Haupttönen. Nicht abgebildet: Pakad (Erkennungsphrase), Andolan und andere Ornamente, Tageszeit.',
  },

  ...ragas([
    ['raga-yaman', 'Raag Yaman', ['Yaman', 'Raga Yaman', 'Iman', 'Kalyan (Raga)'], 'hindustani', ['NIOS-HM', 'YAMAN'], 'B',
      [0, 2, 4, 6, 9, 11], [0, 2, 4, 6, 7, 9, 11], { center: 0, predominant: [2, 5] },
      'Aufstieg ohne Pa, wie in der Praxis üblich (NIOS; Bhatkhande): oft auch Sa nur als schwacher Ton und Beginn auf dem tiefen Ni. Lehrbuchform aufwärts ist vollständig (S R G m P D N). Vadi Ga, Samvadi Ni. Nicht abgebildet: Pakad (.N R G R S P m G R S), Tageszeit (erstes Nachtviertel).'],
    ['raga-bhupali', 'Raag Bhupali', ['Bhupali', 'Bhoopali', 'Bhoop', 'Raga Bhupali'], 'hindustani', ['NIOS-HM'], 'B',
      [0, 2, 4, 7, 9], null, { center: 0, predominant: [2, 4] },
      'Audav–Audav (fünf Töne auf- und abwärts, ohne Ma und Ni). Vadi Ga, Samvadi Dha. Nicht abgebildet: Phrasen und Ornamentik.'],
    ['raga-kafi', 'Raag Kafi', ['Kafi (Raga)', 'Raga Kafi'], 'hindustani', ['NIOS-HM', 'THAAT'], 'B',
      [0, 2, 3, 5, 7, 9, 10], null, { center: 0, predominant: [4, 0] },
      'Sampurna–Sampurna mit komal Ga und komal Ni. Vadi Pa, Samvadi Sa. Nicht abgebildet: Phrasen und Ornamentik.'],
    ['raga-alhaiya-bilawal', 'Raag Alhaiya Bilawal', ['Alhaiya Bilawal', 'Raga Alhaiya Bilawal'], 'hindustani', ['NIOS-HM'], 'B',
      [0, 2, 4, 7, 9, 11], [0, 2, 4, 5, 7, 9, 10, 11], { center: 0, predominant: [4, 2] },
      'Aufwärts ohne Ma; abwärts mit Ma und zusätzlich komal Ni. Die Quelle beschreibt den Abstieg als vakra (Umwege: Dha Ni Dha Pa, Ga Ma Re); solche Zickzack-Wendungen kann die Tonliste nicht abbilden. Vadi Dha, Samvadi Ga.'],
    ['raga-malkauns', 'Raag Malkauns', ['Malkauns', 'Malkosh', 'Malkaush', 'Raga Malkauns'], 'hindustani', ['MALKAUNS'], 'B',
      [0, 3, 5, 8, 10], null, { center: 0, predominant: [2, 0] },
      'Pentatonisch mit komal Ga, komal Dha, komal Ni; auf- und abwärts gleicher Tonvorrat (abwärts mit Wendung Ma Ga Ma). Vadi Ma, Samvadi Sa.'],
    ['raga-bilahari', 'Bilahari', ['Raga Bilahari', 'Bilahari ragam'], 'carnatic', ['BILAHARI'], 'B',
      [0, 2, 4, 7, 9], [0, 2, 4, 5, 7, 9, 11], undefined,
      'Aufstieg wie Mohanam (S R2 G3 P D2), Abstieg wie Dheerasankarabharanam (S N3 D2 P M1 G3 R2). Als bhashanga-Raga verwendet Bilahari zusätzlich den Fremdton N2 (kaishiki nishadam), der hier nicht enthalten ist.'],
    ['raga-malahari', 'Malahari', ['Raga Malahari'], 'carnatic', ['NIOS-CM'], 'B',
      [0, 1, 5, 7, 8], [0, 1, 4, 5, 7, 8], undefined,
      'Janya von Mela 15 (Mayamalavagowla): aufwärts S R1 M1 P D1, abwärts S D1 P M1 G3 R1. Traditionell einer der ersten Ragas im Unterricht (Pillari Gitam).'],
    ['raga-hamsadhvani', 'Hamsadhvani', ['Hamsadhwani', 'Hansadhwani', 'Raga Hamsadhvani'], 'carnatic', ['HAMSADHVANI'], 'B',
      [0, 2, 4, 7, 11], null, undefined,
      'S R2 G3 P N3 auf- und abwärts (Audava). Theoretisch Janya von Mela 29, in der Praxis Mela 65 zugeordnet.'],
  ]),

  /* ───────── Jüdische Gebetsmodi (aschkenasischer Nusach), vereinfacht ───────── */
  ...jewishModes([
    ['jd-ahava-rabbah', 'Ahava Rabbah', ['Ahavah Rabbah', 'Freygish-Steiger'], 'phrygisch-dominant', [0, 1, 4, 5, 7, 8, 10],
      'Tonmaterial mit kleiner Sekunde und übermäßiger Sekunde; die Terz wird bevorzugt. Motive und Kadenzwendungen sind nicht abgebildet.'],
    ['jd-magen-avot', 'Magen Avot', ['Magein Avot', 'Mogen Ovos'], 'moll', [0, 2, 3, 5, 7, 8, 10],
      'Dem natürlichen Moll am nächsten; oft auf einem Rezitationston gesungen, mit Wechsel in die parallele Durtonart. Diese Bewegungen sind nicht abgebildet.'],
    ['jd-adonai-malach', 'Adonai Malach', ['Adonoi Moloch'], 'mixolydisch', [0, 2, 4, 5, 7, 9, 10],
      'Dur mit kleiner Septime. Die kleine Dezime (erniedrigte Terz in der oberen Oktave) ist im oktavgleichen Modell nicht darstellbar; an Hohen Feiertagen werden diese Stufen oft erhöht.'],
    ['jd-mi-shebeirach', 'Mi Shebeirach', ['Misheberakh', 'Av HaRachamim'], 'ukrainisch-dorisch', [0, 2, 3, 6, 7, 9, 10],
      'In der Synagogalmusik ein Nebenmodus, der eher im Vorübergehen erscheint als ganze Stücke trägt.'],
  ]),

  /* ───────── Phase D (Nachtrag): koreanische Modi, vereinfacht ───────── */
  {
    id: 'kr-pyeongjo', name: 'Pyeongjo (vereinfacht)', aliases: ['Pyeongjo', 'P’yŏngjo', 'Pyongjo'], original: [{ text: '평조', lang: 'ko', romanization: 'pyeongjo' }],
    region: ['east-asia'], tradition: 'Koreanische Musik (Pansori, Sanjo)', family: 'korean', kind: 'modal-reference', sameMaterialAs: 'dur-pentatonik',
    evidence: 'C', sources: ['KOREA'], pitch: { unit: 'semitones', steps: [0, 2, 4, 7, 9] },
    rules: { center: 0, predominant: [3, 1] },
    notes: 'Tonvorrat sol–la–do–re–mi mit do als Zentrum (Lee 2002, Kim 2015; zitiert bei Shin 2018/Kim 2024). Haupttöne sol und re; typische Ornamente: Vibrato (yoseong) auf sol, fallender Ton (toeseong) auf re; mi kann zu fa werden. Widerspruch in der Quelle: Baek nennt sol als Zentrum. Nicht abgebildet: Ornamente und flexible Tonhöhen.',
  },
  {
    id: 'kr-gyemyeonjo', name: 'Gyemyeonjo (vereinfacht)', aliases: ['Gyemyeonjo', 'Kyemyŏnjo', 'Kyemyonjo'], original: [{ text: '계면조', lang: 'ko', romanization: 'gyemyeonjo' }],
    region: ['east-asia'], tradition: 'Koreanische Musik (Pansori, Sanjo, Volkslied)', family: 'korean', kind: 'modal-reference',
    evidence: 'C', sources: ['KOREA'], pitch: { unit: 'semitones', steps: [0, 3, 7] },
    rules: { center: 0 },
    notes: 'Dreiton-Kern (Chang/Han 1975): Grundton, kleine Terz, Quinte; abgeleitet aus dem Beispiel von Lee Jaesuk (1969, Gayageum-Sanjo): c als Grundton, g mit Vibrato (yoseong), es als fallender Ton (toeseong), zitiert bei Shin 2018/Kim 2024. Weitere Töne erscheinen nur als Verzierung (z. B. kkeongneuncheong). Andere Analysen nennen abweichende Tonvorräte. Klangcharakter: klagend.',
  },

  /* ───────── Phase E: arabischer Maqam Rast (Cent) ───────── */
  {
    id: 'ar-rast-24edo', name: 'Maqam Rast (24-EDO)', aliases: ['Rast', 'Maqam Rast', 'Rast Vierteltonfassung'], original: [{ text: 'مقام راست', lang: 'ar', romanization: 'maqām rāst' }],
    region: ['mena'], tradition: 'Arabische Musik; 24-EDO wie auf arabischen Keyboards', family: 'maqam-arab', kind: 'modal-reference',
    evidence: 'C', sources: ['ABLMQ', 'ASH'], pitch: { unit: 'cents', steps: [0, 200, 350, 500, 700, 900, 1050] },
    notes: 'Viertelton-Raster: E½♭ = 350 Cent, H½♭ = 1050 Cent. Die reale Intonation ist je Region und Epoche verschieden (siehe die Varianten Ägypten und Syrien). Nicht abgebildet: Ajnas-Wege, Modulationen, Abstieg mit B♭.',
  },
  {
    id: 'ar-rast-eg', name: 'Maqam Rast (Ägypten, Mitte 20. Jh.)', aliases: ['Rast Ägypten', 'Rast Egypt'],
    region: ['mena'], tradition: 'Arabische Musik, Ägypten', family: 'maqam-arab', kind: 'modal-reference',
    evidence: 'B', sources: ['ABLMQ'], pitch: { unit: 'cents', steps: [0, 200, 342, 500, 700, 900, 1056] },
    notes: 'Intonation nach dem Gehör von Sami Abu Shumays (Ableton-Presets); laut Autor persönliche Werte, keine universelle Norm. E½♭ liegt näher an Es (Es +42 ct). Nicht abgebildet: Ajnas-Wege und Modulationen.',
  },
  {
    id: 'ar-rast-sy', name: 'Maqam Rast (Syrien, Mitte 20. Jh.)', aliases: ['Rast Syrien', 'Rast Syria'],
    region: ['mena'], tradition: 'Arabische Musik, Syrien', family: 'maqam-arab', kind: 'modal-reference',
    evidence: 'B', sources: ['ABLMQ'], pitch: { unit: 'cents', steps: [0, 200, 356, 500, 700, 900, 1061] },
    notes: 'Intonation nach dem Gehör von Sami Abu Shumays (Ableton-Presets): E½♭ in Syrien etwas höher als in Ägypten. Nicht abgebildet: Ajnas-Wege und Modulationen.',
  },

  /* ───────── Phase F: türkische Makamlar (AEU, 53 Kommata pro Oktave) ───────── */
  {
    id: 'tr-rast', name: 'Makam Rast (türkisch, AEU)', aliases: ['Rast makamı', 'Türkisch Rast', 'Turkish Rast'], original: [{ text: 'Rast makamı', lang: 'tr' }],
    region: ['mena', 'europe'], tradition: 'Türkische Kunstmusik (Arel-Ezgi-Uzdilek-Theorie)', family: 'makam-turkish', kind: 'modal-reference',
    evidence: 'B', sources: ['TRAST', 'TMAKAM'],
    pitch: { unit: 'cents', steps: commas([0, 9, 17, 22, 31, 40, 48]), descending: commas([0, 9, 17, 22, 31, 40, 44]) },
    rules: { center: 0, predominant: [4] },
    notes: 'Kommata aufwärts 9-8-5-9-9-8-5 (Rast-Pentachord + Rast-Tetrachord auf Neva), abwärts mit Acem statt Eviç (4 Kommata tiefer, Bûselik-Tetrachord). Durak Rast, Güçlü Neva (als Hauptton). Die neutrale Terz liegt bei etwa 385 Cent, höher als im arabischen Rast. AEU-Theorie und Spielpraxis weichen voneinander ab.',
  },
  {
    id: 'tr-ussak', name: 'Makam Uşşak (türkisch, AEU)', aliases: ['Uşşak makamı', 'Ussak', 'Usak', 'Uschak'], original: [{ text: 'Uşşak makamı', lang: 'tr' }],
    region: ['mena', 'europe'], tradition: 'Türkische Kunstmusik (Arel-Ezgi-Uzdilek-Theorie)', family: 'makam-turkish', kind: 'modal-reference',
    evidence: 'B', sources: ['TUSSAK', 'TMAKAM'],
    pitch: { unit: 'cents', steps: commas([0, 8, 13, 22, 31, 35, 44]) },
    rules: { center: 0, predominant: [3] },
    notes: 'Kommata 8-5-9-9-4-9-9 (Uşşak-Tetrachord + Bûselik-Pentachord auf Neva). Durak Dügâh, Güçlü Neva (als Hauptton). Nicht abgebildet: Seyir (aufsteigend), Entwicklung unter den Grundton (Rast-Pentachord auf Yegâh).',
  },

  /* ───────── Südostasien, Afrika, Ozeanien (Cent) ───────── */
  {
    id: 'th-7edo', name: 'Thailändisch, 7 gleiche Stufen (idealisiert)', aliases: ['Thai 7-EDO', 'Thai tuning', 'Thailändische Stimmung'],
    region: ['southeast-asia'], tradition: 'Thailändische klassische Musik', family: 'southeast-asia-tunings', kind: 'material',
    evidence: 'C', sources: ['MORTON'], pitch: { unit: 'cents', steps: equal(7, 1200) },
    notes: 'Idealisierung: Die Oktave wird in sieben nahezu gleiche Stufen geteilt (Morton: etwa 172 Cent). Die Melodik nutzt meist fünf der sieben Stufen; Stufe 4 und 7 vor allem als Durchgangstöne.',
  },
  {
    id: 'vn-bac-ngo', name: 'Vietnamesische nördliche Pentatonik (Einzelmessung)', aliases: ['Điệu Bắc', 'Dieu Bac', 'Vietnamese pentatonic'], original: [{ text: 'điệu Bắc', lang: 'vi' }],
    region: ['southeast-asia'], tradition: 'Vietnamesische traditionelle Musik', family: 'southeast-asia-tunings', kind: 'modal-reference',
    evidence: 'C', sources: ['NGO'], pitch: { unit: 'cents', steps: [0, 171, 514, 685, 887] },
    notes: 'Stufen hò, xự, xang, xê, cống mit den gemessenen Werten einer Studie an einem einzelnen Stück (Ngo/Phan 2017). Nicht verallgemeinern; Vibrato und Ornamente prägen den Modus stärker als die Tonhöhen.',
  },
  {
    id: 'id-slendro-ideal', name: 'Sléndro (idealisiert, 5 gleiche Stufen)', aliases: ['Slendro', 'Salendro', 'Sléndro 5-EDO'],
    region: ['southeast-asia'], tradition: 'Javanische und balinesische Gamelan-Musik', family: 'gamelan', kind: 'material',
    evidence: 'C', sources: ['SLENDRO'], pitch: { unit: 'cents', steps: equal(5, 1200) },
    notes: 'Idealisierung „annähernd gleich große Stufen“. Reale Gamelans weichen deutlich ab und sind einzeln gestimmt; für eine dokumentierte Stimmung siehe Gamelan Son of Lion.',
  },
  {
    id: 'ug-amadinda', name: 'Amadinda (idealisiert, 5 gleiche Stufen)', aliases: ['Amadinda', 'Akadinda', 'Kiganda xylophone', 'Equipentatonik'],
    region: ['sub-saharan-africa'], tradition: 'Hofmusik von Buganda (Uganda), Xylophone amadinda und akadinda', family: 'africa-tunings', kind: 'material',
    evidence: 'C', sources: ['BAGANDA', 'KUBIK'], pitch: { unit: 'cents', steps: equal(5, 1200) },
    notes: 'Annähernd gleichstufige Pentatonik (etwa 240 Cent je Stufe). Instrumente weichen voneinander ab, Oktaven werden bewusst leicht unrein gestimmt (Schwebung).',
  },
  {
    id: 'sb-areare', name: '’Are’are-Panflöten (7 gleiche Stufen)', aliases: ['Areare', '’au tahana', 'Au tahana', 'Equiheptaphonie'],
    region: ['oceania'], tradition: '’Are’are, Malaita (Salomonen), Panflöten-Ensembles ’au tahana', family: 'oceania-tunings', kind: 'material',
    evidence: 'B', sources: ['ZEMP', 'LAI'], pitch: { unit: 'cents', steps: equal(7, 1200) },
    notes: 'Gleichstufige Heptatonik (etwa 171 Cent). Nach Zemps Messungen weichen 88 % der Intervalle weniger als 20 Cent davon ab; die Stimmung wird beim Bau nach Gehör korrigiert.',
  },

  /* ───────── Instrumentenstimmungen und historische Systeme (Cent) ───────── */
  {
    id: 'gb-highland-pipe', name: 'Great Highland Bagpipe (gemessen)', aliases: ['Dudelsack', 'Highland bagpipe', 'Bagpipe chanter'],
    region: ['europe'], tradition: 'Schottische Pipe-Musik (Spielpfeife, Chanter)', family: 'instrument-tunings', kind: 'tuning',
    evidence: 'A', sources: ['PIPE'], pitch: { unit: 'cents', steps: [0, 203.9, 386.3, 519.6, 702, 884.4, 1017.6] },
    notes: 'Ab tiefem A (Grundton A wählen): Mittelwerte von 18 Spielpfeifen nach Lenihan/MacNeill (1954), wiedergegeben bei Macpherson (1998). D und hohes G liegen über den reinen Werten (498 bzw. 969–996 Cent); das tiefe G liegt etwa 231 Cent unter dem tiefen A.',
  },
  {
    id: 'gr-archytas-enh', name: 'Archytas: enharmonisch, dorische Oktave', aliases: ['Archytas', 'Enharmonisches Tetrachord', 'Enharmonic genus'],
    region: ['historical-experimental'], tradition: 'Antike griechische Musiktheorie (Archytas von Tarent)', family: 'historical-tunings', kind: 'tuning',
    evidence: 'B', sources: ['TETRA'], pitch: { unit: 'cents', steps: [0, 62.961, 111.731, 498.045, 701.955, 764.916, 813.686] },
    notes: 'Zwei enharmonische Tetrachorde (28/27 · 36/35 · 5/4) im Abstand eines Ganztons 9/8 zur dorischen Oktavgattung zusammengesetzt; die Zusammensetzung ist aus der Quelle abgeleitet.',
  },
  {
    id: 'bp-13edt', name: 'Bohlen-Pierce (13 Stufen pro Duodezime)', aliases: ['Bohlen-Pierce', 'BP-Skala', '13edt', 'Tritave'],
    region: ['historical-experimental'], tradition: 'Experimentelles Tonsystem (Bohlen 1978, van Prooijen 1978, Mathews/Pierce 1984)', family: 'equal-divisions', kind: 'material',
    evidence: 'A', sources: ['BP'], pitch: { unit: 'cents', steps: equal(13, 1901.955), period: 1901.955 },
    notes: 'Periode ist die Duodezime 3:1 (≈ 1902 Cent), nicht die Oktave. Der Grundton liegt exakt auf der Taste in der Oktave von C4; Wiederholungen liegen jeweils eine Duodezime höher oder tiefer.',
  },
  ...[19, 24, 31, 53].map((n) => /** @type {TonalSystem} */ ({
    id: `edo-${n}`, name: `${n}-EDO (${n} gleiche Stufen pro Oktave)`, aliases: [`${n}-TET`, `${n}edo`, `${n} gleichstufig`],
    region: ['historical-experimental'], tradition: n === 53 ? 'Gleichstufige Teilung; Komma-Raster der türkischen AEU-Theorie' : 'Gleichstufige Teilung der Oktave (Mikrotonalität)',
    family: 'equal-divisions', kind: /** @type {const} */ ('material'),
    evidence: /** @type {const} */ ('A'), sources: n === 53 ? ['DEF-EDO', 'TMAKAM'] : ['DEF-EDO'], pitch: { unit: /** @type {const} */ ('cents'), steps: equal(n, 1200) },
  })),

  /* ───────── Phase D (Nachtrag): Gamelan-Stimmungen und javanische Pathet ───────── */
  {
    id: 'gamelan-slendro-gsol', name: 'Sléndro, Gamelan Son of Lion', aliases: ['Slendro Son of Lion', 'GSOL slendro'],
    region: ['southeast-asia', 'north-america'], tradition: 'Gamelan Son of Lion (New York), Instrumente in javanischer Tradition', family: 'gamelan', kind: 'tuning',
    evidence: 'A', sources: ['GSOL'], pitch: { unit: 'cents', steps: [0, 245, 507, 735, 970] },
    notes: 'Dokumentierte Stimmung eines konkreten Ensembles (Töne 1, 2, 3, 5, 6). Originalhöhe: Ton 1 ≈ Cis −15 ct (Grundton Cis wählen). Die obere Oktave ist um etwa 5 Cent gestreckt; hier vereinfacht auf 1200 Cent.',
  },
  {
    id: 'gamelan-pelog-gsol', name: 'Pélog, Gamelan Son of Lion', aliases: ['Pelog Son of Lion', 'GSOL pelog'],
    region: ['southeast-asia', 'north-america'], tradition: 'Gamelan Son of Lion (New York), Instrumente in javanischer Tradition', family: 'gamelan', kind: 'tuning',
    evidence: 'A', sources: ['GSOL'], pitch: { unit: 'cents', steps: [0, 170, 315, 590, 717, 830, 1005] },
    notes: 'Dokumentierte Stimmung eines konkreten Ensembles (Töne 1–7). Originalhöhe: Ton 1 ≈ D +30 ct (Grundton D wählen). Ton 4 ist gleich Sléndro-Ton 5, Ton 6 gleich Sléndro-Ton 6.',
  },
  ...pathet(),

  /* ───────── Karnatische Melakarta (regelbasiert) ───────── */
  ...melakartaEntries(),
];

/**
 * Erzeugt Modus-Einträge eines Elternmaterials (gleiche Tradition, Quellen, Familie wie angegeben).
 * @param {string} parent @param {string} region @param {string} tradition @param {string[]} sources
 * @param {[string, string, string[], number[]][]} rows  [id, Name, Aliase, Halbtöne]
 * @param {'A'|'B'|'C'} [evidence] @param {string} [notes]
 * @returns {TonalSystem[]}
 */
function modes(parent, region, tradition, sources, rows, evidence = 'A', notes) {
  const family = parent === 'dur' ? 'diatonic' : 'melodic-minor-modes';
  return rows.map(([id, name, aliases, steps]) => ({
    id, name, aliases, region: [region], tradition, family, kind: /** @type {const} */ ('mode'), parent,
    evidence, sources, pitch: { unit: /** @type {const} */ ('semitones'), steps }, ...(notes ? { notes } : {}),
  }));
}

/** Messiaens Modi begrenzter Transponierbarkeit 3–7. @param {[number, number[]][]} rows @returns {TonalSystem[]} */
function messiaen(rows) {
  return rows.map(([n, steps]) => ({
    id: `messiaen-${n}`, name: `Messiaen-Modus ${n}`, aliases: [`Modus begrenzter Transponierbarkeit ${n}`, `Mode of limited transposition ${n}`],
    region: ['europe'], tradition: 'Olivier Messiaen, Technique de mon langage musical (1944)', family: 'symmetric', kind: /** @type {const} */ ('scale'),
    evidence: /** @type {const} */ ('A'), sources: ['MLT'], pitch: { unit: /** @type {const} */ ('semitones'), steps },
  }));
}

/** Tiefes Einfrieren (Daten sind unveränderlich, wie SCALES bisher). @template T @param {T} o @returns {T} */
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

const LOOKUPS = { isSourceId: (/** @type {string} */ id) => getSource(id) !== undefined, isRegionId };
const problems = validateLibrary(ENTRIES, LOOKUPS);
if (problems.length > 0) throw new Error(`Ungültige Tonsystem-Bibliothek: ${problems.join('; ')}`);

/** @type {readonly TonalSystem[]} */
export const TONAL_SYSTEMS = deepFreeze(ENTRIES);

const BY_ID = new Map(TONAL_SYSTEMS.map((s) => [s.id, s]));

/* ---------- Eigene Tonleitern (Scala-Import, Phase F): nur im Speicher dieser Sitzung ---------- */

/** @type {Map<string, TonalSystem>} */
const USER = new Map();

/** @param {string} id @returns {TonalSystem|undefined} */
export const getTonalSystem = (id) => BY_ID.get(id) ?? USER.get(id);

/** Eingebaute und importierte Tonsysteme (importierte am Ende). @returns {readonly TonalSystem[]} */
export const allTonalSystems = () => (USER.size === 0 ? TONAL_SYSTEMS : [...TONAL_SYSTEMS, ...USER.values()]);

/**
 * Registriert ein eigenes Tonsystem (z. B. aus einer Scala-Datei) für diese Sitzung. Die ID wird bei Bedarf eindeutig gemacht
 * („user-name-2“). Ungültige Einträge werden mit Begründung abgelehnt; eingebaute Einträge können nicht überschrieben werden.
 * @param {TonalSystem} entry
 * @returns {{ ok:true, system:TonalSystem }|{ ok:false, problems:string[] }}
 */
export function registerUserSystem(entry) {
  let id = entry.id;
  for (let n = 2; BY_ID.has(id) || USER.has(id); n++) id = `${entry.id}-${n}`;
  const candidate = { ...entry, id };
  const problems = validateLibrary([...TONAL_SYSTEMS, ...USER.values(), candidate], LOOKUPS).filter((m) => m.startsWith(`${id}:`) || m.includes(`„${id}“`));
  if (problems.length > 0) return { ok: false, problems };
  const sys = deepFreeze(candidate);
  USER.set(id, sys);
  return { ok: true, system: sys };
}

/** Entfernt alle eigenen Tonsysteme (für Tests). */
export function clearUserSystems() {
  USER.clear();
}

/** Prüffunktion mit den Nachschlagetabellen dieser Bibliothek (für Tests und künftige Erweiterungen). @param {readonly any[]} systems */
export const validateAgainstRegistries = (systems) => validateLibrary(systems, LOOKUPS);


/** Chinesische Modi auf dem Gong-Material. @param {[string, string, string, string, string, string, number[]][]} rows */
function cnModes(rows) {
  return rows.map(([id, name, alias, text, romanization, sol, steps]) => ({
    id, name, aliases: [alias, alias.replace(' ', '-')], original: [{ text, lang: 'zh', romanization }],
    region: ['east-asia'], tradition: 'Han-chinesische Musik', family: 'cn-pentatonic', kind: /** @type {const} */ ('mode'), parent: 'cn-gong',
    evidence: /** @type {const} */ ('A'), sources: ['LAM'], pitch: { unit: /** @type {const} */ ('semitones'), steps },
    notes: `Finalis auf der Position ${id.slice(3)} (${sol}). Rotation des Gong-Materials; Intervallfolge aus Lam (2024) abgeleitet.`,
  }));
}

/** Hindustani-Thaats nach Bhatkhande. @param {[string, string, string[], number[]][]} rows @returns {TonalSystem[]} */
function thaats(rows) {
  return rows.map(([key, name, aliases, steps]) => ({
    id: `thaat-${key}`, name: `${name} (Thaat)`, aliases: [`${name} Thaat`, `Thaat ${name}`, ...aliases],
    region: ['south-asia'], tradition: 'Hindustani-Musik (Nordindien), Thaat-System nach V. N. Bhatkhande', family: 'thaat', kind: /** @type {const} */ ('classification'),
    evidence: /** @type {const} */ ('A'), sources: ['THAAT'], pitch: { unit: /** @type {const} */ ('semitones'), steps },
    notes: 'Klassifikations-Skala: Thaats ordnen Ragas, werden aber selbst nicht gesungen und haben keine eigenen Auf- und Abstiegsformen.',
  }));
}

/** Jüdische Gebetsmodi als vereinfachte Referenzfassungen. @param {[string, string, string[], string, number[], string][]} rows @returns {TonalSystem[]} */
function jewishModes(rows) {
  return rows.map(([id, name, aliases, same, steps, detail]) => ({
    id, name: `${name} (vereinfacht)`, aliases: [name, ...aliases, 'Steiger', 'Nusach'],
    region: ['europe'], tradition: 'Aschkenasischer Synagogengesang (Nusach, Steiger)', family: 'jewish-modes', kind: /** @type {const} */ ('modal-reference'), sameMaterialAs: same,
    evidence: /** @type {const} */ ('C'), sources: ['NUSACH'], pitch: { unit: /** @type {const} */ ('semitones'), steps },
    notes: `12-TET-Tonmaterial eines Gebetsmodus. ${detail}`,
  }));
}

/**
 * Raga-Referenzfassungen (Tonvorrat auf- und abwärts, Haupttöne als Stufenindizes der Aufstiegsform).
 * @param {[string, string, string[], 'hindustani'|'carnatic', string[], 'A'|'B'|'C', number[], number[]|null, import('./schema.js').ModalRules|undefined, string][]} rows
 * @returns {TonalSystem[]}
 */
function ragas(rows) {
  return rows.map(([id, name, aliases, school, sources, evidence, up, down, rules, detail]) => ({
    id, name: `${name} (vereinfacht)`, aliases,
    region: ['south-asia'], tradition: school === 'hindustani' ? 'Hindustani-Musik (Nordindien)' : 'Karnatische Musik (Südindien)',
    family: 'raga', kind: /** @type {const} */ ('modal-reference'), evidence,
    sources, pitch: { unit: /** @type {const} */ ('semitones'), steps: up, ...(down ? { descending: down } : {}) },
    ...(rules ? { rules } : {}),
    notes: `Nur Tonvorrat${down ? ' mit eigener Abstiegsform' : ''}${rules ? ' und Haupttönen' : ''}. ${detail}`,
  }));
}

/** Gleichstufige Teilung: n Stufen pro Periode (Cent, auf 1/1000 gerundet). @param {number} n @param {number} period */
function equal(n, period) {
  return Array.from({ length: n }, (_, i) => Math.round((i * period * 1000) / n) / 1000);
}

/**
 * Javanische Pathet auf der dokumentierten Stimmung des Gamelan Son of Lion (vereinfachte Referenzfassungen).
 * Kadenzen und Ton-Rollen nach [PATHET]; Stufenindizes beziehen sich auf die Tonliste des Eintrags.
 * @returns {TonalSystem[]}
 */
function pathet() {
  const slendro = [0, 245, 507, 735, 970]; // Töne 1 2 3 5 6
  const bem = [0, 170, 315, 717, 830]; // Pélog-Töne 1 2 3 5 6 (ab Ton 1)
  const barang = [0, 145, 547, 660, 835]; // Pélog-Töne 2 3 5 6 7 (ab Ton 2)
  /** @type {[string, string, number[], import('./schema.js').ModalRules, string][]} */
  const rows = [
    ['pathet-slendro-nem', 'Pathet nem (Sléndro)', slendro, { center: 1, predominant: [1, 3], avoid: [0] },
      'Töne 1 2 3 5 6, Grundton = Ton 1. Kadenz 6-5-3-2; betont Ton 2, stark Ton 5, gemieden Ton 1.'],
    ['pathet-slendro-sanga', 'Pathet sanga (Sléndro)', slendro, { center: 3, predominant: [3, 0], avoid: [2] },
      'Töne 1 2 3 5 6, Grundton = Ton 1. Kadenz 2-1-6-5; betont Ton 5, stark Ton 1, gemieden Ton 3.'],
    ['pathet-slendro-manyura', 'Pathet manyura (Sléndro)', slendro, { center: 4, predominant: [4, 1], avoid: [3] },
      'Töne 1 2 3 5 6, Grundton = Ton 1. Kadenz 3-2-1-6; betont Ton 6, stark Ton 2, gemieden Ton 5.'],
    ['pathet-pelog-lima', 'Pathet lima (Pélog)', bem, { center: 0 },
      'Töne 1 2 3 5 6 (pathet bem; Ton 4 nur als Verzierung), Grundton = Ton 1. Kadenz 5-4-2-1 (alt) bzw. 5-3-2-1; Ton 7 selten.'],
    ['pathet-pelog-nem', 'Pathet nem (Pélog)', bem, { center: 3 },
      'Töne 1 2 3 5 6, Grundton = Ton 1. Kadenz 2-1-6-5, Schluss auf Ton 5; Ton 7 selten.'],
    ['pathet-pelog-barang', 'Pathet barang (Pélog)', barang, { center: 3 },
      'Töne 2 3 5 6 7 (Ton 7 ersetzt Ton 1), Grundton = Ton 2. Kadenz 3-2-7-6, Schluss auf Ton 6.'],
  ];
  return rows.map(([id, name, steps, rules, detail]) => ({
    id, name: `${name} (vereinfacht)`, aliases: [name, name.replace('Pathet', 'Patet')],
    region: ['southeast-asia'], tradition: 'Javanische Gamelan-Musik (Zentraljava)', family: 'gamelan', kind: /** @type {const} */ ('modal-reference'),
    evidence: /** @type {const} */ ('C'), sources: ['PATHET', 'GSOL'], pitch: { unit: /** @type {const} */ ('cents'), steps }, rules,
    notes: `Pathet-Lehre nach Lindsay/Hood (über Wikipedia), Tonhöhen beispielhaft nach der Stimmung des Gamelan Son of Lion; jedes Gamelan klingt anders. ${detail} Nicht abgebildet: Balungan-Struktur, Garap und die Wahl des Registers.`,
  }));
}

/** Holdrian-Kommata (53 pro Oktave) → Cent, auf 1/1000 gerundet. @param {number[]} c */
function commas(c) {
  return c.map((k) => Math.round((k * 1200 * 1000) / 53) / 1000);
}
