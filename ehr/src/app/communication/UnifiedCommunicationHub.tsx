'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CommunicationAttachment, CommunicationCall, CommunicationConversation, CommunicationConversationView, CommunicationDraft, CommunicationHubSnapshot, CommunicationMessage, ConversationSummary } from '@/lib/clinicalCommunicationStore';
import TelehealthCallWorkspace from './TelehealthCallWorkspace';
import './unified-communication.css';

export type CommunicationHubMode = 'all' | 'messages' | 'email' | 'calls' | 'video' | 'voicemail' | 'timeline';
type Folder = 'inbox' | 'sent' | 'drafts' | 'awaitingResponse' | 'needsAction' | 'urgent' | 'calls' | 'voicemail' | 'deliveryIssues' | 'archived';
type ComposerState = { draftId: string; draftRevision: number; conversationId: string | null; recipientId: string; patientId: string; subject: string; bodyText: string; category: string; priority: 'routine' | 'urgent' | 'asap' | 'stat'; channel: 'secure_message' | 'email'; requiresAcknowledgement: boolean; isInternalNote: boolean; attachments: CommunicationAttachment[] };
type Envelope<T> = { data?: T; error?: string; code?: string };
type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = { initialData: CommunicationHubSnapshot; initialMode?: CommunicationHubMode };

const folders: Array<{ id: Folder; label: string; icon: string; count: (snapshot: CommunicationHubSnapshot) => number }> = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', count: (snapshot) => snapshot.folders.inbox },
  { id: 'sent', label: 'Sent', icon: 'send', count: (snapshot) => snapshot.folders.sent },
  { id: 'drafts', label: 'Drafts', icon: 'edit', count: (snapshot) => snapshot.folders.drafts },
  { id: 'awaitingResponse', label: 'Awaiting response', icon: 'clock', count: (snapshot) => snapshot.folders.awaitingResponse },
  { id: 'needsAction', label: 'Needs action', icon: 'task', count: (snapshot) => snapshot.folders.needsAction },
  { id: 'urgent', label: 'Urgent', icon: 'alert', count: (snapshot) => snapshot.folders.urgent },
  { id: 'calls', label: 'Calls', icon: 'phone', count: (snapshot) => snapshot.folders.calls },
  { id: 'voicemail', label: 'Voicemail', icon: 'voicemail', count: (snapshot) => snapshot.folders.voicemail },
  { id: 'deliveryIssues', label: 'Delivery issues', icon: 'warning', count: (snapshot) => snapshot.folders.deliveryIssues },
  { id: 'archived', label: 'Archived', icon: 'archive', count: (snapshot) => snapshot.folders.archived },
];

const modes: Array<{ id: CommunicationHubMode; label: string; icon: string }> = [
  { id: 'all', label: 'All communications', icon: 'layers' },
  { id: 'messages', label: 'Messages', icon: 'message' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'calls', label: 'Calls', icon: 'phone' },
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'voicemail', label: 'Voicemail', icon: 'voicemail' },
  { id: 'timeline', label: 'Timeline', icon: 'timeline' },
];

const templates = [
  { title: 'Medication instruction', category: 'Medication', body: 'Please take this medication exactly as directed. Contact the care team if side effects occur.' },
  { title: 'Lab result follow-up', category: 'Lab', body: 'Your result has been reviewed. Please contact the clinic if your symptoms change or continue.' },
  { title: 'Request more information', category: 'General', body: 'Please send the additional details so the care team can review your question safely.' },
  { title: 'Emergency guidance', category: 'Safety', body: 'This service is not for emergencies. For urgent or life-threatening symptoms, contact emergency services.' },
];

