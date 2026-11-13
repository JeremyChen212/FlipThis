import { BANKS, type BankId, type SlotId } from './config';
import type { PlayerState, RoomState } from './types';

/** Assign a whole harmonically compatible pack, independently of seat or name. */
export function randomBank(): BankId {
  const ids = Object.keys(BANKS) as BankId[];
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return ids[Math.floor((value[0] / 0x100000000) * ids.length)];
}

/** Keep old saved rooms sounding the same until their next new session. */
export function playerBank(player: PlayerState | undefined, slot: SlotId, room?: RoomState) {
  const legacy: Partial<Record<SlotId, BankId>> = { p1: 'peach', p2: 'sky', p3: 'mint', p4: 'lilac' };
  return BANKS[room?.battle?.packs[slot] || player?.bank || legacy[slot] || (Object.keys(BANKS) as BankId[])[(Number(slot.slice(1)) - 1) % 4]];
}
