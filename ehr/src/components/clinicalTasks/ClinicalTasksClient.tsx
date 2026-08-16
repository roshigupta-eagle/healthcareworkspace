"use client";
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import SummaryCards from './SummaryCards';
import TaskList from './TaskList';
import TaskDetailPanel from './TaskDetailPanel';
import { Modal, Drawer } from './Modals';
import { mockTasks as fallbackTasks, mockUsers, mockLabResults, mockPatients } from '../../lib/mockClinicalData';
import type { Task, TabKey } from '../../lib/clinicalTypes';
import { useToast } from '@/components/Toast';
import { useRouter, useSearchParams } from 'next/navigation';

type ViewKey = 'focus' | 'list' | 'calendar' | 'team';

export default function ClinicalTasksClient({ initialTasks: initialTasksProp, patientId }: { initialTasks?: Task[]; patientId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>((initialTasksProp ?? fallbackTasks) as Task[]);
  const [view, setView] = useState<ViewKey>((searchParams.get('view') as ViewKey) ?? 'focus');
  const [search, setSearch] = useState<string>((searchParams.get('q') ?? ''));
  const [filters, setFilters] = useState<{ priorities: string[]; statuses: string[]; assignedTo?: string | undefined }>({ priorities: [], statuses: [], assignedTo: undefined });
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('task') ?? tasks[0]?.id ?? null);
  const [openNew, setOpenNew] = useState(false);
  const [openDelegate, setOpenDelegate] = useState(false);
  const [openResults, setOpenResults] = useState<{ open: boolean; resultId?: string | null }>({ open: false });
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const currentUserId = 'u1';
  const toast = useToast();
  const announcementsRef = useRef<HTMLDivElement | null>(null);

  // Fetch tasks
  useEffect(() => {
    let mounted = true;
    async function fetchTasks() {
      try {
        const url = patientId ? `/api/tasks?patientId=${encodeURIComponent(patientId)}` : `/api/tasks`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (mounted && data?.tasks) {
          setTasks(data.tasks as Task[]);
          setLastSynced(new Date().toISOString());
        }
      } catch (err) {
        // fallback already seeded
      }
    }
    fetchTasks();
    return () => { mounted = false; };
  }, [patientId]);

  // SSE / EventSource for real-time updates (fallbacks to polling in environments without SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    let pollId: any = null;
    const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        es = new EventSource(`/api/tasks/events${qs}`);
        es.onopen = () => { setConnected(true); };
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.task) {
              setTasks((prev) => upsertTask(prev, msg.task));
              announce(`New task: ${msg.task.title}`);
            }
          } catch (e) {
            // ignore
          }
        };
        es.onerror = () => { setConnected(false); es?.close(); es = null; };
      } else {
        // polling fallback
        pollId = setInterval(async () => {
          const res = await fetch(`/api/tasks${qs}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.tasks) setTasks((prev) => mergeTaskLists(prev, data.tasks));
          }
        }, 10000);
      }
    } catch {
      // ignore
    }
    return () => { if (es) es.close(); if (pollId) clearInterval(pollId); };
  }, [patientId]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement && (document.activeElement as HTMLElement).tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && (document.activeElement as HTMLElement).getAttribute('contenteditable') === 'true')) return;
      if (e.key === '/') {
        const el = document.querySelector('input[aria-label="Search tasks"]') as HTMLInputElement | null;
        if (el) { el.focus(); e.preventDefault(); }
      }
      if (e.key.toLowerCase() === 'n') setOpenNew(true);
      if (e.key.toLowerCase() === 'f') { /* open filter popover if exists */ }
      if (e.key.toLowerCase() === 'j') selectAdjacent(1);
      if (e.key.toLowerCase() === 'k') selectAdjacent(-1);
      if (e.key === 'Enter') { /* open detail handled by click */ }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tasks, selectedId]);

  function selectAdjacent(delta: number) {
    const visible = getVisibleTasks(tasks, { search, filters });
    if (!visible.length) return;
    const idx = Math.max(0, visible.findIndex((t) => t.id === selectedId));
    const next = visible[(idx + delta + visible.length) % visible.length];
    if (next) handleSelect(next.id, true);
  }

  function announce(message: string) {
    try {
      if (announcementsRef.current) announcementsRef.current.textContent = message;
    } catch {}
  }

  function upsertTask(list: Task[], t: Task) {
    const map = new Map(list.map((x) => [x.id, x]));
    const existing = map.get(t.id);
    if (!existing) {
      return [t, ...list];
    }
    if (new Date(t.updatedAt || t.createdAt || 0).getTime() <= new Date(existing.updatedAt || existing.createdAt || 0).getTime()) return list;
    return list.map((x) => (x.id === t.id ? t : x));
  }

  function mergeTaskLists(a: Task[], b: Task[]) {
    const out = new Map<string, Task>();
    b.forEach((t) => out.set(t.id, t));
    a.forEach((t) => { if (!out.has(t.id)) out.set(t.id, t); });
    return Array.from(out.values()).sort((x, y) => (new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()));
  }

  function getVisibleTasks(list: Task[], opts: { search?: string; filters?: { priorities: string[]; statuses: string[]; assignedTo?: string | undefined } }) {
    const q = (opts.search || '').trim().toLowerCase();
    return list.filter((t) => {
      if (opts.filters?.priorities?.length && !opts.filters.priorities.includes(t.priority || '')) return false;
      if (opts.filters?.statuses?.length && !opts.filters.statuses.includes(t.status || '')) return false;
      if (opts.filters?.assignedTo && t.assignedTo !== opts.filters.assignedTo) return false;
      if (!q) return true;
      const patient = t.patient ? `${t.patient.givenName} ${t.patient.familyName}`.toLowerCase() : '';
      if ((t.title || '').toLowerCase().includes(q)) return true;
      if (patient.includes(q)) return true;
      if (t.id && t.id.toLowerCase().includes(q)) return true;
      return false;
    });
  }

  async function handleCreateTask(payload: { title: string; patientId?: string; assignedTo?: string | null; priority?: string; category?: string; dueAt?: string | null }) {
    const pid = payload.patientId ?? patientId ?? mockPatients[0].id;
    const temp: Task = {
      id: `temp-${Date.now()}`,
      title: payload.title,
      patientId: pid,
      patient: mockPatients.find((p) => p.id === pid) ?? mockPatients[0],
      assignedTo: payload.assignedTo ?? currentUserId,
      assignedToUser: mockUsers.find((u) => u.id === (payload.assignedTo ?? currentUserId)) ?? null,
      status: 'new',
      priority: (payload.priority as any) ?? 'medium',
      category: payload.category ?? 'General',
      dueAt: payload.dueAt ?? null,
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
      notes: [],
      activity: [],
    } as Task;
    setTasks((p) => [temp, ...p]);
    setOpenNew(false);
    setSelectedId(temp.id);
    announce('Task created');
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: temp.title, patientId: temp.patientId, assignedTo: temp.assignedTo, priority: temp.priority, category: temp.category, dueAt: temp.dueAt }) });
      const data = await res.json();
      if (data?.task) {
        setTasks((prev) => prev.map((pt) => (pt.id === temp.id ? data.task : pt)));
        announce('Task saved');
        toast?.push?.({ message: 'Task created', level: 'success' });
      }
    } catch (e) {
      toast?.push?.({ message: 'Failed to save task', level: 'error' });
    }
  }

  async function handleMarkComplete(id: string, outcome?: string) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    // For critical tasks, require outcome
    if (t.priority === 'critical' && !outcome) {
      // open a modal in future; for now, require outcome
    }
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'completed', completedAt: new Date().toISOString() } : x)));
    announce('Task completed');
    try {
      await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'complete', outcome: outcome ?? 'completed' }) });
      toast?.push?.({ message: 'Marked complete', level: 'success' });
      // select next
      const visible = getVisibleTasks(tasks, { search, filters });
      const idx = visible.findIndex((x) => x.id === id);
      const next = visible[idx + 1] ?? visible[idx - 1] ?? null;
      if (next) handleSelect(next.id, true);
    } catch {
      toast?.push?.({ message: 'Failed to update', level: 'error' });
    }
  }

  function handleDelegate(id: string, userId: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, assignedTo: userId, status: 'delegated' } : t)));
    setOpenDelegate(false);
    fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delegate', to: userId }) }).catch(() => null);
    toast?.push?.({ message: 'Task delegated', level: 'info' });
  }

  function handleOpenResults(resultId?: string | null) {
    setOpenResults({ open: true, resultId: resultId ?? null });
  }

  function handleSaveNote(taskId: string, body: string) {
    const note = { id: String(Math.random()).slice(2, 8), authorId: currentUserId, body, createdAt: new Date().toISOString() } as any;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, notes: [...(t.notes ?? []), note], activity: [...(t.activity ?? []), { id: String(Math.random()).slice(2, 8), type: 'note', detail: body, actorId: currentUserId, createdAt: new Date().toISOString() }] } : t)));
    fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'addNote', note: { body } }) }).catch(() => null);
    toast?.push?.({ message: 'Note saved', level: 'success' });
  }

  function handleSelect(id: string | null, pushUrl = false) {
    setSelectedId(id);
    if (pushUrl) {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('task', id); else url.searchParams.delete('task');
      url.searchParams.set('view', view);
      if (search) url.searchParams.set('q', search); else url.searchParams.delete('q');
      router.replace(url.pathname + url.search);
    }
  }

  // Keep search in URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (search) url.searchParams.set('q', search); else url.searchParams.delete('q');
    router.replace(url.pathname + url.search);
  }, [search]);

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null;

  // compute summary counts
  const summary = useMemo(() => {
    const myOpen = tasks.filter((t) => t.assignedTo === currentUserId && t.status !== 'completed').length;
    const critical = tasks.filter((t) => t.priority === 'critical' || (t.clinicalSeverity && t.clinicalSeverity.toLowerCase().includes('critical'))).length;
    const overdue = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'completed').length;
    const dueToday = tasks.filter((t) => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }).length;
    const completedThisWeek = tasks.filter((t) => t.completedAt && (new Date(t.completedAt).getTime() > (Date.now() - 7 * 24 * 3600 * 1000))).length;
    return { myOpen, critical, overdue, dueToday, completedThisWeek };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar active="Clinical Tasks" taskCount={tasks.length} inBasketCount={2} />

        <main className="flex-1 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Clinical Tasks</h1>
              <div className="text-sm text-slate-500">Stay on top of what matters most</div>
              <div className="mt-2 text-xs text-slate-400">Scope: {patientId ? `Tasks for ${patientId}` : 'My Tasks'} · Last sync: {lastSynced ? new Date(lastSynced).toLocaleTimeString() : '—'} {connected ? <span className="ml-2 text-xs text-teal-600">● Live</span> : <span className="ml-2 text-xs text-amber-500">● Offline</span>}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md shadow-sm">
                  <button onClick={() => setView('focus')} className={`px-3 py-2 rounded-l-md ${view === 'focus' ? 'bg-sky-600 text-white' : 'bg-white border'}`}>Focus</button>
                  <button onClick={() => setView('list')} className={`px-3 py-2 ${view === 'list' ? 'bg-sky-600 text-white' : 'bg-white border'}`}>List</button>
                  <button onClick={() => setView('calendar')} className={`px-3 py-2 ${view === 'calendar' ? 'bg-sky-600 text-white' : 'bg-white border'}`}>Calendar</button>
                  <button onClick={() => setView('team')} className={`px-3 py-2 rounded-r-md ${view === 'team' ? 'bg-sky-600 text-white' : 'bg-white border'}`}>Team</button>
                </div>

                <TopHeader search={search} onSearch={setSearch} onNew={() => setOpenNew(true)} onFilterChange={(f) => setFilters(f)} filters={filters} />
              </div>
            </div>
          </div>

          {/* Summary cards row (full width) */}
          <div className="mb-6">
            <SummaryCards tasks={tasks} currentUserId={currentUserId} />
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <TaskList tasks={tasks} view={view} tab={'all'} onTabChange={() => {}} search={search} selectedId={selectedId} onSelect={(id) => handleSelect(id, true)} onToggleComplete={(id) => handleMarkComplete(id)} />
              </div>
              <div className="lg:col-span-7">
                <TaskDetailPanel task={selectedTask} onMarkComplete={(id) => handleMarkComplete(id)} onDelegate={() => setOpenDelegate(true)} onOpenResults={handleOpenResults} onSaveNote={handleSaveNote} />
              </div>
            </div>
          </div>

          <div aria-live="polite" className="sr-only" ref={announcementsRef}></div>

          <Modal open={openNew} onClose={() => setOpenNew(false)} title="Create new task">
            <NewTaskForm patientId={patientId} onCreate={handleCreateTask} onCancel={() => setOpenNew(false)} />
          </Modal>

          <Modal open={openDelegate} onClose={() => setOpenDelegate(false)} title="Delegate task">
            <div>
              <div className="text-sm text-slate-600">Select user to delegate to</div>
              <div className="mt-2 space-y-2">
                {mockUsers.map((u) => (
                  <button key={u.id} onClick={() => { if (selectedId) handleDelegate(selectedId, u.id); }} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50">{u.name} · {u.role}</button>
                ))}
              </div>
            </div>
          </Modal>

          <Drawer open={openResults.open} onClose={() => setOpenResults({ open: false })} title="Result details">
            <div>
              {openResults.resultId ? (
                <div>
                  {mockLabResults.filter((r) => r.id === openResults.resultId).map((r) => (
                    <div key={r.id} className="space-y-2">
                      <div className="text-sm font-medium">{r.test}</div>
                      <div className="text-xs text-slate-500">{r.date}</div>
                      <div className="mt-2">{r.value} {r.unit} ({r.referenceRange})</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No result selected.</div>
              )}
            </div>
          </Drawer>
        </main>
      </div>
    </div>
  );
}

function NewTaskForm({ patientId: propPatientId, onCreate, onCancel }: { patientId?: string; onCreate: (p: { title: string; patientId?: string; assignedTo?: string | null; priority?: string; category?: string; dueAt?: string | null }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [dueAt, setDueAt] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('General');
  const patientSelection = propPatientId ?? mockPatients[0].id;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-slate-600">Title</label>
        <input aria-label="New task title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-2 mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-600">Assign to</label>
          <select className="w-full border rounded p-2 mt-1 text-sm" value={assignedTo ?? ''} onChange={(e) => setAssignedTo(e.target.value || undefined)}>
            <option value="">(Assign to me)</option>
            {mockUsers.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-600">Priority</label>
          <select className="w-full border rounded p-2 mt-1 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-600">Due</label>
          <input type="date" className="w-full border rounded p-2 mt-1" value={dueAt ?? ''} onChange={(e) => setDueAt(e.target.value || null)} />
        </div>

        <div>
          <label className="block text-sm text-slate-600">Category</label>
          <input className="w-full border rounded p-2 mt-1 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
        <button onClick={() => { if (title.trim()) onCreate({ title: title.trim(), patientId: patientSelection, assignedTo: assignedTo ?? undefined, priority, category, dueAt: dueAt ?? null }); }} className="px-4 py-2 bg-sky-600 text-white rounded">Create Task</button>
      </div>
    </div>
  );
}