function Icon({ name, size = 17 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    inbox: <><path d="M4 5h16v12H4z" /><path d="M4 13h4l1.5 2h5L16 13h4" /></>,
    send: <><path d="M3 11 21 3l-8 18-2-8-8-2z" /><path d="m11 13 4-4" /></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 6 4 4" /></>,
    clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
    task: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 2 2 5-5M8 8h3M8 17h8" /></>,
    alert: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    phone: <><path d="M6 3h3l2 5-2 1.5a13 13 0 0 0 5.5 5.5L16 13l5 2v3c0 1.1-.9 2-2 2C10.2 20 4 13.8 4 5c0-1.1.9-2 2-2z" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></>,
    voicemail: <><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><path d="M8 15h8M5 18h14" /></>,
    warning: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    archive: <><path d="M4 7h16v13H4zM3 4h18v3H3z" /><path d="M9 12h6" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    message: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    timeline: <><path d="M6 4v16M6 8h5M6 15h8" /><circle cx="17" cy="8" r="2" /><circle cx="17" cy="15" r="2" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    shield: <><path d="M12 3 19 6v5c0 4-2.5 7.2-7 10-4.5-2.8-7-6-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    attachment: <><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4.5a3.5 3.5 0 0 1 5 5L9.5 18a2 2 0 0 1-3-3L15 6.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    sparkle: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4z" /><path d="m19 16 .5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.message}</svg>;
}

function formatTime(value?: string) {
  if (!value) return 'Time not documented';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time not documented';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatLongTime(value?: string) {
  if (!value) return 'Time not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time not documented' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function callEventDescription(call: CommunicationCall) {
  if (call.state === 'failed') return call.errorDetail || 'The call provider could not complete the request.';
  if (call.state === 'connected') return 'Call connected.';
  if (['created', 'dialing', 'ringing', 'connecting', 'reconnecting'].includes(call.state)) return 'Call request accepted by the provider.';
  return 'Call event recorded.';
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function previewParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  const asUser = searchParams.get('asUser');
  const patientId = searchParams.get('patientId');
  if (asUser) params.set('asUser', asUser);
  if (patientId) params.set('patientId', patientId);
  return params;
}

function withQuery(path: string, query: string) {
  return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
}

function modeFromSearchParams(searchParams: URLSearchParams, fallback: CommunicationHubMode) {
  if (searchParams.get('view') === 'timeline') return 'timeline' as const;
  switch (searchParams.get('channel')) {
    case 'messages':
    case 'secure_message': return 'messages' as const;
    case 'email': return 'email' as const;
    case 'calls':
    case 'call': return 'calls' as const;
    case 'video': return 'video' as const;
    case 'voicemail': return 'voicemail' as const;
    default: return fallback;
  }
}

function folderFromSearchParams(searchParams: URLSearchParams): Folder {
  const requested = searchParams.get('folder');
  return folders.find((item) => item.id === requested)?.id || 'inbox';
}

function filterConversations(conversations: readonly ConversationSummary[], mode: CommunicationHubMode, folder: Folder, query: string) {
  const normalized = query.trim().toLowerCase();
  return conversations.filter((item) => {
    if (mode === 'messages' && !item.channels.includes('secure_message')) return false;
    if (mode === 'email' && !item.channels.includes('email')) return false;
    if (mode === 'calls' && item.callCount === 0) return false;
    if (mode === 'video') return false;
    if (mode === 'voicemail' && item.voicemailCount === 0) return false;
    if (folder === 'drafts') return false;
    if (folder === 'sent' && item.unread) return false;
    if (folder === 'awaitingResponse' && !item.awaitingResponse) return false;
    if (folder === 'needsAction' && !item.actionRequired) return false;
    if (folder === 'urgent' && !['urgent', 'asap', 'stat'].includes(item.priority)) return false;
    if (folder === 'calls' && item.callCount === 0) return false;
    if (folder === 'voicemail' && item.voicemailCount === 0) return false;
    if (folder === 'deliveryIssues' && !item.deliveryIssue) return false;
    if (folder === 'archived' && item.state !== 'archived') return false;
    if (folder === 'inbox' && item.state === 'archived') return false;
    return !normalized || [item.participantName, item.patientName, item.topic, item.preview, item.category].filter(Boolean).join(' ').toLowerCase().includes(normalized);
  });
}
function syncCommunicationUrl(mode: CommunicationHubMode, folder: Folder, conversationId: string | null, search: string) {
  const params = new URLSearchParams(window.location.search);
  params.delete('channel');
  params.delete('view');
  params.delete('folder');
  params.delete('conversation');
  params.delete('conversationId');
  params.delete('q');
  if (mode === 'timeline') params.set('view', 'timeline');
  else if (mode !== 'all') params.set('channel', mode === 'messages' ? 'secure_message' : mode === 'calls' ? 'call' : mode);
  if (folder !== 'inbox') params.set('folder', folder);
  if (conversationId) params.set('conversationId', conversationId);
  if (search.trim()) params.set('q', search.trim());
  const query = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

function getErrorMessage(payload: Envelope<unknown>, fallback: string) {
  return payload.error || (payload as { detail?: string }).detail || fallback;
}

function responseError(payload: Envelope<unknown>, fallback: string) {
  const error = new Error(getErrorMessage(payload, fallback)) as Error & { code?: string };
  error.code = payload.code;
  return error;
}

function draftStatusText(state: DraftSaveState) {
  if (state === 'saving') return 'Saving draft…';
  if (state === 'saved') return 'Draft saved';
  if (state === 'error') return 'Draft could not be saved';
  return 'Draft will save as you type';
}

function newIdempotencyKey(scope: string) {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function draftRequestPayload(composer: ComposerState) {
  return {
    id: composer.draftId,
    revision: composer.draftRevision,
    conversationId: composer.conversationId || undefined,
    patientId: composer.patientId || undefined,
    recipientId: composer.isInternalNote ? undefined : composer.recipientId || undefined,
    channel: composer.channel,
    subject: composer.subject,
    bodyText: composer.bodyText,
    category: composer.category,
    priority: composer.priority,
    requiresAcknowledgement: composer.requiresAcknowledgement,
    isInternalNote: composer.isInternalNote,
    attachmentIds: composer.attachments.map((attachment) => attachment.id),
  };
}

function draftContentFingerprint(composer: ComposerState) {
  return JSON.stringify({ ...draftRequestPayload(composer), revision: undefined });
}

function preferredManualDeliveryId(conversation: CommunicationConversationView | null) {
  return conversation?.deliveries.find((item) => ['queued', 'deferred', 'retry_scheduled', 'failed_transient', 'failed_permanent', 'bounced', 'policy_blocked'].includes(item.state))?.id || conversation?.deliveries[0]?.id || null;
}

function statusTone(value: string) {
  if (['urgent', 'asap', 'stat', 'failed_permanent', 'bounced'].includes(value)) return 'coral';
  if (['queued', 'deferred', 'retry_scheduled', 'awaiting_action', 'awaiting_response', 'action_required'].includes(value)) return 'amber';
  if (['delivered_to_inbox', 'read', 'acknowledged', 'resolved', 'completed', 'up'].includes(value)) return 'green';
  if (['email_server_accepted', 'secure_message', 'email'].includes(value)) return 'blue';
  return 'slate';
}

function StatusBadge({ value, prefix }: { value: string; prefix?: string }) {
  return <span className={`communication-hub-badge is-${statusTone(value)}`}>{prefix ? `${prefix} ` : ''}{label(value)}</span>;
}

function ConversationRow({ item, selected, onSelect }: { item: ConversationSummary; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`communication-hub-conversation-row ${selected ? 'is-selected' : ''} ${item.unread ? 'is-unread' : ''}`} onClick={onSelect} aria-pressed={selected}>
    <span className={`communication-hub-avatar tone-${statusTone(item.category.toLowerCase())}`}>{initials(item.participantName)}</span>
    <span className="communication-hub-row-copy"><span className="communication-hub-row-top"><strong>{item.participantName}</strong><time dateTime={item.lastActivityAt}>{formatTime(item.lastActivityAt)}</time></span><span className="communication-hub-row-topic">{item.topic}</span><span className="communication-hub-row-meta">{item.patientName || 'Administrative'} ? {item.category}</span><span className="communication-hub-row-preview">{item.preview}</span><span className="communication-hub-row-badges">{item.unread && <StatusBadge value="urgent" prefix="Unread" />}{item.actionRequired && <StatusBadge value="action_required" prefix="Action" />}{item.deliveryIssue && <StatusBadge value="deferred" prefix="Delivery" />}</span></span>
  </button>;
}

function DraftRow({ draft, onResume }: { draft: CommunicationDraft; onResume: () => void }) {
  return <button type="button" className="communication-hub-conversation-row" onClick={onResume}>
    <span className="communication-hub-avatar tone-slate"><Icon name="edit" size={16} /></span>
    <span className="communication-hub-row-copy"><span className="communication-hub-row-top"><strong>{draft.subject || 'Untitled draft'}</strong><time dateTime={draft.updatedAt}>{formatTime(draft.updatedAt)}</time></span><span className="communication-hub-row-topic">{draft.isInternalNote ? 'Internal note' : label(draft.channel)}</span><span className="communication-hub-row-meta">{draft.patientId ? 'Patient context selected' : 'No patient context'} ? {draft.category}</span><span className="communication-hub-row-preview">{draft.bodyText || 'No message text yet'}</span><span className="communication-hub-row-badges">{draft.attachments.length > 0 && <StatusBadge value="secure_message" prefix={`${draft.attachments.length} attachment${draft.attachments.length === 1 ? '' : 's'}`} />}</span></span>
  </button>;
}

function MessageCard({ message, actorId, onAcknowledge, onCreateTask }: { message: CommunicationMessage; actorId: string; onAcknowledge: () => void; onCreateTask: () => void }) {
  const own = message.sender.id === actorId;
  const acknowledged = message.acknowledgements.some((acknowledgement) => acknowledgement.actor.id === actorId);
  return <article className={`communication-hub-message ${own ? 'is-own' : 'is-other'} ${message.isInternalNote ? 'is-internal' : ''}`}>
    <div className="communication-hub-message-head"><span className="communication-hub-avatar small">{initials(message.sender.name)}</span><span><strong>{message.sender.name}</strong><span>{message.sender.role} ? {formatLongTime(message.sentAt || message.receivedAt || message.createdAt)}</span></span>{message.isInternalNote && <StatusBadge value="action_required" prefix="Internal note" />}</div>
    <div className="communication-hub-message-body">{message.bodyText}</div>
    {message.attachments.length > 0 && <div className="communication-hub-message-attachments">{message.attachments.map((attachment) => <span key={attachment.id}><Icon name="attachment" size={14} /> {attachment.filename} <small>{label(attachment.scanState)}</small></span>)}</div>}
    <div className="communication-hub-message-actions">{message.requiresAcknowledgement && !own && !acknowledged && <button type="button" onClick={onAcknowledge}><Icon name="check" size={14} /> Acknowledge</button>}{acknowledged && <span className="communication-hub-read-state"><Icon name="check" size={13} /> Acknowledged</span>}{message.actionRequired && <button type="button" onClick={onCreateTask}><Icon name="task" size={14} /> Create task</button>}{own && <span className="communication-hub-read-state">{message.readBy.length > 1 ? 'Read' : 'Accepted by Roshi'}</span>}</div>
  </article>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="communication-hub-modal-backdrop" role="presentation"><section className="communication-hub-modal" role="dialog" aria-modal="true" aria-labelledby="communication-modal-title"><header><div><span className="communication-hub-kicker">Communication Hub</span><h2 id="communication-modal-title">{title}</h2></div><button type="button" className="communication-hub-icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></header>{children}</section></div>;
}

export default function UnifiedCommunicationHub({ initialData, initialMode = 'all' }: Props) {
  const searchParams = useSearchParams();
  const previewKey = previewParams(searchParams).toString();
  const patientScopeId = searchParams.get('patientId') || '';
  const initialUrlMode = modeFromSearchParams(searchParams, initialMode);
  const [snapshot, setSnapshot] = useState(initialData);
  const [mode, setMode] = useState<CommunicationHubMode>(initialUrlMode);
  const [folder, setFolder] = useState<Folder>(() => folderFromSearchParams(searchParams));
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [selectedId, setSelectedId] = useState(() => searchParams.get('conversationId') || searchParams.get('conversation') || initialData.conversations[0]?.id || null);
  const [conversation, setConversation] = useState<CommunicationConversationView | null>(null);
  const [composerOpen, setComposerOpen] = useState(searchParams.get('new') === '1');
  const [composer, setComposer] = useState<ComposerState>({ draftId: newIdempotencyKey('communication-draft'), draftRevision: 0, conversationId: null, recipientId: initialData.directory.find((entry) => entry.type === 'organization')?.id || initialData.directory[0]?.id || '', patientId: patientScopeId || 'patient-001', subject: '', bodyText: '', category: 'General', priority: 'routine', channel: 'secure_message', requiresAcknowledgement: false, isInternalNote: false, attachments: [] });
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(initialUrlMode === 'timeline');
  const [busy, setBusy] = useState<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('idle');
  const [draftConflict, setDraftConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Follow up on communication');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [manualMethod, setManualMethod] = useState('Phone');
  const [manualConfirmedWith, setManualConfirmedWith] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [taskSourceMessageId, setTaskSourceMessageId] = useState<string | null>(null);
  const [manualDeliveryId, setManualDeliveryId] = useState<string | null>(null);
  const [callRecipientId, setCallRecipientId] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [pendingAttachmentCount, setPendingAttachmentCount] = useState(0);
  const sendIdempotencyKeyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const actionIdempotencyKeysRef = useRef<Record<string, string>>({});
  const autosaveInFlightRef = useRef(false);
  const autosaveQueuedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef<{ id: string; contentFingerprint: string; revision: number } | null>(null);
  const [autosaveGeneration, setAutosaveGeneration] = useState(0);

  function actionIdempotencyKey(operation: string) {
    return actionIdempotencyKeysRef.current[operation] ||= newIdempotencyKey('communication-action');
  }

  function clearActionIdempotencyKey(operation: string) {
    delete actionIdempotencyKeysRef.current[operation];
  }

  function clearScheduledAutosave() {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }

  function composerFromDraft(draft: CommunicationDraft): ComposerState {
    return { draftId: draft.id, draftRevision: draft.revision, conversationId: draft.conversationId || null, recipientId: draft.isInternalNote ? '' : draft.recipientId || snapshot.directory.find((entry) => entry.type === 'organization')?.id || '', patientId: draft.patientId || '', subject: draft.subject, bodyText: draft.bodyText, category: draft.category, priority: draft.priority, channel: draft.channel === 'email' ? 'email' : 'secure_message', requiresAcknowledgement: draft.requiresAcknowledgement, isInternalNote: draft.isInternalNote, attachments: draft.attachments };
  }

  function restoreSavedDraft(draft: CommunicationDraft) {
    const restoredComposer = composerFromDraft(draft);
    setComposer(restoredComposer);
    lastSavedDraftRef.current = { id: draft.id, contentFingerprint: draftContentFingerprint(restoredComposer), revision: draft.revision };
    setDraftConflict(false);
    setDraftSaveState('saved');
  }

  async function reloadConflictedDraft() {
    setBusy('draft-recovery');
    try {
      const response = await fetch(withQuery('/api/communication/v1/drafts', previewKey), { cache: 'no-store' });
      const payload = await response.json() as Envelope<CommunicationDraft[]>;
      if (!response.ok || !payload.data) throw responseError(payload, 'The latest saved draft could not be loaded.');
      const savedDraft = payload.data.find((draft) => draft.id === composer.draftId);
      if (!savedDraft) throw new Error('The saved draft is no longer available in this patient context. Save your local work as a new draft.');
      restoreSavedDraft(savedDraft);
      setError(null);
      setNotice('Reloaded the latest saved draft.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The latest saved draft could not be loaded.');
    } finally {
      setBusy(null);
    }
  }

  function saveConflictAsNewDraft() {
    clearScheduledAutosave();
    autosaveQueuedRef.current = false;
    lastSavedDraftRef.current = null;
    setComposer((current) => ({ ...current, draftId: newIdempotencyKey('communication-draft'), draftRevision: 0 }));
    setDraftConflict(false);
    setDraftSaveState('idle');
    setError(null);
    setNotice('Your local edits are now a new draft and will save automatically.');
  }

  function renderDraftConflictRecovery() {
    if (!draftConflict) return null;
    return <div className="communication-hub-draft-conflict" role="alert"><strong>This draft changed in another session.</strong><span>Your local edits remain open. Reload the saved version or save your edits as a separate draft before sending.</span><div><button type="button" className="communication-hub-secondary-button" onClick={() => void reloadConflictedDraft()} disabled={busy === 'draft-recovery'}>Reload saved draft</button><button type="button" className="communication-hub-secondary-button" onClick={saveConflictAsNewDraft} disabled={busy === 'draft-recovery'}>Save local copy</button></div></div>;
  }

  const visibleConversationItems = filterConversations(snapshot.conversations, mode, folder, query);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleDrafts = snapshot.drafts.filter((draft) => !normalizedQuery || [draft.subject, draft.bodyText, draft.category].join(' ').toLowerCase().includes(normalizedQuery));
  const effectiveSelectedId = folder === 'drafts' || selectedId === null ? null : selectedId && visibleConversationItems.some((item) => item.id === selectedId) ? selectedId : visibleConversationItems[0]?.id || null;
  const selectedSummary = snapshot.conversations.find((item) => item.id === effectiveSelectedId);
  const patientDirectory = snapshot.directory.filter((entry) => entry.type === 'patient');
  const selectedManualDeliveryId = manualDeliveryId || preferredManualDeliveryId(conversation);
  const activeCallSignature = conversation?.calls.filter((call) => ['created', 'waiting_room', 'dialing', 'ringing', 'connecting', 'connected', 'reconnecting', 'on_hold', 'transferring', 'conferencing', 'ending'].includes(call.state)).map((call) => `${call.id}:${call.state}`).join('|') || '';

  useEffect(() => {
    syncCommunicationUrl(mode, folder, effectiveSelectedId, query);
  }, [mode, folder, effectiveSelectedId, query]);

  const selectedRecipient = snapshot.directory.find((entry) => entry.id === composer.recipientId);


  useEffect(() => {
    if (!effectiveSelectedId) return;
    const controller = new AbortController();
    fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      const payload = await response.json() as Envelope<CommunicationConversationView>;
      if (!response.ok || !payload.data) throw new Error(getErrorMessage(payload, 'The conversation could not be loaded.'));
      setConversation(payload.data);
      const lastIncoming = [...payload.data.messages].reverse().find((message) => message.sender.id !== initialData.actor.id && !message.readBy.includes(initialData.actor.id));
      if (lastIncoming) {
        const readResponse = await fetch(withQuery(`/api/communication/v1/messages/${encodeURIComponent(lastIncoming.id)}/read`, previewKey), { method: 'POST' });
        if (readResponse.ok) {
          const inboxResponse = await fetch(withQuery('/api/communication/v1/inbox', previewKey), { cache: 'no-store' });
          const inboxPayload = await inboxResponse.json() as Envelope<CommunicationHubSnapshot>;
          if (inboxResponse.ok && inboxPayload.data) setSnapshot(inboxPayload.data);
        }
      }
    }).catch((caught: unknown) => { if ((caught as { name?: string }).name !== 'AbortError') setError(caught instanceof Error ? caught.message : 'The conversation could not be loaded.'); }).finally(() => setBusy(null));
    return () => controller.abort();
  }, [effectiveSelectedId, previewKey, initialData.actor.id]);

  useEffect(() => {
    if (!effectiveSelectedId || !activeCallSignature) return;
    let disposed = false;
    const refreshActiveCall = async () => {
      try {
        const response = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
        const payload = await response.json() as Envelope<CommunicationConversationView>;
        if (!disposed && response.ok && payload.data) setConversation(payload.data);
      } catch {
        // Keep displaying the latest authoritative state until the next refresh.
      }
    };
    const interval = window.setInterval(() => { void refreshActiveCall(); }, 1_000);
    return () => { disposed = true; window.clearInterval(interval); };
  }, [activeCallSignature, effectiveSelectedId, previewKey]);

  useEffect(() => {
    if (!composerOpen || draftConflict) return;
    const contentFingerprint = draftContentFingerprint(composer);
    const persisted = lastSavedDraftRef.current;
    if (persisted?.id === composer.draftId && persisted.contentFingerprint === contentFingerprint && persisted.revision === composer.draftRevision) return;
    if (autosaveInFlightRef.current) {
      autosaveQueuedRef.current = true;
      return;
    }
    setDraftSaveState('idle');
    const draftToSave = composer;
    const timer = window.setTimeout(() => {
      if (autosaveTimerRef.current === timer) autosaveTimerRef.current = null;
      void (async () => {
        if (autosaveInFlightRef.current) { autosaveQueuedRef.current = true; return; }
        autosaveInFlightRef.current = true;
        try {
          setDraftSaveState('saving');
          const response = await fetch(withQuery('/api/communication/v1/drafts', previewKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draftRequestPayload(draftToSave)) });
          const payload = await response.json() as Envelope<CommunicationDraft>;
          if (!response.ok || !payload.data) throw responseError(payload, 'The draft could not be saved.');
          lastSavedDraftRef.current = { id: draftToSave.draftId, contentFingerprint, revision: payload.data.revision };
          setComposer((current) => current.draftId === draftToSave.draftId && current.draftRevision === draftToSave.draftRevision ? { ...current, draftRevision: payload.data!.revision } : current);
          setDraftConflict(false);
          setDraftSaveState('saved');
        } catch (caught) {
          setDraftSaveState('error');
          if ((caught as { code?: string }).code === 'DRAFT_VERSION_CONFLICT') {
            setDraftConflict(true);
            setReviewOpen(false);
            setError('This draft changed in another session. Reload it or save your local edits as a new draft.');
          } else {
            setError(caught instanceof Error ? caught.message : 'The draft could not be saved.');
          }
        } finally {
          autosaveInFlightRef.current = false;
          if (autosaveQueuedRef.current) { autosaveQueuedRef.current = false; setAutosaveGeneration((generation) => generation + 1); }
        }
      })();
    }, 700);
    autosaveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (autosaveTimerRef.current === timer) autosaveTimerRef.current = null;
    };
  }, [composerOpen, composer, previewKey, autosaveGeneration, draftConflict]);

  async function refresh(showNotice = true) {
    setBusy('refresh');
    setError(null);
    try {
      // Keep the client-side search reversible: a refresh must not replace the full
      // snapshot with an already-filtered server response.
      const response = await fetch(withQuery('/api/communication/v1/inbox', previewKey), { cache: 'no-store' });
      const payload = await response.json() as Envelope<CommunicationHubSnapshot>;
      if (!response.ok || !payload.data) throw new Error(getErrorMessage(payload, 'The Communication Hub could not be refreshed.'));
      setSnapshot(payload.data);
      if (showNotice) setNotice('Communication Hub refreshed.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The Communication Hub could not be refreshed.'); } finally { setBusy(null); }
  }

  async function submitMessage() {
    if (pendingAttachmentCount > 0) { setError('Wait for selected attachments to finish validation before sending.'); return; }
    if (!composer.bodyText.trim() || !composer.subject.trim() || (!composer.isInternalNote && !composer.recipientId)) return;
    if (draftConflict) { setReviewOpen(false); setError('Resolve the draft conflict before sending this communication.'); return; }
    if (autosaveInFlightRef.current) { setError('Your latest draft changes are still saving. Wait for the save to finish, then send.'); return; }
    clearScheduledAutosave();
    autosaveQueuedRef.current = false;
    setBusy('send');
    setError(null);
    const targetConversationId = composer.conversationId;
    const fingerprint = JSON.stringify({ conversationId: targetConversationId, recipientId: composer.recipientId, patientId: composer.patientId, subject: composer.subject, bodyText: composer.bodyText, category: composer.category, priority: composer.priority, channel: composer.channel, requiresAcknowledgement: composer.requiresAcknowledgement, isInternalNote: composer.isInternalNote, attachmentIds: composer.attachments.map((attachment) => attachment.id) });
    const retry = sendIdempotencyKeyRef.current;
    const key = retry?.fingerprint === fingerprint ? retry.key : newIdempotencyKey('communication-message');
    sendIdempotencyKeyRef.current = { fingerprint, key };
    const path = targetConversationId ? `/api/communication/v1/conversations/${encodeURIComponent(targetConversationId)}` : '/api/communication/v1/conversations';
    const commonPayload = { recipientId: composer.isInternalNote ? undefined : composer.recipientId, subject: composer.subject, bodyText: composer.bodyText, category: composer.category, priority: composer.priority, channel: composer.channel, requiresAcknowledgement: composer.requiresAcknowledgement, isInternalNote: composer.isInternalNote, attachmentIds: composer.attachments.map((attachment) => attachment.id), draftId: composer.draftId, idempotencyKey: key };
    const payloadBody = targetConversationId ? commonPayload : { ...commonPayload, patientId: composer.patientId || undefined };
    try {
      const response = await fetch(withQuery(path, previewKey), { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payloadBody) });
      const result = await response.json() as Envelope<{ id?: string }>;
      if (!response.ok) throw new Error(getErrorMessage(result, 'The message could not be sent. Your draft is saved.'));
      sendIdempotencyKeyRef.current = null;
      lastSavedDraftRef.current = null;
      setComposer((current) => ({ ...current, bodyText: '', subject: '' }));
      setComposerOpen(false);
      setReviewOpen(false);
      setNotice(composer.channel === 'email' ? 'Message accepted locally. Email delivery remains queued until a provider is configured.' : composer.isInternalNote ? 'Internal note recorded locally.' : 'Message accepted locally; external delivery remains queued.');
      await refresh(false);
      const resultingConversationId = targetConversationId || result.data?.id;
      if (resultingConversationId) {
        setSelectedId(resultingConversationId);
        try {
        const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(resultingConversationId)}`, previewKey), { cache: 'no-store' });
        const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
          if (!detailResponse.ok || !detail.data) throw new Error('Conversation detail refresh failed.');
          setConversation(detail.data);
        } catch {
          setNotice('Message accepted locally. Conversation details could not be refreshed; use Refresh to reload them.');
        }
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The message could not be sent. Your draft is saved.'); } finally { setBusy(null); }
  }

  async function uploadAttachment(file: File) {
    setPendingAttachmentCount((count) => count + 1);
    setBusy('attachment');
    setError(null);
    try {
      const response = await fetch(withQuery('/api/communication/v1/attachments/presign', previewKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size, patientId: composer.patientId || undefined }) });
      const payload = await response.json() as Envelope<{ attachment: CommunicationAttachment }>;
      if (!response.ok || !payload.data?.attachment) throw new Error(getErrorMessage(payload, 'The attachment could not be validated.'));
      setComposer((current) => ({ ...current, attachments: [...current.attachments, payload.data!.attachment] }));
      setNotice(`${file.name} passed local metadata policy checks; content scanning is not configured.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The attachment could not be validated.'); } finally { setPendingAttachmentCount((count) => Math.max(0, count - 1)); setBusy(null); }
  }

  async function attachChartReference() {
    if (!composer.patientId) { setError('Select a patient before attaching chart context.'); return; }
    setPendingAttachmentCount((count) => count + 1);
    setBusy('attachment');
    try {
      const response = await fetch(withQuery('/api/communication/v1/attachments/presign', previewKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'patient-context-reference.json', contentType: 'application/json', sizeBytes: 0, patientId: composer.patientId, source: { resourceType: 'Patient', resourceId: composer.patientId, display: 'Selected patient context' } }) });
      const payload = await response.json() as Envelope<{ attachment: CommunicationAttachment }>;
      if (!response.ok || !payload.data?.attachment) throw new Error(getErrorMessage(payload, 'Chart context could not be attached.'));
      setComposer((current) => ({ ...current, attachments: [...current.attachments, payload.data!.attachment] }));
      setNotice('Exact patient context reference attached.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Chart context could not be attached.'); } finally { setPendingAttachmentCount((count) => Math.max(0, count - 1)); setBusy(null); }
  }

  async function acknowledge(message: CommunicationMessage) {
    setBusy(`ack-${message.id}`);
    const operation = `ack:${message.id}`;
    const key = actionIdempotencyKey(operation);
    try {
      const response = await fetch(withQuery(`/api/communication/v1/messages/${encodeURIComponent(message.id)}/acknowledgements`, previewKey), { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ idempotencyKey: key }) });
      const payload = await response.json() as Envelope<CommunicationConversation>;
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Acknowledgement could not be recorded.'));
      setNotice('Acknowledgement recorded.');
      if (effectiveSelectedId) {
        const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
        const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
        if (detail.data) setConversation(detail.data);
      }
      clearActionIdempotencyKey(operation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Acknowledgement could not be recorded.'); } finally { setBusy(null); }
  }

  async function createTask() {
    const sourceMessage = taskSourceMessageId ? conversation?.messages.find((message) => message.id === taskSourceMessageId) : undefined;
    if (!conversation || (taskSourceMessageId && !sourceMessage) || !taskTitle.trim()) return;
    setBusy('task');
    const operation = `task:${sourceMessage?.id || conversation.id}:${taskTitle.trim()}:${taskDueAt}:${conversation.priority}`;
    const key = actionIdempotencyKey(operation);
    try {
      const path = sourceMessage ? `/api/communication/v1/messages/${encodeURIComponent(sourceMessage.id)}/tasks` : `/api/communication/v1/conversations/${encodeURIComponent(conversation.id)}/tasks`;
      const response = await fetch(withQuery(path, previewKey), { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ idempotencyKey: key, title: taskTitle, dueAt: taskDueAt || undefined, priority: conversation.priority }) });
      const payload = await response.json() as Envelope<unknown>;
      if (!response.ok) throw new Error(getErrorMessage(payload, 'The task could not be created.'));
      setTaskOpen(false);
      setTaskSourceMessageId(null);
      setNotice('Task created and linked to this communication.');
      if (effectiveSelectedId) {
        const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
        const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
        if (detail.data) setConversation(detail.data);
      }
      clearActionIdempotencyKey(operation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The task could not be created.'); } finally { setBusy(null); }
  }

  function openManualConfirmation(deliveryId?: string) {
    const delivery = deliveryId ? conversation?.deliveries.find((item) => item.id === deliveryId) : selectedManualDeliveryId ? conversation?.deliveries.find((item) => item.id === selectedManualDeliveryId) : undefined;
    if (!delivery) { setError('This conversation has no delivery record available for manual confirmation.'); return; }
    setManualDeliveryId(delivery.id);
    setManualOpen(true);
  }

  async function recordManualConfirmation() {
    const delivery = selectedManualDeliveryId ? conversation?.deliveries.find((item) => item.id === selectedManualDeliveryId) : undefined;
    const sourceMessage = delivery ? conversation?.messages.find((message) => message.id === delivery.messageId) : undefined;
    if (!delivery || !sourceMessage || !manualConfirmedWith.trim() || !manualNote.trim()) return;
    setBusy('manual');
    const operation = `manual:${delivery.id}:${sourceMessage.id}:${manualMethod}:${manualConfirmedWith.trim()}:${manualNote.trim()}`;
    const key = actionIdempotencyKey(operation);
    try {
      const response = await fetch(withQuery(`/api/communication/v1/messages/${encodeURIComponent(sourceMessage.id)}/manual-delivery-confirmations`, previewKey), { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ idempotencyKey: key, deliveryId: delivery.id, method: manualMethod, confirmedWith: manualConfirmedWith, note: manualNote }) });
      const payload = await response.json() as Envelope<unknown>;
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Manual confirmation could not be recorded.'));
      setManualOpen(false);
      setManualDeliveryId(null);
      setManualConfirmedWith('');
      setManualNote('');
      setNotice('Manual delivery confirmation recorded without changing machine delivery truth.');
      if (effectiveSelectedId) {
        const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
        const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
        if (detail.data) setConversation(detail.data);
      }
      clearActionIdempotencyKey(operation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Manual confirmation could not be recorded.'); } finally { setBusy(null); }
  }

  async function resolveConversation() {
    if (!effectiveSelectedId) return;
    setBusy('resolve');
    const action = conversation?.state === 'resolved' ? 'close' : 'resolve';
    const operation = `resolve:${effectiveSelectedId}:${action}`;
    const key = actionIdempotencyKey(operation);
    try {
      const response = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { method: 'PATCH', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ action, idempotencyKey: key }) });
      const payload = await response.json() as Envelope<unknown>;
      if (!response.ok) throw new Error(getErrorMessage(payload, 'The conversation could not be updated.'));
      setNotice(conversation?.state === 'resolved' ? 'Conversation closed.' : 'Conversation marked resolved.');
      await refresh(false);
      const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
      const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
      if (detail.data) setConversation(detail.data);
      clearActionIdempotencyKey(operation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The conversation could not be updated.'); } finally { setBusy(null); }
  }

  async function startCall() {
    if (!effectiveSelectedId) return;
    if (conversation && ['closed', 'archived'].includes(conversation.state)) { setError('Closed or archived conversations cannot start a new call.'); return; }
    const recipientCandidates = conversation?.participants.filter((participant) => participant.id !== snapshot.actor.id) || [];
    const recipientId = recipientCandidates.length === 1 ? recipientCandidates[0]!.id : recipientCandidates.find((participant) => participant.id === callRecipientId)?.id;
    if (!recipientId) { setError('Select one conversation participant before attempting a call.'); return; }
    setBusy('call');
    setError(null);
    setNotice('Initiating call...');
    const operation = `call:${effectiveSelectedId}:${conversation?.patientId || ''}:${recipientId || ''}:${callType}`;
    const key = actionIdempotencyKey(operation);
    try {
      const response = await fetch(withQuery('/api/communication/v1/calls', previewKey), { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ idempotencyKey: key, conversationId: effectiveSelectedId, patientId: conversation?.patientId, recipientId, callType }) });
      const payload = await response.json() as Envelope<{ state: string; errorCode?: string }>;
      if (!response.ok) throw new Error(getErrorMessage(payload, 'The call could not be started.'));
      setNotice(payload.data?.state === 'connected' ? 'Call connected.' : 'Calling. The provider accepted the request.');
      await refresh(false);
      const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
      const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
      if (detail.data) setConversation(detail.data);
      clearActionIdempotencyKey(operation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The call could not be started.'); } finally { setBusy(null); }
  }

  async function updateVoicemail(action: 'review' | 'callback' | 'resolve', voicemailId: string) {
    setBusy(`voicemail-${voicemailId}`);
    const operation = `voicemail:${voicemailId}:${action}`;
    const key = actionIdempotencyKey(operation);
    try {
      const response = await fetch(withQuery(`/api/communication/v1/voicemails/${encodeURIComponent(voicemailId)}`, previewKey), { method: 'PATCH', headers: { 'content-type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ action, idempotencyKey: key }) });
      const payload = await response.json() as Envelope<unknown>;
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Voicemail could not be updated.'));
      setNotice(action === 'callback' ? 'Callback requested.' : `Voicemail ${action}d.`);
      if (effectiveSelectedId) {
        const detailResponse = await fetch(withQuery(`/api/communication/v1/conversations/${encodeURIComponent(effectiveSelectedId)}`, previewKey), { cache: 'no-store' });
        const detail = await detailResponse.json() as Envelope<CommunicationConversationView>;
        if (detail.data) setConversation(detail.data);
      }
      clearActionIdempotencyKey(operation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Voicemail could not be updated.'); } finally { setBusy(null); }
  }

  function openComposer(options: { isInternalNote?: boolean } = {}) {
    if (composerOpen) { setNotice('Save and close the current draft before changing its conversation context.'); return; }
    if (conversation && ['closed', 'archived'].includes(conversation.state)) { setError('Closed or archived conversations cannot accept a new message or internal note.'); return; }
    const recipient = conversation?.participants.filter((participant) => participant.id !== snapshot.actor.id).map((participant) => snapshot.directory.find((entry) => entry.id === participant.id)).find(Boolean) || (selectedSummary ? snapshot.directory.find((entry) => entry.name === selectedSummary.participantName) : snapshot.directory.find((entry) => entry.type === 'organization'));
    const conversationId = conversation?.id === effectiveSelectedId ? effectiveSelectedId : null;
    setComposer((current) => ({ ...current, draftId: newIdempotencyKey('communication-draft'), draftRevision: 0, conversationId, recipientId: options.isInternalNote ? '' : recipient?.id || current.recipientId, patientId: conversation?.patientId || current.patientId, subject: conversation?.topic || '', bodyText: '', category: conversation?.category || 'General', priority: conversation?.priority || 'routine', isInternalNote: options.isInternalNote === true, attachments: [] }));
    lastSavedDraftRef.current = null;
    setDraftConflict(false);
    setDraftSaveState('idle');
    setComposerOpen(true);
  }

  function openNewComposer() {
    if (composerOpen) { setNotice('Save and close the current draft before starting another communication.'); return; }
    setSelectedId(null);
    setConversation(null);
    setMode('all');
    setTimelineOpen(false);
    setComposer({ draftId: newIdempotencyKey('communication-draft'), draftRevision: 0, conversationId: null, recipientId: snapshot.directory.find((entry) => entry.type === 'organization')?.id || snapshot.directory[0]?.id || '', patientId: patientScopeId || patientDirectory[0]?.id || '', subject: '', bodyText: '', category: 'General', priority: 'routine', channel: 'secure_message', requiresAcknowledgement: false, isInternalNote: false, attachments: [] });
    lastSavedDraftRef.current = null;
    setDraftConflict(false);
    setDraftSaveState('idle');
    setComposerOpen(true);
  }

  async function saveDraftAndClose() {
    if (draftConflict) { setError('Reload the saved draft or save your local work as a new draft before closing.'); return; }
    if (autosaveInFlightRef.current) { setNotice('The latest draft changes are still saving. Select Save and close again when that save completes.'); return; }
    clearScheduledAutosave();
    autosaveQueuedRef.current = false;
    const draftToSave = composer;
    autosaveInFlightRef.current = true;
    setBusy('draft');
    setDraftSaveState('saving');
    try {
      const response = await fetch(withQuery('/api/communication/v1/drafts', previewKey), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draftRequestPayload(draftToSave)) });
      const payload = await response.json() as Envelope<CommunicationDraft>;
      if (!response.ok || !payload.data) throw responseError(payload, 'The draft could not be saved.');
      lastSavedDraftRef.current = { id: draftToSave.draftId, contentFingerprint: draftContentFingerprint(draftToSave), revision: payload.data.revision };
      setComposer((current) => current.draftId === draftToSave.draftId && current.draftRevision === draftToSave.draftRevision ? { ...current, draftRevision: payload.data!.revision } : current);
      setDraftConflict(false);
      setDraftSaveState('saved');
      setComposerOpen(false);
      await refresh(false);
      setNotice('Draft saved locally.');
    } catch (caught) {
      setDraftSaveState('error');
      if ((caught as { code?: string }).code === 'DRAFT_VERSION_CONFLICT') {
        setDraftConflict(true);
        setError('This draft changed in another session. Reload it or save your local edits as a new draft.');
      } else {
        setError(caught instanceof Error ? caught.message : 'The draft could not be saved.');
      }
    } finally {
      autosaveInFlightRef.current = false;
      setBusy(null);
    }
  }

  function resumeDraft(draft: CommunicationDraft) {
    if (composerOpen) { setNotice('Save and close the current draft before opening another one.'); return; }
    setMode('all');
    setFolder('inbox');
    setTimelineOpen(false);
    setSelectedId(draft.conversationId || null);
    setConversation(null);
    restoreSavedDraft(draft);
    setComposerOpen(true);
  }

  function draftContextIsLocked() {
    if (!composerOpen) return false;
    setNotice('Save and close the current draft before changing conversation, mode, folder, or search context.');
    return true;
  }

  function selectConversation(conversationId: string) {
    if (draftContextIsLocked()) return;
    setSelectedId(conversationId);
    setTimelineOpen(mode === 'timeline');
  }

  function selectMode(nextMode: CommunicationHubMode) {
    if (draftContextIsLocked()) return;
    setMode(nextMode);
    setTimelineOpen(nextMode === 'timeline');
  }

  function selectFolder(nextFolder: Folder) {
    if (draftContextIsLocked()) return;
    setFolder(nextFolder);
    if (nextFolder === 'drafts') { setSelectedId(null); setConversation(null); }
    void refresh();
  }

  function renderNewConversationComposer() {
    return <section className="communication-hub-composer">
      <form onSubmit={(event) => { event.preventDefault(); setReviewOpen(true); }}>
        <fieldset className="communication-hub-composer-fieldset" disabled={busy === 'draft' || busy === 'draft-recovery'}>
        <div className="communication-hub-composer-head"><div><span className="communication-hub-kicker">New communication</span><strong>Confirm the recipient and patient context before sending.</strong></div><button type="button" className="communication-hub-text-button" onClick={() => void saveDraftAndClose()}>Save and close</button></div>
        <div className="communication-hub-new-message-fields">
          <label>Recipient<select value={composer.recipientId} onChange={(event) => setComposer((current) => ({ ...current, recipientId: event.target.value }))} aria-label="Recipient"><option value="">Select a recipient</option>{snapshot.directory.filter((entry) => entry.id !== snapshot.actor.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.role || entry.type}</option>)}</select></label>
          <label>Patient context<select value={composer.patientId} onChange={(event) => setComposer((current) => ({ ...current, patientId: event.target.value }))} aria-label="Patient context" disabled={Boolean(patientScopeId)}><option value="">No patient context</option>{patientDirectory.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label>
          <label>Subject<input value={composer.subject} onChange={(event) => setComposer((current) => ({ ...current, subject: event.target.value }))} aria-label="Subject" placeholder="Communication subject" required /></label>
        </div>
        <textarea value={composer.bodyText} onChange={(event) => setComposer((current) => ({ ...current, bodyText: event.target.value }))} placeholder="Write a clear, patient-safe message..." aria-label="Message body" rows={5} />
        <div className="communication-hub-composer-toolbar"><label className="communication-hub-select-label">Channel<select value={composer.channel} onChange={(event) => setComposer((current) => ({ ...current, channel: event.target.value as ComposerState['channel'] }))}><option value="secure_message">Secure message</option><option value="email">Secure email</option></select></label><label className="communication-hub-select-label">Priority<select value={composer.priority} onChange={(event) => setComposer((current) => ({ ...current, priority: event.target.value as ComposerState['priority'] }))}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="asap">ASAP</option><option value="stat">STAT</option></select></label><button type="button" className="communication-hub-tool-button" onClick={() => setTemplatesOpen(true)}><Icon name="edit" size={14} /> Template</button><label className="communication-hub-tool-button"><Icon name="attachment" size={14} /> Attach<input type="file" multiple hidden disabled={pendingAttachmentCount > 0} onChange={(event) => { for (const file of Array.from(event.target.files || [])) void uploadAttachment(file); event.currentTarget.value = ''; }} /></label><button type="button" className="communication-hub-tool-button" onClick={() => void attachChartReference()} disabled={pendingAttachmentCount > 0}><Icon name="attachment" size={14} /> Chart reference</button></div>
        {composer.attachments.length > 0 && <div className="communication-hub-attachment-list">{composer.attachments.map((attachment) => <span key={attachment.id}><Icon name="attachment" size={13} /> {attachment.filename} <StatusBadge value={attachment.scanState} /><button type="button" onClick={() => setComposer((current) => ({ ...current, attachments: current.attachments.filter((item) => item.id !== attachment.id) }))} aria-label={`Remove ${attachment.filename}`}><Icon name="close" size={12} /></button></span>)}</div>}
        <div className="communication-hub-composer-foot"><span className={`communication-hub-draft-status is-${draftSaveState}`} role="status" aria-live="polite"><span className="communication-hub-live-dot" /> {pendingAttachmentCount > 0 ? 'Validating attachment…' : draftStatusText(draftSaveState)}</span><label className="communication-hub-check"><input type="checkbox" checked={composer.requiresAcknowledgement} onChange={(event) => setComposer((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} /> Require acknowledgement</label><button type="submit" className="communication-hub-primary-button" disabled={!composer.bodyText.trim() || !composer.subject.trim() || !composer.recipientId || busy === 'send' || pendingAttachmentCount > 0}><Icon name="send" size={15} /> Review and send</button></div>
        </fieldset>
      </form>
    </section>;
  }

  function visibleConversations() {
    return visibleConversationItems;
  }

  function renderThread() {
    if (composerOpen && composer.conversationId === null) return renderNewConversationComposer();
    if (mode === 'calls') return <TelehealthCallWorkspace actorName={snapshot.actor.name} patientId={patientScopeId || undefined} conversationId={selectedId || undefined} patientNames={Object.fromEntries(patientDirectory.map((patient) => [patient.id, patient.name]))} previewKey={previewKey} providerStatus={snapshot.providerStatus.telephony} />;
    if (mode === 'video') return <div className="communication-hub-empty"><span className="communication-hub-empty-icon"><Icon name="video" size={25} /></span><strong>Video provider not configured</strong><p>Video visits cannot be started in this environment. Configure an approved provider before scheduling or joining a clinical video visit.</p></div>;
    if (folder === 'drafts') return <div className="communication-hub-empty"><span className="communication-hub-empty-icon"><Icon name="edit" size={25} /></span><strong>Select a draft</strong><p>Choose a saved draft to continue editing it.</p></div>;
    if (!conversation || conversation.id !== effectiveSelectedId) return composerOpen && composer.conversationId === null ? renderNewConversationComposer() : <div className="communication-hub-empty"><span className="communication-hub-empty-icon"><Icon name="message" size={25} /></span><strong>Select a conversation</strong><p>Choose a communication from the list to review its clinical story.</p></div>;
    const deliveryIssues = conversation.deliveries.filter((delivery) => ['queued', 'deferred', 'retry_scheduled', 'failed_transient', 'failed_permanent', 'bounced'].includes(delivery.state));
    const isTerminal = ['closed', 'archived'].includes(conversation.state);
    return <>
      <header className="communication-hub-thread-header"><div className="communication-hub-thread-title"><span className="communication-hub-avatar medium">{initials(conversation.participants.find((participant) => participant.id !== snapshot.actor.id)?.name || conversation.topic)}</span><div><span className="communication-hub-kicker">{conversation.category} ? {conversation.patientContext?.name || 'Administrative'}</span><h2>{conversation.topic}</h2><p>{conversation.participants.map((participant) => participant.name).join(' ? ')}</p></div></div><div className="communication-hub-thread-actions"><StatusBadge value={conversation.state} /><label className="communication-hub-select-label">Call format<select value={callType} onChange={(event) => setCallType(event.target.value as 'audio' | 'video')} aria-label="Call format"><option value="audio">Audio call</option><option value="video">Patient video visit</option></select></label>{conversation.participants.filter((participant) => participant.id !== snapshot.actor.id).length > 1 && <label className="communication-hub-select-label">Call recipient<select value={callRecipientId} onChange={(event) => setCallRecipientId(event.target.value)} aria-label="Call recipient"><option value="">Select recipient</option>{conversation.participants.filter((participant) => participant.id !== snapshot.actor.id).map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}</select></label>}<button type="button" className="communication-hub-secondary-button" onClick={() => void resolveConversation()} disabled={busy === 'resolve' || isTerminal}><Icon name="check" size={14} /> {conversation.state === 'resolved' ? 'Close' : 'Resolve'}</button></div></header>
      {deliveryIssues.length > 0 && <div className="communication-hub-delivery-alert"><span><Icon name="warning" size={18} /></span><div><strong>Primary delivery still needs attention</strong><p>{deliveryIssues[0].endpointLabel} is {label(deliveryIssues[0].state)}. {conversation.deliveries.some((delivery) => delivery.fallbackOfDeliveryId) ? 'A fallback is recorded but remains queued; no external delivery is confirmed.' : 'This local record remains queued; no provider retry worker is running.'}</p></div><button type="button" onClick={() => openManualConfirmation(deliveryIssues[0].id)}>Record outside confirmation</button></div>}
      <div className="communication-hub-view-toggle" role="tablist" aria-label="Conversation view"><button type="button" role="tab" aria-selected={!timelineOpen} onClick={() => selectMode('all')}>Messages</button><button type="button" role="tab" aria-selected={timelineOpen} onClick={() => selectMode('timeline')}>Timeline</button></div>
      {timelineOpen ? <div className="communication-hub-timeline">{conversation.timeline.map((event) => <div className="communication-hub-timeline-event" key={event.id}><span className="communication-hub-timeline-dot" /><div><strong>{event.description}</strong><time dateTime={event.occurredAt}>{formatLongTime(event.occurredAt)}</time>{event.actor && <small>{event.actor.name}</small>}</div></div>)}</div> : <div className="communication-hub-message-list">{conversation.messages.map((message) => <MessageCard key={message.id} message={message} actorId={snapshot.actor.id} onAcknowledge={() => void acknowledge(message)} onCreateTask={() => { setTaskSourceMessageId(message.id); setTaskTitle(message.subject || `Follow up on ${conversation.topic}`); setTaskOpen(true); }} />)}{conversation.calls.map((call) => <article className="communication-hub-event-card is-call" key={call.id}><span className="communication-hub-event-icon"><Icon name="phone" /></span><div><strong>{label(call.state)} call</strong><p>{callEventDescription(call)}</p><small>{formatLongTime(call.endedAt || call.startedAt)}{call.durationSeconds ? ` ? ${Math.round(call.durationSeconds / 60)} min` : ''}</small></div><StatusBadge value={call.state} /></article>)}{conversation.voicemails.map((voicemail) => <article className="communication-hub-event-card is-voicemail" key={voicemail.id}><span className="communication-hub-event-icon"><Icon name="voicemail" /></span><div><strong>Voicemail from {voicemail.callerName}</strong><p>{voicemail.transcription || 'Audio message available for review.'}</p><small>{formatLongTime(voicemail.receivedAt)} ? {voicemail.durationSeconds}s</small><div className="communication-hub-inline-actions"><button type="button" onClick={() => void updateVoicemail('review', voicemail.id)}>Mark reviewed</button><button type="button" onClick={() => void updateVoicemail('callback', voicemail.id)}>Request callback</button></div></div><StatusBadge value={voicemail.state} /></article>)}</div>}
      <section className={`communication-hub-composer ${composer.isInternalNote ? 'is-internal' : ''}`}>
        {composerOpen ? (
          <form onSubmit={(event) => { event.preventDefault(); setReviewOpen(true); }}>
            <fieldset className="communication-hub-composer-fieldset" disabled={busy === 'draft' || busy === 'draft-recovery'}>
            <div className="communication-hub-composer-head">
              <div>
                <span className="communication-hub-kicker">{composer.isInternalNote ? 'Internal note' : composer.channel === 'email' ? 'Secure email' : 'Secure message'}</span>
                <strong>{composer.isInternalNote ? 'Not visible to the patient' : 'Reply in this conversation'}</strong>
              </div>
              <button type="button" className="communication-hub-text-button" onClick={() => void saveDraftAndClose()}>Save and close</button>
            </div>
            {!composer.isInternalNote && <label className="communication-hub-reply-recipient">Reply recipient<select value={composer.recipientId} onChange={(event) => setComposer((current) => ({ ...current, recipientId: event.target.value }))} aria-label="Reply recipient">{conversation.participants.filter((participant) => participant.id !== snapshot.actor.id).map((participant) => <option key={participant.id} value={participant.id}>{participant.name} · {participant.role || participant.type}</option>)}</select></label>}
            <textarea value={composer.bodyText} onChange={(event) => setComposer((current) => ({ ...current, bodyText: event.target.value }))} placeholder={composer.isInternalNote ? 'Record an internal clinical note...' : 'Write a clear, patient-friendly reply...'} aria-label="Message body" rows={5} />
            <div className="communication-hub-composer-toolbar">
              <label className="communication-hub-select-label">Channel<select value={composer.channel} onChange={(event) => setComposer((current) => ({ ...current, channel: event.target.value as ComposerState['channel'] }))}><option value="secure_message">Secure message</option><option value="email">Secure email</option></select></label>
              <label className="communication-hub-select-label">Priority<select value={composer.priority} onChange={(event) => setComposer((current) => ({ ...current, priority: event.target.value as ComposerState['priority'] }))}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="asap">ASAP</option><option value="stat">STAT</option></select></label>
              <button type="button" className="communication-hub-tool-button" onClick={() => setTemplatesOpen(true)}><Icon name="edit" size={14} /> Template</button>
              <label className="communication-hub-tool-button"><Icon name="attachment" size={14} /> Attach<input type="file" multiple hidden disabled={pendingAttachmentCount > 0} onChange={(event) => { for (const file of Array.from(event.target.files || [])) void uploadAttachment(file); event.currentTarget.value = ''; }} /></label>
              <button type="button" className="communication-hub-tool-button" onClick={() => void attachChartReference()} disabled={pendingAttachmentCount > 0}><Icon name="attachment" size={14} /> Chart reference</button>
              <button type="button" className={`communication-hub-tool-button ${composer.isInternalNote ? 'is-active' : ''}`} onClick={() => setComposer((current) => ({ ...current, isInternalNote: !current.isInternalNote }))}><Icon name="edit" size={14} /> Internal note</button>
            </div>
            {composer.attachments.length > 0 && <div className="communication-hub-attachment-list">{composer.attachments.map((attachment) => <span key={attachment.id}><Icon name="attachment" size={13} /> {attachment.filename} <StatusBadge value={attachment.scanState} /><button type="button" onClick={() => setComposer((current) => ({ ...current, attachments: current.attachments.filter((item) => item.id !== attachment.id) }))} aria-label={`Remove ${attachment.filename}`}><Icon name="close" size={12} /></button></span>)}</div>}
            <div className="communication-hub-composer-foot">
              <span className={`communication-hub-draft-status is-${draftSaveState}`} role="status" aria-live="polite"><span className="communication-hub-live-dot" /> {pendingAttachmentCount > 0 ? 'Validating attachment…' : draftStatusText(draftSaveState)}</span>
              <label className="communication-hub-check"><input type="checkbox" checked={composer.requiresAcknowledgement} onChange={(event) => setComposer((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} /> Require acknowledgement</label>
              <button type="submit" className="communication-hub-primary-button" disabled={!composer.bodyText.trim() || (!composer.isInternalNote && !composer.recipientId) || busy === 'send' || pendingAttachmentCount > 0}><Icon name="send" size={15} /> Review and send</button>
            </div>
            </fieldset>
          </form>
        ) : (
          <div className="communication-hub-composer-closed"><div><span className="communication-hub-kicker">Secure communication</span><strong>Keep the clinical story together.</strong><p>{isTerminal ? 'This conversation is closed and cannot accept new messages.' : 'Messages, calls, voicemail, delivery, and tasks stay linked to this conversation.'}</p></div><button type="button" className="communication-hub-primary-button" onClick={() => openComposer()} disabled={isTerminal}><Icon name="edit" size={15} /> Reply</button></div>
        )}
      </section>
    </>;
  }

  return <main className="communication-hub" aria-labelledby="communication-hub-title">
    {renderDraftConflictRecovery()}
    <header className="communication-hub-topbar"><div className="communication-hub-brand"><span className="communication-hub-brand-mark"><Icon name="shield" size={20} /></span><div><span className="communication-hub-kicker">Roshi clinical exchange</span><h1 id="communication-hub-title">Communication Hub</h1></div></div><div className="communication-hub-top-actions"><span className="communication-hub-session"><Icon name="lock" size={14} /> Secure workspace ? {snapshot.actor.name}</span><button type="button" className="communication-hub-secondary-button" onClick={() => void refresh()} disabled={busy === 'refresh'}><Icon name="refresh" size={14} /> {busy === 'refresh' ? 'Refreshing' : 'Refresh'}</button><button type="button" className="communication-hub-primary-button" onClick={openNewComposer}><Icon name="plus" size={15} /> New communication</button></div></header>
    <section className="communication-hub-provider-strip" aria-label="Provider status"><span className="is-muted"><i /> Secure messaging: local acceptance only</span><span className="is-muted"><i /> Email provider not configured</span><span className={snapshot.providerStatus.telephony.available ? '' : 'is-muted'}><i /> Telephony provider {snapshot.providerStatus.telephony.available ? 'available' : 'not configured'}</span><span className="is-muted"><i /> Video provider not configured</span><span className="communication-hub-provider-note">{snapshot.providerStatus.telephony.reason || 'Provider status is not available.'}</span></section>
    {error && <div className="communication-hub-alert is-error" role="alert"><Icon name="warning" size={16} /> <span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><Icon name="close" size={14} /></button></div>}
    {notice && <div className="communication-hub-alert is-success" role="status"><Icon name="check" size={16} /> <span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice"><Icon name="close" size={14} /></button></div>}
    <section className="communication-hub-mode-tabs" role="tablist" aria-label="Communication modes">{modes.map((item) => <button type="button" role="tab" aria-selected={mode === item.id} key={item.id} onClick={() => selectMode(item.id)}>{<Icon name={item.icon} size={15} />}{item.label}</button>)}</section>
    <section className={`communication-hub-layout ${mode === 'calls' ? 'is-calls-workspace' : ''}`}>
      <aside className="communication-hub-sidebar" aria-label="Communication folders"><div className="communication-hub-side-heading"><span className="communication-hub-kicker">Workspace</span><button type="button" className="communication-hub-icon-button" onClick={openNewComposer} aria-label="Compose new communication"><Icon name="plus" /></button></div><nav className="communication-hub-folder-list">{folders.map((item) => <button type="button" key={item.id} className={folder === item.id ? 'is-active' : ''} onClick={() => selectFolder(item.id)}><Icon name={item.icon} size={16} /><span>{item.label}</span>{item.count(snapshot) > 0 && <b>{item.count(snapshot)}</b>}</button>)}</nav><div className="communication-hub-side-divider" /><div className="communication-hub-endpoint-card"><div><span className="communication-hub-kicker">Endpoint health</span><strong>Maple Pharmacy PMS</strong></div><StatusBadge value="deferred" prefix="Down" /><p>Local delivery records are queued; no provider retry worker is running.</p></div></aside>
      <section className="communication-hub-list-pane" aria-label={folder === 'drafts' ? 'Draft list' : 'Conversation list'}>
        <div className="communication-hub-list-header"><div><span className="communication-hub-kicker">{folder === 'inbox' ? 'Your inbox' : label(folder)}</span><h2>{folder === 'drafts' ? `${visibleDrafts.length} drafts` : `${visibleConversations().length} conversations`}</h2></div><button type="button" className="communication-hub-icon-button" onClick={() => { if (!draftContextIsLocked()) setQuery(''); }} aria-label="Clear search" disabled={composerOpen}><Icon name="search" /></button></div>
        <label className="communication-hub-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={folder === 'drafts' ? 'Search drafts' : 'Search patient, topic, or message'} aria-label={folder === 'drafts' ? 'Search drafts' : 'Search communications'} disabled={composerOpen} /></label>
        <div className="communication-hub-filter-pills"><button type="button" className={folder === 'inbox' ? 'is-active' : ''} onClick={() => selectFolder('inbox')}>All</button><button type="button" className={folder === 'needsAction' ? 'is-active' : ''} onClick={() => selectFolder('needsAction')}>Needs action</button><button type="button" className={folder === 'urgent' ? 'is-active is-urgent' : ''} onClick={() => selectFolder('urgent')}>Urgent</button><button type="button" className={folder === 'deliveryIssues' ? 'is-active' : ''} onClick={() => selectFolder('deliveryIssues')}>Delivery issues</button></div>
        <div className="communication-hub-conversation-list">{folder === 'drafts' ? (visibleDrafts.length === 0 ? <div className="communication-hub-empty compact"><span className="communication-hub-empty-icon"><Icon name="edit" /></span><strong>No drafts found</strong><p>Saved drafts will appear here.</p></div> : visibleDrafts.map((draft) => <DraftRow key={draft.id} draft={draft} onResume={() => resumeDraft(draft)} />)) : (visibleConversations().length === 0 ? <div className="communication-hub-empty compact"><span className="communication-hub-empty-icon"><Icon name="search" /></span><strong>No conversations found</strong><p>Try another keyword or folder.</p></div> : visibleConversations().map((item) => <ConversationRow key={item.id} item={item} selected={item.id === effectiveSelectedId} onSelect={() => selectConversation(item.id)} />))}</div>
      </section>
      <section className="communication-hub-thread-pane" aria-label="Active conversation"><div className="communication-hub-thread-scroll">{renderThread()}</div></section>
      {detailsOpen && <aside className="communication-hub-details" aria-label="Communication details"><div className="communication-hub-details-head"><div><span className="communication-hub-kicker">Details</span><h2>Clinical context</h2></div><button type="button" className="communication-hub-icon-button mobile-only" onClick={() => setDetailsOpen(false)} aria-label="Close details"><Icon name="close" /></button></div>{conversation?.id === effectiveSelectedId && conversation.patientContext ? <><section className="communication-hub-patient-card"><div className="communication-hub-patient-avatar">{initials(conversation.patientContext.name)}</div><div><strong>{conversation.patientContext.name}</strong><span>{conversation.patientContext.gender || 'Patient'} ? MRN {conversation.patientContext.mrn}</span><span>DOB {conversation.patientContext.dob}</span></div><StatusBadge value={conversation.patientContext.identityVerified ? 'resolved' : 'awaiting_action'} prefix={conversation.patientContext.identityVerified ? 'Verified' : 'Verify'} /></section><section className="communication-hub-safety-card"><div className="communication-hub-safety-icon"><Icon name="shield" /></div><div><strong>Safety snapshot</strong><span>{conversation.patientContext.riskLevel} risk ? {conversation.patientContext.preferredChannel}</span><span>{conversation.patientContext.allergies.join(', ')}</span></div></section><section className="communication-hub-detail-section"><div className="communication-hub-detail-title"><h3>Conditions</h3><span>{conversation.patientContext.conditions.length}</span></div><div className="communication-hub-detail-tags">{conversation.patientContext.conditions.length ? conversation.patientContext.conditions.map((item) => <span key={item}>{item}</span>) : <em>No active conditions listed</em>}</div></section><section className="communication-hub-detail-section"><div className="communication-hub-detail-title"><h3>Medications</h3></div><ul className="communication-hub-detail-list">{conversation.patientContext.medications.length ? conversation.patientContext.medications.map((item) => <li key={item}>{item}</li>) : <li>No current medications listed</li>}</ul></section><section className="communication-hub-detail-section"><div className="communication-hub-detail-title"><h3>Recent labs</h3></div><ul className="communication-hub-detail-list">{conversation.patientContext.recentLabs.length ? conversation.patientContext.recentLabs.map((item) => <li key={item}>{item}</li>) : <li>No recent results available</li>}</ul></section></> : <div className="communication-hub-empty compact"><span className="communication-hub-empty-icon"><Icon name="user" /></span><strong>No patient context</strong><p>Administrative conversations can remain patient-independent.</p></div>}<section className="communication-hub-action-center"><div className="communication-hub-detail-title"><h3>Action center</h3><span>{conversation?.tasks.filter((task) => task.status !== 'completed').length || 0}</span></div><button type="button" onClick={() => { setTaskTitle(conversation?.topic ? `Follow up on ${conversation.topic}` : 'Follow up on communication'); setTaskOpen(true); }} disabled={!conversation}><Icon name="task" size={15} /> Create local task</button><button type="button" onClick={() => void startCall()} disabled={!conversation || busy === 'call'}><Icon name="phone" size={15} /> Start call</button><button type="button" onClick={() => openComposer({ isInternalNote: true })} disabled={!conversation}><Icon name="edit" size={15} /> Add internal note</button></section><section className="communication-hub-detail-section"><div className="communication-hub-detail-title"><h3>AI summary</h3><span className="communication-hub-ai-label"><Icon name="sparkle" size={12} /> Rules-based local</span></div><p className="communication-hub-summary">{conversation?.summary.text || 'Select a conversation to view a source-linked summary.'}</p><small className="communication-hub-summary-note">Review original messages before clinical action.</small></section><section className="communication-hub-detail-section"><div className="communication-hub-detail-title"><h3>Delivery</h3><button type="button" className="communication-hub-text-button" onClick={() => setManualOpen(true)} disabled={!conversation}>Manual confirmation</button></div>{conversation?.deliveries.length ? conversation.deliveries.map((delivery) => <div className="communication-hub-delivery-row" key={delivery.id}><span className={`communication-hub-channel-mark is-${delivery.channel}`}><Icon name={delivery.channel.includes('email') ? 'mail' : delivery.channel === 'pms' ? 'message' : 'layers'} size={14} /></span><div><strong>{delivery.endpointLabel}</strong><span>{label(delivery.channel)} ? {label(delivery.state)}</span>{delivery.lastErrorDetail && <small>{delivery.lastErrorDetail}</small>}</div><StatusBadge value={delivery.state} /></div>) : <p className="communication-hub-muted">No delivery attempts recorded.</p>}</section><div className="communication-hub-quick-actions"><button type="button" onClick={() => setDetailsOpen(false)}>Hide details</button></div></aside>}
    </section>
    {!detailsOpen && mode !== 'calls' && <button type="button" className="communication-hub-show-details" onClick={() => setDetailsOpen(true)}><Icon name="layers" size={15} /> Details</button>}
    {reviewOpen && <Modal title="Review message before sending" onClose={() => setReviewOpen(false)}><div className="communication-hub-review"><div className="communication-hub-review-row"><span>Recipient</span><strong>{composer.isInternalNote ? 'Internal note (no recipient)' : selectedRecipient?.name || 'Recipient not selected'}</strong></div><div className="communication-hub-review-row"><span>Patient</span><strong>{patientDirectory.find((patient) => patient.id === composer.patientId)?.name || 'No patient context'}</strong></div><div className="communication-hub-review-row"><span>Channel and priority</span><strong>{label(composer.channel)} ? {label(composer.priority)}</strong></div><div className="communication-hub-review-message"><span>Message</span><p>{composer.bodyText}</p></div>{composer.attachments.length > 0 && <div className="communication-hub-review-message"><span>Attachments</span><p>{composer.attachments.map((attachment) => attachment.filename).join(', ')}</p></div>}<div className="communication-hub-review-warning"><Icon name="shield" size={16} /><span>Confirm the patient, recipient, attachments, and original context before sending. Roshi will return durable acceptance; channel delivery may remain pending.</span></div><div className="communication-hub-modal-actions"><button type="button" className="communication-hub-secondary-button" onClick={() => setReviewOpen(false)}>Go back</button><button type="button" className="communication-hub-primary-button" onClick={() => void submitMessage()} disabled={busy === 'send' || pendingAttachmentCount > 0}><Icon name="send" size={15} /> {busy === 'send' ? 'Sending' : pendingAttachmentCount > 0 ? 'Validating attachment' : 'Send securely'}</button></div></div></Modal>}
    {templatesOpen && <Modal title="Message templates" onClose={() => setTemplatesOpen(false)}><div className="communication-hub-template-grid">{templates.map((template) => <article key={template.title}><StatusBadge value={template.category.toLowerCase()} /><h3>{template.title}</h3><p>{template.body}</p><button type="button" className="communication-hub-secondary-button" onClick={() => { setComposer((current) => ({ ...current, bodyText: current.bodyText ? `${current.bodyText}\n\n${template.body}` : template.body, category: template.category })); setTemplatesOpen(false); }}>Insert template</button></article>)}</div></Modal>}
    {taskOpen && <Modal title="Create local follow-up task" onClose={() => { setTaskOpen(false); setTaskSourceMessageId(null); }}><form className="communication-hub-modal-form" onSubmit={(event) => { event.preventDefault(); void createTask(); }}><label>Task title<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required /></label><label>Due date<input type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} /></label><p className="communication-hub-form-note">This development-seam task remains linked to the exact selected message when opened from a message, or to the conversation when opened from the action center. It is not yet synchronized to the canonical Tasks service.</p><div className="communication-hub-modal-actions"><button type="button" className="communication-hub-secondary-button" onClick={() => { setTaskOpen(false); setTaskSourceMessageId(null); }}>Cancel</button><button type="submit" className="communication-hub-primary-button" disabled={busy === 'task'}><Icon name="task" size={15} /> Create local task</button></div></form></Modal>}
    {manualOpen && <Modal title="Record manual delivery confirmation" onClose={() => { setManualOpen(false); setManualDeliveryId(null); }}><form className="communication-hub-modal-form" onSubmit={(event) => { event.preventDefault(); void recordManualConfirmation(); }}><div className="communication-hub-review-warning"><Icon name="warning" size={16} /><span>This adds an external confirmation. It does not overwrite machine delivery state.</span></div><label>Delivery record<select value={selectedManualDeliveryId || ''} onChange={(event) => setManualDeliveryId(event.target.value || null)} required><option value="">Select a delivery record</option>{conversation?.deliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.endpointLabel} ? {label(delivery.state)}</option>)}</select></label><label>Method<select value={manualMethod} onChange={(event) => setManualMethod(event.target.value)}><option>Phone</option><option>In person</option><option>Secure email</option><option>Fax</option><option>Other</option></select></label><label>Confirmed with<input value={manualConfirmedWith} onChange={(event) => setManualConfirmedWith(event.target.value)} placeholder="Person or organization" required /></label><label>Note<textarea value={manualNote} onChange={(event) => setManualNote(event.target.value)} rows={4} placeholder="What was confirmed?" required /></label><div className="communication-hub-modal-actions"><button type="button" className="communication-hub-secondary-button" onClick={() => { setManualOpen(false); setManualDeliveryId(null); }}>Cancel</button><button type="submit" className="communication-hub-primary-button" disabled={busy === 'manual' || !selectedManualDeliveryId}><Icon name="check" size={15} /> Record confirmation</button></div></form></Modal>}
  </main>;
}
