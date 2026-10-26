// @ts-check
/**
 * Arrangement: die gemeinsame Sicht für Klangvorschau und MIDI-Export.
 * Alle aktiven Spuren mit ihren Noten (absolute Ticks der Master-Zeitachse, Tonhöhe der Spur), gemeinsames Tempo und
 * gemeinsame Gesamtlänge. Pausen sind nur als Lücken enthalten. Mute/Solo gehören NICHT hierher (reine Hörkontrolle der Vorschau).
 *
 * @typedef {{ seq:number, startTick:number, durationTick:number, midi:number, velocity:number }} ArrNote
 * @typedef {{ id:string, name:string, program:number, notes:readonly ArrNote[] }} ArrTrack
 * @typedef {{ ppq:number, tempoBpm:number, totalTicks:number, events:readonly import('./timeline.js').MasterEvent[], tracks:readonly ArrTrack[] }} Arrangement
 */

/**
 * @param {import('./pipeline.js').PipelineResult} result
 * @returns {Arrangement}
 */
export function buildArrangement(result) {
  return Object.freeze({
    ppq: result.master.ppq,
    tempoBpm: result.master.tempoBpm,
    totalTicks: result.master.totalTicks,
    events: result.master.events,
    tracks: Object.freeze(result.tracks.filter((t) => t.enabled).map((t) => Object.freeze({
      id: t.id,
      name: t.name,
      program: t.instrument.program,
      notes: t.events,
    }))),
  });
}

/** Anzahl exportierbarer Noten über alle aktiven Spuren. @param {Arrangement} a */
export function countNotes(a) {
  return a.tracks.reduce((n, t) => n + t.notes.length, 0);
}
