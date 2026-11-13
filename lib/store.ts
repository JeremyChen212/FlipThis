'use client';
import { useEffect, useMemo, useState } from 'react';
import { ROOM_ID, SLOTS } from './config';
import { upgradeDemoTaste } from './demoTaste';
import { newBattleRoom } from './battle';
import { appendChat, chatMessageId, type ChatAuthor } from './chat';
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
  update(patch: Patch, expectedBattleId?: string): Promise<void>;
  reset(): Promise<void>;
  sendChat(author: ChatAuthor, text: string, battleId: string): Promise<void>;
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
  const players = { ...(raw?.players || {}) };
  for (const { id } of SLOTS) {
    const player = players[id];
    if (player) players[id] = upgradeDemoTaste(player, id);
  }
  return {
    phase: raw?.phase || 'lobby',
    phaseEndsAt: raw?.phaseEndsAt ?? null,
    players,
    pairs: raw?.pairs ?? null,
    ...(raw?.voting ? { voting: raw.voting } : {}),
    ...(raw?.battle ? { battle: raw.battle } : {}),
    ...(raw?.chat ? { chat: raw.chat } : {}),
    ...(raw?.chatSequence ? { chatSequence: raw.chatSequence } : {}),
    updatedAt: raw?.updatedAt || 0,
  };
}

function createLocalStore(): RoomStore {
  const key = `flipthis.room.${ROOM_ID}`;
  // Serialize all local writes so chat and beat edits cannot overwrite one another.
  const mutate = (fn: () => void) => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(`${key}.write`, async () => fn())
    : Promise.resolve().then(fn);
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null;
  const listeners = new Set<(r: RoomState) => void>();
  const read = (): RoomState => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return withDefaults(JSON.parse(raw));
      const fresh = newBattleRoom();
      localStorage.setItem(key, JSON.stringify(fresh));
      return fresh;
    } catch { return { ...EMPTY_ROOM }; }
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
    async update(patch, expectedBattleId) {
      await mutate(() => {
      const r = read() as unknown as Record<string, unknown>;
      if (expectedBattleId && (r as unknown as RoomState).battle?.id !== expectedBattleId) return;
      for (const [p, v] of Object.entries(patch)) setPath(r, p, JSON.parse(JSON.stringify(v ?? null)));
      (r as unknown as RoomState).updatedAt = Date.now();
      write(withDefaults(r as unknown as RoomState));
      });
    },
    async reset() { await mutate(() => write(newBattleRoom(read()))); },
    async sendChat(author, text, battleId) {
      const id = chatMessageId();
      await mutate(() => {
        const room = read();
        write({ ...room, ...appendChat(room, author, text, battleId, id), updatedAt: Date.now() });
      });
    },
  };
}

function createFirebaseStore(): RoomStore {
  const ready = (async () => {
    const { initializeApp, getApps } = await import('firebase/app');
    const fs = await import('firebase/firestore');
    const app = getApps()[0] || initializeApp(fbConfig);
    const db = fs.getFirestore(app);
    const ref = fs.doc(db, 'rooms', ROOM_ID);
    await fs.runTransaction(db, async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) transaction.set(ref, newBattleRoom());
    });
    return { fs, db, ref };
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
    async update(patch, expectedBattleId) {
      const { fs, db, ref } = await ready;
      const data: Record<string, unknown> = { updatedAt: Date.now() };
      for (const [p, v] of Object.entries(patch)) data[p] = v === null ? fs.deleteField() : JSON.parse(JSON.stringify(v));
      if (expectedBattleId) {
        await fs.runTransaction(db, async transaction => {
          const snap = await transaction.get(ref);
          if (snap.exists() && snap.data().battle?.id === expectedBattleId) transaction.update(ref, data);
        });
        return;
      }
      try {
        await fs.updateDoc(ref, data);
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'not-found') {
          await fs.runTransaction(db, async transaction => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) transaction.set(ref, newBattleRoom());
          });
          await fs.updateDoc(ref, data);
        } else throw e;
      }
    },
    async reset() {
      const { fs, db, ref } = await ready;
      await fs.runTransaction(db, async transaction => {
        const snap = await transaction.get(ref);
        transaction.set(ref, newBattleRoom(snap.exists() ? snap.data() as RoomState : undefined));
      });
    },
    async sendChat(author, text, battleId) {
      const { fs, db, ref } = await ready;
      const id = chatMessageId();
      await fs.runTransaction(db, async transaction => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('The room is no longer available. Rejoin to chat.');
        const room = withDefaults(snap.data() as RoomState);
        transaction.update(ref, { ...appendChat(room, author, text, battleId, id), updatedAt: Date.now() });
      });
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
