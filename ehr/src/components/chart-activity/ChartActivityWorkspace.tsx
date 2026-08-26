"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ActivityCategory, ActivitySort, ChartActivityEvent, ChartActivityModel } from '@/lib/chartActivity';

type IconName = 'note' | 'document' | 'result' | 'appointment' | 'medication' | 'task' | 'condition' | 'care-gap' | 'message' | 'encounter' | 'history' | 'search' | 'filter' | 'calendar' | 'user' | 'arrow' | 'check' | 'clock' | 'alert' | 'close' | 'refresh' | 'download' | 'plus';
type RangeKey = 'today' | '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

const TIME_ZONE = process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || 'America/Toronto';
const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  note: 'Notes', document: 'Documents', result: 'Results', appointment: 'Appointments', medication: 'Medications', task: 'Tasks', condition: 'Conditions', 'care-gap': 'Care Gaps', 'care-plan': 'Care Plans', order: 'Orders', referral: 'Referrals', message: 'Messages', encounter: 'Encounters', other: 'Other',
};
const CATEGORY_TONE: Record<ActivityCategory, string> = {
  note: 'border-violet-100 bg-violet-50/70 text-violet-800', document: 'border-indigo-100 bg-indigo-50/70 text-indigo-800', result: 'border-cyan-100 bg-cyan-50/70 text-cyan-800', appointment: 'border-teal-100 bg-teal-50/70 text-teal-800', medication: 'border-emerald-100 bg-emerald-50/70 text-emerald-800', task: 'border-amber-100 bg-amber-50/70 text-amber-900', condition: 'border-blue-100 bg-blue-50/70 text-blue-800', 'care-gap': 'border-amber-100 bg-amber-50/70 text-amber-900', 'care-plan': 'border-teal-100 bg-teal-50/70 text-teal-800', order: 'border-slate-200 bg-slate-50 text-slate-700', referral: 'border-blue-100 bg-blue-50/70 text-blue-800', message: 'border-cyan-100 bg-cyan-50/70 text-cyan-800', encounter: 'border-teal-100 bg-teal-50/70 text-teal-800', other: 'border-slate-200 bg-slate-50 text-slate-700',
};
const STATUS_TONE: Record<string, string> = { Updated: 'text-violet-700', Reviewed: 'text-blue-700', Scheduled: 'text-teal-700', Reconciled: 'text-emerald-700', Uploaded: 'text-indigo-700', 'Needs Review': 'text-amber-800', Completed: 'text-emerald-700' };

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    note: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></>,
    document: <><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M15 3v5h5M9 13h6M9 17h5" /></>,
    result: <><path d="M5 4h14M7 4v4M17 4v4M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 15h2l1-3 2 6 1-3h2" /></>,
    appointment: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
    medication: <><path d="m8 8 8 8M6 10l4-4a3 3 0 0 1 4 0l4 4a3 3 0 0 1 0 4l-4 4a3 3 0 0 1-4 0l-4-4a3 3 0 0 1 0-4Z" /><path d="M9 9h6" /></>,
    task: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h3" /></>,
    condition: <><path d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10Z" /><path d="M12 8v6M9 11h6" /></>,
    'care-gap': <><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /><path d="M8 8h5M8 12h3M16 3v6M13 6h6" /></>,
    message: <><path d="M4 5h16v11H8l-4 4Z" /><path d="M8 9h8M8 13h5" /></>,
    encounter: <><path d="M6 3v5a6 6 0 0 0 12 0V3M4 3h4M16 3h4M12 14v3a4 4 0 0 0 8 0v-1" /><circle cx="20" cy="14" r="1" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    alert: <><path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-4L3 9M4 13a8 8 0 0 0 14.8 4L21 15" /><path d="M3 4v5h5M21 20v-5h-5" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function iconFor(category: ActivityCategory): IconName {
  if (category === 'note') return 'note';
  if (category === 'document') return 'document';
  if (category === 'result') return 'result';
  if (category === 'appointment') return 'appointment';
  if (category === 'medication') return 'medication';
  if (category === 'task') return 'task';
  if (category === 'condition') return 'condition';
  if (category === 'care-gap') return 'care-gap';
  if (category === 'message') return 'message';
  if (category === 'encounter') return 'encounter';
  return 'history';
}

function formatDate(value?: string, includeTime = true) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hasTime = /T|\d{1,2}:\d{2}/.test(value);
  return new Intl.DateTimeFormat(undefined, { timeZone: TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric', ...(includeTime && hasTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date);
}

function monthGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { timeZone: TIME_ZONE, month: 'long', year: 'numeric' }).format(date);
}

