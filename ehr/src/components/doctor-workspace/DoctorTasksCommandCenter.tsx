"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import WorkspaceDrawer from './WorkspaceDrawer';
import type { DoctorWorkItem, DoctorWorkPriority, DoctorWorkSnapshot } from '@/lib/doctorWorkStore';
import './tasks-inbox.css';

type View = 'list' | 'kanban' | 'timeline' | 'calendar';
type Tab = 'all' | 'urgent' | 'result-review' | 'note-signature' | 'document-review' | 'follow-up' | 'task';
type Stage = 'todo' | 'in-progress' | 'pending' | 'completed';
type DateRange = 'all' | 'today' | 'week' | 'next7' | 'overdue';
type CreateForm = { patientId: string; type: string; title: string; assignee: 'self' | 'unassigned'; dueDate: string; priority: DoctorWorkPriority; description: string; sourceId: string };

type Props = { initialData: DoctorWorkSnapshot };

const tabs: Array<[Tab, string]> = [['all', 'All'], ['urgent', 'Urgent'], ['result-review', 'Results'], ['note-signature', 'Notes'], ['document-review', 'Documents'], ['follow-up', 'Follow-Ups'], ['task', 'Tasks']];
const columns: Array<[Stage, string, string]> = [['todo', 'To Do', 'todo'], ['in-progress', 'In Progress', 'progress'], ['pending', 'Pending', 'pending'], ['completed', 'Completed', 'completed']];
const priorityMeta: Record<DoctorWorkPriority, { label: string; className: string }> = {
  critical: { label: 'Urgent', className: 'tasks-priority is-urgent' },
  high: { label: 'High', className: 'tasks-priority is-high' },
  normal: { label: 'Routine', className: 'tasks-priority is-normal' },
  low: { label: 'Low', className: 'tasks-priority is-low' },
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    list: <><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></>,
    kanban: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></>,
    timeline: <><path d="M4 6h16M4 12h10M4 18h16" /><circle cx="4" cy="6" r="2" /><circle cx="4" cy="12" r="2" /><circle cx="4" cy="18" r="2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    inbox: <><path d="M4 4h16v13H4z" /><path d="M4 13h4l1.5 3h5L16 13h4M8 8h8" /></>,
    alert: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    patient: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0114 0" /></>,
    source: <><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    play: <path d="m8 5 11 7-11 7z" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    pending: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.inbox}</svg>;
}

function previewQuery(searchParams: URLSearchParams) {
  const query = new URLSearchParams();
  const asUser = searchParams.get('asUser');
  if (asUser) query.set('asUser', asUser);
  else if (['1', 'true'].includes(searchParams.get('noauth') || '')) query.set('noauth', '1');
  return query.toString();
}

function withPreview(href: string, searchParams: URLSearchParams) {
  const query = previewQuery(searchParams);
  return query ? `${href}${href.includes('?') ? '&' : '?'}${query}` : href;
}

function taskId(item: DoctorWorkItem) {
  return item.id.startsWith('task:') ? item.id.split(':').slice(2).join(':') : null;
}

function dateValue(value?: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year || 0, (month || 1) - 1, day || 1, 12);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const parsed = dateValue(value);
  return parsed ? new Intl.DateTimeFormat('en-US', options).format(parsed) : 'Not documented';
}

function dueLabel(item: DoctorWorkItem, now: Date) {
  const due = dateValue(item.dueAt);
  if (!due) return 'No due date';
  if (item.status === 'overdue') return `Overdue ${Math.max(1, Math.ceil((now.getTime() - due.getTime()) / 86400000))}d`;
  if (due.toDateString() === now.toDateString()) return 'Today';
  return formatDate(item.dueAt);
}

function stageFor(item: DoctorWorkItem): Stage {
  if (item.status === 'completed') return 'completed';
  if (item.status === 'in-progress') return 'in-progress';
  if (item.status === 'blocked') return 'pending';
  return 'todo';
}

function stageLabel(stage: Stage) {
  return columns.find(([value]) => value === stage)?.[1] || 'To Do';
}

function isOpen(item: DoctorWorkItem) {
  return !['completed', 'cancelled', 'failed'].includes(item.status);
}

