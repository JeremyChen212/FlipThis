'use client';
import { useEffect, useRef, useState } from 'react';
import type { Beat } from './types';

/**
 * Local beat state that saves to the room shortly after the player stops
 * clicking. Returns [beat, update, replace, cancelPending].
 */
export function useSyncedBeat(initial: Beat, save: (b: Beat) => void) {
  const [beat, setBeat] = useState<Beat>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(beat);
  const saveRef = useRef(save);
  saveRef.current = save;

  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const update = (b: Beat) => {
    setBeat(b); latest.current = b;
    cancel();
    timer.current = setTimeout(() => { timer.current = null; saveRef.current(latest.current); }, 350);
  };
  const replace = (b: Beat) => { cancel(); setBeat(b); latest.current = b; };

  // Flush a pending save if the screen changes mid-edit.
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); saveRef.current(latest.current); } }, []);
  return [beat, update, replace, cancel] as const;
}
