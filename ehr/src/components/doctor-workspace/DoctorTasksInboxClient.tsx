"use client";

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import WorkspaceDrawer from './WorkspaceDrawer';
import type { DoctorWorkItem, DoctorWorkPriority, DoctorWorkSnapshot } from '@/lib/doctorWorkStore';

const priorityMeta: Record<DoctorWorkPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'doctor-work-badge doctor-work-badge-critical' },
  high: { label: 'High', className: 'doctor-work-badge doctor-work-badge-high' },
  normal: { label: 'Normal', className: 'doctor-work-badge doctor-work-badge-normal' },
  low: { label: 'Low', className: 'doctor-work-badge doctor-work-badge-low' },
};

const tabLabels = [
  ['all', 'All'],
  ['urgent', 'Urgent'],
  ['result-review', 'Results'],
  ['note-signature', 'Notes'],
  ['document-review', 'Documents'],
  ['follow-up', 'Follow-Ups'],
  ['task', 'Tasks'],
] as const;

type Tab = typeof tabLabels[number][0];
type CreateForm = {
  patientId: string;
  type: string;
  title: string;
  assignee: 'self' | 'unassigned';
  dueDate: string;
  priority: string;
  description: string;
  source?: DoctorWorkItem['sourceRecord'];
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    inbox: <><path d="M4 4h16v13H4z" /><path d="M4 13h4l1.5 3h5L16 13h4M8 8h8" /></>,
    alert: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.inbox}</svg>;
}

