"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useState, type ReactNode } from 'react';
import type { CommunicationChannel, CommunicationItem, CommunicationSnapshot } from '@/lib/communicationStore';
import './communication.css';

type ActiveModule = 'hub' | 'messages' | 'email' | 'calls';

type Props = {
  initialData: CommunicationSnapshot;
  active?: ActiveModule;
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" /></>,
    message: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    phone: <><path d="M6 3h3l2 5-2 1.5a13 13 0 0 0 5.5 5.5L16 13l5 2v3c0 1.1-.9 2-2 2C10.2 20 4 13.8 4 5c0-1.1.9-2 2-2z" /></>,
    voicemail: <><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><path d="M8 15h8M5 17h14" /></>,
    follow: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    alert: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    pin: <><path d="m15 4 5 5-3 1-3 5 1 4-2 1-2-4-5-3-1-3 5-2 1-3z" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    task: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h8" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    records: <><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 13h8M8 17h6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.message}</svg>;
}

function previewQuery(searchParams: URLSearchParams) {
  const query = new URLSearchParams();
  const asUser = searchParams.get('asUser');
  if (asUser) query.set('asUser', asUser);
  else if (searchParams.get('noauth') === '1' || searchParams.get('noauth') === 'true') query.set('noauth', '1');
  return query;
}

function withPreview(href: string, searchParams: URLSearchParams) {
  const query = previewQuery(searchParams).toString();
  return query ? `${href}${href.includes('?') ? '&' : '?'}${query}` : href;
}

