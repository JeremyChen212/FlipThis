'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BPM, KEY_LABEL } from '@/lib/config';
import { invitePath, loadSession, resolveCode, saveSession, sessionPath, type Session } from '@/lib/session';
import { createLobby, joinLobby } from '@/lib/roomStores';
import { Chassis } from '@/components/Chassis';

export default function JoinPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('Our beat battle');
  const [online, setOnline] = useState<boolean | null>(null);
  const [practice, setPractice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Session[]>([]);
  const [legacyCode, setLegacyCode] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode((params.get('room') || '').toUpperCase());
    setPractice(params.get('mode') === 'local');
    fetch('/api/lobbies', { cache: 'no-store' }).then(r => r.json()).then(data => setOnline(data.online === true)).catch(() => setOnline(false));
  }, []);
  useEffect(() => {
    const sessions = code.length === 6 ? [loadSession(code, 'host'), loadSession(code, 'player')] : [loadSession()];
    setSaved(sessions.filter((s): s is Session => !!s));
  }, [code]);
  const transport = practice || online === false ? 'local' : 'online';
  function enter(session: Session) { saveSession(session); router.push(sessionPath(session)); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (tab === 'create') enter(await createLobby(title, name, transport));
      else {
        const previous = saved.find(s => s.role === 'player' && s.roomId === code && s.transport === transport && s.name.toLowerCase() === name.trim().toLowerCase());
        enter(await joinLobby(code, name, transport, previous));
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open the lobby. Please retry.'); }
    finally { setBusy(false); }
  }
  function legacy(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const result = resolveCode(legacyCode);
    if (!result) { setError('Use HOST or PLAYER1–PLAYER20 for the classic demo.'); return; }
    if (result.role === 'host') enter({ role: 'host', name: 'Host' });
    else if (!name.trim()) setError('Add your name first.');
    else enter({ role: 'player', slot: result.slot, name: name.trim().slice(0, 20) });
  }
  return <Chassis left={<>
    <div className="brand">flip<span>this</span></div>
    <p className="hint">Battles bring people in. Crews make them stay.</p>
    <p className="hint">Flip a shared sample, vote blind, swap feedback, and remix each other’s beats. Up to 20 creators. No account signup.</p>
  </>} screen={<>
    <div className="screen-top"><span className="screen-label">FLIPTHIS · SHARED MUSIC MAKING</span><span className="screen-label">{BPM} BPM · {KEY_LABEL}</span></div>
    <div className="screen-title">{tab === 'create' ? 'Bring your crew into a battle' : 'Join the room. Find your sound.'}</div>
    <div className="screen-label">{online === null ? 'CHECKING CONNECTION…' : transport === 'online' ? 'ONLINE LOBBIES · UP TO 20 PLAYERS' : 'LOCAL PRACTICE · TABS ON THIS DEVICE'}</div>
  </>}>
    <section className="panel stack" style={{ maxWidth: 620, width: '100%', margin: '0 auto', gap: 18 }}>
      <div className="row" role="group" aria-label="Lobby action">
        <button className={`btn ${tab === 'join' ? 'btn-dark' : 'btn-ghost'}`} type="button" onClick={() => { setTab('join'); setError(''); }}>Join a lobby</button>
        <button className={`btn ${tab === 'create' ? 'btn-dark' : 'btn-ghost'}`} type="button" onClick={() => { setTab('create'); setError(''); }}>Create a lobby</button>
      </div>
      {transport === 'local' && online !== null && <p className="banner">Local practice shares a room between tabs in this browser. Online rooms will be available once hosting and Firebase are configured.</p>}
      <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
        {tab === 'join' ? <div className="field"><label htmlFor="room-code">Room code</label><input id="room-code" className="input input-code" autoComplete="off" maxLength={6} required value={code} placeholder="ABC234" onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }} /><span className="hint">Use the code or invite link from your host. A free seat is assigned automatically.</span></div>
          : <div className="field"><label htmlFor="lobby-name">Lobby name</label><input id="lobby-name" className="input" maxLength={50} required value={title} onChange={e => setTitle(e.target.value)} /></div>}
        <div className="field"><label htmlFor="your-name">Your name</label><input id="your-name" className="input" autoComplete="given-name" maxLength={20} required value={name} placeholder="e.g. Maya" onChange={e => setName(e.target.value)} /></div>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || online === null}>{busy ? 'Opening lobby…' : tab === 'create' ? 'Create lobby and host' : 'Join battle'}</button>
      </form>
      <p className="hint">Your spot and work are saved in this browser. Use the same browser and device to reconnect; keep your invite link handy.</p>
      {saved.map(session => <button type="button" className="btn btn-ghost" key={`${session.roomId || 'demo'}-${session.role}`} onClick={() => enter(session)}>Reconnect {session.role === 'host' ? 'as host' : `as ${session.name}`}{session.roomId ? ` · ${session.roomId}` : ' · classic demo'}</button>)}
      {online && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPractice(!practice); setCode(''); setError(''); }}>{practice ? 'Use online lobbies' : 'Practice locally on this device'}</button>}
      <details><summary>Classic single-device demo</summary><p className="hint">Open HOST and separate PLAYER1–PLAYER20 tabs for the original local demo.</p>
        <form className="row" onSubmit={legacy}><input aria-label="Classic demo seat code" className="input grow" value={legacyCode} onChange={e => setLegacyCode(e.target.value)} placeholder="HOST or PLAYER1" /><button className="btn btn-ghost" type="submit">Open demo</button></form>
      </details>
    </section>
  </Chassis>;
}
