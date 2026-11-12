'use client';
import { HOST_CODE, SLOTS, type SlotId } from './config';

export interface Session { role: 'player' | 'host'; slot?: SlotId; name: string }
const KEY = 'flipthis.session';

export function resolveCode(code: string): { role: 'host' } | { role: 'player'; slot: SlotId } | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  if (c === HOST_CODE.toUpperCase()) return { role: 'host' };
  const slot = SLOTS.find((s) => s.code === c);
  return slot ? { role: 'player', slot: slot.id } : null;
}

export function saveSession(s: Session) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

/** sessionStorage first so several tabs in one browser can hold different seats. */
export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

export function clearSession() {
  try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch {}
}