function filterDate(item: DoctorWorkItem, range: DateRange, now: Date) {
  const due = dateValue(item.dueAt);
  if (range === 'all') return true;
  if (range === 'overdue') return item.status === 'overdue';
  if (!due) return false;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'today') return due.toDateString() === start.toDateString();
  if (range === 'week') return due.getTime() >= start.getTime() && due.getTime() < start.getTime() + 7 * 86400000;
  return due.getTime() >= start.getTime() && due.getTime() < start.getTime() + 8 * 86400000;
}

function avatar(name?: string) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: string; tone: string }) {
  return <div className={`tasks-metric ${tone}`}><span className="tasks-metric-icon"><Icon name={icon} size={17} /></span><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></div>;
}

function TaskCard({ item, now, searchParams, onOpen, onDragStart, onDrop, onMenu, menuOpen, onAction }: { item: DoctorWorkItem; now: Date; searchParams: URLSearchParams; onOpen: () => void; onDragStart: () => void; onDrop: () => void; onMenu: () => void; menuOpen: boolean; onAction: (action: string) => void }) {
  const stage = stageFor(item);
    const menuActions: Array<[string, string]> = [];
    if (item.canonicalTask && stage === 'todo') menuActions.push(['start', 'Start Work']);
    if (item.canonicalTask && stage === 'in-progress') menuActions.push(['hold', 'Move to Pending']);
    if (item.canonicalTask && stage === 'pending') menuActions.push(['resume', 'Resume Work']);
    if (item.canonicalTask && item.canComplete && (stage === 'in-progress' || stage === 'pending')) menuActions.push(['complete', 'Complete Task']);
  return <article className={`tasks-card is-${stage}`} draggable={item.canonicalTask} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><div className="tasks-card-top"><span className="tasks-category">{item.type}</span><div className="tasks-card-menu-wrap"><button type="button" className="tasks-icon-button" onClick={onMenu} aria-label={`More actions for ${item.title}`} aria-expanded={menuOpen} title="More actions"><Icon name="more" size={16} /></button>{menuOpen && <div className="tasks-card-menu" role="menu"><button type="button" role="menuitem" onClick={onOpen}>Open Task</button><Link role="menuitem" href={withPreview(item.patient.href, searchParams)}>Open Patient</Link>{item.sourceHref && <Link role="menuitem" href={withPreview(item.sourceHref, searchParams)}>Open Source</Link>}{menuActions.map(([action, label]) => <button type="button" role="menuitem" key={action} onClick={() => onAction(action)}>{label}</button>)}<button type="button" role="menuitem" onClick={() => onAction('follow-up')}>Create Follow-Up</button></div>}</div></div><button type="button" className="tasks-card-open" onClick={onOpen}><h3>{item.title}</h3><p>{item.summary}</p><span className="tasks-card-patient"><span className="tasks-avatar">{avatar(item.patient.name)}</span><span><small>Patient</small><strong>{item.patient.name}</strong></span></span><span className="tasks-card-owner"><span className="tasks-avatar is-owner">{avatar(item.assignedTo)}</span><span><small>Assigned to</small><strong>{item.assignedTo || 'Unassigned'}</strong></span></span></button><div className="tasks-card-footer"><span><Icon name="calendar" size={13} />{dueLabel(item, now)}</span><span className={priorityMeta[item.priority].className}>{priorityMeta[item.priority].label}</span></div></article>;
}