function formatDate(value?: string) {
  if (!value) return 'Not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not documented' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function taskIdFromWorkItem(item: DoctorWorkItem) {
  return item.id.startsWith('task:') ? item.id.split(':').slice(2).join(':') : null;
}

function Metric({ label, value, detail, tone, icon }: { label: string; value: number; detail: string; tone: string; icon: string }) {
  return <div className={`doctor-work-metric ${tone}`}><span className="doctor-work-metric-icon"><Icon name={icon} /></span><span className="doctor-work-metric-label">{label}</span><strong>{value}</strong><span className="doctor-work-metric-detail">{detail}</span></div>;
}

export default function DoctorTasksInboxClient({ initialData }: { initialData: DoctorWorkSnapshot }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'all');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('priority');
  const [selected, setSelected] = useState<DoctorWorkItem | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');
  const [form, setForm] = useState<CreateForm>({ patientId: searchParams.get('patientId') || '', type: 'Follow-up', title: searchParams.get('title') || '', assignee: 'self', dueDate: '', priority: 'normal', description: '', source: undefined });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const createKeyRef = useRef<string | null>(null);

  const filtered = data.items.filter((item) => {
    const normalized = query.trim().toLowerCase();
    const haystack = [item.patient.name, item.patient.mrn, item.type, item.title, item.summary, item.sourceLabel].join(' ').toLowerCase();
    if (normalized && !haystack.includes(normalized)) return false;
    if (tab === 'urgent' && item.priority !== 'critical') return false;
    if (tab === 'follow-up' && !item.type.toLowerCase().includes('follow')) return false;
    if (tab !== 'all' && tab !== 'urgent' && tab !== 'follow-up' && item.kind !== tab) return false;
    if (priority !== 'all' && item.priority !== priority) return false;
    if (status !== 'all' && item.status !== status) return false;
    return true;
  }).sort((left, right) => {
    if (sort === 'due') return (Date.parse(left.dueAt || '') || Infinity) - (Date.parse(right.dueAt || '') || Infinity);
    if (sort === 'newest') return (Date.parse(right.createdAt || '') || 0) - (Date.parse(left.createdAt || '') || 0);
    if (sort === 'oldest') return (Date.parse(left.createdAt || '') || 0) - (Date.parse(right.createdAt || '') || 0);
    if (sort === 'patient') return left.patient.name.localeCompare(right.patient.name);
    const ranks: Record<DoctorWorkPriority, number> = { critical: 4, high: 3, normal: 2, low: 1 };
    return ranks[right.priority] - ranks[left.priority] || (Date.parse(left.dueAt || '') || Infinity) - (Date.parse(right.dueAt || '') || Infinity);
  });

  async function refresh() {
    setBusy('refresh');
    setError(null);
    try {
      const response = await fetch('/api/doctor/work', { cache: 'no-store' });
      const payload = await response.json() as DoctorWorkSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'We could not load your tasks.');
      setData(payload);
      setNotice('Worklist refreshed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not load your tasks.');
    } finally {
      setBusy(null);
    }
  }

  async function updateTask(item: DoctorWorkItem, action: string) {
    const taskId = taskIdFromWorkItem(item);
    if (!taskId) return;
    setBusy(item.id);
    setError(null);
    try {
      const response = await fetch(`/api/doctor/work/${encodeURIComponent(taskId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Task update failed.');
      setSelected(null);
      setNotice(action === 'complete' ? 'Task completed.' : action === 'start' ? 'Task started.' : 'Task updated.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Task update failed.');
    } finally {
      setBusy(null);
    }
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.patientId || !form.title.trim()) return;
    setBusy('create');
    setError(null);
    try {
      const idempotencyKey = createKeyRef.current || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `task-${Date.now()}`);
      createKeyRef.current = idempotencyKey;
      const response = await fetch('/api/doctor/work', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ patientId: form.patientId, title: form.title.trim(), category: form.type, priority: form.priority, dueDate: form.dueDate || undefined, description: form.description.trim(), assignee: form.assignee === 'self' ? { id: data.actor.id, name: data.actor.name, role: data.actor.role } : null, assigneeMode: form.assignee, relatedResources: form.source ? [form.source] : [] }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Task could not be created.');
      setCreateOpen(false);
      createKeyRef.current = null;
      setForm({ patientId: '', type: 'Follow-up', title: '', assignee: 'self', dueDate: '', priority: 'normal', description: '', source: undefined });
      setNotice('Task created.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Task could not be created.');
    } finally {
      setBusy(null);
    }
  }

  function openCreate(item?: DoctorWorkItem) {
    createKeyRef.current = null;
    setForm({ patientId: item?.patient.id || '', type: item?.type || 'Follow-up', title: item ? `Follow up: ${item.title}` : '', assignee: 'self', dueDate: '', priority: item?.priority === 'critical' ? 'urgent' : item?.priority || 'normal', description: item?.summary || '', source: item?.sourceRecord });
    setCreateOpen(true);
  }

  return <main className="doctor-workspace-page" aria-labelledby="tasks-inbox-title">
    <header className="doctor-workspace-page-header"><div><div className="doctor-work-eyebrow">Clinical work queue</div><h1 id="tasks-inbox-title">Tasks &amp; Inbox</h1><p>Clinical work, review requests and follow-up actions assigned to you.</p><div className="doctor-work-context">{data.actor.name} · {data.actor.role}</div></div><div className="doctor-work-header-actions"><button type="button" className="doctor-work-primary-button" onClick={() => openCreate()}>+ Create Task</button><button type="button" className="doctor-work-secondary-button" onClick={() => void refresh()} disabled={busy === 'refresh'}><Icon name="refresh" size={15} />{busy === 'refresh' ? 'Refreshing' : 'Refresh'}</button></div></header>
    {error && <div role="alert" className="doctor-work-alert doctor-work-alert-error">{error}</div>}
    {notice && <div role="status" className="doctor-work-alert doctor-work-alert-success">{notice}</div>}
    <section className="doctor-work-metrics" aria-label="Task summary"><Metric label="My Open Work" value={data.counts.open} detail="requires attention" tone="doctor-work-metric-blue" icon="inbox" /><Metric label="Urgent" value={data.counts.urgent} detail="critical priority" tone="doctor-work-metric-red" icon="alert" /><Metric label="Due Today" value={data.counts.dueToday} detail="time-sensitive" tone="doctor-work-metric-amber" icon="calendar" /><Metric label="Overdue" value={data.counts.overdue} detail="past due" tone="doctor-work-metric-coral" icon="clock" /></section>
    <section className="doctor-work-surface"><div className="doctor-work-tabs" role="tablist" aria-label="Task categories">{tabLabels.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{label}{value === 'urgent' && data.counts.urgent > 0 && <span className="doctor-work-tab-count">{data.counts.urgent}</span>}{value === 'result-review' && data.counts.results > 0 && <span className="doctor-work-tab-count">{data.counts.results}</span>}{value === 'note-signature' && data.counts.notes > 0 && <span className="doctor-work-tab-count">{data.counts.notes}</span>}{value === 'document-review' && data.counts.documents > 0 && <span className="doctor-work-tab-count">{data.counts.documents}</span>}</button>)}</div><div className="doctor-work-toolbar"><label className="doctor-work-search">Search tasks, patients, records...<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, patients, records..." /></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="overdue">Overdue</option></select></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="priority">Clinical priority</option><option value="due">Due date</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="patient">Patient</option></select></label></div></section>
    <section className="doctor-work-surface doctor-work-list" aria-labelledby="worklist-title"><div className="doctor-work-list-header"><div><div className="doctor-work-eyebrow">Action inbox</div><h2 id="worklist-title">Worklist</h2></div><span className="doctor-work-result-count">{filtered.length} shown</span></div>{filtered.length === 0 ? <div className="doctor-work-empty"><span>✓</span><div><strong>You&apos;re caught up.</strong><p>No assigned clinical work currently requires attention.</p></div></div> : <div className="doctor-work-rows">{filtered.map((item) => <article key={item.id} className="doctor-work-row"><div className="doctor-work-row-main"><div className="doctor-work-patient-line"><span className="doctor-work-patient">{item.patient.name}</span><span className={priorityMeta[item.priority].className}>{priorityMeta[item.priority].label}</span><span className={`doctor-work-status doctor-work-status-${item.status}`}>{item.status.replace('-', ' ')}</span></div><h3>{item.type} · {item.title}</h3><p>{item.summary}</p><div className="doctor-work-row-meta"><span>Due {formatDate(item.dueAt)}</span><span>Source {item.sourceLabel}</span>{item.assignedTo && <span>Assigned to {item.assignedTo}</span>}</div></div><div className="doctor-work-row-actions"><button type="button" className="doctor-work-secondary-button" onClick={() => setSelected(item)}>Open</button>{item.sourceHref && <Link href={item.sourceHref} className="doctor-work-text-link">Source <Icon name="arrow" size={13} /></Link>}</div></article>)}</div>}</section>
    <WorkspaceDrawer title="Task Details" open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && <div className="doctor-work-detail"><div className="doctor-work-detail-hero"><div className="doctor-work-eyebrow">{selected.type}</div><h3>{selected.title}</h3><p>{selected.patient.name} · MRN {selected.patient.mrn}</p><span className={priorityMeta[selected.priority].className}>{priorityMeta[selected.priority].label}</span></div><dl className="doctor-work-detail-grid"><div><dt>Status</dt><dd>{selected.status.replace('-', ' ')}</dd></div><div><dt>Due</dt><dd>{formatDate(selected.dueAt)}</dd></div><div><dt>Assigned to</dt><dd>{selected.assignedTo || 'Unassigned'}</dd></div><div><dt>Assigned by</dt><dd>{selected.assignedBy || 'Not documented'}</dd></div><div><dt>Created</dt><dd>{formatDate(selected.createdAt)}</dd></div><div><dt>Source</dt><dd>{selected.sourceLabel}</dd></div></dl><div className="doctor-work-detail-block"><h4>Instructions</h4><p>{selected.instructions || selected.summary || 'No instructions documented.'}</p></div>{selected.sourceHref && <Link href={selected.sourceHref} className="doctor-work-primary-button">Open source record</Link>}{selected.canonicalTask ? <div className="doctor-work-detail-actions">{selected.status === 'open' || selected.status === 'overdue' ? <button type="button" onClick={() => void updateTask(selected, 'start')} disabled={busy === selected.id} className="doctor-work-secondary-button">{busy === selected.id ? 'Saving...' : 'Start Work'}</button> : null}{['open', 'in-progress', 'overdue', 'blocked'].includes(selected.status) ? <button type="button" onClick={() => void updateTask(selected, 'complete')} disabled={busy === selected.id} className="doctor-work-primary-button">{busy === selected.id ? 'Saving...' : 'Complete Task'}</button> : null}<button type="button" onClick={() => openCreate(selected)} className="doctor-work-secondary-button">Create Follow-Up</button></div> : <div className="doctor-work-review-note">Review the authoritative source record before creating or completing clinical work. This derived item is not itself a completion record.</div>}<div className="doctor-work-detail-block"><h4>History</h4>{selected.history.length ? <ul className="doctor-work-history">{selected.history.map((entry, index) => <li key={`${entry.action}-${entry.timestamp}-${index}`}><strong>{entry.action}</strong><span>{entry.actor || 'System'} · {formatDate(entry.timestamp)}</span></li>)}</ul> : <p>No task history documented.</p>}</div></div>}</WorkspaceDrawer>
    <WorkspaceDrawer title="Create Task" open={createOpen} onClose={() => setCreateOpen(false)}><form className="doctor-work-form" onSubmit={(event) => void createTask(event)}><p className="doctor-work-form-intro">Create a persistent task after choosing the patient, owner, due date, priority, and instructions.</p><label>Patient<select required value={form.patientId} onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}><option value="">Select patient</option>{data.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}</select></label><label>Task type<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option>Clinical Task</option><option>Result Review</option><option>Document Review</option><option>Note Signature</option><option>Follow-up</option><option>Care Coordination</option><option>Patient Message Follow-Up</option></select></label><label>Task title<input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to be done?" /></label><label>Assignee<select value={form.assignee} onChange={(event) => setForm((current) => ({ ...current, assignee: event.target.value as CreateForm['assignee'] }))}><option value="self">{data.actor.name}</option><option value="unassigned">Unassigned</option></select></label><div className="doctor-work-form-grid"><label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></label><label>Priority<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}><option value="urgent">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label></div><label>Instructions<textarea rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Document the requested work." /></label>{form.source && <div className="doctor-work-related-record">Related record: {form.source.display || form.source.type}</div>}<div className="doctor-work-form-actions"><button type="button" className="doctor-work-secondary-button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" disabled={busy === 'create'} className="doctor-work-primary-button">{busy === 'create' ? 'Creating...' : 'Create Task'}</button></div></form></WorkspaceDrawer>
  </main>;
}
