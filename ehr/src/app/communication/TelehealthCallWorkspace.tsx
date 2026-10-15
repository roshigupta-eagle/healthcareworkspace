'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import './telehealth-call-workspace.css';

type CallState = 'created' | 'waiting_room' | 'dialing' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'on_hold' | 'transferring' | 'conferencing' | 'ending' | 'ended' | 'busy' | 'no_answer' | 'declined' | 'failed' | 'dropped' | 'cancelled';

type CallStateHistoryEntry = {
  id?: string;
  action?: string;
  fromState?: CallState | null;
  toState?: CallState;
  occurredAt?: string;
  actor?: { id?: string; name?: string; role?: string };
  result?: string;
  note?: string;
};

type TelehealthCall = {
  id: string;
  conversationId?: string;
  patientId?: string;
  callType?: 'audio' | 'video' | 'group_audio' | 'group_video';
  recipientId?: string;
  state: CallState;
  provider?: string;
  createdAt?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  dispositionCode?: string;
  recordingState?: string;
  transcriptionState?: string;
  participants?: Array<{ id: string; name: string; role?: string; joinedAt?: string; leftAt?: string; muted?: boolean; onHold?: boolean }>;
  notes?: string[];
  waitingRoom?: { state?: string; enteredAt?: string; admittedAt?: string };
  recordingConsent?: { state?: string; recordedAt?: string };
  quality?: { state?: string; updatedAt?: string };
  errorCode?: string;
  errorDetail?: string;
  revision?: number;
  stateHistory?: CallStateHistoryEntry[];
};

type CallsEnvelope = {
  data?: { calls?: TelehealthCall[]; nextCursor?: string | null };
  error?: string;
  detail?: string;
  code?: string;
};

type Props = {
  actorName: string;
  patientId?: string;
  conversationId?: string;
  patientNames: Record<string, string>;
  previewKey: string;
  providerStatus: { available: boolean; reason?: string };
};

function appendQuery(path: string, query: string) {
  return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path;
}

