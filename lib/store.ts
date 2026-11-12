'use client';
import { useEffect, useMemo, useState } from 'react';
import { ROOM_ID } from './config';
import { EMPTY_ROOM, type RoomState } from './types';

/**
 * Room sync. With Firebase env vars set, every laptop shares one Firestore
 * document. Without them it falls back to "local mode": tabs in the same
 * browser share state through BroadcastChannel, which is enough to rehearse.
 *
 * Patches use dotted paths ("players.p1.beat") so concurrent writers never
 * overwrite each other's fields. A value of null deletes the field.
 */
export type Patch = Record<string, unknown>;

export interface RoomStore {
  mode: 'firebase' | 'local';
  subscribe(cb: (room: RoomState) => void): () => void;
  update(patch: Patch): Promise<void>;
  reset(): Promise<void>;
}

const fbConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const hasFirebase = !!(fbConfig.apiKey && fbConfig.projectId);

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  if (value === null) delete cur[last]; else cur[last] = value;
}

function withDefaults(raw: Partial<RoomState> | undefined | null): RoomState {
  return {
    phase: raw?.phase || 'lobby',
    phaseEndsAt: raw?.phaseEndsAt ?? null,
    players: raw?.players || {},
    pairs: raw?.pairs ?? null,
    updatedAt: raw?.updatedAt || 0,
  };
}

function createLocalStore(): RoomStore {
  const key = `flipthis.room.${ROOM_ID}`;
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null;
  const listeners = new Set<(r: RoomState) => void>();
  const read = (): RoomState => {
    try { const raw = localStorage.getItem(key); return withDefaults(raw ? JSON.parse(raw) : null); } catch { return { ...EMPTY_ROOM }; }
  };
  const write = (r: RoomState) => {
    try { localStorage.setItem(key, JSON.stringify(r)); } catch {}
    listeners.forEach((l) => l(r));
    channel?.postMessage('changed');
  };
  channel?.addEventListener('message', () => { const r = read(); listeners.forEach((l) => l(r)); });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => { if (e.key === key) { const r = read(); listeners.forEach((l) => l(r)); } });
  }
  return {
    mode: 'local',
    subscribe(cb) { listeners.add(cb); cb(read()); return () => { listeners.delete(cb); }; },
    async update(patch) {
      const r = read() as unknown as Record<string, unknown>;
      for (const [p, v] of Object.entries(patch)) setPath(r, p, JSON.parse(JSON.stringify(v ?? null)));
      (r as unknown as RoomState).updatedAt = Date.now();
      write(withDefaults(r as unknown as RoomState));
    },
    async reset() { write({ ...EMPTY_ROOM, updatedAt: Date.now() }); },
  };
}

function createFirebaseStore(): RoomStore {
  const ready = (async () => {
    const { initializeApp, getApps } = await import('firebase/app');
    const fs = await import('firebase/firestore');
    const app = getApps()[0] || initializeApp(fbConfig);
    const db = fs.getFirestore(app);
    return { fs, ref: fs.doc(db, 'rooms', ROOM_ID) };
  })();

  return {
    mode: 'firebase',
    subscribe(cb) {
      let unsub: (() => void) | null = null; let cancelled = false;
      ready.then(({ fs, ref }) => {
        if (cancelled) return;
        unsub = fs.onSnapshot(ref, (snap) => cb(withDefaults(snap.exists() ? (snap.data() as RoomState) : null)),
          (err) => console.error('[flipthis] room listener error', err));
      });
      return () => { cancelled = true; unsub?.(); };
    },
    async update(patch) {
      const { fs, ref } = await ready;
      const data: Record<string, unknown> = { updatedAt: Date.now() };
      for (const [p, v] of Object.entries(patch)) data[p] = v === null ? fs.deleteField() : JSON.parse(JSON.stringify(v));
      try {
        await fs.updateDoc(ref, data);
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'not-found') {
          await fs.setDoc(ref, { ...EMPTY_ROOM, updatedAt: Date.now() });
          await fs.updateDoc(ref, data);
        } else throw e;
      }
    },
    async reset() {
      const { fs, ref } = await ready;
      await fs.setDoc(ref, { ...EMPTY_ROOM, updatedAt: Date.now() });
    },
  };
}

let singleton: RoomStore | null = null;
export function getStore(): RoomStore {
  if (!singleton) singleton = hasFirebase ? createFirebaseStore() : createLocalStore();
  return singleton;
}

export function useRoom() {
  const store = useMemo(() => (typeof window === 'undefined' ? null : getStore()), []);
  const [room, setRoom] = useState<RoomState | null>(null);
  useEffect(() => store?.subscribe(setRoom), [store]);
  return { room, store, mode: store?.mode ?? 'local' };
}

/** Ticks once a second so countdowns re-render. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}
