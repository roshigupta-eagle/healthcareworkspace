"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import type { ConditionRecord } from '@/lib/conditionsStore';
import {
  clinicalStatusLabel,
  verificationLabel,
  needsReview,
  computeSnapshot,
  computeNeedsAttention,
  careGapsForCondition,
  tasksForCondition,
  availableConditionActions,
  type CareGapItem,
  type TaskItem,
} from '@/lib/conditions';
import ConditionDetailDrawer from './ConditionDetailDrawer';
import AddConditionDrawer from './AddConditionDrawer';
import CompareConditionsDrawer from './CompareConditionsDrawer';
import MultidisciplinaryReviewDrawer from './MultidisciplinaryReviewDrawer';
import ConditionStatusDialog, { type StatusAction } from './ConditionStatusDialog';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-teal-50 text-teal-800 border-teal-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  remission: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'entered-in-error': 'bg-rose-50 text-rose-700 border-rose-200',
};

type StatusFilter = 'all' | 'active' | 'resolved' | 'inactive';

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function ConditionsPageClient({ patient }: { patient: any }) {
  const patientId = patient.id;
  const [conditions, setConditions] = useState<ConditionRecord[]>([]);
  const [careGaps, setCareGaps] = useState<CareGapItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const [selectedCondition, setSelectedCondition] = useState<ConditionRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [quickAction, setQuickAction] = useState<{ condition: ConditionRecord; action: StatusAction } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoadError(null);
      const [condRes, gapRes, taskRes] = await Promise.all([
        fetch(`/api/patients/${encodeURIComponent(patientId)}/conditions`),
        fetch(`/api/patients/${encodeURIComponent(patientId)}/care-gaps`),
        fetch(`/api/patients/${encodeURIComponent(patientId)}/tasks`),
      ]);
      if (!condRes.ok) throw new Error('Unable to load conditions.');
      const condJson = await condRes.json();
      const gapJson = gapRes.ok ? await gapRes.json() : { items: [] };
      const taskJson = taskRes.ok ? await taskRes.json() : { data: [] };
      setConditions(condJson.items || []);
      setCareGaps(gapJson.items || []);
      setTasks(taskJson.data || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load condition data right now.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const snapshot = useMemo(() => computeSnapshot(conditions, careGaps, tasks), [conditions, careGaps, tasks]);
  const attention = useMemo(() => computeNeedsAttention(conditions, careGaps), [conditions, careGaps]);

  const filteredConditions = useMemo(() => {
    let list = conditions;
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') list = list.filter((c) => c.clinicalStatus === 'active');
      else if (statusFilter === 'resolved') list = list.filter((c) => c.clinicalStatus === 'resolved' || c.clinicalStatus === 'remission');
      else if (statusFilter === 'inactive') list = list.filter((c) => c.clinicalStatus === 'inactive');
    } else {
      list = list.filter((c) => c.clinicalStatus !== 'entered-in-error');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q));
    }
    return list;
  }, [conditions, statusFilter, search]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const compareConditions = compareIds.map((id) => conditions.find((c) => c.id === id)).filter(Boolean) as ConditionRecord[];

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-10 text-sm text-slate-500">Loading conditions…</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 pb-28">
      <div className="mb-4">
        <Link href={`/dashboard/records/${patient.id}`} className="inline-flex items-center text-sm text-teal-600 hover:underline gap-2">← Back to Patient</Link>
      </div>

      <PatientProfileHeader patient={patient} />

      {loadError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={fetchAll} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Conditions — Command Center</h1>
            <p className="mt-1 text-sm text-slate-500">Overview, clinical context, care gaps, and quick actions for active conditions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Add Condition</button>
            <button
              title="Problem list import is not yet configured for this workspace"
              disabled
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
            >
              Import Problem List
            </button>
          </div>
        </div>

        {/* Snapshot */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5">
            <div className="text-2xl font-bold text-teal-800">{snapshot.active}</div>
            <div className="text-xs font-medium text-teal-700 mt-0.5">Active Conditions</div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
            <div className="text-2xl font-bold text-amber-800">{snapshot.needsReviewCount}</div>
            <div className="text-xs font-medium text-amber-700 mt-0.5">Needs Review</div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
            <div className="text-2xl font-bold text-rose-800">{snapshot.careGapsOpen}</div>
            <div className="text-xs font-medium text-rose-700 mt-0.5">Care Gaps Open</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
            <div className="text-2xl font-bold text-blue-800">{snapshot.tasksOpen}</div>
            <div className="text-xs font-medium text-blue-700 mt-0.5">Open Tasks</div>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-amber-100 p-4">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Needs Attention</h2>
          <div className="space-y-2">
            {attention.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-amber-50/70 border border-amber-100 px-3 py-2 text-sm">
                <span><strong className="text-slate-900">{a.conditionName}</strong> — {a.reason}</span>
                <button onClick={() => setSelectedCondition(conditions.find((c) => c.id === a.conditionId) || null)} className="text-xs font-semibold text-amber-800 hover:underline flex-shrink-0">Review</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & filters */}
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                aria-label="Search conditions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conditions or category…"
                className="px-3 py-2 border border-slate-200 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="inactive">Inactive</option>
                <option value="all">All (excl. errors)</option>
              </select>
            </div>
            <div className="text-sm text-slate-500">Showing <strong className="text-slate-900">{filteredConditions.length}</strong> of {conditions.length}</div>
          </div>

          {compareIds.length > 0 && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 flex items-center justify-between text-sm">
              <span className="text-teal-800 font-medium">{compareIds.length} selected for comparison</span>
              <div className="flex items-center gap-2">
                <button disabled={compareIds.length !== 2} onClick={() => setShowCompare(true)} className="text-xs font-semibold text-teal-800 disabled:opacity-40 hover:underline">Compare</button>
                <button onClick={() => setCompareIds([])} className="text-xs font-semibold text-slate-500 hover:underline">Clear</button>
              </div>
            </div>
          )}

          {/* Condition cards */}
          <div className="space-y-3">
            {filteredConditions.length === 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">No conditions match this view.</div>
            )}
            {filteredConditions.map((c) => {
              const gaps = careGapsForCondition(c, careGaps);
              const relatedTasks = tasksForCondition(c, tasks);
              const flagged = needsReview(c);
              const actions = availableConditionActions(c);
              return (
                <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <input type="checkbox" aria-label={`Select ${c.name} to compare`} checked={compareIds.includes(c.id)} onChange={() => toggleCompare(c.id)} className="mt-1.5 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                      <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                        {c.name.split(' ').slice(0, 2).map((s) => s[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <button onClick={() => setSelectedCondition(c)} className="text-base font-semibold text-slate-900 hover:text-teal-700 hover:underline text-left">{c.name}</button>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_TONE[c.clinicalStatus]}`}>{clinicalStatusLabel(c.clinicalStatus)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-200">{verificationLabel(c.verificationStatus)}</span>
                          {flagged && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-amber-50 text-amber-800 border-amber-200">Needs Review</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5">
                          {c.category ? `${c.category} · ` : ''}Last reviewed {formatDate(c.lastReviewed)}
                          {gaps.length > 0 && <span className="ml-1 text-amber-700 font-medium">· {gaps.length} care gap{gaps.length > 1 ? 's' : ''}</span>}
                          {relatedTasks.length > 0 && <span className="ml-1 text-blue-700 font-medium">· {relatedTasks.length} task{relatedTasks.length > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedCondition(c)} className="text-sm font-semibold text-teal-700 hover:underline">Open</button>
                        {actions.includes('resolve') && <button onClick={() => setQuickAction({ condition: c, action: 'resolve' })} className="text-sm text-slate-500 hover:text-slate-700">Resolve</button>}
                        {actions.includes('reopen') && <button onClick={() => setQuickAction({ condition: c, action: 'reopen' })} className="text-sm text-slate-500 hover:text-slate-700">Reopen</button>}
                      </div>
                      <div className="text-xs text-slate-400">{c.managedBy || 'No owner documented'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT - Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">AI Condition Overview</h5>
            </div>
            {!aiGenerated ? (
              <>
                <p className="mt-2 text-sm text-slate-600">Generate a structured, source-backed overview of this patient&apos;s active conditions.</p>
                <button onClick={() => setAiGenerated(true)} className="mt-3 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm font-semibold hover:bg-violet-100">Generate</button>
              </>
            ) : (
              <>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                  <li><strong className="text-slate-900">{snapshot.active}</strong> active condition{snapshot.active === 1 ? '' : 's'}</li>
                  <li><strong className="text-slate-900">{snapshot.needsReviewCount}</strong> needing review</li>
                  <li><strong className="text-slate-900">{snapshot.careGapsOpen}</strong> open care gap{snapshot.careGapsOpen === 1 ? '' : 's'}</li>
                  <li><strong className="text-slate-900">{snapshot.tasksOpen}</strong> open task{snapshot.tasksOpen === 1 ? '' : 's'}</li>
                </ul>
                <button onClick={() => setAiGenerated(false)} className="mt-3 text-xs font-semibold text-violet-700 hover:underline">Refresh</button>
                <div className="mt-2 text-xs text-slate-400">Generated from current chart data. Review before acting.</div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-slate-900">Care Gaps</h5>
            {careGaps.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400 italic">No care gaps documented.</p>
            ) : (
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                {careGaps.slice(0, 4).map((g) => (
                  <div key={g.id} className="flex justify-between gap-2">
                    <span className="truncate">{g.title}</span>
                    <span className={`font-semibold flex-shrink-0 ${g.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'}`}>{g.status.replace('-', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href={`/dashboard/records/${patient.id}/care-gaps`} className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline">View all care gaps →</Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-slate-900">Open Tasks</h5>
            {tasks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400 italic">No open tasks.</p>
            ) : (
              <ul className="mt-3 text-sm space-y-2">
                {tasks.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span className="truncate">{t.title}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/dashboard/records/${patient.id}/tasks`} className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline">View all tasks →</Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-slate-900">Quick Actions</h5>
            <div className="mt-3 grid gap-2">
              <button onClick={() => setShowAdd(true)} className="px-3 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Add Condition</button>
              <button onClick={() => setShowReview(true)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Start Multidisciplinary Review</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-slate-100 p-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="text-sm text-slate-700">Patient record: <strong>{patient.name}</strong></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowReview(true)} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Start Multidisciplinary Review</button>
          </div>
        </div>
      </div>

      {selectedCondition && (
        <ConditionDetailDrawer
          patientId={patientId}
          condition={selectedCondition}
          careGaps={careGaps}
          tasks={tasks}
          onClose={() => setSelectedCondition(null)}
          onRefresh={fetchAll}
        />
      )}
      {showAdd && <AddConditionDrawer patientId={patientId} onClose={() => setShowAdd(false)} onCreated={async () => { await fetchAll(); setShowAdd(false); }} />}
      {showCompare && compareConditions.length === 2 && (
        <CompareConditionsDrawer conditions={[compareConditions[0], compareConditions[1]]} careGaps={careGaps} tasks={tasks} onClose={() => setShowCompare(false)} />
      )}
      {showReview && <MultidisciplinaryReviewDrawer conditions={conditions} careTeam={patient.careTeam || []} onClose={() => setShowReview(false)} />}
      {quickAction && (
        <ConditionStatusDialog
          patientId={patientId}
          condition={quickAction.condition}
          action={quickAction.action}
          onClose={() => setQuickAction(null)}
          onConfirmed={async () => { await fetchAll(); setQuickAction(null); }}
        />
      )}
    </div>
  );
}
