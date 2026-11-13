'use client';
import { useEffect, useRef, useState } from 'react';
import { SLOT_BY_ID, PHASE_LABELS } from '@/lib/config';
import { CHAT_HISTORY_LIMIT, CHAT_MAX_LENGTH, chatIsOpen, chatMessages, type ChatAuthor } from '@/lib/chat';
import type { RoomStore } from '@/lib/store';
import type { RoomState } from '@/lib/types';

export function RoomChat({ room, store, author }: { room: RoomState; store: RoomStore; author: ChatAuthor }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const atBottom = useRef(true);
  const busy = useRef(false);
  const open = chatIsOpen(room.phase);
  const messages = chatMessages(room);

  useEffect(() => {
    if (open && atBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [open, room.chatSequence]);

  if (!open) return null;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !draft.trim()) return;
    busy.current = true; setSending(true); setError('');
    try {
      await store.sendChat(author, draft, room.battle?.id || 'legacy');
      setDraft('');
      atBottom.current = true; setAwayFromBottom(false);
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be sent. Please try again.');
    } finally {
      busy.current = false; setSending(false);
      requestAnimationFrame(() => input.current?.focus());
    }
  }

  const prompts = room.phase === 'lobby'
    ? ['What have you been listening to lately?', 'I’m new to making beats—anyone else?']
    : ['One thing I learned from hearing everyone’s beats…', 'Who wants to swap remix ideas?'];

  return <section className="panel room-chat" aria-labelledby="room-chat-title">
    <div className="panel-head">
      <h2 id="room-chat-title">{room.phase === 'lobby' ? 'Meet the room' : 'Talk about the flips'}</h2>
      <span className="chip-mono">GLOBAL CHAT</span>
    </div>
    <p className="hint">Everyone in this battle can read and join in. Chat pauses during Taste Drop, beat building, and blind voting, then reopens at reveal. Keep it kind and give each other room to experiment.</p>
    <div ref={log} className="chat-log" role="log" aria-label="Room conversation" aria-live="polite" aria-relevant="additions text" tabIndex={0}
      onScroll={() => {
        const element = log.current;
        if (!element) return;
        atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
        setAwayFromBottom(!atBottom.current);
      }}>
      {!messages.length && <p className="hint chat-empty">Start the conversation. Say hello, share a feeling, or ask someone about their taste.</p>}
      {messages.map(message => <article key={message.id} className="chat-message" data-mine={message.author === author}>
        <div className="row chat-message-head">
          <span className="dot" style={{ background: message.author === 'host' ? 'var(--ink)' : SLOT_BY_ID[message.author].color }} />
          <strong>{message.name}</strong>
          {message.author === author && <span className="hint">you</span>}
          <span className="hint">{PHASE_LABELS[message.phase]}</span>
        </div>
        <p className="feedback-text">{message.text}</p>
      </article>)}
    </div>
    {awayFromBottom && <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
      atBottom.current = true; setAwayFromBottom(false);
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    }}>Jump to latest messages</button>}
    {messages.length >= CHAT_HISTORY_LIMIT && <p className="hint">Showing the latest {CHAT_HISTORY_LIMIT} messages in this battle.</p>}
    <form ref={form} className="stack" onSubmit={send}>
      <label className="field" htmlFor="room-chat-message">Your message</label>
      <textarea ref={input} id="room-chat-message" className="comment-input" rows={2} maxLength={CHAT_MAX_LENGTH} value={draft} disabled={sending}
        placeholder={room.phase === 'lobby' ? 'Say hi to the other creators…' : 'Celebrate a flip, ask a question, or find a collaborator…'}
        onChange={e => { setDraft(e.target.value); setError(''); }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); form.current?.requestSubmit(); }
        }} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="hint">{draft.length}/{CHAT_MAX_LENGTH} · Enter to send · Shift+Enter for a new line</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send to room'}</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    <div className="row" aria-label="Conversation starters">
      {prompts.map(prompt => <button key={prompt} type="button" className="chat-prompt" disabled={sending} onClick={() => { setDraft(prompt); input.current?.focus(); }}>{prompt}</button>)}
    </div>
    <p className="hint">Messages stay with this battle. Starting a new battle clears the conversation.</p>
  </section>;
}
