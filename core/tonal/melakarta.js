// @ts-check
/**
 * Die 72 Melakarta (karnatische Elternskalen) als regelbasiert erzeugte Bibliothekseinträge.
 * Quelle: [MELA] (Wikipedia „Melakarta“, Abruf 28.10.2026) – Namen und Chakras wörtlich aus der dortigen Tabelle.
 *
 * Bildungsregel (Bericht Phase 1, Abschnitt 7.1): Sa = 0, Pa = 7; Ma = 5 Halbtöne für Nr. 1–36, sonst 6.
 * k = (n − 1) mod 36; Ri/Ga-Paar = RI_GA[⌊k/6⌋], Dha/Ni-Paar = DHA_NI[k mod 6]. Je 6 aufeinanderfolgende Mela bilden ein Chakra.
 * Die 16 Swara-Namen fallen auf 12 Tonhöhen (R2 = G1, R3 = G2, D2 = N1, D3 = N2); hier zählen nur die Tonhöhen.
 */

/** Ri/Ga-Kombinationen in Halbtönen: R1G1, R1G2, R1G3, R2G2, R2G3, R3G3. */
export const RI_GA = Object.freeze([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]].map((x) => Object.freeze(x)));
/** Dha/Ni-Kombinationen in Halbtönen: D1N1, D1N2, D1N3, D2N2, D2N3, D3N3. */
export const DHA_NI = Object.freeze([[8, 9], [8, 10], [8, 11], [9, 10], [9, 11], [10, 11]].map((x) => Object.freeze(x)));

export const MELAKARTA_NAMES = Object.freeze([
  'Kanakāngi', 'Ratnāngi', 'Gānamūrti', 'Vanaspati', 'Mānavati', 'Tānarūpi',
  'Senāvati', 'Hanumatodi', 'Dhenukā', 'Nātakapriyā', 'Kokilapriyā', 'Rūpavati',
  'Gāyakapriyā', 'Vakuḷābharaṇam', 'Māyāmāḻavagowla', 'Chakravākam', 'Sūryakāntam', 'Hātakāmbari',
  'Jhankāradhvani', 'Naṭabhairavi', 'Kīravāṇi', 'Kharaharapriyā', 'Gourimanohari', 'Varuṇapriyā',
  'Māraranjani', 'Chārukesi', 'Sarasāngi', 'Harikāmbhōji', 'Dhīraśankarābharaṇam', 'Nāganandini',
  'Yāgapriyā', 'Rāgavardhini', 'Gāngeyabhuśani', 'Vāgadhīśvari', 'Śūlini', 'Chalanāṭa',
  'Sālagam', 'Jalārnavam', 'Jhālavarāḷi', 'Navanītam', 'Pāvani', 'Raghupriyā',
  'Gavāmbhodi', 'Bhavapriyā', 'Śubhapantuvarāḷi', 'Shaḍvidamārgini', 'Suvarnāngi', 'Divyamaṇi',
  'Dhavaḻāmbari', 'Nāmanārāyaṇi', 'Kāmavardhini', 'Rāmapriyā', 'Gamanāśrama', 'Viśvambari',
  'Śāmaḻāngi', 'Śanmukhapriyā', 'Simhendramadhyamam', 'Hemavati', 'Dharmavati', 'Nītimati',
  'Kāntāmaṇi', 'Riśabhapriyā', 'Latāngi', 'Vāchaspati', 'Mechakalyāni', 'Chitrāmbari',
  'Sucharitrā', 'Jyoti svarupini', 'Dhāthuvardhani', 'Nāsikābhūśaṇi', 'Kōsalam', 'Rasikapriyā',
]);

export const CHAKRA_NAMES = Object.freeze(['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu', 'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya']);

/** Halbtöne der Melakarta Nr. n (1–72). @param {number} n @returns {number[]} */
export function melakartaSteps(n) {
  if (!Number.isInteger(n) || n < 1 || n > 72) throw new RangeError(`Melakarta-Nummer 1–72 erwartet: ${n}`);
  const k = (n - 1) % 36;
  const [ri, ga] = RI_GA[Math.floor(k / 6)];
  const [dha, ni] = DHA_NI[k % 6];
  return [0, ri, ga, n <= 36 ? 5 : 6, 7, dha, ni];
}

/** Chakra (1–12) der Melakarta Nr. n. @param {number} n */
export const chakraOf = (n) => Math.floor((n - 1) / 6) + 1;

/** Familien-ID je Chakra. @param {number} c 1–12 */
export const chakraFamilyId = (c) => `melakarta-${String(c).padStart(2, '0')}`;

/** Familien (Optgroups) der Melakarta in Chakra-Reihenfolge. */
export const MELAKARTA_FAMILIES = Object.freeze(CHAKRA_NAMES.map((name, i) => Object.freeze({
  id: chakraFamilyId(i + 1),
  name: `Melakarta ${i * 6 + 1}–${i * 6 + 6} (Chakra ${i + 1}, ${name})`,
})));

/** Ohne diakritische Zeichen (für Aliase wie „Mayamalavagowla“). @param {string} s */
const plain = (s) => s.normalize('NFKD').replace(/\p{M}+/gu, '');

/** @returns {import('./schema.js').TonalSystem[]} */
export function melakartaEntries() {
  return MELAKARTA_NAMES.map((name, i) => {
    const n = i + 1;
    const c = chakraOf(n);
    const asciiName = plain(name);
    return {
      id: `mela-${String(n).padStart(2, '0')}`,
      name: `${name} (Mela ${n})`,
      aliases: [`Melakarta ${n}`, `Mela ${n}`, ...(asciiName !== name ? [asciiName] : []), `Chakra ${CHAKRA_NAMES[c - 1]}`],
      region: ['south-asia'],
      tradition: 'Karnatische Musik (Südindien), Melakarta-System nach Venkatamakhin/Govindacharya',
      family: chakraFamilyId(c),
      kind: /** @type {const} */ ('classification'),
      evidence: /** @type {const} */ ('A'),
      sources: ['MELA'],
      pitch: { unit: /** @type {const} */ ('semitones'), steps: melakartaSteps(n) },
      notes: 'Klassifikations-Skala (Janaka-Raga): enthält alle sieben Swaras auf- und abwärts. Die daraus abgeleiteten Ragas haben eigene Regeln, die hier nicht abgebildet sind. Swara-Namen, die auf dieselbe Tonhöhe fallen (z. B. R2 = G1), sind als 12-TET-Halbtöne zusammengefasst.',
    };
  });
}
