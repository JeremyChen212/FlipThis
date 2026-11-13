import { BARS, DRUM_ROWS, KITS, LANES, LOOP_BY_ID, MIN_SAMPLE_BARS, STEPS, type KitId } from './config';
import type { Beat } from './types';

export function emptyBeat(kit: KitId = 'boombap'): Beat {
  const groove = KITS.find((k) => k.id === kit)!.groove;
  return {
    place: { sample: {}, chords: {}, melody: {}, bass: {}, fx: {} },
    drumOn: Array(BARS).fill(true),
    kit,
    steps: Object.fromEntries(DRUM_ROWS.map((r) => [r.id, [...groove[r.id]]])) as Beat['steps'],
  };
}

/** Firestore and JSON round trips can drop empty maps; this restores the full shape. */
export function normalizeBeat(b: Partial<Beat> | undefined | null): Beat {
  const base = emptyBeat((b?.kit as KitId) || 'boombap');
  if (!b) return base;
  const place = { ...base.place };
  for (const lane of LANES) place[lane.id] = { ...(b.place?.[lane.id] || {}) };
  const steps = { ...base.steps };
  for (const r of DRUM_ROWS) {
    const row = b.steps?.[r.id];
    steps[r.id] = Array.from({ length: drumStepCount(b) }, (_, i) => (row && row[i] ? 1 : 0));
  }
  // Older eight-bar beats keep their existing toggles; new bars start enabled.
  const drumOn = Array.from({ length: BARS }, (_, i) => b.drumOn?.[i] ?? true);
  return { place, drumOn, kit: base.kit, steps };
}

export function drumStepCount(b: Partial<Beat>): 8 | 16 {
  return Object.values(b.steps || {}).some(row => row.length > 8) ? 16 : 8;
}

/** Both resolutions fill one bar; preserve hits on their musical positions. */
export function resizeDrums(beat: Beat, count: 8 | 16): Beat {
  const current = drumStepCount(beat);
  const next = cloneBeat(beat);
  if (current === count) return next;
  for (const { id } of DRUM_ROWS) {
    next.steps[id] = Array.from({ length: count }, (_, i) => count === 16
      ? (i % 2 === 0 ? beat.steps[id][i / 2] || 0 : 0)
      : beat.steps[id][i * 2] || 0);
  }
  return next;
}

export function sampleBars(b: Beat): number {
  return Object.keys(b.place.sample || {}).length;
}

export function canSubmit(b: Beat): boolean {
  return sampleBars(b) >= MIN_SAMPLE_BARS;
}

export function loopIdsIn(b: Beat): string[] {
  const ids = new Set<string>();
  for (const lane of LANES) for (const id of Object.values(b.place[lane.id] || {})) if (LOOP_BY_ID[id]) ids.add(id);
  return [...ids];
}

export function cloneBeat(b: Beat): Beat {
  return JSON.parse(JSON.stringify(b));
}
