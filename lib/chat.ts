import { PHASES, SLOTS, type Phase, type SlotId } from './config';
import type { ChatMessage, RoomState } from './types';

export const CHAT_MAX_LENGTH = 400;
export const CHAT_HISTORY_LIMIT = 150;
export type ChatAuthor = SlotId | 'host';

export function chatIsOpen(phase: Phase): boolean {
  return phase === 'lobby' || PHASES.indexOf(phase) >= PHASES.indexOf('reveal');
}

export function chatMessages(room: RoomState): ChatMessage[] {
  return Object.values(room.chat || {}).sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
}

/** Called against the latest room inside a transaction or local write lock. */
export function appendChat(room: RoomState, author: ChatAuthor, text: string, battleId: string, id: string, now = Date.now()) {
  if ((room.battle?.id || 'legacy') !== battleId) throw new Error('A new battle has started. Send your message again in the new lobby.');
  if (!chatIsOpen(room.phase)) throw new Error('Room chat opens in the lobby and after the reveal.');
  const player = author === 'host' ? null : room.players[author];
  if (author !== 'host' && (!SLOTS.some(s => s.id === author) || !player || player.bot)) throw new Error('Join a player seat before sending a message.');
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Write a message first.');
  if (trimmed.length > CHAT_MAX_LENGTH) throw new Error(`Keep messages to ${CHAT_MAX_LENGTH} characters.`);
  const sequence = (room.chatSequence || 0) + 1;
  const message: ChatMessage = { id, author, name: author === 'host' ? 'Facilitator' : player!.name, text: trimmed, phase: room.phase, sequence, createdAt: now };
  const recent = [...chatMessages(room), message].slice(-CHAT_HISTORY_LIMIT);
  return { chat: Object.fromEntries(recent.map(m => [m.id, m])), chatSequence: sequence };
}

export function chatMessageId(): string {
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return Array.from(values, n => n.toString(16).padStart(8, '0')).join('');
}
