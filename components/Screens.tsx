'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getEngine } from '@/lib/audio';
import { cloneBeat, normalizeBeat } from '@/lib/beat';
import { BANKS, FLIP_EDIT_LIMIT, LANES, SHARED_LOOPS, SLOTS, SLOT_BY_ID, SURVEY_URL, VIBE_TAGS, type LoopDef, type SlotId } from '@/lib/config';
import { joinedSlots, matchupsFor, pairKey, playerName, standings, tagOverlap } from '@/lib/game';
import type { RoomStore } from '@/lib/store';
import type { Beat, RoomState } from '@/lib/types';
import { useSyncedBeat } from '@/lib/useSyncedBeat';
import { BeatPlayer, stopAll } from './Playback';
import { Studio } from './Studio';
import { CheckIcon, PlayIcon } from './Icons';

type P = { room: RoomState; slot: SlotId };
type PS = P & { store: RoomStore };

const LANE_COLOR = Object.fromEntries(LANES.map((l) => [l.id, l.color]));

function SeatChip({ room, slot }: P) {
  return <span className="chip"><span className="dot" style={{ background: SLOT_BY_ID[slot].color }} />{playerName(room, slot)}</span>;
}

/** Click-to-hear list of loops (lobby). */
function LoopList({ loops }: { loops: LoopDef[] }) {
  const engine = getEngine();
  useEffect(() => { engine.loadLoops(loops.map((l) => l.id)); }, [engine, loops]);
  return (
    <div className="card-list">
      {loops.map((l) => (
        <button key={l.id} type="button" className="card row" style={{ justifyContent: 'space-between', textAlign: 'left' }}
          onClick={async () => { await engine.unlock(); engine.previewLoop(l.id); }} aria-label={`Preview ${l.name}`}>
          <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: LANE_COLOR[l.lane] }} /><strong>{l.name}</strong></span>
          <PlayIcon />
        </button>
      ))}
    </div>
  );
}

export function Lobby({ room, slot }: P) {
  const bank = BANKS[SLOT_BY_ID[slot].bank];
  const joined = joinedSlots(room);
  return (
    <>
      <section className="panel big-center">
        <h1>You’re in, {playerName(room, slot)}.</h1>
        <p>{joined.length} of {SLOTS.length} players here. The battle starts when the host is ready. Grab headphones and get to know your sounds.</p>
        <div className="row" style={{ justifyContent: 'center' }}>{joined.map((s) => <SeatChip key={s} room={room} slot={s} />)}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Your sounds</h2><span className="hint">Everyone shares the vocal chop. The other loops are yours alone, but every bank fits together.</span></div>
        <LoopList loops={[...SHARED_LOOPS, ...bank.loops]} />
      </section>
    </>
  );
}

