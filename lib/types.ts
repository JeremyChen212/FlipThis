import type { DrumRow, KitId, LaneId, Phase, SlotId } from './config';

/** A beat is plain data so it can be synced, voted on and flipped. */
export interface Beat {
  /** lane -> zero-based arrangement bar index -> loop id */
  place: Record<LaneId, Record<string, string>>;
  drumOn: boolean[];
  kit: KitId;
  steps: Record<DrumRow, number[]>;
}

export interface Taste { song: string; tags: string[] }

export interface FlipState {
  /** Whose beat this player is flipping. */
  of: SlotId;
  beat: Beat;
  edits: number;
  done: boolean;
}

export interface PlayerState {
  name: string;
  joinedAt: number;
  taste?: Taste;
  beat?: Beat;
  submitted?: boolean;
  /** pair key ("p1-p2") -> winning slot */
  votes?: Record<string, SlotId>;
  flip?: FlipState;
  teamUp?: boolean | null;
  /** Demo player filled in by the host when fewer than 4 people show up. */
  bot?: boolean;
}

export interface RoomState {
  phase: Phase;
  /** Epoch ms when the current phase timer ends, or null for no timer. */
  phaseEndsAt: number | null;
  players: Partial<Record<SlotId, PlayerState>>;
  /** slot -> partner slot for Flip Back */
  pairs: Partial<Record<SlotId, SlotId>> | null;
  updatedAt: number;
}

export const EMPTY_ROOM: RoomState = { phase: 'lobby', phaseEndsAt: null, players: {}, pairs: null, updatedAt: 0 };