function Kanban({ items, now, searchParams, onOpen, onDragStart, onDrop, onMenu, menuId, onAction, onAdd }: { items: DoctorWorkItem[]; now: Date; searchParams: URLSearchParams; onOpen: (item: DoctorWorkItem) => void; onDragStart: (item: DoctorWorkItem) => void; onDrop: (stage: Stage) => void; onMenu: (id: string) => void; menuId: string | null; onAction: (item: DoctorWorkItem, action: string) => void; onAdd: () => void }) {
  return <div className="tasks-kanban" aria-label="Clinical task workflow board">{columns.map(([stage, label, tone]) => { const stageItems = items.filter((item) => stageFor(item) === stage); return <section className={`tasks-lane is-${tone}`} key={stage} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(stage)} aria-labelledby={`tasks-lane-${stage}`}><header className="tasks-lane-header"><div><span className="tasks-lane-icon"><Icon name={stage === 'todo' ? 'list' : stage === 'in-progress' ? 'play' : stage === 'pending' ? 'pending' : 'check'} size={15} /></span><h2 id={`tasks-lane-${stage}`}>{label}</h2><span className="tasks-lane-count">{stageItems.length}</span></div><button type="button" className="tasks-lane-add" onClick={onAdd} aria-label={`Add task to ${label}`} title="Add task"><Icon name="plus" size={16} /></button></header><div className="tasks-lane-body">{stageItems.length ? stageItems.map((item) => <TaskCard item={item} now={now} searchParams={searchParams} key={item.id} onOpen={() => onOpen(item)} onDragStart={() => onDragStart(item)} onDrop={() => onDrop(stage)} onMenu={() => onMenu(item.id)} menuOpen={menuId === item.id} onAction={(action) => onAction(item, action)} />) : <div className="tasks-lane-empty">{stage === 'todo' ? 'No tasks waiting to start.' : stage === 'in-progress' ? 'No tasks currently in progress.' : stage === 'pending' ? 'Nothing is currently pending.' : 'No completed tasks in this period.'}</div>}<button type="button" className="tasks-add-task" onClick={onAdd}><Icon name="plus" size={14} /> Add Task</button></div></section>; })}</div>;
}

function ListView({ items, now, searchParams, onOpen }: { items: DoctorWorkItem[]; now: Date; searchParams: URLSearchParams; onOpen: (item: DoctorWorkItem) => void }) {
  return <div className="tasks-list-table" role="table" aria-label="Clinical work list"><div className="tasks-list-head" role="row"><span>Patient</span><span>Task</span><span>Type</span><span>Priority</span><span>Status</span><span>Due</span><span>Owner</span><span>Source</span><span>Action</span></div>{items.length ? items.map((item) => <div className="tasks-list-row" role="row" key={item.id}><span className="tasks-list-patient"><span className="tasks-avatar">{avatar(item.patient.name)}</span><strong>{item.patient.name}</strong><small>MRN {item.patient.mrn}</small></span><span><strong>{item.title}</strong><small>{item.summary}</small></span><span>{item.type}</span><span><span className={priorityMeta[item.priority].className}>{priorityMeta[item.priority].label}</span></span><span><span className={`tasks-status is-${stageFor(item)}`}>{stageLabel(stageFor(item))}</span></span><span>{dueLabel(item, now)}</span><span>{item.assignedTo || 'Unassigned'}</span><span><Link href={item.sourceHref ? withPreview(item.sourceHref, searchParams) : withPreview(item.patient.href, searchParams)} className="tasks-source-link">{item.sourceLabel}</Link></span><span><button type="button" className="tasks-open-link" onClick={() => onOpen(item)}>Open <Icon name="arrow" size={13} /></button></span></div>) : <div className="tasks-empty"><Icon name="check" size={20} /><strong>You&apos;re caught up.</strong><p>No clinical work matches these filters.</p></div>}</div>;
}

