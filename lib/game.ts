import { BARS, LOOP_BARS, SLOTS, type SlotId } from './config';
import type { RoomState } from './types';

export const pairKey = (a: SlotId, b: SlotId) => [a, b].sort().join('_');

/** Slots that have joined, in seat order. */
export function joinedSlots(room: RoomState): SlotId[] {
  return SLOTS.map((s) => s.id).filter((id) => !!room.players[id]);
}

/** Slots with a beat that has at least one loop or drum hit. */
export function beatSlots(room: RoomState): SlotId[] {
  return joinedSlots(room).filter((id) => {
    const b = room.players[id]?.beat;
    if (!b) return false;
    const hasLoop = Object.values(b.place || {}).some((m) => Object.keys(m || {}).length > 0);
    const hasDrum = Object.values(b.steps || {}).some((row) => (row || []).some(Boolean));
    return hasLoop || hasDrum;
  });
}

/** Every matchup a voter judges: all pairs of other players' beats, in a stable shuffled order. */
export function matchupsFor(room: RoomState, voter: SlotId): [SlotId, SlotId][] {
  const others = beatSlots(room).filter((s) => s !== voter);
  const out: [SlotId, SlotId][] = [];
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
    // Swap left/right for some voters so no beat is always "A".
    out.push((voter.charCodeAt(1) + i + j) % 2 === 1 ? [others[j], others[i]] : [others[i], others[j]]);
  }
  const shift = voter.charCodeAt(1) % Math.max(out.length, 1);
  return [...out.slice(shift), ...out.slice(0, shift)];
}

export interface Standing { slot: SlotId; wins: number; points: number; rank: number }
export function standings(room: RoomState): Standing[] {
  const wins: Partial<Record<SlotId, number>> = {};
  for (const s of beatSlots(room)) wins[s] = 0;
  for (const p of Object.values(room.players)) for (const w of Object.values(p?.votes || {})) {
    if (wins[w] !== undefined) wins[w] = (wins[w] || 0) + 1;
  }
  const rows = (Object.keys(wins) as SlotId[]).map((slot) => ({ slot, wins: wins[slot] || 0, points: 10 + 15 * (wins[slot] || 0), rank: 0 }));
  rows.sort((a, b) => b.wins - a.wins || a.slot.localeCompare(b.slot));
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].wins === r.wins ? rows[i - 1].rank : i + 1; });
  return rows;
}

export function tagOverlap(room: RoomState, a: SlotId, b: SlotId): string[] {
  const ta = room.players[a]?.taste?.tags || [], tb = room.players[b]?.taste?.tags || [];
  return ta.filter((t) => tb.includes(t));
}

/** All ways to split the joined players into pairs (odd one out pairs with nobody). */
export function pairingOptions(slots: SlotId[]): [SlotId, SlotId][][] {
  if (slots.length < 2) return [];
  if (slots.length === 2) return [[[slots[0], slots[1]]]];
  if (slots.length === 3) return [[[slots[0], slots[1]]], [[slots[0], slots[2]]], [[slots[1], slots[2]]]];
  const [a, ...rest] = slots.slice(0, 4);
  return rest.map((b) => { const others = rest.filter((x) => x !== b); return [[a, b], [others[0], others[1]]] as [SlotId, SlotId][]; });
}

/** Pick the pairing with the most shared vibe tags. */
export function bestPairing(room: RoomState): [SlotId, SlotId][] {
  const opts = pairingOptions(joinedSlots(room));
  let best = opts[0] || [], bestScore = -1;
  for (const o of opts) {
    const score = o.reduce((s, [a, b]) => s + tagOverlap(room, a, b).length, 0);
    if (score > bestScore) { best = o; bestScore = score; }
  }
  return best;
}

export function pairsToMap(pairs: [SlotId, SlotId][]): Partial<Record<SlotId, SlotId>> {
  const m: Partial<Record<SlotId, SlotId>> = {};
  for (const [a, b] of pairs) { m[a] = b; m[b] = a; }
  return m;
}

export function playerName(room: RoomState, slot: SlotId): string {
  return room.players[slot]?.name || SLOTS.find((s) => s.id === slot)!.defaultName;
}

import { BANKS, KITS, SHARED_LOOPS, SLOT_BY_ID, VIBE_TAGS } from './config';
import { cloneBeat, emptyBeat } from './beat';
import type { Beat, PlayerState } from './types';

/** A reasonable beat for a demo seat, built from that seat's bank. */
export function botBeat(slot: SlotId): Beat {
  const bank = BANKS[SLOT_BY_ID[slot].bank].loops;
  const by = (lane: string) => bank.find((l) => l.lane === lane)!.id;
  const kit = KITS[(slot.charCodeAt(1) + 1) % KITS.length].id;
  const b = emptyBeat(kit);
  const chop = SHARED_LOOPS[slot.charCodeAt(1) % SHARED_LOOPS.length].id;
  for (let bar = 0; bar < BARS; bar++) {
    const phraseBar = bar % LOOP_BARS;
    if ([0, 1, 4, 5].includes(phraseBar)) b.place.sample[String(bar)] = chop;
    b.place.chords[String(bar)] = by('chords');
    if ([2, 3, 6, 7].includes(phraseBar)) b.place.melody[String(bar)] = by('melody');
    if (phraseBar >= 4) b.place.bass[String(bar)] = by('bass');
    if (phraseBar === 3) b.place.fx[String(bar)] = by('fx');
    b.drumOn[bar] = phraseBar >= 2;
  }
  return b;
}

export function botPlayer(slot: SlotId): PlayerState {
  const i = slot.charCodeAt(1);
  return {
    name: `${SLOT_BY_ID[slot].defaultName} (demo)`, joinedAt: Date.now(), bot: true, submitted: true,
    taste: { song: ['Frank Ocean – Ivy', 'Yung Lean – Ginseng Strip 2002', 'Mac DeMarco – Chamber of Reflection', 'Clairo – Bags'][i % 4], tags: [VIBE_TAGS[i % 8], VIBE_TAGS[(i + 3) % 8]] },
    beat: botBeat(slot),
  };
}

/** Votes a demo seat casts: prefers the beat with more filled bars. */
export function botVotes(room: RoomState, slot: SlotId): Record<string, SlotId> {
  const fill = (s: SlotId) => Object.values(room.players[s]?.beat?.place || {}).reduce((n, m) => n + Object.keys(m || {}).length, 0);
  const out: Record<string, SlotId> = {};
  for (const [a, b] of matchupsFor(room, slot)) out[pairKey(a, b)] = fill(a) >= fill(b) ? a : b;
  return out;
}

/** A demo seat's Flip Back: its partner's beat plus one of its own loops. */
export function botFlip(room: RoomState, slot: SlotId, partner: SlotId) {
  const base = room.players[partner]?.beat;
  const beat = base ? cloneBeat(base) : emptyBeat();
  const mel = BANKS[SLOT_BY_ID[slot].bank].loops.find((l) => l.lane === 'melody')!.id;
  beat.place.melody['0'] = mel; beat.place.melody['1'] = mel;
  return { of: partner, beat, edits: 2, done: true };
}
