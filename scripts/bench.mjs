// Misst die Core-Laufzeit (Text → Sequence). Aufruf: npm run bench
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {runPipeline} from '../core/pipeline.js';

const sample =
	'Zwei flinke Boxer jagen die quirlige Eva und ihren Mops durch Sylt.\nFranz jagt im komplett verwahrlosten Taxi quer durch Bayern.\nZwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.\nVogel Quax zwickt Johnys Pferd Bim.\nSylvia wagt quick den Jux bei Pforzheim.\nPolyfon zwitschernd aßen Mäxchens Vögel Rüben, Joghurt und Quark.\n"Fix, Schwyz!" quäkt Jürgen blöd vom Paß.\nVictor jagt zwölf Boxkämpfer quer über den großen Sylter Deich.\nFalsches Üben von Xylophonmusik quält jeden größeren Zwerg.\nHeizölrückstoßabdämpfung.';
const make = (n) => sample.repeat(Math.ceil(n / sample.length)).slice(0, n);
console.log(`Node ${process.version} · ${os.cpus()[0].model} · ${os.platform()} ${os.arch()}`);
for (const n of [10000, 50000]) {
	const text = make(n);
	runPipeline(text, {}); // Aufwärmen (JIT)
	const times = [];
	let last;
	for (let i = 0; i < 7; i++) {
		const t0 = performance.now();
		last = runPipeline(text, {});
		times.push(performance.now() - t0);
	}
	times.sort((a, b) => a - b);
	const s = last.result.stats;
	console.log(
		`${String(n).padStart(6)} Zeichen: Median ${times[3].toFixed(1)} ms, Min ${times[0].toFixed(1)} ms, Max ${times[6].toFixed(1)} ms (${s.notes} Noten, ${s.rests} Pausen)`,
	);
	const inc = [];
	for (let i = 0; i < 7; i++) {
		const t0 = performance.now();
		const r = runPipeline(text, {mode: 'A'}, last.result); // immer echte Änderung gegenüber dem Standard (Modus B)
		inc.push(performance.now() - t0);
		if ([...r.recomputed].sort().join() !== 'mapping,sequence,track:track-1,trackmeta')
			throw new Error('Unerwartete Neuberechnung: ' + r.recomputed);
	}
	inc.sort((a, b) => a - b);
	console.log(
		`        Moduswechsel der Spur (Text/Bytes/Tokens/Master wiederverwendet): Median ${inc[3].toFixed(1)} ms`,
	);
}

// Mehrspur: 8 Spuren (verschiedene Regeln/Skalen), 50.000 Zeichen
{
	const rule = (type, extra = {}) => ({
		type,
		chars: '',
		caseSensitive: false,
		yIsVowel: false,
		...extra,
	});
	const mk = (id, type, program, over = {}) => ({
		id,
		name: id,
		enabled: true,
		rule: rule(type),
		mapping: {mode: 'B', scaleId: 'dur', root: 0, lo: 60, hi: 84, ...over},
		instrument: {program},
	});
	const tracks = [
		mk('a', 'vowels', 40),
		mk('b', 'consonants', 0),
		mk('c', 'digits', 12),
		mk('d', 'symbols', 9),
		mk('e', 'emoji', 10),
		mk('f', 'otherLetters', 73),
		mk('g', 'custom', 19, {}),
		mk('h', 'all', 33, {scaleId: 'moll', root: 9, lo: 36, hi: 60}),
	];
	tracks[6].rule = rule('custom', {chars: 'aeiou xyz'});
	const text = make(50000);
	runPipeline(text, {tracks});
	const t8 = [];
	let last;
	for (let i = 0; i < 7; i++) {
		const t0 = performance.now();
		last = runPipeline(text, {tracks});
		t8.push(performance.now() - t0);
	}
	t8.sort((a, b) => a - b);
	console.log(
		` 50000 Zeichen, 8 Spuren: Median ${t8[3].toFixed(1)} ms, Max ${t8[6].toFixed(1)} ms`,
	);
	const base = runPipeline(text, {tracks}).result;
	const one = [];
	for (let i = 0; i < 7; i++) {
		const t0 = performance.now();
		const r = runPipeline(
			text,
			{
				tracks: tracks.map((t) =>
					t.id === 'b' ? {...t, mapping: {...t.mapping, root: 2}} : t,
				),
			},
			base,
		);
		one.push(performance.now() - t0);
		if (
			r.recomputed.join() !== 'track:b,trackmeta' &&
			r.recomputed.join() !== 'trackmeta,track:b'
		)
			throw new Error('Unerwartet: ' + r.recomputed);
	}
	one.sort((a, b) => a - b);
	console.log(
		`        Mapping einer Spur ändern (nur diese Spur neu): Median ${one[3].toFixed(1)} ms`,
	);
	void last;
}