function TimelineView({ items, now, onOpen }: { items: DoctorWorkItem[]; now: Date; onOpen: (item: DoctorWorkItem) => void }) {
  const groups = new Map<string, DoctorWorkItem[]>();
  items.forEach((item) => { const key = item.status === 'overdue' ? 'Overdue' : item.dueAt ? formatDate(item.dueAt, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'; groups.set(key, [...(groups.get(key) || []), item]); });
  return <div className="tasks-timeline-view">{groups.size ? [...groups.entries()].map(([label, group]) => <section className="tasks-timeline-group" key={label}><h2>{label}</h2><div>{group.map((item) => <button type="button" className="tasks-timeline-item" key={item.id} onClick={() => onOpen(item)}><span className={`tasks-timeline-marker is-${stageFor(item)}`} /><span><strong>{item.title}</strong><small>{item.patient.name} · {item.type} · {dueLabel(item, now)}</small></span><span className={priorityMeta[item.priority].className}>{priorityMeta[item.priority].label}</span><Icon name="arrow" size={14} /></button>)}</div></section>) : <div className="tasks-empty"><Icon name="check" size={20} /><strong>You&apos;re caught up.</strong><p>No clinical work matches these filters.</p></div>}</div>;
}

function CalendarView({ items, now, onOpen }: { items: DoctorWorkItem[]; now: Date; onOpen: (item: DoctorWorkItem) => void }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const dayCount = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + dayCount) / 7) * 7 }, (_, index) => index - firstWeekday + 1);
  return <div className="tasks-calendar"><div className="tasks-calendar-heading"><div className="tasks-calendar-nav"><button type="button" className="tasks-icon-button" onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Previous month"><Icon name="arrow" size={14} /></button><h2>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthCursor)}</h2><button type="button" className="tasks-icon-button" onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Next month"><Icon name="arrow" size={14} /></button></div><span>{items.length} tasks in view</span></div><div className="tasks-calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="tasks-calendar-grid">{cells.map((day) => { const date = day > 0 && day <= dayCount ? new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day) : null; const dayItems = date ? items.filter((item) => { const due = dateValue(item.dueAt); return due?.toDateString() === date.toDateString(); }) : []; return <div className={`tasks-calendar-day ${date?.toDateString() === now.toDateString() ? 'is-today' : ''}`} key={`${day}-${date?.toISOString() || 'empty'}`}>{date && <strong>{day}</strong>}{dayItems.map((item) => <button type="button" className={`tasks-calendar-item is-${stageFor(item)}`} key={item.id} onClick={() => onOpen(item)}>{item.title}</button>)}</div>; })}</div></div>;
}

