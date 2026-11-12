'use client';
import { PHASES, PHASE_LABELS, type Phase } from '@/lib/config';

export function formatClock(ms: number | null) {
  if (ms === null) return '--:--';
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function PhasePills({ phase }: { phase: Phase }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div className="phases" aria-label="Battle progress">
      {PHASES.map((p, i) => (
        <span key={p} className="phase-pill" data-on={p === phase} data-done={i < idx} aria-current={p === phase ? 'step' : undefined}>
          {PHASE_LABELS[p]}
        </span>
      ))}
    </div>
  );
}

/** The light body with a brand panel on the left and the black display on the right. */
export function Chassis({ left, screen, children }: { left: React.ReactNode; screen: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="page">
      <div className="chassis">
        <div className="topbar">
          <div className="panel brandbox">{left}</div>
          <div className="screen">{screen}</div>
        </div>
        {children}
      </div>
    </main>
  );
}