function formatDateTime(value?: string) {
  if (!value) return 'Time not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time not documented' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function channelLabel(channel: CommunicationChannel) {
  return channel === 'message' ? 'Message' : channel === 'voicemail' ? 'Voicemail' : channel[0].toUpperCase() + channel.slice(1);
}

function patientHref(item: CommunicationItem) {
  return item.patientId ? `/dashboard/records/${encodeURIComponent(item.patientId)}` : undefined;
}

export function CommunicationModuleNav({ active }: { active: ActiveModule }) {
  const searchParams = useSearchParams();
  return <nav className="communication-module-nav" aria-label="Communication modules">
    <Link href={withPreview('/communication', searchParams)} className={active === 'hub' ? 'is-active' : ''}>Hub</Link>
    <Link href={withPreview('/communication/messages', searchParams)} className={active === 'messages' ? 'is-active' : ''}><Icon name="message" size={14} /> Messages</Link>
    <Link href={withPreview('/communication/email', searchParams)} className={active === 'email' ? 'is-active' : ''}><Icon name="mail" size={14} /> Email</Link>
    <Link href={withPreview('/communication/calls', searchParams)} className={active === 'calls' ? 'is-active' : ''}><Icon name="phone" size={14} /> Calls</Link>
  </nav>;
}

function Header({ active, onRefresh, refreshing }: { active: ActiveModule; onRefresh?: () => void; refreshing?: boolean }) {
  const searchParams = useSearchParams();
  return <>
    <div className="communication-route-bar"><CommunicationModuleNav active={active} /><div className="communication-route-actions">{onRefresh && <button type="button" className="communication-secondary-button" onClick={onRefresh} disabled={refreshing}><Icon name="refresh" size={14} /> {refreshing ? 'Refreshing' : 'Refresh'}</button>}<Link href={withPreview('/communication/messages?new=1', searchParams)} className="communication-primary-button"><Icon name="plus" size={15} /> New Message</Link></div></div>
  </>;
}

function ChannelIcon({ channel }: { channel: CommunicationChannel }) {
  return <span className={`communication-channel-icon is-${channel}`}><Icon name={channel === 'message' ? 'message' : channel} size={20} /></span>;
}

function ChannelCard({ channel, title, description, count, detail, available, href, reason }: { channel: CommunicationChannel; title: string; description: string; count: string; detail: string; available: boolean; href: string; reason?: string }) {
  const searchParams = useSearchParams();
  return <article className={`communication-channel-card ${available ? 'is-available' : 'is-unavailable'}`}>
    <div className="communication-channel-card-top"><ChannelIcon channel={channel} /><span className={`communication-availability ${available ? 'is-live' : 'is-muted'}`}>{available ? 'Live' : 'Unavailable'}</span></div>
    <h2>{title}</h2><p>{description}</p>
    <div className="communication-channel-count"><strong>{count}</strong><span>{detail}</span></div>
    {!available && <p className="communication-channel-reason"><Icon name="lock" size={14} /> {reason}</p>}
    <Link href={withPreview(href, searchParams)} className="communication-card-link">Open {title} <Icon name="arrow" size={14} /></Link>
  </article>;
}

function CommunicationRow({ item, onPin, pinBusy }: { item: CommunicationItem; onPin?: (item: CommunicationItem) => void; pinBusy?: boolean }) {
  const searchParams = useSearchParams();
  const chart = patientHref(item);
  return <article className={`communication-row ${item.unread ? 'is-unread' : ''}`}>
    <Link href={withPreview(item.href, searchParams)} className="communication-row-main">
      <span className={`communication-row-channel is-${item.channel}`} title={channelLabel(item.channel)}><Icon name={item.channel === 'message' ? 'message' : item.channel} size={16} /><span className="sr-only">{channelLabel(item.channel)}</span></span>
      <span className="communication-row-copy"><strong>{item.contactName}</strong><span className="communication-row-meta">{item.patientName || 'No patient context'} · {item.subject}</span><span className="communication-row-preview">{item.preview}</span></span>
      <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
    </Link>
    <div className="communication-row-actions">{item.requiresFollowUp && <span className="communication-follow-up"><Icon name="follow" size={13} /> Follow-up</span>}{chart && <Link href={withPreview(chart, searchParams)} className="communication-patient-link">Chart</Link>}{onPin && <button type="button" className={`communication-icon-button ${item.pinned ? 'is-pinned' : ''}`} onClick={() => onPin(item)} disabled={pinBusy} aria-label={item.pinned ? `Unpin ${item.subject}` : `Pin ${item.subject}`} title={item.pinned ? 'Unpin' : 'Pin'}><Icon name="pin" size={15} /></button>}</div>
  </article>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="communication-empty"><span><Icon name="message" size={20} /></span><strong>{title}</strong><p>{detail}</p>{action}</div>;
}

function UnavailableChannel({ type, reason }: { type: 'Email' | 'Calls'; reason: string }) {
  const isEmail = type === 'Email';
  const searchParams = useSearchParams();
  return <main className="communication-page" aria-labelledby="communication-module-title"><Header active={isEmail ? 'email' : 'calls'} /><section className="communication-unavailable-panel"><span className={`communication-unavailable-icon is-${isEmail ? 'email' : 'call'}`}><Icon name={isEmail ? 'mail' : 'phone'} size={28} /></span><span className="communication-eyebrow">{type} workspace</span><h1 id="communication-module-title">{type}</h1><p>{isEmail ? 'Review and send clinical email only after an approved delivery provider is connected.' : 'Review call activity and voicemail only after an approved telephony provider is connected.'}</p><div className="communication-honesty"><Icon name="lock" size={16} /><span><strong>Provider not configured</strong>{reason}</span></div><div className="communication-unavailable-actions"><Link href={withPreview('/communication', searchParams)} className="communication-primary-button">Back to Communication Hub</Link><Link href={withPreview('/admin/audit', searchParams)} className="communication-secondary-button">View Audit Log <Icon name="arrow" size={14} /></Link></div></section></main>;
}

export default function CommunicationWorkspace({ initialData, active = 'hub' }: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState(initialData.query);
  const [channel, setChannel] = useState<CommunicationChannel | 'all'>(initialData.channel);
  const [busy, setBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const preview = previewQuery(searchParams);
  const previewKey = preview.toString();
  const tasksHref = withPreview('/dashboard/tasks', searchParams);
  const appointmentsHref = withPreview('/dashboard/appointments', searchParams);
  const recordsHref = withPreview('/dashboard/records', searchParams);

  useEffect(() => {
    if (active !== 'hub') return;
    const controller = new AbortController();
    const params = new URLSearchParams(previewKey);
    if (deferredQuery) params.set('q', deferredQuery);
    if (channel !== 'all') params.set('channel', channel);
    fetch(`/api/communication?${params.toString()}`, { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Communication Hub could not be loaded.');
      return response.json() as Promise<CommunicationSnapshot>;
    }).then(setData).catch((error: unknown) => { if ((error as { name?: string }).name !== 'AbortError') return; }).finally(() => undefined);
    return () => controller.abort();
  }, [active, channel, deferredQuery, previewKey]);

  async function refresh() {
    setBusy(true);
    try {
      const params = new URLSearchParams(previewKey);
      if (query) params.set('q', query);
      if (channel !== 'all') params.set('channel', channel);
      const response = await fetch(`/api/communication?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Communication Hub could not be refreshed.');
      setData(await response.json() as CommunicationSnapshot);
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(item: CommunicationItem) {
    setPinBusy(item.id);
    try {
      const response = await fetch(`/api/communication/${encodeURIComponent(item.id)}/pin?${previewKey}`, { method: 'POST' });
      if (!response.ok) throw new Error('Communication could not be pinned.');
      await refresh();
    } finally {
      setPinBusy(null);
    }
  }

  if (active === 'email') return <UnavailableChannel type="Email" reason={data.channels.email.reason || 'An approved email provider is required before delivery can be enabled.'} />;
  if (active === 'calls') return <UnavailableChannel type="Calls" reason={data.channels.calls.reason || 'An approved telephony provider is required before call activity can be enabled.'} />;

  const attention = data.needsAttention.filter((item) => (channel === 'all' || item.channel === channel) && (!deferredQuery || [item.contactName, item.patientName, item.subject, item.preview].join(' ').toLowerCase().includes(deferredQuery.toLowerCase())));
  const followUps = data.followUps.filter((item) => channel === 'all' || item.channel === channel);
  const recent = data.items.filter((item) => channel === 'all' || item.channel === channel);
  const pinned = data.pinned.filter((item) => channel === 'all' || item.channel === channel);
  return <main className="communication-page" aria-labelledby="communication-title">
    <Header active="hub" onRefresh={() => void refresh()} refreshing={busy} />
    <header className="communication-header"><div><span className="communication-eyebrow">Clinical communications</span><h1 id="communication-title">Communication Hub</h1><p>One place for patient messages, care-team work, follow-ups, and communication context.</p><span className="communication-header-context"><Icon name="lock" size={13} /> PHI-aware workspace · Last refreshed {formatDateTime(data.generatedAt)}</span></div><div className="communication-header-actions"><Link href={tasksHref} className="communication-secondary-button"><Icon name="task" size={14} /> Tasks</Link><Link href={appointmentsHref} className="communication-secondary-button"><Icon name="calendar" size={14} /> Appointments</Link></div></header>
    <section className="communication-search-band" aria-label="Search communications"><div className="communication-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Search people, patients, subjects, and message text..." aria-label="Search communications" /><kbd>⌘ K</kbd></div><div className="communication-filter-tabs" role="tablist" aria-label="Communication channels">{([['all', 'All'], ['message', 'Messages'], ['email', 'Email'], ['call', 'Calls'], ['voicemail', 'Voicemail']] as const).map(([value, label]) => <button type="button" key={value} role="tab" aria-selected={channel === value} onClick={() => setChannel(value)}>{label}{value === 'message' && data.channels.messages.unread > 0 && <span>{data.channels.messages.unread}</span>}</button>)}</div></section>
    <section className="communication-metrics" aria-label="Communication summary"><div><span className="communication-metric-icon is-blue"><Icon name="message" /></span><span><small>Unread</small><strong>{data.counts.unread}</strong><em>secure messages</em></span></div><div><span className="communication-metric-icon is-amber"><Icon name="alert" /></span><span><small>Needs attention</small><strong>{attention.length}</strong><em>new or waiting</em></span></div><div><span className="communication-metric-icon is-teal"><Icon name="follow" /></span><span><small>Follow-ups</small><strong>{followUps.length}</strong><em>flagged conversations</em></span></div><div><span className="communication-metric-icon is-slate"><Icon name="phone" /></span><span><small>Calls today</small><strong>{data.counts.callsToday ?? '—'}</strong><em>{data.channels.calls.available ? 'activity logged' : 'provider unavailable'}</em></span></div></section>
    <section className="communication-channel-grid" aria-label="Communication channels"><ChannelCard channel="email" title="Email" description="Clinical email with delivery controls and audit history." count="—" detail="provider unavailable" available={false} href="/communication/email" reason={data.channels.email.reason} /><ChannelCard channel="message" title="Secure Messages" description="Patient and care-team conversations from the secure message store." count={String(data.channels.messages.unread)} detail="unread conversations" available href="/communication/messages" /><ChannelCard channel="call" title="Calls & Voicemail" description="Call activity, voicemail, and scheduled callbacks." count="—" detail="provider unavailable" available={false} href="/communication/calls" reason={data.channels.calls.reason} /></section>
    <section className="communication-content-grid"><div className="communication-main-column"><section className="communication-panel"><div className="communication-panel-heading"><div><span className="communication-section-kicker">Priority queue</span><h2>Needs Attention</h2></div><span className="communication-panel-count">{attention.length}</span></div>{attention.length ? attention.slice(0, 6).map((item) => <CommunicationRow item={item} key={item.id} onPin={(current) => void togglePin(current)} pinBusy={pinBusy === item.id} />) : <EmptyState title="Nothing needs attention" detail="New messages and flagged follow-ups will appear here." action={<Link href="/communication/messages?new=1" className="communication-text-link">Start a secure message <Icon name="arrow" size={14} /></Link>} />}</section><section className="communication-panel"><div className="communication-panel-heading"><div><span className="communication-section-kicker">Activity</span><h2>Recent Activity</h2></div><Link href={withPreview('/communication/messages', searchParams)} className="communication-text-link">Open Messages <Icon name="arrow" size={14} /></Link></div>{recent.length ? recent.slice(0, 5).map((item) => <CommunicationRow item={item} key={item.id} onPin={(current) => void togglePin(current)} pinBusy={pinBusy === item.id} />) : <EmptyState title="No communication activity" detail="Communication activity will be listed here as it is recorded." />}</section></div><aside className="communication-side-column"><section className="communication-panel communication-brief"><div className="communication-panel-heading"><div><span className="communication-section-kicker">Workspace brief</span><h2>Communication Brief</h2></div><span className="communication-brief-status">Live data</span></div><p>{data.counts.unread ? `${data.counts.unread} secure message${data.counts.unread === 1 ? '' : 's'} need review.` : 'No unread secure messages are waiting.'} {data.counts.waitingForReply ? `${data.counts.waitingForReply} conversation${data.counts.waitingForReply === 1 ? ' is' : 's are'} flagged for follow-up.` : 'No conversations are currently flagged for follow-up.'}</p><div className="communication-brief-list"><span><Icon name="message" size={14} /> Secure messages <strong>{data.channels.messages.unread} unread</strong></span><span><Icon name="mail" size={14} /> Email <strong>Not connected</strong></span><span><Icon name="phone" size={14} /> Calls <strong>Not connected</strong></span></div></section><section className="communication-panel"><div className="communication-panel-heading"><div><span className="communication-section-kicker">Work queue</span><h2>Follow-ups</h2></div><span className="communication-panel-count">{followUps.length}</span></div>{followUps.length ? followUps.slice(0, 4).map((item) => <CommunicationRow item={item} key={item.id} onPin={(current) => void togglePin(current)} pinBusy={pinBusy === item.id} />) : <EmptyState title="No follow-ups" detail="Flag a conversation when it needs another touch." />}</section><section className="communication-panel"><div className="communication-panel-heading"><div><span className="communication-section-kicker">Saved for later</span><h2>Pinned</h2></div><span className="communication-panel-count">{pinned.length}</span></div>{pinned.length ? pinned.slice(0, 4).map((item) => <CommunicationRow item={item} key={item.id} onPin={(current) => void togglePin(current)} pinBusy={pinBusy === item.id} />) : <EmptyState title="Nothing pinned" detail="Pin a conversation to keep it close at hand." />}</section></aside></section>
    <section className="communication-quick-actions" aria-label="Quick actions"><span>Quick actions</span><Link href={withPreview('/communication/messages?new=1', searchParams)}><Icon name="message" size={15} /> New secure message</Link><Link href={tasksHref}><Icon name="task" size={15} /> Create task</Link><Link href={recordsHref}><Icon name="records" size={15} /> Find patient</Link><Link href={appointmentsHref}><Icon name="calendar" size={15} /> View appointments</Link></section>
  </main>;
}
