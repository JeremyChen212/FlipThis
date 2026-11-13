import { ALL_LOOPS, type LoopDef } from './config';

/** The same compact identifier appears on a loop card and its placed blocks. */
export function loopLabel(loop: LoopDef): string {
  const index = ALL_LOOPS.filter(l => l.lane === loop.lane).findIndex(l => l.id === loop.id);
  return `${loop.lane === 'sample' ? 'S' : loop.lane === 'fx' ? 'F' : loop.lane[0].toUpperCase()}${index + 1}`;
}
