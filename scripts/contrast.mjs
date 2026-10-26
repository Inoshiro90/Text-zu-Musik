// Prüft die Textkontraste der CSS-Farbpaare (WCAG 2.x, Ziel ≥ 4,5:1). Aufruf: node scripts/contrast.mjs
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const themes = {
  hell: { bg: '#ffffff', surface: '#f6f5f4', text: '#f0f0f0', muted: '#615d59', accent: '#005bab', accentText: '#ffffff', btn: '#0075de', error: '#a84300', warnBg: '#f6f5f4', errBg: '#fff3ec', infoBg: '#f2f9ff', noteText: '#ffffff', rest: '#523410', linked: '#dd5b00', row: '#f6f5f4', rowBlack: '#efeeed' },
  dunkel: { bg: '#191919', surface: '#252525', text: '#ebebeb', muted: '#9b9a97', accent: '#4d9de0', accentText: '#08131f', btn: '#4d9de0', error: '#ff9d66', warnBg: '#2a2620', errBg: '#2e231c', infoBg: '#1f2a35', noteText: '#0a1020', rest: '#e2a869', linked: '#ff8a4c', row: '#252525', rowBlack: '#2b2b2b' },
};
themes.hell.text = '#0d0d0d'; // rgba(0,0,0,.95) auf Weiß
const trackColors = { hell: ['#0075de', '#b45309', '#047857', '#9333ea', '#be123c', '#0e7490', '#4d7c0f', '#a21caf'], dunkel: ['#4d9de0', '#fbbf24', '#34d399', '#d8b4fe', '#fda4af', '#67e8f9', '#bef264', '#f0abfc'] };
let bad = 0;
for (const [name, t] of Object.entries(themes)) {
  const pairs = [['Text/Hintergrund', t.text, t.bg], ['Text/Fläche', t.text, t.surface], ['Gedämpft/Hintergrund', t.muted, t.bg], ['Gedämpft/Fläche', t.muted, t.surface], ['Akzenttext/Fläche', t.accent, t.surface], ['Primärbutton', t.accentText, t.btn], ['Fehler/Hintergrund', t.error, t.bg], ['Fehler/Fläche', t.error, t.surface], ['Text/Warnung', t.text, t.warnBg], ['Text/Fehlerbox', t.text, t.errBg], ['Text/Infobox', t.text, t.infoBg], ['Pausenlabel/Hintergrund', t.rest, t.bg], ['Pausenlabel/Zeile', t.rest, t.row], ['Auswahl-Kontur/Hintergrund (3:1)', t.linked, t.bg], ['Achsenbeschriftung/Zeile', t.muted, t.row], ['Achsenbeschriftung/Schwarztaste', t.muted, t.rowBlack]];
  trackColors[name].forEach((c, i) => { pairs.push([`Spurfarbe ${i + 1}: Notenbeschriftung`, t.noteText, c]); pairs.push([`Spurfarbe ${i + 1}: Rahmen/Kürzel auf Hintergrund`, c, t.bg]); });
  for (const [label, fg, bg] of pairs) { const min = label.includes('3:1') ? 3 : 4.5; const r = ratio(fg, bg); if (r < min) bad++; console.log(`${name.padEnd(6)} ${label.padEnd(32)} ${r.toFixed(2)}:1 ${r >= min ? 'ok' : 'ZU NIEDRIG'}`); }
}
process.exit(bad ? 1 : 0);
