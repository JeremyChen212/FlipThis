import { PHASES, SLOTS, type SlotId } from './config';
import { canSubmit, cloneBeat, normalizeBeat } from './beat';
import type { Beat, RoomState, VotingState } from './types';

export const MAX_VOTE_ROUNDS = 6;
const keyFor = (a: SlotId, b: SlotId) => [a, b].sort().join('_');

export function eligibleSlots(room: RoomState): SlotId[] {
  return SLOTS.map(s => s.id).filter(s => {
    const p = room.players[s];
    return p?.submitted && p.beat && canSubmit(normalizeBeat(p.beat));
  });
}

/** Each cyclic round gives every beat exactly two judgments, one on each side.
 * Choose offset pairs to spread opponents and listeners before repeating them.
 * No voter sees their own beat, or judges the same pair twice. */
export function createVoting(room: RoomState): VotingState {
  const slots = eligibleSlots(room), n = slots.length;
  const schedule: VotingState['schedule'] = {};
  const beats: VotingState['beats'] = {};
  for (const s of slots) { schedule[s] = []; beats[s] = cloneBeat(normalizeBeat(room.players[s]!.beat)); }
  if (n < 3) return { slots, beats, schedule };
  const rounds = Math.min(MAX_VOTE_ROUNDS, (n - 1) * (n - 2) / 2);
  const candidates: [number, number][] = [];
  for (let a = 1; a < n; a++) for (let b = a + 1; b < n; b++) candidates.push([a, b]);
  const comparisons = new Map<string, number>();
  const listeners = new Map<string, number>();
  for (let r = 0; r < rounds; r++) {
    let best = 0, bestScore = Infinity;
    for (let c = 0; c < candidates.length; c++) {
      const [a, b] = candidates[c];
      let score = 0;
      const withinRound = new Map<string, number>();
      for (let v = 0; v < n; v++) {
        const x = slots[(v + a) % n], y = slots[(v + b) % n];
        const pair = keyFor(x, y);
        score += ((comparisons.get(pair) || 0) + (withinRound.get(pair) || 0)) * 100;
        withinRound.set(pair, (withinRound.get(pair) || 0) + 1);
        score += ((listeners.get(`${slots[v]}:${x}`) || 0) + (listeners.get(`${slots[v]}:${y}`) || 0)) * 10;
      }
      if (score < bestScore) { best = c; bestScore = score; }
    }
    const [a, b] = candidates.splice(best, 1)[0];
    for (let v = 0; v < n; v++) {
      const x = slots[(v + a) % n], y = slots[(v + b) % n];
      schedule[slots[v]]!.push(r % 2 ? [y, x] : [x, y]);
      const key = keyFor(x, y);
      comparisons.set(key, (comparisons.get(key) || 0) + 1);
      for (const s of [x, y]) {
        const key = `${slots[v]}:${s}`;
        listeners.set(key, (listeners.get(key) || 0) + 1);
      }
    }
  }
  return { slots, beats, schedule };
}

export function votingBeat(room: RoomState, slot: SlotId): Beat {
  return normalizeBeat(room.voting?.beats[slot] || room.players[slot]?.beat);
}

export function votePatch(room: RoomState, voter: SlotId, a: SlotId, b: SlotId, winner: SlotId, comments: Partial<Record<SlotId, string>>): Record<string, unknown> {
  const voting = room.voting || createVoting(room);
  const key = keyFor(a, b);
  if (room.phase !== 'vote' || ![a, b].includes(winner) || !voting.schedule[voter]?.some(pair => keyFor(...pair) === key)) throw new Error('This vote is not assigned to you.');
  const patch: Record<string, unknown> = { [`players.${voter}.votes.${key}`]: winner };
  for (const creator of [a, b]) if (comments[creator] !== undefined) {
    patch[`players.${voter}.comments.${creator}`] = comments[creator]!.trim().slice(0, 280) || null;
  }
  return patch;
}

export function feedbackFor(room: RoomState, creator: SlotId): { author: SlotId; text: string }[] {
  if (PHASES.indexOf(room.phase) < PHASES.indexOf('reveal')) return [];
  const voting = room.voting || createVoting(room);
  const feedback: { author: SlotId; text: string }[] = [];
  for (const author of voting.slots) {
    if (author === creator) continue;
    const player = room.players[author];
    const text = player?.comments?.[creator]?.trim();
    const reviewed = voting.schedule[author]?.some(([a, b]) => (a === creator || b === creator) && [a, b].includes(player?.votes?.[keyFor(a, b)] as SlotId));
    if (text && reviewed) feedback.push({ author, text: text.slice(0, 280) });
  }
  return feedback;
}
