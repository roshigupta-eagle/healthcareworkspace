'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import { Modal } from '@/design-system/components/Modal';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

type ClinicalTask = any;

export default function PatientTasksPageShell({ patient }: { patient: any }) {
  const [tasks, setTasks] = useState<ClinicalTask[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [view, setView] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}/tasks`);
      const j = await res.json();
      setTasks(j.data || []);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const out: Record<string, number> = { open: 0, dueToday: 0, overdue: 0, high: 0, mine: 0, completed: 0 };
    if (!tasks) return out;
    const now = new Date();
    tasks.forEach((t: any) => {
      const status = (t.status || '').toLowerCase();
      if (status !== 'completed' && status !== 'cancelled') out.open++;
      if (t.priority === 'high') out.high++;
      if (status === 'completed') out.completed++;
      if (t.assignee && t.assignee.id === 'dr-aris') out.mine++;
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        const diff = Math.floor((d.getTime() - now.getTime()) / (1000*60*60*24));
        if (diff < 0) out.overdue++;
        if (d.toDateString() === now.toDateString()) out.dueToday++;
      }
    });
    return out;
  }, [tasks]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    let out = tasks.slice();
    if (view === 'open') out = out.filter((t:any)=> t.status !== 'completed' && t.status !== 'cancelled');
    if (view === 'due-today') out = out.filter((t:any)=> t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());
    if (view === 'overdue') out = out.filter((t:any)=> t.dueDate && new Date(t.dueDate) < new Date() && (!t.status || t.status !== 'completed'));
    if (search) {
      const s = search.toLowerCase();
      out = out.filter((t:any)=> (t.title||'').toLowerCase().includes(s) || (t.description||'').toLowerCase().includes(s) || (t.assignee?.name||'').toLowerCase().includes(s));
    }
    return out;
  }, [tasks, view, search]);

  const selected = useMemo(() => tasks?.find((t:any)=> t.id === selectedId) || null, [tasks, selectedId]);

  async function onCreate() {
    if (!newTitle) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: newTitle, description: '' }) });
      const j = await res.json();
      const created = j.data;
      setTasks((prev:any)=> prev ? [created, ...prev] : [created]);
      setCreateOpen(false);
      setNewTitle('');
      setSelectedId(created.id);
    } catch (e) {
      console.error(e);
      alert('Failed to create task');
    } finally { setCreating(false); }
  }

  async function onAction(taskId: string, action: string, payload?: any) {
    try {
      const res = await fetch(`/api/patients/${patient.id}/tasks/${taskId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
      const j = await res.json();
      if (j.data) {
        setTasks((prev:any)=> prev ? prev.map((t:any)=> t.id===taskId ? j.data : t) : [j.data]);
      }
    } catch (e) { console.error(e); alert('Action failed'); }
  }

  return (
    <main className="min-h-screen bg-[#F6F9FB] py-8">
      <div className="max-w-[1600px] mx-auto px-6">
        {/* Breadcrumbs */}
        <nav className="mb-3 text-sm text-neutral-600" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/dashboard/records" className="text-teal-600 hover:underline">Patient Records</Link></li>
            <li className="text-neutral-400">/</li>
            <li><Link href={`/dashboard/records/${patient.id}`} className="text-teal-600 hover:underline">{patient.name}</Link></li>
            <li className="text-neutral-400">/</li>
            <li className="font-medium text-gray-800">Clinical Tasks</li>
          </ol>
        </nav>

        {/* Compact banner */}
        <div className="mb-4">
          <PatientBanner
            mrn={patient.mrn}
            firstName={(patient.name||'').split(' ')[0]}
            lastName={(patient.name||'').split(' ').slice(1).join(' ')}
            dateOfBirth={patient.dob}
            age={patient.age || 0}
            sex={(patient.gender||'Unknown') as any}
            allergies={patient.allergies || []}
            allergyHref={`/dashboard/records/${patient.id}/allergies`}
            className="rounded-lg"
            identifiers={[{ label: 'Phone', value: patient.contact?.phone || '—' }]}
            verificationStatus={'verified'}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Clinical Tasks</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage, assign, track, and complete patient-specific clinical and follow-up work.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=> setCreateOpen(true)} className="rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold">Create Task</button>
            <button onClick={()=> fetchTasks()} className="rounded-md bg-white border px-3 py-2 text-sm">Refresh</button>
            <button onClick={() => alert('Export not implemented in this preview')} className="rounded-md bg-white border px-3 py-2 text-sm">Export</button>
            <button onClick={() => alert('Open audit history')} className="rounded-md bg-white border px-3 py-2 text-sm">Audit</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard title="Open Tasks" value={counts.open} subtitle={`${counts.open} total`} />
          <StatCard title="Due Today" value={counts.dueToday} subtitle={`${counts.dueToday} today`} />
          <StatCard title="Overdue" value={counts.overdue} subtitle={`${counts.overdue} overdue`} />
          <StatCard title="High Priority" value={counts.high} subtitle={`${counts.high} high`} />
          <StatCard title="Assigned to Me" value={counts.mine} subtitle={`${counts.mine} assigned`} />
          <StatCard title="Completed Recently" value={counts.completed} subtitle={`${counts.completed} last 30d`} />
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div role="tablist" aria-label="Task views" className="flex gap-2">
            {[
              { key: 'all', label: 'All Tasks' },
              { key: 'open', label: 'Open' },
              { key: 'due-today', label: 'Due Today' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'mine', label: 'Assigned to Me' },
              { key: 'unassigned', label: 'Unassigned' },
              { key: 'completed', label: 'Completed' },
            ].map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={view === tab.key}
                onClick={() => setView(tab.key)}
                className={`px-3 py-2 rounded-md text-sm ${view === tab.key ? 'bg-teal-700 text-white' : 'bg-white border'}`}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: list */}
          <div className="lg:col-span-8">
            {/* Search + quick filters */}
            <div className="flex items-center gap-3 mb-4">
              <input aria-label="Search tasks" value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Search task title, assignee, order, result, condition, or encounter…" className="flex-1 p-2 rounded border" />
              <select aria-label="Sort" className="p-2 rounded border text-sm">
                <option value="urgent">Sort: Urgent</option>
                <option value="due">Sort: Due Date</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>

            {/* Task list */}
            <div className="bg-white rounded-lg border p-4">
              {loading ? (
                <div className="text-sm text-neutral-500">Loading tasks…</div>
              ) : !tasks || tasks.length === 0 ? (
                <div className="text-sm text-neutral-500">No clinical tasks. <button onClick={()=> setCreateOpen(true)} className="text-teal-600 underline">Create Task</button></div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-neutral-500">No tasks match these filters. <button onClick={()=> { setSearch(''); setView('all'); }} className="text-teal-600 underline">Clear filters</button></div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((t:any)=> (
                    <li key={t.id} tabIndex={0} role="button" onClick={()=> setSelectedId(t.id)} onKeyDown={(e)=> { if (e.key === 'Enter') setSelectedId(t.id); }} className={`p-3 rounded border ${selectedId===t.id ? 'bg-teal-50 border-teal-200' : 'bg-white'} flex items-center justify-between` }>
                      <div>
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="text-xs text-neutral-500">{t.description || t.relatedResources?.[0]?.display || ''}</div>
                        <div className="text-xs text-neutral-400 mt-1">Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'} • {t.assignee?.name || 'Unassigned'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs px-2 py-1 rounded-full bg-gray-100">{t.status || 'Planned'}</div>
                        <div className="text-xs px-2 py-1 rounded-full bg-gray-100">{t.priority || 'normal'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pagination / count */}
            <div className="mt-3 text-sm text-neutral-500">{filtered.length} results</div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg border p-4 min-h-[240px]">
              {selected ? (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold">{selected.title}</div>
                      <div className="text-sm text-neutral-500">{selected.category} • {selected.assignee?.name || 'Unassigned'}</div>
                    </div>
                    <div className="text-sm">{selected.status}</div>
                  </div>

                  <div className="mt-3 text-sm text-neutral-700">{selected.description}</div>

                  <div className="mt-4 flex gap-2">
                    {selected.status !== 'in-progress' && selected.status !== 'completed' && (
                      <button onClick={()=> onAction(selected.id, 'start')} className="rounded-md bg-teal-600 text-white px-3 py-2 text-sm">Start</button>
                    )}
                    {selected.status !== 'completed' && (
                      <button onClick={()=> onAction(selected.id, 'complete')} className="rounded-md bg-emerald-600 text-white px-3 py-2 text-sm">Complete</button>
                    )}
                    <button onClick={()=> { const assignee = { id: 'dr-aris', name: 'Dr. Aris Thorne' }; onAction(selected.id, 'assign', { assignee }); }} className="rounded-md bg-white border px-3 py-2 text-sm">Assign to Me</button>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium">History</h3>
                    <ul className="mt-2 text-sm text-neutral-600">
                      {(selected.history || []).slice().reverse().map((h:any)=> (
                        <li key={h.id} className="py-1">{new Date(h.timestamp).toLocaleString()} — {h.action} by {h.userName || h.userId || 'system'}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium">FHIR</h3>
                    <button onClick={async ()=> { const res = await fetch(`/api/patients/${patient.id}/tasks/${selected.id}/fhir`); const j = await res.json(); alert(JSON.stringify(j.data, null, 2).slice(0, 2000)); }} className="mt-2 text-sm text-teal-600 underline">View FHIR JSON</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">Select a task to review its details, clinical context, history, and available actions.</div>
              )}
            </div>

            {/* Audit + FHIR inspector quick access */}
            <div className="mt-3">
              <button className="w-full rounded-md bg-white border px-3 py-2 text-sm" onClick={()=> alert('Open audit history')}>View Audit History</button>
            </div>
          </div>
        </div>

        {/* Create Task modal */}
        <Modal open={createOpen} onClose={()=> setCreateOpen(false)} title="Create Task" description="Create a new clinical task for this patient" size="md">
          <div>
            <label className="text-sm text-neutral-700">Title</label>
            <input className="w-full mt-1 p-2 border rounded" value={newTitle} onChange={(e)=> setNewTitle(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=> setCreateOpen(false)} className="px-3 py-2 rounded border">Cancel</button>
              <button onClick={onCreate} className="px-3 py-2 rounded bg-teal-600 text-white">Create</button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