function initials(value?: string) {
  return (value || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function statusLabel(event: ChartActivityEvent) {
  return event.isActionable ? 'Needs review' : event.status || 'Recorded';
}

function SummaryCard({ icon, value, label, detail, tone }: { icon: IconName; value: string | number; label: string; detail: string; tone: 'teal' | 'amber' | 'violet' | 'cyan' }) {
  const surface = { teal: 'border-teal-100 bg-teal-50/70', amber: 'border-amber-100 bg-amber-50/70', violet: 'border-violet-100 bg-violet-50/70', cyan: 'border-cyan-100 bg-cyan-50/70' }[tone];
  const iconSurface = { teal: 'bg-teal-100 text-teal-700', amber: 'bg-amber-100 text-amber-700', violet: 'bg-violet-100 text-violet-700', cyan: 'bg-cyan-100 text-cyan-700' }[tone];
  return <div className={`rounded-2xl border p-5 shadow-sm ${surface}`}><div className="flex items-start justify-between gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconSurface}`}><Icon name={icon} size={19} /></div><div className="text-right"><div className="text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</div><div className="mt-1 text-xs text-slate-600">{detail}</div></div></div><div className="mt-4 text-sm font-bold text-slate-800">{label}</div></div>;
}

function ActivityBadge({ event }: { event: ChartActivityEvent }) {
  return <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${event.isActionable ? 'text-amber-800' : STATUS_TONE[event.status || ''] || 'text-slate-600'}`}>{event.isActionable ? <Icon name="alert" size={13} /> : event.status === 'Reviewed' || event.status === 'Completed' ? <Icon name="check" size={13} /> : <Icon name="clock" size={13} />}{statusLabel(event)}</span>;
}

function EventCard({ event, selected, onSelect }: { event: ChartActivityEvent; selected: boolean; onSelect: () => void }) {
  const tone = CATEGORY_TONE[event.category];
  const label = `${event.title}. ${CATEGORY_LABELS[event.category]} activity. ${event.actor?.display ? `Performed by ${event.actor.display}. ` : ''}${formatDate(event.occurredAt)}. ${event.recordHref ? 'Source record available.' : 'Source record unavailable.'}`;
  return <article tabIndex={0} aria-label={label} onClick={onSelect} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); onSelect(); } }} className={`relative cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${selected ? 'border-teal-300 bg-teal-50/40 ring-1 ring-teal-200' : 'border-slate-200/80'}`}><div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${selected ? 'bg-teal-600' : event.isActionable ? 'bg-amber-400' : 'bg-slate-200'}`} aria-hidden /><div className="flex items-start gap-4"><div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl border ${tone}`}><Icon name={iconFor(event.category)} size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-[16px] font-bold text-slate-950">{event.title}</h3><p className="mt-1 text-sm text-slate-600">{event.action}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{CATEGORY_LABELS[event.category]}</span></div><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{initials(event.actor?.display)}</span>{event.actor?.display || 'Unknown user'}{event.actor?.role ? ` - ${event.actor.role}` : ''}</span><span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} />{formatDate(event.occurredAt)}</span>{event.organization && <span>{event.organization}</span>}</div><div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3"><ActivityBadge event={event} />{event.sourceRecord && <span className="text-xs text-slate-500">{event.sourceRecord.display || event.sourceRecord.type}</span>}<span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-teal-700">View details <Icon name="arrow" size={14} /></span></div></div></div></article>;
}

function ActivityDrawer({ event, patientId, patientName, onClose }: { event: ChartActivityEvent; patientId: string; patientName: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-[var(--z-overlay)] flex justify-end bg-slate-950/30" role="presentation" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="activity-details-title" className="h-full w-full max-w-[580px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Activity details</p><h2 id="activity-details-title" className="mt-2 text-2xl font-bold text-slate-950">{event.title}</h2><p className="mt-1 text-sm text-slate-500">{formatDate(event.occurredAt)}</p></div><button type="button" onClick={onClose} aria-label="Close activity details" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="close" size={20} /></button></div><div className="mt-5 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${CATEGORY_TONE[event.category]}`}>{CATEGORY_LABELS[event.category]}</span><ActivityBadge event={event} /></div><dl className="mt-7 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Action</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.action}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Performed by</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.actor?.display || 'Unknown user'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Patient</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{patientName}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Source system</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.sourceSystem}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Source record</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.sourceRecord?.display || event.sourceRecord?.type || 'Not linked'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Record status</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.status || 'Recorded'}</dd></div></dl>{event.attentionReason && <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-2 font-bold"><Icon name="alert" size={17} />Needs attention</div><p className="mt-2 leading-6">{event.attentionReason}</p></div>}<section className="mt-8 border-t border-slate-100 pt-6"><h3 className="text-base font-bold text-slate-950">Actions</h3><div className="mt-4 flex flex-wrap gap-3">{event.recordHref ? <Link href={event.recordHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"><Icon name="arrow" size={16} />View source record</Link> : <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-500"><Icon name="alert" size={16} />Source record unavailable</span>}<Link href={`/dashboard/records/${encodeURIComponent(patientId)}/activity`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="history" size={16} />View activity history</Link></div></section><p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">Chart Activity reports meaningful operational actions. The linked source record remains authoritative for clinical content.</p></section></div>;
}

function WhatChangedDrawer({ model, onClose }: { model: ChartActivityModel; onClose: () => void }) {
  const counts = Array.from(new Set(model.allItems.map((event) => event.category))).map((category) => ({ category, count: model.allItems.filter((event) => event.category === category).length }));
  return <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="what-changed-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">Chart comparison</p><h2 id="what-changed-title" className="mt-1 text-2xl font-bold text-slate-950">What changed?</h2><p className="mt-1 text-sm text-slate-500">Meaningful chart actions in the current activity collection.</p></div><button type="button" onClick={onClose} aria-label="Close what changed" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><Icon name="close" size={20} /></button></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{counts.map(({ category, count }) => <div key={category} className={`rounded-xl border p-4 ${CATEGORY_TONE[category]}`}><div className="text-2xl font-bold text-slate-950">{count}</div><div className="mt-1 text-xs font-bold uppercase tracking-wide">{CATEGORY_LABELS[category]}</div></div>)}</div><div className="mt-7 border-t border-slate-100 pt-6"><h3 className="text-base font-bold text-slate-950">Recent meaningful changes</h3><div className="mt-4 space-y-3">{model.allItems.slice(0, 5).map((event) => <button key={event.id} type="button" onClick={onClose} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"><div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${CATEGORY_TONE[event.category]}`}><Icon name={iconFor(event.category)} size={17} /></div><div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900">{event.title}</div><div className="mt-1 text-xs text-slate-500">{event.actor?.display || 'Unknown user'} - {formatDate(event.occurredAt)}</div></div></button>)}</div></div><div className="mt-7 flex justify-end border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button></div></section></div>;
}

export default function ChartActivityWorkspace({ patientId, patientName, initialModel }: { patientId: string; patientName: string; initialModel: ChartActivityModel }) {
  const [model, setModel] = useState(initialModel);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [actor, setActor] = useState('all');
  const [range, setRange] = useState<RangeKey>('all');
  const [sort, setSort] = useState<ActivitySort>('newest');
  const [sinceLastVisit, setSinceLastVisit] = useState(false);
  const [selected, setSelected] = useState<ChartActivityEvent | null>(null);
  const [whatChanged, setWhatChanged] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range, sort });
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'all') params.set('category', category);
      if (actor !== 'all') params.set('actor', actor);
      if (sinceLastVisit) params.set('sinceLastVisit', 'true');
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/activity?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('We could not load chart activity.');
      setModel(await response.json() as ChartActivityModel);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not load chart activity.');
    } finally {
      setLoading(false);
    }
  }, [actor, category, patientId, query, range, sinceLastVisit, sort]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadActivity(); }, query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadActivity, query]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setSelected(null); setWhatChanged(false); setQuickAdd(false); setMoreOpen(false); }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const groups = useMemo(() => {
    const output: Array<{ label: string; items: ChartActivityEvent[] }> = [];
    model.items.forEach((event) => {
      const label = monthGroup(event.occurredAt);
      const existing = output.find((group) => group.label === label);
      if (existing) existing.items.push(event); else output.push({ label, items: [event] });
    });
    return output;
  }, [model.items]);
  const counts = useMemo(() => Object.fromEntries(model.allItems.map((event) => [event.category, (model.allItems.filter((item) => item.category === event.category).length)])), [model.allItems]);
  const activeFilters = [query.trim(), category !== 'all' ? category : '', actor !== 'all' ? actor : '', range !== 'all' ? range : '', sinceLastVisit ? 'Since last visit' : ''].filter(Boolean);
  const clearFilters = () => { setQuery(''); setCategory('all'); setActor('all'); setRange('all'); setSort('newest'); setSinceLastVisit(false); };
  const quickLinks = [
    { label: 'Add new note', href: `/dashboard/records/${patientId}/doctor-notes/new`, icon: 'note' as IconName },
    { label: 'Upload document', href: `/dashboard/records/${patientId}/documents?upload=1`, icon: 'document' as IconName },
    { label: 'Create follow-up task', href: `/dashboard/records/${patientId}/tasks?new=1&title=${encodeURIComponent('Follow-up task')}`, icon: 'task' as IconName },
    { label: 'Schedule follow-up', href: `/dashboard/appointments/book?patientId=${encodeURIComponent(patientId)}`, icon: 'appointment' as IconName },
    { label: 'Message patient', href: `/dashboard/records/${patientId}/messages`, icon: 'message' as IconName },
  ];

  return <main className="chart-activity-workspace pb-12 pt-7 sm:pt-9" aria-labelledby="chart-activity-title"><header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-800"><Icon name="history" size={14} />Operational chart record</div><h1 id="chart-activity-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Chart Activity</h1><p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">Meaningful changes, reviews, and actions across {patientName}&apos;s chart.</p></div><div className="flex flex-wrap gap-3"><Link href={`/dashboard/records/${patientId}/timeline`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="history" size={17} />View clinical timeline</Link><Link href={`/dashboard/records/${patientId}/documents`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="document" size={17} />View documents</Link><div className="relative"><button type="button" onClick={() => setMoreOpen((value) => !value)} aria-haspopup="menu" aria-expanded={moreOpen} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500">More</button>{moreOpen && <div role="menu" className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"><button type="button" role="menuitem" onClick={() => { setMoreOpen(false); void loadActivity(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="refresh" size={15} />Refresh activity</button><button type="button" role="menuitem" onClick={() => { setMoreOpen(false); window.print(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><Icon name="download" size={15} />Print activity</button></div>}</div></div></header>
    <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-labelledby="activity-snapshot-title"><h2 id="activity-snapshot-title" className="sr-only">Activity Snapshot</h2><SummaryCard icon="history" value={model.summary.recentActivity} label="Recent activity" detail="Last 30 days" tone="teal" /><SummaryCard icon="alert" value={model.summary.needsAction} label="Needs action" detail="Authoritative workflow state" tone="amber" /><SummaryCard icon="document" value={model.summary.documentChanges} label="Document changes" detail="All documented activity" tone="violet" /><SummaryCard icon="calendar" value={model.summary.latestActivity ? formatDate(model.summary.latestActivity.occurredAt) : '—'} label="Latest activity" detail={model.summary.latestActivity?.actor?.display || 'No activity recorded'} tone="cyan" /></section>
    {model.summary.needsAction > 0 && <section className="mt-7 rounded-3xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6" aria-labelledby="needs-attention-title"><div className="flex items-center justify-between gap-3"><div><h2 id="needs-attention-title" className="text-lg font-bold text-amber-950">Needs Attention</h2><p className="mt-1 text-sm text-amber-900/70">Review items surfaced by documented workflow state.</p></div><Icon name="alert" size={22} /></div><div className="mt-4 space-y-3">{model.allItems.filter((event) => event.isActionable).slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => setSelected(event)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white/80 p-4 text-left hover:bg-white"><span><span className="block text-sm font-bold text-slate-900">{event.title}</span><span className="mt-1 block text-xs text-slate-600">{event.attentionReason || 'Workflow action required'} - {formatDate(event.occurredAt)}</span></span><span className="text-xs font-bold text-amber-900">Review</span></button>)}</div></section>}
    <section className="mt-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="activity-filters-title"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><h2 id="activity-filters-title" className="text-lg font-bold text-slate-950">Find a chart change</h2><p className="mt-1 text-sm text-slate-500">Filter meaningful operational actions without opening the full chart timeline.</p></div><button type="button" onClick={() => setWhatChanged(true)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-900 hover:bg-cyan-100 xl:self-auto"><Icon name="history" size={16} />What changed?</button></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Activity categories"><button type="button" onClick={() => setCategory('all')} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold ${category === 'all' ? 'bg-teal-700 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>All {model.allItems.length}</button>{model.filterOptions.categories.filter((item) => ['note', 'document', 'result', 'appointment', 'medication'].includes(item)).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold ${category === item ? 'bg-teal-700 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{CATEGORY_LABELS[item]} {counts[item] || 0}</button>)}</div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)]"><label className="relative block"><span className="sr-only">Search activity</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={17} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity, actor, source..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Activity type" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="all">All activity types</option>{model.filterOptions.categories.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select><select value={actor} onChange={(event) => setActor(event.target.value)} aria-label="Clinician or actor" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="all">All users</option>{model.filterOptions.actors.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={range} onChange={(event) => setRange(event.target.value as RangeKey)} aria-label="Activity date range" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="all">All time</option><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="6m">Last 6 months</option><option value="1y">Last year</option></select><select value={sort} onChange={(event) => setSort(event.target.value as ActivitySort)} aria-label="Activity sort" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option><option value="actionable">Needs action first</option><option value="category">Activity type</option><option value="actor">Actor</option></select></div><div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => setSinceLastVisit((value) => !value)} className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-bold ${sinceLastVisit ? 'bg-cyan-700 text-white' : 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100'}`}><Icon name="history" size={14} />Since last visit</button>{activeFilters.length > 0 && <><span className="text-xs font-bold uppercase tracking-wide text-slate-400">Active filters</span>{activeFilters.map((filter) => <span key={filter} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{filter}</span>)}<button type="button" onClick={clearFilters} className="text-xs font-bold text-teal-700 underline underline-offset-2">Clear all</button></>}</div></section>
    {error && <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert"><span className="flex items-center gap-2"><Icon name="alert" size={18} />{error}. Existing activity remains visible.</span><button type="button" onClick={() => void loadActivity()} className="font-bold underline">Try again</button></div>}
    <section className="mt-7" aria-labelledby="activity-timeline-title"><div className="flex items-end justify-between gap-4"><div><h2 id="activity-timeline-title" className="text-xl font-bold text-slate-950">Activity timeline</h2><p className="mt-1 text-sm text-slate-500">{loading ? 'Updating activity...' : `${model.items.length} meaningful change${model.items.length === 1 ? '' : 's'} in this view`}</p></div>{loading && <span className="text-xs font-semibold text-teal-700" aria-live="polite">Updating...</span>}</div>{loading && model.items.length === 0 ? <div className="mt-5 space-y-4" aria-busy="true">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}</div> : model.items.length === 0 ? <div className="mt-5 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon name="history" size={27} /></div><h3 className="mt-4 text-lg font-bold text-slate-950">{activeFilters.length ? 'No activity matches your filters' : 'No chart activity yet'}</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{activeFilters.length ? 'Clear the current search or filters to see other meaningful chart actions.' : 'Meaningful changes and actions will appear here when chart workflows are completed.'}</p>{activeFilters.length > 0 && <button type="button" onClick={clearFilters} className="mt-5 text-sm font-bold text-teal-700 underline underline-offset-2">Clear filters</button>}</div> : <div className="relative mt-5 space-y-8 pl-4 before:absolute before:bottom-6 before:left-[34px] before:top-6 before:w-px before:bg-slate-200">{groups.map((group) => <div key={group.label} className="relative"><div className="mb-4 flex items-center gap-3"><div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#F6F9FB] bg-slate-700 text-white"><Icon name="calendar" size={16} /></div><h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{group.label} <span className="ml-2 text-xs font-semibold normal-case tracking-normal text-slate-400">{group.items.length} change{group.items.length === 1 ? '' : 's'}</span></h3></div><div className="ml-5 space-y-4 border-l border-slate-200 pl-8">{group.items.map((event) => <EventCard key={event.id} event={event} selected={selected?.id === event.id} onSelect={() => setSelected(event)} />)}</div></div>)}</div>}</section>
    <div className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center"><span className="text-xs leading-5 text-slate-500">Chart Activity is an operational read layer; source records remain authoritative.</span><div className="relative"><button type="button" onClick={() => setQuickAdd((value) => !value)} aria-expanded={quickAdd} aria-haspopup="menu" aria-label="Quick Add chart workflow" title="Quick Add" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"><Icon name="plus" size={17} />Quick Add</button>{quickAdd && <div role="menu" aria-label="Quick Add workflows" className="absolute bottom-14 right-0 z-20 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{quickLinks.map((link) => <Link key={link.href} href={link.href} role="menuitem" onClick={() => setQuickAdd(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><span className="text-teal-700"><Icon name={link.icon} size={17} /></span>{link.label}</Link>)}</div>}</div></div>
    {selected && <ActivityDrawer event={selected} patientId={patientId} patientName={patientName} onClose={() => setSelected(null)} />}{whatChanged && <WhatChangedDrawer model={model} onClose={() => setWhatChanged(false)} />}</main>;
}