// @ts-check
/**
 * Quellenverzeichnis der Tonsystem-Bibliothek. Jeder Bibliothekseintrag verweist über `sources` auf IDs von hier.
 * Grundlage: Bericht „Globale Tonsystembibliothek – Recherche & Implementierungsplan (Phase 1)“, Abschnitt 16.
 * `checked`: true = die Seite wurde für den Bericht gelesen; false = nur bibliografisch erfasst.
 * `kind`: 'definition' für rein rechnerische/definitorische Einträge (z. B. die chromatische Leiter), sonst 'reference'.
 */

/** @typedef {{ id:string, title:string, author:string, year:string, url?:string, accessed?:string, checked:boolean, kind:'reference'|'definition', note?:string }} Source */

const ACCESSED = '2026-10-28';

/** @type {readonly Source[]} */
export const SOURCES = Object.freeze(/** @type {Source[]} */ ([
  { id: 'DEF-12TET', title: 'Gleichstufige Zwölfteilung der Oktave (Definition)', author: '–', year: '–', checked: true, kind: 'definition', note: 'Die chromatische Leiter enthält definitionsgemäß alle 12 Tonklassen.' },
  { id: 'LAM', title: 'Pentatonic Xuangong Transformations in Chinese Music', author: 'Nathan L. Lam, Music Theory Online 30(1)', year: '2024', url: 'https://mtosmt.org/issues/mto.24.30.1/mto.24.30.1.lam.html', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'KOREA', title: 'Pyeongjo und Gyemyeonjo (Übersetzung Shin 2018)', author: 'Shin Eun-Joo, übers. Seokyoung Kim, Music Theory Online 30(4)', year: '2018/2024', url: 'https://mtosmt.org/issues/mto.24.30.4/mto.24.30.4.kim.html', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'ASH', title: 'Maqam Analysis: A Primer', author: 'Sami Abu Shumays, Music Theory Spectrum 35(2)', year: '2013', url: 'https://maqamlessons.com/analysis/media/MaqamAnalysisAPrimer_2013WebFormat.pdf', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'ABLMQ', title: 'A Guide to the Maqam Tuning Presets for Ableton Live 12', author: 'Sami Abu Shumays / Ableton', year: 'o. J.', url: 'https://tuning.ableton.com/arabic-maqam/maqam-guide', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MQW', title: 'The Arabic Maqam', author: 'Johnny Farraj, Maqamworld', year: 'o. J.', url: 'https://ftp.maqamworld.com/en/maqam.php', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'TMAKAM', title: 'Turkish makam', author: 'Wikipedia (zitiert Signell 2004, Özkan 2000)', year: '2026', url: 'https://en.wikipedia.org/wiki/Turkish_makam', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'DURING', title: 'Dastgāh', author: 'Jean During, Encyclopædia Iranica VII/1', year: '1994/2011', url: 'https://iranicaonline.org/articles/dastgah', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'FARHAT', title: 'The Dastgah Concept in Persian Music (nach Hormoz Farhat 1990)', author: 'Ableton', year: 'o. J.', url: 'https://tuning.ableton.com/persian-radif/dastgah-concept', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'NUSACH', title: 'Nusach (Jewish music)', author: 'Wikipedia (zitiert Idelsohn 1929, Cohon 1950)', year: '2026', url: 'https://en.wikipedia.org/wiki/Nusach_(Jewish_music)', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'UKRD', title: 'Ukrainian Dorian scale', author: 'Wikipedia (zitiert Beregovski, Feldman 2016)', year: '2026', url: 'https://en.wikipedia.org/wiki/Ukrainian_Dorian_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'HUNG', title: 'Hungarian minor scale', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Hungarian_minor_scale', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Setzt Double Harmonic Major fälschlich mit Phrygisch-Dominant gleich.' },
  { id: 'DHS', title: 'Double harmonic scale', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'NEAP', title: 'Neapolitan scale', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Neapolitan_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MLT', title: 'Mode of limited transposition (nach Messiaen)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Mode_of_limited_transposition', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'PIPE', title: 'The Pitch and Scale of the Great Highland Bagpipe', author: 'Ewan Macpherson (nach Lenihan/MacNeill 1954)', year: '1998', url: 'https://publish.uwo.ca/~emacphe3/pipes/acoustics/pipescale.html', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'THAAT', title: 'Thaat (nach Bhatkhande 1909–1932)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Thaat', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'BHAIRAV', title: 'Bhairav (raga) (zitiert Bor/Rao 1999)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Bhairav_(raga)', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MELA', title: 'Melakarta', author: 'Wikipedia (zitiert Sambamurthy, Bhagyalekshmy)', year: '2026', url: 'https://en.wikipedia.org/wiki/Melakarta', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'YO', title: 'Yo scale (zitiert Koizumi 1974)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Yo_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'INSEN', title: 'Insen scale', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Insen_scale', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Artikel als quellenarm markiert.' },
  { id: 'HIRA', title: 'Hirajōshi scale', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Hiraj%C5%8Dshi_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'RITSU', title: 'Ritsu and ryo scales (zitiert Malm 2000, Gillan 2012)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Ritsu_and_ryo_scales', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'PATHET', title: 'Pathet (zitiert Lindsay 1992, Hood)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Pathet', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'PELOG', title: 'Pelog (zitiert Tenzer 2000, Vitale 2002)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Pelog', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'SLENDRO', title: 'Slendro', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Slendro', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'SUNDA', title: 'A Guide to the Sundanese Gamelan Tuning (Laras)', author: 'Iwan Gunawan / Ableton', year: 'o. J.', url: 'https://tuning.ableton.com/sundanese-gamelan', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MORTON', title: 'Thai Traditional Music: Hot-House Plant or Sturdy Stock', author: 'David Morton, Journal of the Siam Society 58(2)', year: '1970', url: 'https://thesiamsociety.org/wp-content/uploads/1970/03/JSS_058_2b_Morton_ThaiTraditionalMusic.pdf', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'NGO', title: 'Key Pitches in Context and the Pitch/intensity Contour Graph', author: 'Ngo Thanh Nhan, Phan Gia Anh Thu, VNU J. of Social Sciences and Humanities 3(5)', year: '2017', url: 'https://cs.nyu.edu/~nhan/JoSSH_vol-3_no-5_ver-12_20171215.pdf', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'KUBIK', title: 'The structure of Kiganda xylophone music', author: 'Gerhard Kubik, African Music 2(3)', year: '1960', url: 'https://journal.ru.ac.za/index.php/africanmusic/article/view/606', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Nur Abstract gelesen.' },
  { id: 'BAGANDA', title: 'Baganda music (zitiert Kubik, Cooke)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Baganda_music', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'LAI', title: 'Counterpoint and Formative Process in ’Are’are Cyclic Panpipe Music', author: 'Hei-Yeung Lai, Intégral 36', year: '2023', url: 'https://theory.esm.rochester.edu/integral/36-2023/lai/', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'ZEMP', title: 'Melanesian Solo Polyphonic Panpipe Music', author: 'Hugo Zemp, Ethnomusicology 25(3)', year: '1981', checked: false, kind: 'reference', note: 'Über LAI zitiert.' },
  { id: 'BLUES', title: 'Microtonal Analysis of “Blue Notes” and the Blues Scale', author: 'Court B. Cutting, Empirical Musicology Review 13(1–2)', year: '2018', url: 'https://www.osu.tests.sfulib4.publicknowledgeproject.org/index.php/EMR/article/view/6316', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'TETRA', title: 'Tetrachord (nach Chalmers 1993)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Tetrachord', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'BP', title: 'Bohlen–Pierce scale', author: 'Wikipedia (zitiert Bohlen 1978, Mathews/Pierce 1989)', year: '2026', url: 'https://en.wikipedia.org/wiki/Tritave', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MODES', title: 'Music modes: the building blocks of mood and atmosphere in music', author: 'Charlotte Smith, BBC Music Magazine (classical-music.com)', year: '2024', url: 'https://classical-music.com/articles/modes-in-music-what-they-are-and-how-they-are-used-in-music', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MINOR', title: 'Minor scale (zitiert Randel, New Harvard Dictionary of Music 1986; Drabkin, Grove Music Online 2001)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Minor_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MMMODES', title: 'Reference: melodic minor scale modes', author: 'José Rodríguez Alvira, teoria.com', year: 'o. J.', url: 'https://teoria.com/en/reference/m/modes-mm.php', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Nennt die Namen der sieben Modi; Intervalle als Rotation von melodisch Moll abgeleitet.' },
  { id: 'WHOLETONE', title: 'Whole-tone scale (zitiert Piston, Benward/Saker)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Whole-tone_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'BLUESSCALE', title: 'Blues scale (zitiert Greenblatt 2011, Benward/Saker 2003)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Blues_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'PHRYGDOM', title: 'Phrygian dominant scale (zitiert Manuel 2006, Cravitz 2004)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Phrygian_dominant_scale', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'NIOS-HM', title: 'Hindustani Music, Practical Book 2, Kapitel 1 (Chota Khayal: Yaman, Bhairav, Bhupali, Alhaiya Bilawal, Kafi)', author: 'National Institute of Open Schooling (NIOS), Indien', year: 'o. J.', url: 'https://www.nios.ac.in/media/documents/Hindustani_Music_242/hindustanimusicpracticalbook2/ch_HMB2-1.pdf', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'NIOS-CM', title: 'Carnatic Classical Music, Modul II: Pillari Gita und Sanchari Gita (Malahari u. a.)', author: 'National Institute of Open Schooling (NIOS), Indien', year: 'o. J.', url: 'https://www.nios.ac.in/media/documents/Carnatic_Music_243/carnaticmusicbook2/KCM-4.pdf', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Notiert Antara-Gandhara als „G2“ (ältere Zählung); hier als 4 Halbtöne gemäß Elternskala Mela 15 umgesetzt.' },
  { id: 'YAMAN', title: 'Yaman (raga) (zitiert Bhatkhande 1956, Bor 1997, Kaufmann 1968)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Yaman_(raga)', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'MALKAUNS', title: 'Malkauns (zitiert Daniélou 1968, Jairazbhoy 1971, Bagchee 1998)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Malkauns', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'BILAHARI', title: 'Bilahari', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Bilahari', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Einzelbelege der Seite nicht namentlich gelesen.' },
  { id: 'HAMSADHVANI', title: 'Hamsadhvani (zitiert Bor/Rao 1999, Bhagyalekshmy 1990)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Hamsadhvani', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'GSOL', title: 'A Composer’s Guide to Gamelan Son of Lion: instruments and tuning', author: 'Gamelan Son of Lion (New York)', year: 'o. J.', url: 'https://gamelan.org/sonoflion/GSOLspecs.html', accessed: ACCESSED, checked: true, kind: 'reference', note: 'Stimmung als Cent-Abweichung von westlichen Notennamen (Demung-Oktave). Ein Pelog-Ton ist auf der Seite als „P6“ beschriftet, laut Hinweis aber gleich S5; hier als P4 gelesen.' },
  { id: 'DEF-EDO', title: 'Gleichstufige Teilung (Definition): Stufe i = i · Periode / n', author: '–', year: '–', checked: true, kind: 'definition' },
  { id: 'TRAST', title: 'Rast (Turkish makam) (zitiert Ayangil 2008, TDV İslâm Ansiklopedisi, Bozkurt u. a. 2009)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/Rast_(Turkish_makam)', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'TUSSAK', title: 'Uşşak (Turkish makam) (zitiert TDV İslâm Ansiklopedisi, Bozkurt u. a. 2009)', author: 'Wikipedia', year: '2026', url: 'https://en.wikipedia.org/wiki/U%C5%9F%C5%9Fak_(Turkish_makam)', accessed: ACCESSED, checked: true, kind: 'reference' },
  { id: 'USER-SCALA', title: 'Eigene Scala-Datei (vom Nutzer importiert)', author: 'Nutzer', year: '–', checked: false, kind: 'definition', note: 'Inhalt nicht geprüft; gilt nur bis zum Neuladen der Seite.' },
  { id: 'RPN', title: 'Registered Parameter Number', author: 'MIDI-Spec-Tutorial', year: 'o. J.', url: 'https://jazzdup.nfshost.com/tutorial/tech/midispec/rpn.htm', accessed: ACCESSED, checked: true, kind: 'reference' },
]).map((s) => Object.freeze(s)));

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

/** @param {string} id @returns {Source|undefined} */
export const getSource = (id) => BY_ID.get(id);
