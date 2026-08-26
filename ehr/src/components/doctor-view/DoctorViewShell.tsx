"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DoctorViewShortcuts from './DoctorViewShortcuts';
import type {
  DoctorViewActionBucket,
  DoctorViewActionCategory,
  DoctorViewAlert,
  DoctorViewDrawerState,
  DoctorViewPatient,
  DoctorViewQueueItem,
  DoctorViewSnapshot,
  DoctorViewVisit,
} from './DoctorViewTypes';

const priorityStyles: Record<string, { badge: string; rail: string; label: string }> = {
  critical: { badge: 'border-red-200 bg-red-50 text-red-800', rail: 'border-l-red-500', label: 'Critical' },
  urgent: { badge: 'border-rose-200 bg-rose-50 text-rose-800', rail: 'border-l-rose-500', label: 'Urgent' },
  high: { badge: 'border-amber-200 bg-amber-50 text-amber-900', rail: 'border-l-amber-500', label: 'High' },
  normal: { badge: 'border-sky-200 bg-sky-50 text-sky-800', rail: 'border-l-sky-500', label: 'Normal' },
  low: { badge: 'border-slate-200 bg-slate-50 text-slate-700', rail: 'border-l-slate-400', label: 'Low' },
};

const actionMeta: Record<DoctorViewActionCategory, { icon: string; tone: string; href: string }> = {
  'critical-results': { icon: 'flask', tone: 'border-rose-200 bg-rose-50 text-rose-800', href: '/dashboard/tasks?tab=result-review&priority=critical' },
  'abnormal-results': { icon: 'flask', tone: 'border-amber-200 bg-amber-50 text-amber-900', href: '/dashboard/tasks?tab=result-review' },
  'unsigned-notes': { icon: 'note', tone: 'border-violet-200 bg-violet-50 text-violet-800', href: '/dashboard/tasks?tab=note-signature' },
  refills: { icon: 'pill', tone: 'border-cyan-200 bg-cyan-50 text-cyan-800', href: '/dashboard/records' },
  orders: { icon: 'clipboard', tone: 'border-teal-200 bg-teal-50 text-teal-800', href: '/dashboard/orders' },
  documents: { icon: 'folder', tone: 'border-violet-200 bg-violet-50 text-violet-800', href: '/dashboard/documents?tab=needs-review' },
  'open-work': { icon: 'list', tone: 'border-sky-200 bg-sky-50 text-sky-800', href: '/dashboard/tasks' },
  messages: { icon: 'note', tone: 'border-cyan-200 bg-cyan-50 text-cyan-800', href: '/dashboard/messages' },
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    stethoscope: <><path d="M6 3v5a4 4 0 008 0V3" /><path d="M4 3h4M12 3h4M14 12v3a4 4 0 004 4h1a2 2 0 002-2v-1" /><circle cx="19" cy="12" r="2" /></>,
    users: <><path d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 100-6M21 20v-1a4 4 0 00-3-3.8" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    alert: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="M8 12l2.5 2.5L16 9" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    building: <><path d="M4 21V4l8-2v19M12 8h8v13M8 7h1M8 11h1M8 15h1M16 12h1M16 16h1M9 21v-3h3v3" /></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" /><path d="M7 15h10" /></>,
    note: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    pill: <><path d="M7 21a5 5 0 010-10l6-6a5 5 0 017 7l-6 6a5 5 0 01-7 3z" /><path d="M8 12l7 7" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M8 10h8M8 14h6" /></>,
    folder: <><path d="M3 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.list}</svg>;
}

