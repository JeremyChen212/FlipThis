'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BATTLE_NAME, BPM, FLIP_EDIT_LIMIT, KEY_LABEL, PHASES, PHASE_LABELS, PHASE_MINUTES, SLOTS, type Phase, type SlotId } from '@/lib/config';
import { sampleBars, normalizeBeat } from '@/lib/beat';
import { bestPairing, botFlip, botPlayer, botVotes, joinedSlots, matchupsFor, pairingOptions, pairsToMap, playerName, standings, tagOverlap } from '@/lib/game';
import { clearSession, loadSession } from '@/lib/session';
import { hasFirebase, useNow, useRoom, type Patch } from '@/lib/store';
import type { RoomState } from '@/lib/types';
import { Chassis, PhasePills, formatClock } from '@/components/Chassis';
import { BeatPlayer } from '@/components/Playback';

const PHASE_HELP: Record<Phase, string> = {
  lobby: 'Players join with their seat codes. Fill empty seats with demo players if fewer than 4 show up.',
  taste: 'Everyone drops one song and 2 vibe tags. These tags pick the Flip Back pairs.',
  studio: 'Everyone flips the shared vocal chop with their own sample bank and any drum kit.',
  vote: 'Blind A/B votes. Each player judges the matchups that don’t include their own beat.',
  reveal: 'Names and scores are revealed. Check the Flip Back pairs below before moving on.',
  flipback: `Partners swap beats and get ${FLIP_EDIT_LIMIT} edits to add their own sounds.`,
  teamup: 'Partners hear both flips and privately answer: team up for the next battle?',
  done: 'Crews are shown. Point people to the feedback survey.',
};

