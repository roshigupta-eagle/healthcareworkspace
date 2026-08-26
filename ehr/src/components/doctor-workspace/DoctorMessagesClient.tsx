"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import WorkspaceDrawer from './WorkspaceDrawer';
import type { DoctorWorkPatient, DoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import type { MessageConversation } from '@/lib/messageStore';

type ConversationSummary = DoctorWorkSnapshot['messages']['conversations'][number];
type Filter = 'all' | 'unread' | 'patient' | 'care-team' | 'follow-up' | 'archived';
type NewMessageForm = { participantType: 'patient' | 'care-team'; patientId: string; participantName: string; subject: string; body: string };

function withApiPreview(path: string, previewKey: string) {
  return previewKey ? `${path}${path.includes('?') ? '&' : '?'}${previewKey}` : path;
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    message: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
    send: <><path d="M3 11l18-8-8 18-2-8-8-2zM11 13l4-4" /></>,
    follow: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.message}</svg>;
}

function formatDateTime(value?: string) {
  if (!value) return 'Time not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time not documented' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

export default function DoctorMessagesClient({ initialData, patientIdFilter, initialDraft, openNew = false }: { initialData: DoctorWorkSnapshot; patientIdFilter?: string; initialDraft?: string; openNew?: boolean }) {
  const searchParams = useSearchParams();
  const previewParams = new URLSearchParams();
  if (searchParams.get('asUser')) previewParams.set('asUser', searchParams.get('asUser')!);
  else if (['1', 'true'].includes(searchParams.get('noauth') || '')) previewParams.set('noauth', '1');
  const previewKey = previewParams.toString();
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialData.messages.conversations.filter((conversation) => !patientIdFilter || conversation.patientId === patientIdFilter));
  const [counts, setCounts] = useState(initialData.messages.counts);
  const [patients] = useState<DoctorWorkPatient[]>(initialData.patients);
  const [selectedId, setSelectedId] = useState(searchParams.get('conversation') || initialData.messages.conversations[0]?.id || null);
  const [selected, setSelected] = useState<MessageConversation | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [newOpen, setNewOpen] = useState(searchParams.get('new') === '1' || openNew);
  const [newMessage, setNewMessage] = useState<NewMessageForm>({ participantType: 'patient', patientId: searchParams.get('patientId') || patientIdFilter || '', participantName: '', subject: '', body: initialDraft || '' });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const messageKeyRef = useRef<string | null>(null);
  const replyKeyRef = useRef<string | null>(null);

  const visible = conversations.filter((conversation) => {
    if (filter === 'unread' && conversation.unreadCount === 0) return false;
    if (filter === 'patient' && conversation.participant.type !== 'patient') return false;
    if (filter === 'care-team' && conversation.participant.type !== 'care-team') return false;
    if (filter === 'follow-up' && !conversation.requiresFollowUp) return false;
    if (filter === 'archived' && !conversation.archived) return false;
    const normalized = query.trim().toLowerCase();
    return !normalized || [conversation.patientName, conversation.participant.name, conversation.subject, conversation.preview].filter(Boolean).join(' ').toLowerCase().includes(normalized);
  });

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      try {
        const response = await fetch(withApiPreview(`/api/doctor/messages/${encodeURIComponent(selectedId)}`, previewKey), { cache: 'no-store' });
        const payload = await response.json() as { data?: MessageConversation; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error || 'We could not load this conversation.');
        setSelected(payload.data);
        await fetch(withApiPreview(`/api/doctor/messages/${encodeURIComponent(selectedId)}`, previewKey), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'read' }) });
        let clearedUnread = 0;
        setConversations((current) => current.map((conversation) => {
          if (conversation.id !== selectedId) return conversation;
          clearedUnread = conversation.unreadCount;
          return { ...conversation, unreadCount: 0 };
        }));
        if (clearedUnread) setCounts((current) => ({ ...current, unread: Math.max(0, current.unread - clearedUnread) }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'We could not load this conversation.');
      }
    })();
  }, [selectedId, initialData.actor.id, previewKey]);

  async function refresh(includeArchived = filter === 'archived') {
    setBusy('refresh');
    setError(null);
    try {
      const response = await fetch(withApiPreview(`/api/doctor/messages${includeArchived ? '?includeArchived=true' : ''}`, previewKey), { cache: 'no-store' });
      const payload = await response.json() as { data?: ConversationSummary[]; counts?: typeof counts; error?: string };
      if (!response.ok || !payload.data || !payload.counts) throw new Error(payload.error || 'We could not load messages.');
      setConversations(payload.data.filter((conversation) => !patientIdFilter || conversation.patientId === patientIdFilter));
      setCounts(payload.counts);
      setNotice('Messages refreshed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not load messages.');
    } finally {
      setBusy(null);
    }
  }

  async function createConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patient = patients.find((item) => item.id === newMessage.patientId);
    const participantName = newMessage.participantType === 'patient' ? patient?.name || '' : newMessage.participantName.trim();
    if (!participantName || !newMessage.subject.trim() || !newMessage.body.trim()) return;
    setBusy('create');
    setError(null);
    try {
      const idempotencyKey = messageKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `message-${Date.now()}`);
      messageKeyRef.current = idempotencyKey;
      const response = await fetch(withApiPreview('/api/doctor/messages', previewKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: newMessage.participantType === 'patient' ? newMessage.patientId : undefined, participantType: newMessage.participantType, participantId: patient?.id, participantName, subject: newMessage.subject.trim(), body: newMessage.body.trim(), idempotencyKey }) });
      const payload = await response.json() as { data?: MessageConversation; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Message could not be sent.');
      setNewOpen(false);
      messageKeyRef.current = null;
      setNewMessage({ participantType: 'patient', patientId: '', participantName: '', subject: '', body: '' });
      setSelectedId(payload.data.id);
      setNotice('Secure message sent.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message could not be sent.');
    } finally {
      setBusy(null);
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim() || busy === 'send') return;
    setBusy('send');
    setError(null);
    try {
      const idempotencyKey = replyKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `reply-${selected.id}-${Date.now()}`);
      replyKeyRef.current = idempotencyKey;
      const response = await fetch(withApiPreview(`/api/doctor/messages/${encodeURIComponent(selected.id)}`, previewKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: reply.trim(), idempotencyKey }) });
      const payload = await response.json() as { data?: MessageConversation; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Message could not be sent.');
      setSelected(payload.data);
      setReply('');
      replyKeyRef.current = null;
      setNotice('Secure message sent.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message could not be sent.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollowUp() {
    if (!selected) return;
    setBusy('follow-up');
    try {
      const response = await fetch(withApiPreview(`/api/doctor/messages/${encodeURIComponent(selected.id)}`, previewKey), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'follow-up', requiresFollowUp: !selected.requiresFollowUp }) });
      const payload = await response.json() as { data?: MessageConversation; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Conversation could not be updated.');
      setSelected(payload.data);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Conversation could not be updated.');
    } finally {
      setBusy(null);
    }
  }

  const selectedPatient = selected?.patientId ? patients.find((patient) => patient.id === selected.patientId) : undefined;

  return <main className="doctor-workspace-page doctor-messages-page" aria-labelledby="messages-title">
    <header className="doctor-workspace-page-header"><div><div className="doctor-work-eyebrow">Secure communication</div><h1 id="messages-title">Messages</h1><p>Secure patient and care-team communication.</p><div className="doctor-work-context">{counts.unread} unread · {counts.followUp} follow-up needed</div></div><div className="doctor-work-header-actions"><button type="button" className="doctor-work-primary-button" onClick={() => setNewOpen(true)}>+ New Message</button><button type="button" className="doctor-work-secondary-button" onClick={() => void refresh()} disabled={busy === 'refresh'}><Icon name="refresh" size={15} />{busy === 'refresh' ? 'Refreshing' : 'Refresh'}</button></div></header>
    {error && <div role="alert" className="doctor-work-alert doctor-work-alert-error">{error}</div>}
    {notice && <div role="status" className="doctor-work-alert doctor-work-alert-success">{notice}</div>}
    <section className="doctor-message-metrics" aria-label="Message summary"><div className="doctor-message-metric doctor-message-metric-blue"><span>Unread</span><strong>{counts.unread}</strong><small>requires attention</small></div><div className="doctor-message-metric doctor-message-metric-cyan"><span>Patient Messages</span><strong>{counts.patientMessages}</strong><small>active conversations</small></div><div className="doctor-message-metric doctor-message-metric-violet"><span>Care Team</span><strong>{counts.careTeam}</strong><small>active conversations</small></div><div className="doctor-message-metric doctor-message-metric-amber"><span>Follow-Up Needed</span><strong>{counts.followUp}</strong><small>flagged conversations</small></div></section>
    <section className="doctor-work-surface doctor-messages-surface"><div className="doctor-message-toolbar"><div className="doctor-message-filters" role="tablist" aria-label="Message filters">{([['all', 'All'], ['unread', 'Unread'], ['patient', 'Patients'], ['care-team', 'Care Team'], ['follow-up', 'Follow-Up'], ['archived', 'Archived']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => { setFilter(value); void refresh(value === 'archived'); }}>{label}</button>)}</div><label className="doctor-work-search"><span className="sr-only">Search messages or people</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages or people..." /></label></div><div className="doctor-message-layout"><div className="doctor-conversation-list" aria-label="Conversations">{visible.length === 0 ? <div className="doctor-work-empty"><span><Icon name="message" /></span><div><strong>No messages yet</strong><p>Start a secure patient or care-team conversation.</p><button type="button" className="doctor-work-text-link" onClick={() => setNewOpen(true)}>New Message <Icon name="arrow" size={13} /></button></div></div> : visible.map((conversation) => <button type="button" key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`doctor-conversation-row ${selectedId === conversation.id ? 'is-selected' : ''}`}><span className="doctor-conversation-avatar">{initials(conversation.participant.name)}</span><span className="min-w-0 flex-1 text-left"><span className="doctor-conversation-name">{conversation.participant.name}</span><span className="doctor-conversation-role">{conversation.participant.type === 'patient' ? 'Patient' : 'Care Team'}{conversation.patientName ? ` · ${conversation.patientName}` : ''}</span><span className="doctor-conversation-preview">{conversation.preview}</span><span className="doctor-conversation-time">{formatDateTime(conversation.lastMessageAt)}</span></span>{conversation.unreadCount > 0 && <span className="doctor-unread-badge">{conversation.unreadCount}</span>}{conversation.requiresFollowUp && <span className="doctor-follow-up-dot" title="Follow-up needed" />}</button>)}</div><div className="doctor-message-thread">{!selected ? <div className="doctor-message-empty-detail"><Icon name="message" size={30} /><h2>Select a conversation</h2><p>Messages are loaded from the secure Roshi communication store.</p></div> : <><header className="doctor-thread-header"><div><div className="doctor-work-eyebrow">{selected.participant.type === 'patient' ? 'Patient communication' : 'Care-team communication'}</div><h2>{selected.subject}</h2><p>{selected.participant.name}{selectedPatient ? ` · ${selectedPatient.mrn}` : ''}</p></div><div className="doctor-thread-actions">{selectedPatient && <Link href={selectedPatient.href} className="doctor-work-secondary-button">Open Patient</Link>}{selected.patientId && <Link href={`/dashboard/tasks?new=1&patientId=${encodeURIComponent(selected.patientId)}`} className="doctor-work-secondary-button">Create Task</Link>}<button type="button" className="doctor-work-secondary-button" onClick={() => void toggleFollowUp()} disabled={busy === 'follow-up'}><Icon name="follow" size={15} />{selected.requiresFollowUp ? 'Clear Follow-Up' : 'Create Follow-Up'}</button></div></header><div className="doctor-message-thread-body">{selected.messages.map((message) => <article key={message.id} className={`doctor-message-bubble ${message.author.id === initialData.actor.id ? 'is-outbound' : 'is-inbound'}`}><div className="doctor-message-author">{message.author.name} · {formatDateTime(message.sentAt)}</div><p>{message.body}</p><div className="doctor-message-read-state">{message.author.id === initialData.actor.id ? 'Sent securely' : message.readBy.includes(initialData.actor.id) ? 'Read' : 'Unread'}</div></article>)}</div><form className="doctor-message-composer" onSubmit={(event) => void sendReply(event)}><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a secure message..." rows={4} aria-label="Write a secure message" /><div className="doctor-message-composer-footer"><span>Use Ctrl/Cmd + Enter to send</span><button type="submit" className="doctor-work-primary-button" disabled={!reply.trim() || busy === 'send'}><Icon name="send" size={15} />{busy === 'send' ? 'Sending...' : 'Send'}</button></div></form></>}</div></div></section>
    <WorkspaceDrawer title="New Secure Message" open={newOpen} onClose={() => setNewOpen(false)}><form className="doctor-work-form" onSubmit={(event) => void createConversation(event)}><p className="doctor-work-form-intro">Verify the recipient and patient context before sending. Messages are persisted in the secure communication store.</p><label>Recipient type<select value={newMessage.participantType} onChange={(event) => setNewMessage((current) => ({ ...current, participantType: event.target.value as NewMessageForm['participantType'] }))}><option value="patient">Patient</option><option value="care-team">Care team member</option></select></label>{newMessage.participantType === 'patient' ? <label>Patient<select required value={newMessage.patientId} onChange={(event) => setNewMessage((current) => ({ ...current, patientId: event.target.value }))}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}</select></label> : <label>Recipient name<input required value={newMessage.participantName} onChange={(event) => setNewMessage((current) => ({ ...current, participantName: event.target.value }))} placeholder="Care team member" /></label>}<label>Subject<input required value={newMessage.subject} onChange={(event) => setNewMessage((current) => ({ ...current, subject: event.target.value }))} placeholder="Message topic" /></label><label>Message<textarea required rows={8} value={newMessage.body} onChange={(event) => setNewMessage((current) => ({ ...current, body: event.target.value }))} placeholder="Write a secure message..." /></label><div className="doctor-work-form-actions"><button type="button" className="doctor-work-secondary-button" onClick={() => setNewOpen(false)}>Cancel</button><button type="submit" className="doctor-work-primary-button" disabled={busy === 'create'}><Icon name="send" size={15} />{busy === 'create' ? 'Sending...' : 'Send Secure Message'}</button></div></form></WorkspaceDrawer>
  </main>;
}
