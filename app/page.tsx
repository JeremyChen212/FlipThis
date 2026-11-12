'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BATTLE_NAME, BPM, KEY_LABEL } from '@/lib/config';
import { loadSession, resolveCode, saveSession } from '@/lib/session';
import { hasFirebase } from '@/lib/store';
import { Chassis } from '@/components/Chassis';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [resume, setResume] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (s) setResume(s.role === 'host' ? 'host panel' : `seat as ${s.name}`);
  }, []);

  const resolved = resolveCode(code);
  const isHost = resolved?.role === 'host';

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!resolved) { setError('That code doesn’t match a seat. Check the code on the screen.'); return; }
    if (resolved.role === 'host') { saveSession({ role: 'host', name: 'Host' }); router.push('/host'); return; }
    const n = name.trim();
    if (!n) { setError('Add your first name so others can find you.'); return; }
    saveSession({ role: 'player', slot: resolved.slot, name: n.slice(0, 20) });
    router.push('/play');
  }

  return (
    <Chassis
      left={<>
        <div className="brand">flip<span>this</span></div>
        <p className="hint" style={{ margin: 0, lineHeight: 1.5 }}>Flip the same sample, vote blind, then finish each other’s beats.</p>
      </>}
      screen={<>
        <div className="screen-top"><span className="screen-label">{BATTLE_NAME.toUpperCase()}</span><span className="screen-label">{BPM} BPM · {KEY_LABEL}</span></div>
        <div className="screen-title">Enter your seat code to join</div>
        <div className="screen-label">{hasFirebase ? 'LIVE ROOM · WORKS ACROSS LAPTOPS' : 'LOCAL MODE · TABS IN THIS BROWSER SHARE ONE ROOM'}</div>
      </>}
    >
      <div className="panel" style={{ maxWidth: 520, width: '100%', margin: '0 auto' }}>
        <form onSubmit={join} className="stack" style={{ gap: 16 }} noValidate>
          <div className="field">
            <label htmlFor="code">Seat code</label>
            <input id="code" className="input input-code" value={code} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              onChange={(e) => { setCode(e.target.value); setError(''); }} placeholder="CODE" aria-describedby="code-help" />
            <span id="code-help" className="hint">Your facilitator gives each of the 4 players a code.</span>
          </div>
          {!isHost && (
            <div className="field">
              <label htmlFor="name">Your first name</label>
              <input id="name" className="input" value={name} maxLength={20} autoComplete="given-name"
                onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Maya" />
            </div>
          )}
          {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}
          <button className="btn btn-primary" type="submit">{isHost ? 'Open host panel' : 'Join battle'}</button>
          {resume && (
            <button type="button" className="btn btn-ghost" onClick={() => router.push(resume === 'host panel' ? '/host' : '/play')}>
              Rejoin {resume}
            </button>
          )}
        </form>
      </div>
    </Chassis>
  );
}