export default function HostPage() {
  const router = useRouter();
  const { room, store } = useRoom();
  const now = useNow();
  const [origin, setOrigin] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s || s.role !== 'host') router.replace('/');
    setOrigin(window.location.origin);
  }, [router]);

  if (!room || !store) return <main className="page"><div className="chassis"><div className="panel big-center"><p>Connecting to the room…</p></div></div></main>;

  const idx = PHASES.indexOf(room.phase);
  const left = room.phaseEndsAt ? room.phaseEndsAt - now : null;
  const joined = joinedSlots(room);
  const bots = joined.filter((s) => room.players[s]?.bot);

  const goTo = (phase: Phase) => {
    const mins = PHASE_MINUTES[phase];
    const patch: Patch = { phase, phaseEndsAt: mins ? Date.now() + mins * 60000 : null };
    // Demo seats act on their own at each step.
    if (phase === 'reveal' || phase === 'flipback' || phase === 'teamup' || phase === 'done') {
      for (const b of bots) if (!Object.keys(room.players[b]?.votes || {}).length) patch[`players.${b}.votes`] = botVotes(room, b);
    }
    let pairs = room.pairs;
    if ((phase === 'flipback' || phase === 'teamup') && !pairs) { pairs = pairsToMap(bestPairing(room)); patch.pairs = pairs; }
    if ((phase === 'flipback' || phase === 'teamup') && pairs) {
      for (const b of bots) { const p = pairs[b]; if (p && room.players[b]?.flip?.of !== p) patch[`players.${b}.flip`] = botFlip(room, b, p); }
    }
    if (phase === 'teamup' || phase === 'done') for (const b of bots) if (room.players[b]?.teamUp == null) patch[`players.${b}.teamUp`] = true;
    store.update(patch);
  };

  const fillBots = () => {
    const patch: Patch = {};
    for (const s of SLOTS) if (!room.players[s.id]) patch[`players.${s.id}`] = botPlayer(s.id);
    store.update(patch);
  };

  const options = pairingOptions(joined);
  const pairsKey = (o: [SlotId, SlotId][]) => o.map((p) => [...p].sort().join('+')).sort().join(',');
  const currentKey = room.pairs ? pairsKey(Object.entries(room.pairs).filter(([a, b]) => a < (b as string)) as [SlotId, SlotId][]) : '';

  return (
    <Chassis
      left={<>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="brand">flip<span>this</span></div>
          <span className="chip-mono">HOST</span>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="hint">Join at</span>
          <strong style={{ fontFamily: 'var(--mono)', fontSize: 15, wordBreak: 'break-all' }}>{origin || '…'}</strong>
          <span className="hint">{hasFirebase ? 'Live room: works across laptops.' : 'Local mode: only tabs in this browser share the room. Add Firebase keys to go live.'}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { clearSession(); router.push('/'); }}>Leave host panel</button>
      </>}
      screen={<>
        <div className="screen-top">
          <span className="screen-label">{BATTLE_NAME.toUpperCase()} · {BPM} BPM · {KEY_LABEL}</span>
          <span className="screen-big">{formatClock(left)}</span>
        </div>
        <div className="screen-title">{PHASE_LABELS[room.phase]}</div>
        <PhasePills phase={room.phase} />
        <div className="screen-label">{joined.length}/{SLOTS.length} PLAYERS · {PHASE_HELP[room.phase].toUpperCase()}</div>
      </>}
    >
      <section className="panel">
        <div className="panel-head">
          <h2>Run the battle</h2>
          <span className="hint">Phase timers are a guide. Nothing moves until you press Next.</span>
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={idx === 0} onClick={() => goTo(PHASES[idx - 1])}>Back</button>
          <button type="button" className="btn btn-primary" disabled={idx === PHASES.length - 1} onClick={() => goTo(PHASES[idx + 1])}>
            Next: {idx < PHASES.length - 1 ? PHASE_LABELS[PHASES[idx + 1]] : 'end'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.update({ phaseEndsAt: (room.phaseEndsAt && room.phaseEndsAt > Date.now() ? room.phaseEndsAt : Date.now()) + 60000 })}>+1 min</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.update({ phaseEndsAt: null })}>Clear timer</button>
          <span className="grow" />
          <button type="button" className="btn btn-ghost btn-sm" disabled={joined.length >= SLOTS.length} onClick={fillBots}>Fill empty seats with demo players</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>Reset room</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Players</h2><span className="hint">Seat codes: {SLOTS.map((s) => s.code).join(' · ')}</span></div>
        <div className="scroll-x">
          <table className="status-grid">
            <thead><tr><th>Seat</th><th>Name</th><th>Taste</th><th>Beat</th><th>Votes</th><th>Flip Back</th><th>Team up</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {SLOTS.map((s) => {
                const p = room.players[s.id];
                const beat = p?.beat ? normalizeBeat(p.beat) : null;
                const nVotes = Object.keys(p?.votes || {}).length;
                const needVotes = p ? matchupsFor(room, s.id).length : 0;
                return (
                  <tr key={s.id}>
                    <td><span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: s.color }} /><code>{s.code}</code></span></td>
                    <td>{p ? <>{p.name}{p.bot && <span className="hint"> · demo</span>}</> : <span className="no">Empty</span>}</td>
                    <td>{p?.taste ? <>{p.taste.tags.join(', ')}</> : <span className="no">–</span>}</td>
                    <td>{beat ? <span className={p?.submitted ? 'ok' : ''}>{p?.submitted ? 'Submitted' : 'Building'} · sample {sampleBars(beat)} bars</span> : <span className="no">–</span>}</td>
                    <td>{p ? `${nVotes}/${needVotes}` : '–'}</td>
                    <td>{p?.flip ? <span className={p.flip.done ? 'ok' : ''}>{p.flip.done ? 'Sent' : 'Editing'} · {p.flip.edits} edits</span> : <span className="no">–</span>}</td>
                    <td>{p?.teamUp == null ? <span className="no">–</span> : p.teamUp ? <span className="ok">Yes</span> : 'No'}</td>
                    <td>{p && <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.update({ [`players.${s.id}`]: null })} aria-label={`Clear seat ${s.code}`}>Clear</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Flip Back pairs</h2><span className="hint">Ranked by shared vibe tags. Pairs are set automatically when you move to Flip Back if you haven’t picked.</span></div>
        {options.length === 0 ? <p className="hint">Need at least 2 players.</p> : (
          <div className="card-list">
            {[...options].sort((a, b) => score(room, b) - score(room, a)).map((o) => {
              const k = pairsKey(o);
              return (
                <div key={k} className="card stack" style={{ gap: 10, borderColor: k === currentKey ? 'var(--ink)' : undefined }}>
                  {o.map(([a, b]) => (
                    <div key={a + b} className="stack" style={{ gap: 4 }}>
                      <span className="row" style={{ gap: 6 }}><Seat room={room} s={a} /> + <Seat room={room} s={b} /></span>
                      <span className="hint">{tagOverlap(room, a, b).length ? `Shared: ${tagOverlap(room, a, b).join(', ')}` : 'No shared tags'}</span>
                    </div>
                  ))}
                  <button type="button" className={`btn btn-sm ${k === currentKey ? 'btn-dark' : ''}`} onClick={() => store.update({ pairs: pairsToMap(o) })}>
                    {k === currentKey ? 'In use' : 'Use these pairs'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(room.phase === 'vote' || room.phase === 'reveal' || idx > PHASES.indexOf('reveal')) && (
        <section className="panel">
          <div className="panel-head"><h2>Leaderboard</h2><span className="hint">Play beats here to show them on the projector.</span></div>
          <div className="stack">
            {standings(room).map((r) => (
              <div key={r.slot} className="rank">
                <span className="pos">{r.rank}</span>
                <div className="stack" style={{ gap: 8 }}><Seat room={room} s={r.slot} /><BeatPlayer id={`host-${r.slot}`} beat={normalizeBeat(room.players[r.slot]?.beat)} label={`${playerName(room, r.slot)}’s beat`} /></div>
                <span style={{ fontFamily: 'var(--mono)' }}>{r.wins} wins</span>
                <strong style={{ fontFamily: 'var(--mono)' }}>+{r.points}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmReset && (
        <div className="dialog-back" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="dialog">
            <h2 id="reset-title">Reset the room?</h2>
            <p className="hint" style={{ margin: 0 }}>This clears every seat, beat and vote and goes back to the lobby. Players stay on their pages and rejoin automatically.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button type="button" className="btn btn-dark" onClick={() => { store.reset(); setConfirmReset(false); }}>Reset room</button>
            </div>
          </div>
        </div>
      )}
    </Chassis>
  );
}

function score(room: RoomState, o: [SlotId, SlotId][]) { return o.reduce((n, [a, b]) => n + tagOverlap(room, a, b).length, 0); }
function Seat({ room, s }: { room: RoomState; s: SlotId }) {
  return <span className="chip"><span className="dot" style={{ background: SLOTS.find((x) => x.id === s)!.color }} />{playerName(room, s)}</span>;
}