export function TasteDrop({ room, store, slot }: PS) {
  const mine = room.players[slot]?.taste;
  const [song, setSong] = useState(mine?.song || '');
  const [tags, setTags] = useState<string[]>(mine?.tags || []);
  const [editing, setEditing] = useState(!mine);
  const [error, setError] = useState('');
  const toggle = (t: string) => { setError(''); setTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 2 ? [cur[1], t] : [...cur, t]); };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!song.trim()) { setError('Add a song (artist and title).'); return; }
    if (tags.length !== 2) { setError('Pick exactly 2 vibe tags.'); return; }
    store.update({ [`players.${slot}.taste`]: { song: song.trim().slice(0, 80), tags } });
    setEditing(false);
  };
  const wall = joinedSlots(room).filter((s) => room.players[s]?.taste);
  return (
    <>
      {editing ? (
        <section className="panel">
          <form className="stack" style={{ gap: 18, maxWidth: 640 }} onSubmit={save} noValidate>
            <h2 style={{ fontSize: 20 }}>Drop one song that defines your taste</h2>
            <div className="field">
              <label htmlFor="song">Song</label>
              <input id="song" className="input" value={song} maxLength={80} placeholder="Artist – Title" onChange={(e) => { setSong(e.target.value); setError(''); }} />
            </div>
            <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 10 }}>
              <legend className="field" style={{ marginBottom: 10 }}><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Pick 2 vibe tags ({tags.length}/2)</span></legend>
              <div className="row">{VIBE_TAGS.map((t) => <button key={t} type="button" className="tag" aria-pressed={tags.includes(t)} onClick={() => toggle(t)}>{t}</button>)}</div>
            </fieldset>
            {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}
            <div><button type="submit" className="btn btn-primary">Drop it on the wall</button></div>
          </form>
        </section>
      ) : (
        <section className="panel row" style={{ justifyContent: 'space-between' }}>
          <span className="row ok" style={{ gap: 6 }}><CheckIcon /> Your taste is on the wall. Your Flip Back partner is matched by these tags.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Change</button>
        </section>
      )}
      <section className="panel">
        <div className="panel-head"><h2>Taste wall</h2><span className="hint">{wall.length} of {joinedSlots(room).length} dropped</span></div>
        <div className="card-list">
          {wall.map((s) => {
            const t = room.players[s]!.taste!;
            return (
              <div key={s} className="card stack" style={{ gap: 8, borderColor: s === slot ? 'var(--ink)' : undefined }}>
                <SeatChip room={room} slot={s} />
                <strong style={{ fontSize: 15 }}>{t.song}</strong>
                <div className="row" style={{ gap: 6 }}>{t.tags.map((tg) => <span key={tg} className="tag tag-sm">{tg}</span>)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function Vote({ room, store, slot }: PS) {
  const matchups = useMemo(() => matchupsFor(room, slot), [room, slot]);
  const votes = room.players[slot]?.votes || {};
  const nextIdx = matchups.findIndex(([a, b]) => !votes[pairKey(a, b)]);
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const idx = viewIdx ?? (nextIdx === -1 ? matchups.length : nextIdx);
  useEffect(() => () => stopAll(), []);

  if (matchups.length === 0) {
    return <section className="panel big-center"><h1>Not enough beats to vote on yet</h1><p>Voting needs at least 3 submitted beats. Hang tight.</p></section>;
  }
  if (idx >= matchups.length) {
    return (
      <section className="panel big-center">
        <h1>All {matchups.length} votes in</h1>
        <p>Nice ears. The reveal is next.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewIdx(0)}>Review my votes</button>
      </section>
    );
  }
  const [a, b] = matchups[idx];
  const key = pairKey(a, b);
  const picked = votes[key];
  const choose = (w: SlotId) => { stopAll(); store.update({ [`players.${slot}.votes.${key}`]: w }); setViewIdx(null); };
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Matchup {idx + 1} of {matchups.length}: which flip hits harder?</h2>
        <span className="hint">Names stay hidden until the reveal.</span>
      </div>
      <div className="versus">
        {([a, b] as SlotId[]).map((s, i) => (
          <div key={s} className="choice" data-picked={picked === s}>
            <h3>Beat {i === 0 ? 'A' : 'B'}</h3>
            <BeatPlayer id={`vote-${key}-${s}`} beat={normalizeBeat(room.players[s]?.beat)} label={`Beat ${i === 0 ? 'A' : 'B'}`} big />
            <button type="button" className={`btn ${picked === s ? 'btn-dark' : ''}`} onClick={() => choose(s)}>
              {picked === s ? 'Picked' : `Pick Beat ${i === 0 ? 'A' : 'B'}`}
            </button>
          </div>
        )).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, <span key="vs" className="vs" aria-hidden="true">VS</span>, el]), [])}
      </div>
      {viewIdx !== null && (
        <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => setViewIdx(idx - 1)}>Previous</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewIdx(idx + 1 >= matchups.length ? null : idx + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}

export function Reveal({ room, slot }: P) {
  const rows = standings(room);
  return (
    <section className="panel">
      <div className="panel-head"><h2>Results</h2><span className="hint">Wins out of the blind matchups each beat appeared in. Everyone gets 10 points for finishing.</span></div>
      <div className="stack">
        {rows.map((r) => (
          <div key={r.slot} className="rank" data-me={r.slot === slot}>
            <span className="pos">{r.rank}</span>
            <div className="stack" style={{ gap: 8 }}>
              <span className="row" style={{ gap: 8 }}><SeatChip room={room} slot={r.slot} />{r.slot === slot && <span className="hint">you</span>}</span>
              <BeatPlayer id={`reveal-${r.slot}`} beat={normalizeBeat(room.players[r.slot]?.beat)} label={`${playerName(room, r.slot)}’s beat`} />
            </div>
            <span className="mono" style={{ fontFamily: 'var(--mono)' }}>{r.wins} {r.wins === 1 ? 'win' : 'wins'}</span>
            <strong style={{ fontFamily: 'var(--mono)' }}>+{r.points} pts</strong>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 14 }}>Next: Flip Back. You’ll be paired with someone whose taste matches yours to finish each other’s beats.</p>
    </section>
  );
}

function MatchCard({ room, slot, partner }: P & { partner: SlotId }) {
  const shared = tagOverlap(room, slot, partner);
  const t = room.players[partner]?.taste;
  return (
    <section className="panel row" style={{ justifyContent: 'space-between', gap: 14 }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="hint" style={{ textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600 }}>Your match</span>
        <div className="row" style={{ gap: 10 }}><SeatChip room={room} slot={partner} />{t && <span>dropped <strong>{t.song}</strong></span>}</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {shared.length ? <>
          <span className="hint">You both picked</span>{shared.map((tg) => <span key={tg} className="tag tag-sm">{tg}</span>)}
        </> : <span className="hint">Different tastes, different sounds: a good mix.</span>}
      </div>
    </section>
  );
}

export function FlipBack({ room, store, slot }: PS) {
  const partner = room.pairs?.[slot];
  if (!partner) {
    return <section className="panel big-center"><h1>Finding your match…</h1><p>The host is pairing everyone by the vibe tags from Taste Drop.</p></section>;
  }
  return <FlipEditor key={partner} room={room} store={store} slot={slot} partner={partner} />;
}

function FlipEditor({ room, store, slot, partner }: PS & { partner: SlotId }) {
  const mine = room.players[slot]?.flip;
  const original = normalizeBeat(room.players[partner]?.beat);
  const start = mine && mine.of === partner ? normalizeBeat(mine.beat) : cloneBeat(original);
  const [edits, setEdits] = useState(mine && mine.of === partner ? mine.edits : 0);
  const done = !!(mine && mine.of === partner && mine.done);
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const [beat, setBeat, replace, cancelSave] = useSyncedBeat(start, (b) => store.update({ [`players.${slot}.flip`]: { of: partner, beat: b, edits: editsRef.current, done: false } }));
  const left = FLIP_EDIT_LIMIT - edits;
  const bank = BANKS[SLOT_BY_ID[slot].bank];

  const onChange = (b: Beat) => { if (left <= 0) return; setEdits(edits + 1); editsRef.current = edits + 1; setBeat(b); };
  const resetAll = () => { setEdits(0); editsRef.current = 0; replace(cloneBeat(original)); store.update({ [`players.${slot}.flip`]: { of: partner, beat: original, edits: 0, done: false } }); };
  const finish = () => { stopAll(); cancelSave(); store.update({ [`players.${slot}.flip`]: { of: partner, beat, edits, done: true } }); };

  const actions = done ? (
    <><span className="ok row" style={{ gap: 6 }}><CheckIcon /> Sent to {playerName(room, partner)}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.update({ [`players.${slot}.flip.done`]: false })}>Keep editing</button></>
  ) : (
    <><span className="edits" aria-live="polite">{left} {left === 1 ? 'edit' : 'edits'} left</span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={edits === 0} onClick={resetAll}>Undo all</button>
      <button type="button" className="btn btn-dark" onClick={finish}>Done</button></>
  );

  return (
    <>
      <MatchCard room={room} slot={slot} partner={partner} />
      <Studio playKey={`flip-${slot}`} beat={beat} onChange={onChange} canEdit={!done && left > 0} actions={actions}
        loops={[...SHARED_LOOPS, ...bank.loops]} loopsTitle={`Flip ${playerName(room, partner)}’s beat`}
        loopsHint={`Add your sounds to their beat. Each loop placed or removed, drum hit or kit change is one edit (${FLIP_EDIT_LIMIT} total).`} />
    </>
  );
}

export function TeamUp({ room, store, slot }: PS) {
  const partner = room.pairs?.[slot];
  useEffect(() => () => stopAll(), []);
  if (!partner) return <section className="panel big-center"><h1>No partner this round</h1><p>Odd numbers happen. You’ll be first in line next battle.</p></section>;
  const theirFlip = room.players[partner]?.flip;
  const myFlip = room.players[slot]?.flip;
  const mine = room.players[slot]?.teamUp;
  const theirs = room.players[partner]?.teamUp;
  const name = playerName(room, partner);
  const answer = (v: boolean) => store.update({ [`players.${slot}.teamUp`]: v });

  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>Hear what you made together</h2></div>
        <div className="versus">
          <div className="choice">
            <h3>Your beat, flipped by {name}</h3>
            {theirFlip && theirFlip.of === slot ? <BeatPlayer id="tu-mine" beat={normalizeBeat(theirFlip.beat)} label={`your beat flipped by ${name}`} big />
              : <p className="hint" style={{ margin: 0 }}>{name} didn’t send a flip.</p>}
            <span className="hint">Original:</span>
            <BeatPlayer id="tu-mine-orig" beat={normalizeBeat(room.players[slot]?.beat)} label="your original beat" />
          </div>
          <span className="vs" aria-hidden="true">+</span>
          <div className="choice">
            <h3>{name}’s beat, flipped by you</h3>
            {myFlip && myFlip.of === partner ? <BeatPlayer id="tu-theirs" beat={normalizeBeat(myFlip.beat)} label={`${name}'s beat flipped by you`} big />
              : <p className="hint" style={{ margin: 0 }}>You didn’t send a flip.</p>}
            <span className="hint">Original:</span>
            <BeatPlayer id="tu-theirs-orig" beat={normalizeBeat(room.players[partner]?.beat)} label={`${name}'s original beat`} />
          </div>
        </div>
      </section>
      <section className="panel big-center" style={{ padding: 28 }}>
        {mine === undefined || mine === null ? (
          <>
            <h1>Team up with {name} for the next battle?</h1>
            <p>Your answer is private. {name} only finds out if you both say yes.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={() => answer(true)}>Yes, form a crew</button>
              <button type="button" className="btn" onClick={() => answer(false)}>Not this time</button>
            </div>
          </>
        ) : theirs === undefined || theirs === null ? (
          <><h1>Answer saved</h1><p>Waiting for {name} to answer.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.update({ [`players.${slot}.teamUp`]: null })}>Change my answer</button></>
        ) : mine && theirs ? (
          <><h1>You and {name} are a crew</h1><p>You’ll enter the next battle together and see each other’s flips first.</p></>
        ) : (
          <><h1>No crew this time</h1><p>You’ll get a new match next battle.</p></>
        )}
      </section>
    </>
  );
}

export function Done({ room, slot }: P) {
  const crews: [SlotId, SlotId][] = [];
  const seen = new Set<SlotId>();
  for (const [a, b] of Object.entries(room.pairs || {}) as [SlotId, SlotId][]) {
    if (seen.has(a) || seen.has(b)) continue; seen.add(a); seen.add(b);
    if (room.players[a]?.teamUp && room.players[b]?.teamUp) crews.push([a, b]);
  }
  return (
    <section className="panel big-center">
      <h1>That’s the battle</h1>
      <p>{crews.length ? `${crews.length} ${crews.length === 1 ? 'crew' : 'crews'} formed today.` : 'No crews formed this time, which is useful to know too.'}</p>
      <div className="stack">{crews.map(([a, b]) => <div key={a} className="row" style={{ justifyContent: 'center' }}><SeatChip room={room} slot={a} /><span>+</span><SeatChip room={room} slot={b} /></div>)}</div>
      {SURVEY_URL && <a className="btn btn-primary" href={SURVEY_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Give feedback (2 min)</a>}
      <p className="hint">Thanks for playing{room.players[slot]?.name ? `, ${room.players[slot]!.name}` : ''}.</p>
    </section>
  );
}
