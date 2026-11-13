import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { initializeFirestore } from 'firebase-admin/firestore';
import type { LobbyRecord } from '../lobbies';
import type { LobbyRepository } from './lobbyHttp';

export function onlineReady(): boolean {
  return !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}
let repository: LobbyRepository | undefined;
export function firebaseRooms(): LobbyRepository {
  if (repository) return repository;
  if (!onlineReady()) throw new Error('Online rooms are not configured.');
  const app = getApps().find(app => app.name === 'flipthis-server') || initializeApp({
    credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n') }),
  }, 'flipthis-server');
  const db = initializeFirestore(app, { preferRest: true });
  const ref = (code: string) => db.collection('lobbies').doc(code);
  repository = {
    async read(code) {
      const snap = await ref(code).get();
      return snap.exists ? snap.data() as LobbyRecord : null;
    },
    async create(code, record) {
      try { await ref(code).create(record); return true; }
      catch (err) { if ((err as { code?: number }).code === 6) return false; throw err; }
    },
    async transact(code, operation) {
      return db.runTransaction(async transaction => {
        const document = ref(code), snap = await transaction.get(document);
        const change = operation(snap.exists ? snap.data() as LobbyRecord : null);
        transaction.set(document, change.record);
        return change.result;
      });
    },
  };
  return repository;
}