function formatDate(value?: string, timeZone?: string) {
  if (!value) return 'Date not documented';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not documented';
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatTime(value?: string, timeZone?: string) {
  if (!value) return 'Time not documented';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time not documented';
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatWait(minutes?: number, stale = false) {
  if (stale) return 'Wait timestamp stale; verify source';
  if (minutes == null) return 'Waiting time unavailable; verify source';
  return minutes < 60 ? `Waiting ${minutes}m` : `Waiting ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function ageLabel(patient: DoctorViewPatient) {
  return patient.age == null ? 'Age not documented' : `${patient.age} yrs`;
}

function sourceLabel(state: string) {
  if (state === 'ready') return 'Live source';
  if (state === 'partial') return 'Partially available';
  return 'Unavailable';
}

function SourceStatus({ source }: { source: { state: string; source: string; error?: string } }) {
  if (source.state === 'ready') return <span className="text-[11px] font-semibold text-emerald-700">{sourceLabel(source.state)}</span>;
  return <span className="text-[11px] font-semibold text-amber-800" title={source.error}>{sourceLabel(source.state)}</span>;
}

function MetricCard({ label, value, detail, tone, icon, onClick }: { label: string; value: number | null; detail: string; tone: string; icon: string; onClick?: () => void }) {
  const content = <><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} /></div><div className="mt-4 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</div><div className="mt-1 text-3xl font-black tabular-nums text-slate-950">{value == null ? '—' : value}</div><div className="mt-1 text-xs leading-5 text-slate-600">{detail}</div></>;
  if (!onClick) return <div className="doctor-view-surface p-5">{content}</div>;
  return <button type="button" onClick={onClick} className="doctor-view-surface w-full p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{content}</button>;
}

function PatientLabel({ patient }: { patient: DoctorViewPatient }) {
  return <div><div className="text-[15px] font-bold text-slate-950">{patient.displayName}</div><div className="mt-0.5 text-xs text-slate-500">{ageLabel(patient)}{patient.mrn ? ` · ${patient.mrn}` : ''}</div>{patient.clinicalContext && <div className="mt-3 space-y-1 text-xs text-slate-600"><div><span className="font-bold text-slate-700">Allergies:</span> {patient.clinicalContext.allergies.length ? patient.clinicalContext.allergies.join(', ') : 'No known allergies'}</div><div><span className="font-bold text-slate-700">Conditions:</span> {patient.clinicalContext.conditions.length ? patient.clinicalContext.conditions.join(', ') : 'None documented'}</div><div><span className="font-bold text-slate-700">Medications:</span> {patient.clinicalContext.medications.length ? patient.clinicalContext.medications.join(', ') : 'None documented'}</div>{patient.clinicalContext.recentResult && <div><span className="font-bold text-slate-700">Recent result:</span> {patient.clinicalContext.recentResult}</div>}<div><span className="font-bold text-slate-700">Open tasks:</span> {patient.clinicalContext.openTasks} · <span className="font-bold text-slate-700">Documents:</span> {patient.clinicalContext.recentDocuments}</div></div>}</div>;
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[var(--z-overlay)] flex bg-slate-950/30" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="doctor-view-drawer-title" className="doctor-view-drawer ml-auto flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"><h2 id="doctor-view-drawer-title" className="text-xl font-black text-slate-950">{title}</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close drawer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="close" /></button></div><div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div></div></div>;
}

function ActionBucketRow({ bucket, onOpen }: { bucket: DoctorViewActionBucket; onOpen: () => void }) {
  const meta = actionMeta[bucket.category];
  return <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.tone}`}><Icon name={meta.icon} /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-slate-900">{bucket.label}</span><span className="mt-0.5 block text-xs text-slate-500">{bucket.description}</span></span><span className="flex items-center gap-2"><span className="text-lg font-black tabular-nums text-slate-900">{bucket.available ? bucket.count : '—'}</span><Icon name="arrow" size={16} /></span></button>;
}

export default function DoctorViewShell({ initialData }: { initialData: DoctorViewSnapshot }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [drawer, setDrawer] = useState<DoctorViewDrawerState>(null);
  const [queueTab, setQueueTab] = useState<'my' | 'rooms' | 'all'>('my');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [commandState, setCommandState] = useState<Record<string, 'loading' | 'error' | 'success'>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setErrorMessage(null);
    setRefreshStatus(null);
    try {
      const response = await fetch('/api/doctor-view', { cache: 'no-store' });
      if (!response.ok) throw new Error('Doctor View could not refresh.');
      setData(await response.json() as DoctorViewSnapshot);
      setRefreshStatus('Updated just now');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Doctor View could not refresh.');
      setRefreshStatus(null);
    } finally { setRefreshing(false); }
  }

  async function acknowledge(alert: DoctorViewAlert) {
    setCommandState((current) => ({ ...current, [alert.id]: 'loading' }));
    try {
      const response = await fetch('/api/alerts/acknowledge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: alert.id, sourceSystem: alert.sourceSystem }) });
      if (!response.ok) throw new Error('Acknowledgement failed.');
      await refresh();
      setCommandState((current) => ({ ...current, [alert.id]: 'success' }));
    } catch (error) {
      setCommandState((current) => ({ ...current, [alert.id]: 'error' }));
      setErrorMessage(error instanceof Error ? error.message : 'Acknowledgement failed.');
    }
  }

  async function completeWork(item: DoctorViewQueueItem) {
    if (item.canComplete === false) return;
    setCommandState((current) => ({ ...current, [item.id]: 'loading' }));
    try {
      const response = await fetch('/api/doctor-view/work/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: item.id, queueName: item.queueName }) });
      if (!response.ok) throw new Error('Work item could not be completed.');
      await refresh();
      setCommandState((current) => ({ ...current, [item.id]: 'success' }));
    } catch (error) {
      setCommandState((current) => ({ ...current, [item.id]: 'error' }));
      setErrorMessage(error instanceof Error ? error.message : 'Work item could not be completed.');
    }
  }

  function openPatient(patient: DoctorViewPatient, visit?: DoctorViewVisit) { setDrawer({ kind: 'patient', patient, visit }); }
  const preview = process.env.NODE_ENV !== 'production' && Boolean(searchParams.get('noauth') || searchParams.get('asUser'));
  const previewQuery = searchParams.get('asUser') ? `asUser=${encodeURIComponent(searchParams.get('asUser')!)}` : 'noauth=1&asUser=dev';
  function withPreview(href?: string) {
    if (!href || !preview) return href;
    return `${href}${href.includes('?') ? '&' : '?'}${previewQuery}`;
  }
  function openSource(href?: string) { const target = withPreview(href); if (target) router.push(target); }
  function openActionItem(item: import('./DoctorViewTypes').DoctorViewActionItem) {
    if (item.sourceHref) { openSource(item.sourceHref); return; }
    setDrawer({ kind: 'patient', patient: item.patient });
  }
  const waiting = data.nextPatient.item?.waitMinutes;
  const nextPatient = data.nextPatient.item;
  const nextPatientActionHref = nextPatient?.encounterId && nextPatient.sourceHref
    ? nextPatient.sourceHref
    : nextPatient?.patient.localPatientId
      ? `/dashboard/encounters/new?patientId=${encodeURIComponent(nextPatient.patient.localPatientId)}`
      : undefined;
  const nextPatientActionLabel = nextPatient?.encounterId ? 'Open Encounter' : 'Start Encounter';
  const currentWork = queueTab === 'my' ? data.clinicalWork.items : queueTab === 'rooms' ? data.clinicalWork.items.filter((item) => item.patient.displayName !== 'Patient record unavailable') : data.clinicalWork.items;

  return <main className="doctor-view-workspace" aria-labelledby="doctor-view-title">
    <header className="doctor-view-header">
      <div className="min-w-0"><div className="doctor-view-eyebrow">Clinical workspace</div><div className="mt-2 flex flex-wrap items-center gap-3"><h1 id="doctor-view-title" className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Doctor View</h1><span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800"><Icon name="stethoscope" size={14} />{data.actor.specialty}</span></div><p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">Cardiology Command Center. Monitor today&apos;s flow, urgent attention, appointments, and clinical work.</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={15} />{data.schedule.date}</span><span className="inline-flex items-center gap-1.5"><Icon name="building" size={15} />{data.actor.clinic}</span><span className="inline-flex items-center gap-1.5"><Icon name="stethoscope" size={15} />{data.actor.name}</span></div></div></header>
    <DoctorViewShortcuts refreshing={refreshing} status={refreshStatus} onRefresh={() => void refresh()} />
    {errorMessage && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{errorMessage}</div>}

    <section aria-labelledby="clinic-pulse-heading" className="mt-8"><div className="mb-3 flex items-end justify-between gap-3"><div><div className="doctor-view-eyebrow">At a glance</div><h2 id="clinic-pulse-heading" className="mt-1 text-xl font-black text-slate-950">Clinic Pulse</h2></div><SourceStatus source={data.clinicPulse.source} /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Patients Today" value={data.clinicPulse.patientsToday} detail={`${data.clinicPulse.checkedIn ?? '—'} checked in · ${data.clinicPulse.seen ?? '—'} seen`} tone="border-blue-100 bg-blue-50 text-blue-700" icon="users" onClick={() => router.push('/dashboard/records')} /><MetricCard label="Waiting Now" value={data.clinicPulse.waitingNow} detail={`${data.clinicPulse.longestWaitMinutes == null ? 'Wait time unavailable' : `Longest wait · ${data.clinicPulse.longestWaitMinutes}m`}`} tone="border-amber-100 bg-amber-50 text-amber-800" icon="clock" onClick={() => setDrawer({ kind: 'action', bucket: { category: 'open-work', label: 'Waiting Now', description: 'Patients currently in the live clinical flow.', count: data.clinicPulse.waitingNow, available: data.nextPatient.source.state === 'ready', source: data.nextPatient.source, items: data.nextPatient.item ? [{ id: `waiting:${data.nextPatient.item.id}`, category: 'open-work', patient: data.nextPatient.item.patient, title: data.nextPatient.item.chiefComplaint || 'Waiting patient', subtitle: data.nextPatient.item.state.replace(/_/g, ' '), priority: data.nextPatient.item.priority, status: data.nextPatient.item.state, sourceHref: data.nextPatient.item.sourceHref, sourceSystem: 'Cardiology service' }] : [] } })} /><MetricCard label="Urgent Attention" value={data.clinicPulse.urgentAttention} detail={`${data.clinicPulse.unacknowledgedUrgent ?? '—'} unacknowledged`} tone="border-rose-100 bg-rose-50 text-rose-800" icon="alert" onClick={() => setDrawer({ kind: 'action', bucket: { category: 'open-work', label: 'Urgent Attention', description: 'Operationally urgent cardiology visits.', count: data.urgentAttention.items.length, available: data.urgentAttention.source.state === 'ready', source: data.urgentAttention.source, items: data.urgentAttention.items.map((alert) => ({ id: alert.id, category: 'open-work', patient: alert.patient, title: alert.title, subtitle: alert.reason, priority: alert.severity, status: alert.status, dueAt: alert.triggeredAt, sourceHref: alert.sourceHref, sourceSystem: alert.sourceSystem })) } })} /><MetricCard label="Completed Today" value={data.clinicPulse.completedToday} detail="Source-reported completed clinic work" tone="border-emerald-100 bg-emerald-50 text-emerald-700" icon="check" onClick={() => router.push('/doctor/appointments')} /></div></section>

    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,.85fr)]"><div className="space-y-6">
      <section aria-labelledby="urgent-attention-heading" className="doctor-view-surface overflow-hidden"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><div className="doctor-view-eyebrow text-rose-700">Priority work</div><h2 id="urgent-attention-heading" className="mt-1 text-xl font-black text-slate-950">Urgent Attention</h2><p className="mt-1 text-xs text-slate-500">{data.urgentAttention.items.length} active · {data.clinicPulse.unacknowledgedUrgent ?? '—'} unacknowledged. Operational priority is not a diagnostic result.</p></div><button type="button" onClick={() => setDrawer({ kind: 'action', bucket: { category: 'open-work', label: 'Urgent Attention', description: 'Operationally urgent cardiology visits.', count: data.urgentAttention.items.length, available: data.urgentAttention.source.state === 'ready', source: data.urgentAttention.source, items: data.urgentAttention.items.map((alert) => ({ id: alert.id, category: 'open-work', patient: alert.patient, title: alert.title, subtitle: alert.reason, priority: alert.severity, status: alert.status, dueAt: alert.triggeredAt, sourceHref: alert.sourceHref, sourceSystem: alert.sourceSystem })) } })} className="doctor-view-text-button">View all <Icon name="arrow" size={15} /></button></div>{data.urgentAttention.source.state !== 'ready' ? <div className="px-5 py-8 text-sm text-amber-800">{data.urgentAttention.source.error || 'Urgent source unavailable.'}</div> : data.urgentAttention.items.length === 0 ? <div className="px-5 py-8 text-sm text-emerald-700">No urgent alerts requiring attention.</div> : <div className="space-y-3 p-5">{data.urgentAttention.items.slice(0, 4).map((alert) => <article key={alert.id} className={`doctor-view-alert-row border-l-4 ${priorityStyles[alert.severity].rail}`}><div className="flex min-w-0 items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.severity === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}><Icon name="alert" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setDrawer({ kind: 'alert', alert })} className="text-left text-[15px] font-black text-slate-950 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{alert.patient.displayName}</button><span className={`doctor-view-badge ${priorityStyles[alert.severity].badge}`}>{priorityStyles[alert.severity].label}</span><span className={`doctor-view-badge ${alert.status === 'acknowledged' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>{alert.status === 'acknowledged' ? 'Acknowledged' : 'Unacknowledged'}</span></div><div className="mt-1 text-sm font-semibold text-slate-700">{alert.reason}</div><div className="mt-1 text-xs text-slate-500">{ageLabel(alert.patient)}{alert.patient.mrn ? ` · ${alert.patient.mrn}` : ''} · Triggered {formatTime(alert.triggeredAt, data.actor.timeZone)}</div></div></div><div className="flex shrink-0 flex-wrap items-center gap-2"><button type="button" onClick={() => setDrawer({ kind: 'alert', alert })} className="doctor-view-secondary-button">Details</button>{alert.sourceHref && <Link href={alert.sourceHref} className="doctor-view-secondary-button">Open source</Link>}<button type="button" onClick={() => void acknowledge(alert)} disabled={alert.status === 'acknowledged' || commandState[alert.id] === 'loading'} className="doctor-view-amber-button">{commandState[alert.id] === 'loading' ? 'Saving…' : alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</button></div></article>)}</div>}</section>

      <section aria-labelledby="next-patient-heading" className="doctor-view-next"><div className="doctor-view-eyebrow text-teal-800">Patient flow</div><div className="mt-1 flex flex-wrap items-start justify-between gap-4"><div><h2 id="next-patient-heading" className="text-xl font-black text-slate-950">Next Patient</h2>{nextPatient ? <><button type="button" onClick={() => openPatient(nextPatient.patient, nextPatient)} className="mt-2 text-left text-2xl font-black text-teal-900 hover:text-teal-700">{nextPatient.patient.displayName}</button><div className="mt-1 text-sm text-slate-700">{nextPatient.visitType || nextPatient.state.replace(/_/g, ' ')}{nextPatient.room ? ` · ${nextPatient.room}` : ''}</div><div className="mt-1 text-xs font-semibold text-slate-600">{formatWait(waiting)} · {nextPatient.state.replace(/_/g, ' ')}</div></> : <p className="mt-2 text-sm text-slate-600">No patient is currently prioritized by the live flow.</p>}</div>{nextPatient && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openPatient(nextPatient.patient, nextPatient)} className="doctor-view-primary-button">Open Patient</button>{nextPatientActionHref && <Link href={withPreview(nextPatientActionHref)!} className="doctor-view-secondary-button">{nextPatientActionLabel}</Link>}</div>}</div><div className="mt-4 text-xs text-slate-500"><SourceStatus source={data.nextPatient.source} /></div></section>

      <section aria-labelledby="clinical-work-heading" className="doctor-view-surface overflow-hidden"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><div className="doctor-view-eyebrow text-sky-700">Assigned workflow</div><h2 id="clinical-work-heading" className="mt-1 text-xl font-black text-slate-950">My Clinical Work</h2><p className="mt-1 text-xs text-slate-500">Clinical actions assigned to you or your physician queues.</p></div><div className="doctor-view-segmented" role="tablist" aria-label="Clinical work views"><button type="button" role="tab" aria-selected={queueTab === 'my'} onClick={() => setQueueTab('my')}>My Work</button><button type="button" role="tab" aria-selected={queueTab === 'rooms'} onClick={() => setQueueTab('rooms')}>Rooms</button><button type="button" role="tab" aria-selected={queueTab === 'all'} onClick={() => setQueueTab('all')}>All Queues</button></div></div>{queueTab === 'rooms' ? <div className="grid gap-3 p-5 sm:grid-cols-2">{data.rooms.length ? data.rooms.map((room) => <div key={room.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="font-bold text-slate-900">{room.name}</div><div className="mt-1 text-xs text-slate-500">{room.roomType || 'Clinical room'}</div><div className="mt-3 text-sm font-semibold text-slate-700">{room.occupancy}{room.capacity ? ` / ${room.capacity}` : ''} occupied</div><div className={`mt-2 text-xs font-bold ${room.available ? 'text-emerald-700' : 'text-amber-800'}`}>{room.available ? 'Available' : 'In use'}</div></div>) : <div className="p-5 text-sm text-slate-600">Room source unavailable or no rooms reported.</div>}</div> : currentWork.length === 0 ? <div className="p-8 text-sm text-emerald-700">You&apos;re caught up. No assigned clinical work requires action.</div> : <div className="space-y-3 p-5">{currentWork.slice(0, 6).map((item) => <article key={item.id} className="doctor-view-work-row"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setDrawer({ kind: 'work', item })} className="text-left text-[15px] font-black text-slate-950 hover:text-teal-800">{item.patient.displayName}</button><span className={`doctor-view-badge ${priorityStyles[item.priority].badge}`}>{priorityStyles[item.priority].label}</span></div><div className="mt-1 text-sm font-semibold text-slate-700">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.queueName.replace(/_/g, ' ')} · {item.status.replace(/_/g, ' ')}{item.dueAt ? ` · Due ${formatDate(item.dueAt, data.actor.timeZone)}` : ''}</div></div><div className="flex shrink-0 gap-2">{item.sourceHref && <Link href={item.sourceHref} className="doctor-view-secondary-button">Open source</Link>}<button type="button" onClick={() => setDrawer({ kind: 'work', item })} className="doctor-view-secondary-button">Details</button></div></article>)}</div>}</section>
    </div><aside className="space-y-6">
      <section aria-labelledby="schedule-heading" className="doctor-view-surface overflow-hidden"><div className="flex items-end justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><div className="doctor-view-eyebrow text-blue-700">Appointments</div><h2 id="schedule-heading" className="mt-1 text-xl font-black text-slate-950">Today&apos;s Schedule</h2><p className="mt-1 text-xs text-slate-500">Your current and upcoming clinic appointments.</p></div><SourceStatus source={data.schedule.source} /></div>{data.schedule.items.length === 0 ? <div className="p-6 text-sm text-slate-600">No appointments are recorded for {data.schedule.date}.</div> : <div className="divide-y divide-slate-100">{data.schedule.items.slice(0, 6).map((item) => <div key={item.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-950">{formatTime(item.start, data.actor.timeZone)} · {item.patient.displayName}</div><div className="mt-1 text-xs text-slate-500">{item.description || item.visitType || 'Appointment'}</div></div><span className="doctor-view-badge border-blue-200 bg-blue-50 text-blue-800">{item.status}</span></div><div className="mt-3 flex justify-end gap-2">{item.sourceHref && <Link href={item.sourceHref} className="doctor-view-secondary-button">Open appointment</Link>}<button type="button" onClick={() => openPatient(item.patient)} className="doctor-view-secondary-button">Patient</button></div></div>)}</div>}<div className="border-t border-slate-200 p-4"><Link href="/schedule/today" className="doctor-view-text-button">View full schedule <Icon name="arrow" size={15} /></Link></div></section>

      <section aria-labelledby="action-center-heading" className="doctor-view-surface overflow-hidden"><div className="flex items-end justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><div className="doctor-view-eyebrow text-violet-700">Worklist</div><h2 id="action-center-heading" className="mt-1 text-xl font-black text-slate-950">Action Center</h2><p className="mt-1 text-xs text-slate-500">Items that need clinical attention.</p></div></div><div className="space-y-2 p-4">{data.actionCenter.map((bucket) => <ActionBucketRow key={bucket.category} bucket={bucket} onOpen={() => setDrawer({ kind: 'action', bucket })} />)}</div></section>
    </aside></div>

    {drawer?.kind === 'patient' && <Drawer title="Patient Quick View" onClose={() => setDrawer(null)}><div className="space-y-5"><div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4"><PatientLabel patient={drawer.patient} /><div className="mt-3 text-sm text-slate-700">{drawer.visit?.chiefComplaint || 'No current complaint recorded.'}</div>{drawer.visit && <div className="mt-2 text-xs text-slate-500">Flow state: {drawer.visit.state.replace(/_/g, ' ')}{drawer.visit.room ? ` · ${drawer.visit.room}` : ''}</div>}</div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Birth date</dt><dd className="mt-1 font-semibold text-slate-900">{drawer.patient.birthDate ? formatDate(drawer.patient.birthDate, data.actor.timeZone) : 'Not documented'}</dd></div><div><dt className="text-xs text-slate-500">MRN</dt><dd className="mt-1 font-semibold text-slate-900">{drawer.patient.mrn || 'Not documented'}</dd></div><div><dt className="text-xs text-slate-500">Source</dt><dd className="mt-1 font-semibold text-slate-900">{drawer.patient.sourceSystem}</dd></div><div><dt className="text-xs text-slate-500">Clinical risk</dt><dd className="mt-1 font-semibold text-slate-700">Open source record for current context</dd></div></dl><div className="flex flex-wrap gap-2">{drawer.patient.localPatientId && <Link href={withPreview(`/dashboard/records/${encodeURIComponent(drawer.patient.localPatientId)}/ai-clinical-summary?from=doctor-view&returnTo=${encodeURIComponent('/doctor')}`)!} className="doctor-view-primary-button">AI Clinical Summary</Link>}{drawer.patient.chartHref && <button type="button" onClick={() => openSource(drawer.visit?.sourceHref || drawer.patient.chartHref)} className="doctor-view-secondary-button">Open full chart</button>}{drawer.patient.chartHref && <Link href={withPreview(`${drawer.patient.chartHref}/timeline`)!} className="doctor-view-secondary-button">View timeline</Link>}{drawer.patient.chartHref && <Link href={withPreview(`${drawer.patient.chartHref}/doctor-notes`)!} className="doctor-view-secondary-button">View notes</Link>}{drawer.patient.chartHref && <Link href={withPreview(`${drawer.patient.chartHref}/labs`)!} className="doctor-view-secondary-button">View results</Link>}</div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">Only compact, source-verified context is shown here. Open the full record for medications, documents, allergies, and detailed results.</div></div></Drawer>}
    {drawer?.kind === 'alert' && <Drawer title="Alert Details" onClose={() => setDrawer(null)}><div className="space-y-5"><div className={`rounded-2xl border-l-4 p-4 ${priorityStyles[drawer.alert.severity].rail} bg-rose-50/50`}><div className="flex items-center gap-2"><span className={`doctor-view-badge ${priorityStyles[drawer.alert.severity].badge}`}>{priorityStyles[drawer.alert.severity].label}</span><span className="doctor-view-badge border-slate-200 bg-white text-slate-600">{drawer.alert.status}</span></div><h3 className="mt-3 text-lg font-black text-slate-950">{drawer.alert.title}</h3><p className="mt-1 text-sm text-slate-700">{drawer.alert.reason}</p></div><dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Patient</dt><dd className="font-semibold text-slate-900">{drawer.alert.patient.displayName}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Triggered</dt><dd className="font-semibold text-slate-900">{formatDate(drawer.alert.triggeredAt, data.actor.timeZone)} · {formatTime(drawer.alert.triggeredAt, data.actor.timeZone)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Source</dt><dd className="font-semibold text-slate-900">{drawer.alert.sourceSystem}</dd></div></dl><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Acknowledgement records that a clinician reviewed this operational alert. It does not resolve the source workflow.</p><div className="flex flex-wrap gap-2">{drawer.alert.sourceHref && <Link href={drawer.alert.sourceHref} className="doctor-view-primary-button">Open source record</Link>}<button type="button" onClick={() => void acknowledge(drawer.alert)} disabled={drawer.alert.status === 'acknowledged' || commandState[drawer.alert.id] === 'loading'} className="doctor-view-amber-button">{commandState[drawer.alert.id] === 'loading' ? 'Saving…' : drawer.alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</button></div></div></Drawer>}
    {drawer?.kind === 'work' && <Drawer title="Work Item Details" onClose={() => setDrawer(null)}><div className="space-y-5"><div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4"><PatientLabel patient={drawer.item.patient} /><h3 className="mt-3 text-lg font-black text-slate-950">{drawer.item.title}</h3><p className="mt-1 text-sm text-slate-700">{drawer.item.description || 'No additional clinical context supplied.'}</p></div><dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Queue</dt><dd className="font-semibold text-slate-900">{drawer.item.queueName.replace(/_/g, ' ')}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Priority</dt><dd className="font-semibold text-slate-900">{priorityStyles[drawer.item.priority].label}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-slate-900">{drawer.item.status.replace(/_/g, ' ')}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Due</dt><dd className="font-semibold text-slate-900">{drawer.item.dueAt ? formatDate(drawer.item.dueAt, data.actor.timeZone) : 'Not documented'}</dd></div></dl><div className="flex flex-wrap gap-2">{drawer.item.sourceHref && <Link href={withPreview(drawer.item.sourceHref)!} className="doctor-view-primary-button">Open source</Link>}<button type="button" onClick={() => void completeWork(drawer.item)} disabled={drawer.item.canComplete === false || commandState[drawer.item.id] === 'loading' || ['COMPLETED', 'completed'].includes(drawer.item.status)} className="doctor-view-secondary-button">{drawer.item.canComplete === false ? 'Complete in source' : commandState[drawer.item.id] === 'loading' ? 'Saving…' : 'Complete task'}</button></div></div></Drawer>}
    {drawer?.kind === 'action' && <Drawer title={`Action Center · ${drawer.bucket.label}`} onClose={() => setDrawer(null)}><div className="space-y-4"><p className="text-sm text-slate-600">{drawer.bucket.description}</p><SourceStatus source={drawer.bucket.source} />{!drawer.bucket.available ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{drawer.bucket.source.error || 'This worklist is not available from an authoritative source.'}</div> : drawer.bucket.items.length === 0 ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">No items require attention in this worklist.</div> : <div className="space-y-2">{drawer.bucket.items.map((item) => <button key={item.id} type="button" onClick={() => openActionItem(item)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-950">{item.patient.displayName}</div><div className="mt-1 text-sm font-semibold text-slate-700">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.subtitle}</div></div><span className={`doctor-view-badge ${priorityStyles[item.priority].badge}`}>{priorityStyles[item.priority].label}</span></div></button>)}</div>}<Link href={withPreview(actionMeta[drawer.bucket.category].href)!} className="doctor-view-text-button">Open full worklist <Icon name="arrow" size={15} /></Link></div></Drawer>}
  </main>;
}
