// Erzeugt docs/bibliothek-uebersicht.md aus der Tonsystem-Bibliothek (für Pflege und Fachprüfung).
// Aufruf: npm run report   (mit --check: nur prüfen, ob die Datei aktuell ist; Exit-Code 1, wenn nicht)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TONAL_SYSTEMS } from '../core/tonal/library.js';
import { SOURCES } from '../core/tonal/sources.js';
import { FAMILIES, KIND_LABELS, EVIDENCE_LABELS, regionName, familyName, stepPattern } from '../core/tonal/catalog.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'bibliothek-uebersicht.md');
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const fmt = (v) => (+v.toFixed(1)).toLocaleString('de-DE', { useGrouping: false });

function material(s) {
  const p = s.pitch;
  const up = p.unit === 'semitones' ? p.steps.join(' ') : `${p.steps.map(fmt).join('; ')} ct`;
  const down = p.descending ? ` / ab: ${p.unit === 'semitones' ? p.descending.join(' ') : `${p.descending.map(fmt).join('; ')} ct`}` : '';
  const period = p.unit === 'cents' && p.period ? ` (Periode ${fmt(p.period)} ct)` : '';
  return `${up}${down}${period}`;
}

export function buildReport() {
  const lines = [];
  const by = (key) => TONAL_SYSTEMS.reduce((m, s) => { const k = key(s); m.set(k, (m.get(k) ?? 0) + 1); return m; }, new Map());
  lines.push('# Tonsystem-Bibliothek: Übersicht für Pflege und Fachprüfung', '');
  lines.push('Automatisch erzeugt mit `npm run report` aus `core/tonal/library.js`. Nicht von Hand bearbeiten.', '');
  lines.push(`**${TONAL_SYSTEMS.length} Einträge.** Belegstatus: ${[...by((s) => s.evidence)].sort().map(([k, n]) => `${k} ${n}`).join(' · ')}. ` +
    `Mikrotonal (Cent): ${TONAL_SYSTEMS.filter((s) => s.pitch.unit === 'cents').length}. Mit Abstiegsform: ${TONAL_SYSTEMS.filter((s) => s.pitch.descending).length}. Mit Tonhierarchie: ${TONAL_SYSTEMS.filter((s) => s.rules).length}.`, '');
  lines.push('Belegstatus: ' + Object.entries(EVIDENCE_LABELS).map(([k, v]) => v).join('; ') + '.', '');
  lines.push('## Einträge nach Region', '', '| Region | Einträge |', '| --- | --- |');
  for (const [r, n] of [...by((s) => s.region[0])]) lines.push(`| ${cell(regionName(r))} | ${n} |`);
  lines.push('');
  lines.push('## Fachprüfung (Belegstatus B und C)', '', 'Diese Einträge sollten von fachkundigen Personen der jeweiligen Tradition geprüft werden. Prüfpunkte: Name und Schreibweise, Tonmaterial, Haupttöne/Abstieg, Hinweistext zur Vereinfachung.', '');
  for (const f of FAMILIES) {
    const list = TONAL_SYSTEMS.filter((s) => s.family === f.id && s.evidence !== 'A');
    if (!list.length) continue;
    lines.push(`### ${f.name}`, '');
    for (const s of list) lines.push(`- [ ] **${cell(s.name)}** (\`${s.id}\`, ${s.evidence}) – ${cell(s.tradition)}`);
    lines.push('');
  }
  lines.push('## Alle Einträge', '');
  for (const f of FAMILIES) {
    const list = TONAL_SYSTEMS.filter((s) => s.family === f.id);
    if (!list.length) continue;
    lines.push(`### ${f.name} (${list.length})`, '', '| ID | Name | Typ | Beleg | Stufen | Tonmaterial | Abstände | Quellen |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const s of list) {
      lines.push(`| \`${s.id}\` | ${cell(s.name)} | ${cell(KIND_LABELS[s.kind])} | ${s.evidence} | ${s.pitch.steps.length} | ${cell(material(s))} | ${cell(stepPattern(s).split('-').map((v) => fmt(Number(v))).join('-'))} | ${cell(s.sources.join(', '))} |`);
    }
    lines.push('');
  }
  const unknown = [...new Set(TONAL_SYSTEMS.map((s) => s.family))].filter((id) => !FAMILIES.some((f) => f.id === id));
  if (unknown.length) lines.push(`Hinweis: Familien ohne Namen: ${unknown.map(familyName).join(', ')}`, '');
  lines.push('## Quellen', '', '| Kürzel | Titel | Urheber | Jahr | gelesen | Link |', '| --- | --- | --- | --- | --- | --- |');
  for (const q of SOURCES) lines.push(`| ${q.id} | ${cell(q.title)} | ${cell(q.author)} | ${cell(q.year)} | ${q.checked ? 'ja' : 'nein'} | ${q.url ? `[Link](${q.url})` : '–'} |`);
  lines.push('');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = buildReport();
  if (process.argv.includes('--check')) {
    const cur = await readFile(OUT, 'utf8').catch(() => '');
    const same = cur === text;
    console.log(same ? 'Übersicht ist aktuell.' : 'Übersicht ist veraltet: npm run report ausführen.');
    process.exitCode = same ? 0 : 1;
  } else {
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, text);
    console.log(`Geschrieben: ${OUT}`);
  }
}