export default function DoctorTasksCommandCenter({ initialData }: Props) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>((searchParams.get('view') as View) || 'kanban');
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'all');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');
  const [owner, setOwner] = useState('all');
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selected, setSelected] = useState<DoctorWorkItem | null>(null);
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>({ patientId: searchParams.get('patientId') || '', type: 'Follow-up', title: '', assignee: 'self', dueDate: '', priority: 'normal', description: '', sourceId: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragged, setDragged] = useState<DoctorWorkItem | null>(null);
  const deferredQuery = useDeferredValue(query);
  const [now] = useState(() => new Date());
  const apiQuery = previewQuery(searchParams);

  const filtered = useMemo(() => data.items.filter((item) => {
    if (item.status === 'cancelled' || item.status === 'failed') return false;
    const normalized = deferredQuery.trim().toLowerCase();
    const haystack = [item.patient.name, item.patient.mrn, item.type, item.title, item.summary, item.sourceLabel, item.assignedTo].filter(Boolean).join(' ').toLowerCase();
    if (normalized && !haystack.includes(normalized)) return false;
    if (tab === 'urgent' && item.priority !== 'critical') return false;
    if (tab === 'follow-up' && !item.type.toLowerCase().includes('follow')) return false;
    if (tab !== 'all' && tab !== 'urgent' && tab !== 'follow-up' && item.kind !== tab) return false;
    if (priority !== 'all' && item.priority !== priority) return false;
    if (owner === 'mine' && (!item.assignedTo || item.assignedTo.toLowerCase() !== data.actor.name.toLowerCase())) return false;
    if (owner === 'unassigned' && item.assignedTo) return false;
    if (stageFilter !== 'all' && stageFor(item) !== stageFilter) return false;
    return filterDate(item, dateRange, now);
  }).sort((left, right) => (left.status === 'overdue' ? -1 : right.status === 'overdue' ? 1 : (Date.parse(left.dueAt || '') || Infinity) - (Date.parse(right.dueAt || '') || Infinity))), [data.actor.name, data.items, dateRange, deferredQuery, now, owner, priority, stageFilter, tab]);

  async function refresh() {
    setBusy('refresh'); setError(null);
    try { const response = await fetch(`/api/doctor/work${apiQuery ? `?${apiQuery}` : ''}`, { cache: 'no-store' }); const payload = await response.json() as DoctorWorkSnapshot & { error?: string }; if (!response.ok) throw new Error(payload.error || 'We could not load your clinical work.'); setData(payload); setNotice('Clinical work refreshed.'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not load your clinical work.'); } finally { setBusy(null); }
  }

  async function updateTask(item: DoctorWorkItem, action: string) {
    const id = taskId(item);
    if (!id) { setError('This derived review item must be completed through its source workflow.'); return; }
    if (action === 'complete' && !item.canComplete) { setError('Complete the required source workflow before completing this task.'); return; }
    setBusy(item.id); setError(null); setMenuId(null);
    try { const response = await fetch(`/api/doctor/work/${encodeURIComponent(id)}${apiQuery ? `?${apiQuery}` : ''}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, expectedUpdatedAt: item.updatedAt }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Task update failed.'); setSelected(null); setNotice(action === 'complete' ? 'Task completed.' : action === 'start' ? 'Task started.' : action === 'hold' ? 'Task moved to Pending.' : action === 'resume' ? 'Task resumed.' : 'Task updated.'); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Task update failed.'); } finally { setBusy(null); }
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.patientId || !form.title.trim()) return;
    setBusy('create'); setError(null);
    try { const source = data.items.find((item) => item.id === form.sourceId)?.sourceRecord; const key = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `task-${form.patientId}-${form.title.trim()}`; const response = await fetch(`/api/doctor/work${apiQuery ? `?${apiQuery}` : ''}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ patientId: form.patientId, title: form.title.trim(), category: form.type, priority: form.priority, dueDate: form.dueDate || undefined, description: form.description.trim(), assigneeMode: form.assignee, relatedResources: source ? [source] : [] }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error || 'Task could not be created.'); setCreateOpen(false); setNotice('Clinical task created.'); setForm({ patientId: '', type: 'Follow-up', title: '', assignee: 'self', dueDate: '', priority: 'normal', description: '', sourceId: '' }); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Task could not be created.'); } finally { setBusy(null); }
  }

  function openCreate(item?: DoctorWorkItem) { setSelected(null); setMenuId(null); setForm({ patientId: item?.patient.id || '', type: item?.type || 'Follow-up', title: item ? `Follow up: ${item.title}` : '', assignee: 'self', dueDate: '', priority: item?.priority === 'critical' ? 'urgent' : item?.priority || 'normal', description: item?.summary || '', sourceId: item?.id || '' }); setCreateOpen(true); }
  function clearFilters() { setQuery(''); setPriority('all'); setOwner('all'); setStageFilter('all'); setDateRange('all'); setTab('all'); }
  function handleDrop(stage: Stage) { if (!dragged) return; const current = stageFor(dragged); setDragged(null); if (current === stage) return; if (!dragged.canonicalTask) { setError('This review item must be advanced through its source workflow.'); return; } const action = stage === 'in-progress' ? 'start' : stage === 'pending' ? 'hold' : stage === 'completed' ? 'complete' : 'reset'; void updateTask(dragged, action); }

  const sourceOptions = data.items.filter((item) => item.sourceRecord);
  const viewButtons: Array<[View, string, string]> = [['list', 'List', 'list'], ['kanban', 'Kanban', 'kanban'], ['timeline', 'Timeline', 'timeline'], ['calendar', 'Calendar', 'calendar']];
  return <div className="tasks-command-center" aria-labelledby="tasks-inbox-title"><header className="tasks-header"><div><span className="tasks-eyebrow">Clinical work queue</span><h1 id="tasks-inbox-title">Tasks &amp; Inbox</h1><p>Clinical work, review requests and follow-up actions assigned to you.</p><span className="tasks-context"><span className="tasks-context-avatar">{avatar(data.actor.name)}</span>{data.actor.name} · {data.actor.role}</span></div><div className="tasks-header-actions"><button type="button" className="tasks-primary-button" onClick={() => openCreate()}><Icon name="plus" size={15} /> Create Task</button><button type="button" className="tasks-secondary-button" onClick={() => void refresh()} disabled={busy === 'refresh'}><Icon name="refresh" size={15} /> {busy === 'refresh' ? 'Refreshing' : 'Refresh'}</button></div></header>{error && <div className="tasks-alert is-error" role="alert"><Icon name="alert" size={15} />{error}<button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><Icon name="close" size={14} /></button></div>}{notice && <div className="tasks-alert is-success" role="status"><Icon name="check" size={15} />{notice}</div>}<section className="tasks-metrics" aria-label="Clinical work snapshot"><Metric label="My Open Work" value={data.counts.open} detail="assigned clinical work" icon="inbox" tone="is-blue" /><Metric label="Urgent" value={data.counts.urgent} detail="requires priority review" icon="alert" tone="is-coral" /><Metric label="Due Today" value={data.counts.dueToday} detail="time-sensitive" icon="calendar" tone="is-amber" /><Metric label="Overdue" value={data.counts.overdue} detail="past due" icon="clock" tone="is-red" /></section><section className="tasks-filter-surface"><div className="tasks-category-tabs" role="tablist" aria-label="Clinical work categories">{tabs.map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}{value === 'urgent' && data.counts.urgent > 0 && <span>{data.counts.urgent}</span>}{value === 'result-review' && data.counts.results > 0 && <span>{data.counts.results}</span>}{value === 'note-signature' && data.counts.notes > 0 && <span>{data.counts.notes}</span>}{value === 'document-review' && data.counts.documents > 0 && <span>{data.counts.documents}</span>}</button>)}</div><div className="tasks-filter-bar"><label className="tasks-search"><Icon name="search" size={16} /><span className="sr-only">Search clinical work</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }} placeholder="Search tasks, patients, MRNs, sources..." /></label><label><span>Owner</span><select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="mine">My Tasks</option><option value="all">All Owners</option><option value="unassigned">Unassigned</option></select></label><label><span>Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="all">All priorities</option><option value="critical">Urgent</option><option value="high">High</option><option value="normal">Routine</option><option value="low">Low</option></select></label><label><span>Status</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as Stage | 'all')}><option value="all">All stages</option><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="pending">Pending</option><option value="completed">Completed</option></select></label><label><span>Due</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)}><option value="all">All dates</option><option value="today">Today</option><option value="week">This week</option><option value="next7">Next 7 days</option><option value="overdue">Overdue</option></select></label><button type="button" className="tasks-clear-button" onClick={clearFilters}>Clear</button></div></section><section className="tasks-view-toolbar"><div className="tasks-view-switcher" role="tablist" aria-label="Clinical work views">{viewButtons.map(([value, label, icon]) => <button type="button" role="tab" aria-selected={view === value} key={value} onClick={() => { setView(value); window.localStorage.setItem('roshi-tasks-view', value); }}><Icon name={icon} size={15} /> {label}</button>)}</div><span className="tasks-view-count">{filtered.length} shown · {data.counts.open} open</span></section>{view === 'kanban' && <Kanban items={filtered} now={now} searchParams={searchParams} onOpen={setSelected} onDragStart={setDragged} onDrop={handleDrop} onMenu={setMenuId} menuId={menuId} onAction={updateTask} onAdd={() => openCreate()} />}{view === 'list' && <ListView items={filtered} now={now} searchParams={searchParams} onOpen={setSelected} />}{view === 'timeline' && <TimelineView items={filtered} now={now} onOpen={setSelected} />}{view === 'calendar' && <CalendarView items={filtered} now={now} onOpen={setSelected} />}<WorkspaceDrawer title="Task Details" open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && <div className="tasks-detail"><div className={`tasks-detail-hero is-${stageFor(selected)}`}><span className="tasks-eyebrow">{selected.type}</span><h2>{selected.title}</h2><p>{selected.patient.name} · MRN {selected.patient.mrn}</p><div><span className={`tasks-status is-${stageFor(selected)}`}>{stageLabel(stageFor(selected))}</span><span className={priorityMeta[selected.priority].className}>{priorityMeta[selected.priority].label}</span></div></div><dl className="tasks-detail-grid"><div><dt>Patient</dt><dd>{selected.patient.name}</dd></div><div><dt>Task type</dt><dd>{selected.type}</dd></div><div><dt>Due</dt><dd>{formatDate(selected.dueAt)}</dd></div><div><dt>Assigned to</dt><dd>{selected.assignedTo || 'Unassigned'}</dd></div><div><dt>Requested by</dt><dd>{selected.assignedBy || 'Not documented'}</dd></div><div><dt>Created</dt><dd>{formatDate(selected.createdAt)}</dd></div></dl><section className="tasks-detail-section"><h3>Instructions</h3><p>{selected.instructions || selected.summary || 'No instructions documented.'}</p></section><section className="tasks-detail-section"><h3>Source record</h3><p>{selected.sourceLabel}</p>{selected.sourceHref && <Link href={withPreview(selected.sourceHref, searchParams)} className="tasks-primary-button">Open Source <Icon name="arrow" size={14} /></Link>}</section><div className="tasks-detail-actions"><Link href={withPreview(selected.patient.href, searchParams)} className="tasks-secondary-button"><Icon name="patient" size={14} /> Open Patient</Link>{selected.canonicalTask && stageFor(selected) === 'todo' && <button type="button" className="tasks-secondary-button" disabled={busy === selected.id} onClick={() => void updateTask(selected, 'start')}><Icon name="play" size={14} /> Start Work</button>}{selected.canonicalTask && stageFor(selected) === 'in-progress' && <button type="button" className="tasks-secondary-button" disabled={busy === selected.id} onClick={() => void updateTask(selected, 'hold')}><Icon name="pending" size={14} /> Move to Pending</button>}{selected.canonicalTask && stageFor(selected) === 'pending' && <button type="button" className="tasks-secondary-button" disabled={busy === selected.id} onClick={() => void updateTask(selected, 'resume')}><Icon name="play" size={14} /> Resume Work</button>}{selected.canonicalTask && isOpen(selected) && <button type="button" className="tasks-primary-button" disabled={busy === selected.id || !selected.canComplete} onClick={() => void updateTask(selected, 'complete')}><Icon name="check" size={14} /> Complete Task</button>}<button type="button" className="tasks-secondary-button" onClick={() => openCreate(selected)}>Create Follow-Up</button></div>{!selected.canComplete && <p className="tasks-safety-note"><Icon name="alert" size={14} /> This work must be completed through the linked source workflow before the task can be marked complete.</p>}<section className="tasks-detail-section"><h3>History</h3>{selected.history.length ? <ul className="tasks-history">{selected.history.map((entry, index) => <li key={`${entry.action}-${entry.timestamp || index}`}><strong>{entry.action}</strong><span>{entry.actor || 'System'} · {formatDate(entry.timestamp)}</span></li>)}</ul> : <p>No task history is documented.</p>}</section></div>}</WorkspaceDrawer><WorkspaceDrawer title="Create Clinical Task" open={createOpen} onClose={() => setCreateOpen(false)}><form className="tasks-form" onSubmit={(event) => void createTask(event)}><p className="tasks-form-intro">Create a patient-linked task in the canonical clinical work store. New tasks begin in a valid unstarted workflow stage.</p><label>Patient<select required value={form.patientId} onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}><option value="">Select patient</option>{data.patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name} · {patient.mrn}</option>)}</select></label><label>Task type<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option>Clinical Task</option><option>Result Review</option><option>Document Review</option><option>Note Signature</option><option>Follow-up</option><option>Care Coordination</option><option>Patient Message Follow-Up</option><option>Care Gap Follow-Up</option></select></label><label>Task title<input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to be done?" /></label><div className="tasks-form-grid"><label>Assignee<select value={form.assignee} onChange={(event) => setForm((current) => ({ ...current, assignee: event.target.value as CreateForm['assignee'] }))}><option value="self">{data.actor.name}</option><option value="unassigned">Unassigned</option></select></label><label>Priority<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as DoctorWorkPriority }))}><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Routine</option><option value="low">Low</option></select></label></div><div className="tasks-form-grid"><label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></label><label>Source record<select value={form.sourceId} onChange={(event) => setForm((current) => ({ ...current, sourceId: event.target.value }))}><option value="">No source selected</option>{sourceOptions.map((item) => <option key={item.id} value={item.id}>{item.sourceLabel} · {item.patient.name}</option>)}</select></label></div><label>Instructions<textarea rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Concise clinical instructions" /></label><div className="tasks-form-actions"><button type="button" className="tasks-secondary-button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="tasks-primary-button" disabled={busy === 'create'}>{busy === 'create' ? 'Creating...' : 'Create Clinical Task'}</button></div></form></WorkspaceDrawer></div>;
}