function readable(value: string | undefined | null) {
  if (!value) return 'Not documented';
  return value.replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function formatWhen(value: string | undefined) {
  if (!value) return 'Not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not documented'
    : date.toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDuration(seconds: number | undefined) {
  if (!seconds || seconds < 1) return 'No connected duration documented';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function statusKind(state: CallState) {
  if (['failed', 'dropped', 'busy', 'no_answer', 'declined', 'cancelled'].includes(state)) return 'problem';
  if (['connected', 'ended'].includes(state)) return 'complete';
  if (['created', 'waiting_room', 'dialing', 'ringing', 'connecting', 'reconnecting', 'on_hold', 'transferring', 'conferencing', 'ending'].includes(state)) return 'pending';
  return 'neutral';
}

function callError(payload: CallsEnvelope, fallback: string) {
  return payload.error || payload.detail || fallback;
}

function isCallPage(payload: CallsEnvelope): payload is CallsEnvelope & { data: { calls: TelehealthCall[]; nextCursor?: string | null } } {
  return Array.isArray(payload.data?.calls);
}

function matchesCall(call: TelehealthCall, filter: string, patientNames: Record<string, string>) {
  const normalized = filter.trim().toLowerCase();
  if (!normalized) return true;
  return [call.id, call.state, call.provider, call.patientId && patientNames[call.patientId], call.errorCode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

function isVideoCall(call: TelehealthCall) {
  return call.callType === 'video' || call.callType === 'group_video';
}

function DeviceCheckLink({ call, previewKey }: { call: TelehealthCall; previewKey: string }) {
  return <Link className="telehealth-calls-button secondary" href={appendQuery(`/telehealth/calls/${encodeURIComponent(call.id)}/device-check`, previewKey)}>Run device check</Link>;
}

function MeetingLink({ call, previewKey }: { call: TelehealthCall; previewKey: string }) {
  return <Link className="telehealth-calls-button" href={appendQuery(`/telehealth/calls/${encodeURIComponent(call.id)}/meeting`, previewKey)}>Open meeting readiness</Link>;
}

export default function TelehealthCallWorkspace({ actorName, patientId, conversationId, patientNames, previewKey, providerStatus }: Props) {
  const [calls, setCalls] = useState<TelehealthCall[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadPage = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams(previewKey);
    if (patientId) params.set('patientId', patientId);
    if (conversationId) params.set('conversationId', conversationId);
    params.set('limit', '25');
    if (cursor) params.set('cursor', cursor);
    const response = await fetch(appendQuery('/api/communication/v1/calls', params.toString()), { cache: 'no-store' });
    const payload = await response.json() as CallsEnvelope;
    if (!response.ok || !isCallPage(payload)) throw new Error(callError(payload, 'Call history could not be loaded.'));
    return { calls: payload.data.calls, nextCursor: typeof payload.data.nextCursor === 'string' && payload.data.nextCursor ? payload.data.nextCursor : null };
  }, [conversationId, patientId, previewKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await loadPage();
      setCalls(page.calls);
      setNextCursor(page.nextCursor);
      setSelectedId((current) => current && page.calls.some((call) => call.id === current)
        ? current
        : page.calls.find((call) => call.conversationId === conversationId)?.id || page.calls[0]?.id || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Call history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, loadPage]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loading || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await loadPage(nextCursor);
      setCalls((current) => {
        const existingIds = new Set(current.map((call) => call.id));
        return [...current, ...page.calls.filter((call) => !existingIds.has(call.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Older call records could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadPage, loading, loadingMore, nextCursor]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const visibleCalls = useMemo(() => {
    return calls.filter((call) => matchesCall(call, filter, patientNames));
  }, [calls, filter, patientNames]);
  const selected = visibleCalls.find((call) => call.id === selectedId) || visibleCalls[0] || null;
  const failedCount = calls.filter((call) => ['failed', 'dropped', 'busy', 'no_answer', 'declined', 'cancelled'].includes(call.state)).length;
  const activeCount = calls.filter((call) => ['created', 'waiting_room', 'dialing', 'ringing', 'connecting', 'connected', 'reconnecting', 'on_hold', 'transferring', 'conferencing', 'ending'].includes(call.state)).length;

  const changeFilter = (value: string) => {
    setFilter(value);
    const matchingCalls = calls.filter((call) => matchesCall(call, value, patientNames));
    setSelectedId((current) => current && matchingCalls.some((call) => call.id === current) ? current : matchingCalls[0]?.id || null);
  };

  return <section className="telehealth-calls" aria-labelledby="telehealth-calls-title">
    <header className="telehealth-calls-header">
      <div>
        <span className="telehealth-calls-eyebrow">Roshi telehealth</span>
        <h2 id="telehealth-calls-title">Call control and history</h2>
        <p>Review authorized call records and readiness. A media session is never inferred from this screen.</p>
      </div>
      <button type="button" className="telehealth-calls-button" onClick={() => void refresh()} disabled={loading || loadingMore}>
        {loading ? 'Refreshing...' : 'Refresh history'}
      </button>
    </header>

    <aside className="telehealth-calls-safety" aria-label="Urgent safety guidance"><strong>This workspace is not an emergency service.</strong><span>For an immediate threat to life or safety, call 911 or use the local emergency pathway. Do not rely on an unavailable telehealth provider.</span></aside>

    <div className="telehealth-calls-readiness" aria-label="Telehealth readiness">
      <article><span className={`telehealth-calls-indicator ${providerStatus.available ? 'ready' : 'unavailable'}`} aria-hidden="true" /><div><strong>Media provider</strong><span>{providerStatus.available ? 'Available' : 'Not configured'}</span></div><small>{providerStatus.reason || 'No WebRTC, PSTN, or video session can be started from this environment.'}</small></article>
      <article><span className="telehealth-calls-indicator ready" aria-hidden="true" /><div><strong>Call records</strong><span>{calls.length} authorized record{calls.length === 1 ? '' : 's'}</span></div><small>Lifecycle facts and failure dispositions remain reviewable.</small></article>
      <article><span className="telehealth-calls-indicator neutral" aria-hidden="true" /><div><strong>Operator</strong><span>{actorName}</span></div><small>Run a permission-based device check only when you are ready to allow it.</small></article>
    </div>

    {error && <div className="telehealth-calls-alert" role="alert"><strong>Call history unavailable.</strong> {error}</div>}

    <div className="telehealth-calls-metrics" aria-label="Call history summary">
      <span><strong>{calls.length}</strong> total</span>
      <span><strong>{failedCount}</strong> dispositioned failure{failedCount === 1 ? '' : 's'}</span>
      <span><strong>{activeCount}</strong> active call-control session{activeCount === 1 ? '' : 's'} asserted</span>
    </div>

    <div className="telehealth-calls-content">
      <aside className="telehealth-calls-list" aria-label="Call records">
        <label className="telehealth-calls-search">Search call history<input value={filter} onChange={(event) => changeFilter(event.target.value)} placeholder="State, patient, or ID" /></label>
        {loading ? <p className="telehealth-calls-empty">Loading authorized call records...</p> : visibleCalls.length === 0 ? <p className="telehealth-calls-empty">No call records match this view.</p> : <div>{visibleCalls.map((call) => <button type="button" className={`telehealth-calls-row ${call.id === selected?.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(call.id)} key={call.id} aria-pressed={call.id === selected?.id}>
          <span className={`telehealth-calls-state ${statusKind(call.state)}`}>{readable(call.state)}</span>
          <strong>{call.patientId ? patientNames[call.patientId] || 'Patient context' : 'No patient context'}</strong>
          <small>{formatWhen(call.endedAt || call.startedAt || call.createdAt)}</small>
          {call.errorCode && <em>{readable(call.errorCode)}</em>}
        </button>)}</div>}
        {nextCursor && !loading ? <button type="button" className="telehealth-calls-load-more" onClick={() => void loadOlder()} disabled={loadingMore}>{loadingMore ? 'Loading older records...' : 'Load older calls'}</button> : null}
      </aside>

      <p className="telehealth-calls-selection-status" role="status">{selected ? `Selected call session for ${selected.patientId ? patientNames[selected.patientId] || 'patient context' : 'unlinked patient context'}.` : 'No call session selected.'}</p>
      <article className="telehealth-calls-detail">
        {!selected ? <div className="telehealth-calls-empty detail"><strong>No call selected</strong><p>Call records will appear here when the current user is authorized to view them.</p></div> : <>
          <header><div><span className="telehealth-calls-eyebrow">Call session</span><h3>{selected.patientId ? patientNames[selected.patientId] || 'Patient context' : 'No patient context'}</h3><p className="telehealth-calls-id">{selected.id}</p></div><span className={`telehealth-calls-state ${statusKind(selected.state)}`}>{readable(selected.state)}</span></header>
          <dl className="telehealth-calls-facts">
            <div><dt>Provider</dt><dd>{selected.provider === 'not-configured' || !selected.provider ? 'Not configured' : readable(selected.provider)}</dd></div>
            <div><dt>Media intent</dt><dd>{readable(selected.callType || 'audio')}</dd></div>
            <div><dt>Created / started</dt><dd>{formatWhen(selected.createdAt || selected.startedAt)}</dd></div>
            <div><dt>Connected duration</dt><dd>{formatDuration(selected.durationSeconds)}</dd></div>
            <div><dt>Disposition</dt><dd>{readable(selected.dispositionCode || selected.state)}</dd></div>
          </dl>
          <section className="telehealth-calls-operational" aria-label="Operational call safeguards">
            <div><span>Waiting room</span><strong>{readable(selected.waitingRoom?.state || 'not applicable')}</strong><small>{selected.waitingRoom?.enteredAt ? `Entered ${formatWhen(selected.waitingRoom.enteredAt)}` : 'No waiting-room admission is asserted.'}</small></div>
            <div><span>Recording</span><strong>{readable(selected.recordingState || 'not allowed')}</strong><small>{selected.recordingConsent?.state ? `Consent: ${readable(selected.recordingConsent.state)}` : 'Recording is not enabled by this workspace.'}</small></div>
            <div><span>Call quality</span><strong>{readable(selected.quality?.state || 'unknown')}</strong><small>{selected.quality?.updatedAt ? `Updated ${formatWhen(selected.quality.updatedAt)}` : 'No media quality is inferred from control-plane history.'}</small></div>
          </section>
          {(selected.errorCode || selected.errorDetail) && <div className="telehealth-calls-problem"><strong>{readable(selected.errorCode || 'call not completed')}</strong><p>{selected.errorDetail || 'The record does not assert that media was established.'}</p></div>}
          <section className="telehealth-calls-actions" aria-label="Call readiness actions">{selected.provider === 'livekit' && isVideoCall(selected) ? <MeetingLink call={selected} previewKey={previewKey} /> : null}{selected.provider === 'livekit' && !isVideoCall(selected) ? <span>This LiveKit control record is not a video visit, so no meeting link is available.</span> : null}<DeviceCheckLink call={selected} previewKey={previewKey} /><span>Device checking requests permission only after you select it. It does not start, join, record, or transmit a clinical call.</span></section>
          {selected.participants?.length ? <section className="telehealth-calls-participants" aria-labelledby="call-participants-title"><h4 id="call-participants-title">Participants</h4><ul>{selected.participants.map((participant) => <li key={participant.id}><span><strong>{participant.name}</strong><small>{participant.role || 'Participant'}</small></span><span>{participant.joinedAt ? `Joined ${formatWhen(participant.joinedAt)}` : 'No media join asserted'}{participant.leftAt ? ` · Left ${formatWhen(participant.leftAt)}` : ''}</span></li>)}</ul></section> : null}
          {selected.notes?.length ? <section className="telehealth-calls-notes" aria-labelledby="call-notes-title"><h4 id="call-notes-title">Operational notes</h4><ul>{selected.notes.map((note, index) => <li key={`${selected.id}-note-${index}`}>{note}</li>)}</ul></section> : null}
          <section className="telehealth-calls-history" aria-labelledby="call-lifecycle-title"><h4 id="call-lifecycle-title">Lifecycle history</h4>{selected.stateHistory?.length ? <ol>{selected.stateHistory.map((event, index) => <li key={event.id || `${event.occurredAt}-${index}`}><span className={`telehealth-calls-history-dot ${statusKind(event.toState || selected.state)}`} aria-hidden="true" /><div><strong>{event.action ? readable(event.action) : `${readable(event.fromState)} to ${readable(event.toState)}`}</strong><span>{event.fromState || event.toState ? `${readable(event.fromState)} → ${readable(event.toState)}` : 'State transition not documented'}</span>{event.note && <p>{event.note}</p>}<small>{formatWhen(event.occurredAt)}{event.actor?.name ? ` · ${event.actor.name}` : ''}</small></div></li>)}</ol> : <p className="telehealth-calls-empty">No lifecycle history was returned for this record.</p>}</section>
        </>}
      </article>
    </div>
  </section>;
}
