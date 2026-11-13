'use client';
import { useEffect, useRef, useState } from 'react';
import type { Beat } from './types';
import { normalizeBeat } from './beat';

/**
 * Local beat state that saves to the room shortly after the player stops
 * clicking. Returns [beat, update, replace, cancelPending].
 */
export function useSyncedBeat(initial: Beat, save: (b: Beat) => void | Promise<unknown>, draftKey?: string) {
  const readDraft = (): Beat => {
    try { const raw = draftKey && localStorage.getItem(draftKey); return raw ? normalizeBeat(JSON.parse(raw)) : initial; } catch { return initial; }
  };
  const [beat, setBeat] = useState<Beat>(readDraft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(beat);
  const saveRef = useRef(save);
  saveRef.current = save;
  const mounted = useRef(true);
  const keepDraft = (b: Beat) => { try { if (draftKey) localStorage.setItem(draftKey, JSON.stringify(b)); } catch {} };
  async function flush() {
    timer.current = null;
    const current = latest.current;
    try {
      await saveRef.current(current);
      try { if (draftKey && localStorage.getItem(draftKey) === JSON.stringify(current)) localStorage.removeItem(draftKey); } catch {}
    } catch {
      // A local copy survives reloads; reconnecting retries while this phase is open.
      keepDraft(latest.current);
      if (mounted.current) timer.current = setTimeout(flush, 5000);
    }
  }

  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const update = (b: Beat) => {
    setBeat(b); latest.current = b;
    keepDraft(b);
    cancel();
    timer.current = setTimeout(flush, 350);
  };
  const replace = (b: Beat) => { cancel(); setBeat(b); latest.current = b; keepDraft(b); };

  // Flush a pending save if the screen changes mid-edit.
  useEffect(() => {
    mounted.current = true;
    try { if (draftKey && localStorage.getItem(draftKey)) timer.current = setTimeout(flush, 350); } catch {}
    return () => {
      mounted.current = false;
      if (timer.current) { clearTimeout(timer.current); void flush(); }
    };
  }, []);
  return [beat, update, replace, cancel] as const;
}
