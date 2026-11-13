'use client';
import { HOST_CODE, SLOTS, type BankId, type SlotId } from './config';

export interface Session { role: 'player' | 'host'; slot?: SlotId; name: string; bank?: BankId; roomId?: string; token?: string; transport?: 'local' | 'online' }
const KEY = 'flipthis.session';

export function resolveCode(code: string): { role: 'host' } | { role: 'player'; slot: SlotId } | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  if (c === HOST_CODE.toUpperCase()) return { role: 'host' };
  // Old codes remain aliases so existing facilitator notes still work.
  const legacyCodes = ['PEACH', 'SKY', 'MINT', 'LILAC'];
  const slot = SLOTS.find((s, i) => s.code === c || legacyCodes[i] === c);
  return slot ? { role: 'player', slot: slot.id } : null;
}

export function saveSession(s: Session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem(KEY, JSON.stringify(s));
    if (s.roomId) localStorage.setItem(`${KEY}.${s.roomId}.${s.role}`, JSON.stringify(s));
  } catch {}
}

/** sessionStorage first so several tabs in one browser can hold different seats. */
export function loadSession(roomId?: string, role?: Session['role']): Session | null {
  try {
    if (!roomId && typeof window !== 'undefined') {
      roomId = new URLSearchParams(window.location.search).get('room')?.toUpperCase() || undefined;
      if (roomId && !role) role = window.location.pathname === '/host' ? 'host' : window.location.pathname === '/play' ? 'player' : undefined;
    }
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    const current = raw ? JSON.parse(raw) as Session : null;
    if (!roomId) return current;
    if (current?.roomId === roomId && (!role || current.role === role)) return current;
    const saved = localStorage.getItem(`${KEY}.${roomId}.${role || 'player'}`);
    return saved ? JSON.parse(saved) as Session : null;
  } catch { return null; }
}

export function sessionPath(session: Session): string {
  return `${session.role === 'host' ? '/host' : '/play'}${session.roomId ? `?room=${encodeURIComponent(session.roomId)}` : ''}`;
}

export function invitePath(roomId: string, transport: Session['transport']): string {
  return `/?room=${encodeURIComponent(roomId)}${transport === 'local' ? '&mode=local' : ''}`;
}

export function clearSession() {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch {}
}
